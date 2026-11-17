"use client";

import { useEffect, useRef, useState } from "react";
import { BuddyAvatar } from "@/components/Buddy";
import { BUDDY_NAME, VOICE_SESSION_MINUTES } from "@/config";

type Phase = "idle" | "connecting" | "live" | "ended" | "error";
interface Line {
  who: "you" | "sara";
  text: string;
}
interface VoiceSession {
  endSession: () => Promise<void>;
  setMicMuted: (m: boolean) => void;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// Talk it through out loud with Sara. Shows live captions so it also works for students who can't use audio.
export default function VoiceBuddy({ attemptToken }: { attemptToken: string }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [err, setErr] = useState("");
  const [left, setLeft] = useState(VOICE_SESSION_MINUTES * 60);
  const [remaining, setRemaining] = useState<number | null>(null);
  const conv = useRef<VoiceSession | null>(null);
  const sessionId = useRef<string | null>(null);
  const captionsEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase !== "live") return;
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    captionsEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [lines]);

  useEffect(() => () => void conv.current?.endSession().catch(() => {}), []);

  const report = (data: Record<string, unknown>) =>
    sessionId.current &&
    fetch("/api/voice/update", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId: sessionId.current, ...data }),
      keepalive: true,
    }).catch(() => {});

  async function start() {
    setErr("");
    setLines([]);
    sessionId.current = null;
    setLeft(VOICE_SESSION_MINUTES * 60);
    setPhase("connecting");
    try {
      // Ask for the microphone first so a blocked mic gets a clear message.
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        throw new Error("I need your microphone to talk. Allow microphone access in your browser, then try again.");
      }
      const res = await fetch("/api/voice/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ attemptToken }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Sara can't connect right now.");
      sessionId.current = j.sessionId;
      setRemaining(j.remainingToday);

      const { Conversation } = await import("@elevenlabs/client");
      conv.current = (await Conversation.startSession({
        signedUrl: j.signedUrl,
        connectionType: "websocket",
        dynamicVariables: j.dynamicVariables,
        onConnect: ({ conversationId }) => {
          setPhase("live");
          report({ conversationId });
        },
        onDisconnect: () => {
          setPhase((p) => (p === "error" ? p : "ended"));
          setSpeaking(false);
          report({ ended: true });
        },
        onError: (message) => {
          console.error("voice error", message);
        },
        onModeChange: ({ mode }) => setSpeaking(mode === "speaking"),
        onMessage: ({ message, role }) => {
          if (!message?.trim()) return;
          setLines((ls) => [...ls.slice(-30), { who: role === "user" ? "you" : "sara", text: message }]);
        },
      })) as unknown as VoiceSession;
    } catch (e) {
      const msg = String((e as Error).message || e);
      const ours = msg.startsWith("I need your microphone") || !!sessionId.current === false;
      setErr(ours ? msg : `${BUDDY_NAME} couldn't connect. Check your internet connection and try again.`);
      if (!ours) console.error("voice connect failed", msg);
      setPhase("error");
    }
  }

  async function stop() {
    await conv.current?.endSession().catch(() => {});
    conv.current = null;
  }

  function toggleMute() {
    const m = !muted;
    conv.current?.setMicMuted(m);
    setMuted(m);
  }

  const live = phase === "live";

  return (
    <section className="card voice">
      <div className="voice-head">
        <div className={`voice-orb ${live ? (speaking ? "talking" : "listening") : ""}`}>
          <BuddyAvatar size={64} />
        </div>
        <div>
          <h2 style={{ marginBottom: 4 }}>Talk it through with {BUDDY_NAME}</h2>
          <p className="muted small" style={{ margin: 0 }}>
            {live
              ? speaking
                ? `${BUDDY_NAME} is talking. Jump in anytime.`
                : "Listening..."
              : phase === "connecting"
                ? `Calling ${BUDDY_NAME}...`
                : `Review what you missed or get quizzed, out loud, like studying with a classmate. Up to ${VOICE_SESSION_MINUTES} minutes per session.`}
          </p>
        </div>
      </div>

      {(live || lines.length > 0) && (
        <div className="captions" aria-live="polite">
          {lines.length === 0 && <p className="muted small">Captions will show up here.</p>}
          {lines.map((l, i) => (
            <p key={i} className={`cap ${l.who}`}>
              <strong>{l.who === "you" ? "You" : BUDDY_NAME}:</strong> {l.text}
            </p>
          ))}
          <div ref={captionsEnd} />
        </div>
      )}

      {err && <p className="error">{err}</p>}

      <div className="voice-actions">
        {!live && phase !== "connecting" && (
          <button className="btn" onClick={start}>
            🎙️ {phase === "ended" ? "Talk again" : `Start talking with ${BUDDY_NAME}`}
          </button>
        )}
        {phase === "connecting" && (
          <button className="btn" disabled>
            Connecting...
          </button>
        )}
        {live && (
          <>
            <button className="btn secondary" onClick={toggleMute}>
              {muted ? "Unmute" : "Mute"}
            </button>
            <button className="btn" onClick={stop}>
              End session
            </button>
            <span className="muted small">{fmt(left)} left</span>
          </>
        )}
      </div>
      {phase === "ended" && (
        <p className="muted small" style={{ marginTop: 10, marginBottom: 0 }}>
          Nice session.{" "}
          {remaining !== null && (remaining > 0 ? `You have ${remaining} more today.` : "That was your last one for today. See you tomorrow!")}
        </p>
      )}
    </section>
  );
}
