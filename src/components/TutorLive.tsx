"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BuddyAvatar } from "@/components/Buddy";
import { BUDDY_NAME, VOICE_SESSION_MINUTES } from "@/config";

type Channel = "text" | "voice";
type Phase = "idle" | "connecting" | "live" | "error";
interface Line {
  who: "student" | "sara";
  text: string;
}
interface Session {
  sendUserMessage: (t: string) => void;
  endSession: () => Promise<void>;
  setMicMuted?: (m: boolean) => void;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// A live Tutor Mode session with Sara, by text or voice. Sara reports each understanding check and her
// wrap-up through two client tools, which this component saves to the session.
export default function TutorLive(props: {
  sessionId: string;
  topic: string;
  subjectName: string;
  channel: Channel;
  initial: Line[];
  checksPassed: number;
  checksFailed: number;
  voiceMinutes: number;
}) {
  const router = useRouter();
  const [channel, setChannel] = useState<Channel>(props.channel);
  const [phase, setPhase] = useState<Phase>("idle");
  const [lines, setLines] = useState<Line[]>(props.initial);
  const [input, setInput] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [err, setErr] = useState("");
  const [upgrade, setUpgrade] = useState(false);
  const [checks, setChecks] = useState({ passed: props.checksPassed, failed: props.checksFailed });
  const [left, setLeft] = useState(VOICE_SESSION_MINUTES * 60);
  const [minutes, setMinutes] = useState(props.voiceMinutes);
  const [finishing, setFinishing] = useState(false);
  const conv = useRef<Session | null>(null);
  const voiceSessionId = useRef<string | null>(null);
  const finished = useRef(false);
  const wrapAsked = useRef(false);
  const linesRef = useRef<Line[]>(props.initial);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    linesRef.current = lines;
    end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [lines, waiting]);

  const event = useCallback(
    (data: Record<string, unknown>) =>
      fetch(`/api/tutor/${props.sessionId}/event`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
        keepalive: true,
      }).catch(() => {}),
    [props.sessionId],
  );

  const report = (data: Record<string, unknown>) =>
    voiceSessionId.current &&
    fetch("/api/voice/update", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId: voiceSessionId.current, ...data }),
      keepalive: true,
    })
      .then((r) => r.json())
      .then((j) => typeof j?.voiceMinutes === "number" && setMinutes(j.voiceMinutes))
      .catch(() => {});

  const addLine = (l: Line) => {
    setLines((ls) => [...ls, l]);
    void event({ type: "message", who: l.who, text: l.text });
  };

  // Sara's tools. She calls these; the return value is what she hears back.
  const clientTools = {
    record_understanding_check: async (p: { concept?: string; passed?: unknown }) => {
      const passed = p?.passed === true || p?.passed === "true" || p?.passed === "yes";
      setChecks((c) => (passed ? { ...c, passed: c.passed + 1 } : { ...c, failed: c.failed + 1 }));
      await event({ type: "check", concept: p?.concept ?? "", passed });
      return passed ? "Recorded as understood." : "Recorded as not yet. Re-explain it a different way.";
    },
    finish_tutor_session: async (p: Record<string, unknown>) => {
      finished.current = true;
      setFinishing(true);
      await event({
        type: "finish",
        recap: p?.recap,
        mastered: p?.mastered,
        struggled: p?.struggled_concepts,
        related: p?.related_topics,
        practice: p?.practice_questions,
      });
      return "Saved. Give the recap and practice questions, then end the conversation.";
    },
  };

  async function connect(ch: Channel) {
    setErr("");
    setUpgrade(false);
    setPhase("connecting");
    voiceSessionId.current = null;
    try {
      if (ch === "voice") {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach((t) => t.stop());
        } catch {
          throw new Error("I need your microphone to talk. Allow microphone access in your browser, then try again.");
        }
      }
      const res = await fetch("/api/voice/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: ch === "voice" ? "tutor_voice" : "tutor_text", tutorSessionId: props.sessionId }),
      });
      const j = await res.json();
      if (!res.ok) {
        setUpgrade(!!j.upgrade);
        if (j.ended) router.refresh();
        throw new Error(j.error || `${BUDDY_NAME} can't connect right now.`);
      }
      voiceSessionId.current = j.sessionId;
      if (typeof j.voiceMinutes === "number") setMinutes(j.voiceMinutes);
      setLeft(j.maxSeconds);
      const { Conversation } = await import("@elevenlabs/client");
      const resuming = linesRef.current.length > 0;
      let firstAgentMessage = true;
      conv.current = (await Conversation.startSession({
        signedUrl: j.signedUrl,
        ...(ch === "voice"
          ? { connectionType: "websocket" as const, textOnly: false }
          : { textOnly: true, overrides: { conversation: { textOnly: true } } }),
        stripAudioTags: true,
        dynamicVariables: j.dynamicVariables,
        clientTools,
        onConnect: ({ conversationId }) => {
          setPhase("live");
          report({ conversationId });
        },
        onDisconnect: () => {
          conv.current = null;
          setSpeaking(false);
          setWaiting(false);
          setPhase((p) => (p === "error" ? p : "idle"));
          report({ ended: true });
          if (finished.current) {
            void event({ type: "end" }).then(() => router.refresh());
          }
        },
        onError: (message) => console.error("tutor error", message),
        onModeChange: ({ mode }) => setSpeaking(mode === "speaking"),
        onMessage: ({ message, role }) => {
          if (!message?.trim()) return;
          if (role === "user") {
            // Text messages are added when sent; voice comes back as a transcript.
            if (ch === "voice") addLine({ who: "student", text: message });
            return;
          }
          // In text, a reconnect would repeat the greeting mid-conversation: skip it.
          if (firstAgentMessage) {
            firstAgentMessage = false;
            if (ch === "text" && resuming && linesRef.current.length) return;
          }
          setWaiting(false);
          addLine({ who: "sara", text: message });
        },
      })) as unknown as Session;
      return true;
    } catch (e) {
      const msg = String((e as Error).message || e);
      setErr(voiceSessionId.current ? `${BUDDY_NAME} couldn't connect. Check your internet connection and try again.` : msg);
      setPhase("error");
      conv.current = null;
      return false;
    }
  }

  // Text sessions open right away so Sara can greet the student.
  useEffect(() => {
    if (props.channel === "text") void connect("text");
    return () => void conv.current?.endSession().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== "live" || channel !== "voice") return;
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [phase, channel]);
  useEffect(() => {
    if (phase === "live" && channel === "voice" && left === 0) void conv.current?.endSession().catch(() => {});
  }, [phase, channel, left]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || waiting) return;
    setInput("");
    addLine({ who: "student", text });
    setWaiting(true);
    if (!conv.current) {
      const ok = await connect(channel);
      if (!ok) {
        setWaiting(false);
        return;
      }
    }
    conv.current?.sendUserMessage(text);
  }

  async function switchTo(ch: Channel) {
    await conv.current?.endSession().catch(() => {});
    conv.current = null;
    setChannel(ch);
    if (ch === "text") void connect("text");
  }

  async function finish() {
    // While Sara is connected, ask her to wrap up so the recap and practice questions get saved.
    if (conv.current && !finished.current && !wrapAsked.current) {
      wrapAsked.current = true;
      const text = "I'm ready to wrap up. Can you give me my recap and practice questions?";
      addLine({ who: "student", text });
      setWaiting(channel === "text");
      conv.current.sendUserMessage(text);
      setTimeout(() => {
        if (!finished.current) void finish();
      }, 60_000);
      return;
    }
    await conv.current?.endSession().catch(() => {});
    conv.current = null;
    await event({ type: "end" });
    router.refresh();
  }

  const live = phase === "live";
  return (
    <section className="card voice">
      <div className="voice-head">
        <div className={`voice-orb ${live && channel === "voice" ? (speaking ? "talking" : "listening") : ""}`}>
          <BuddyAvatar size={56} />
        </div>
        <div>
          <h2 style={{ marginBottom: 4 }}>{props.topic}</h2>
          <p className="muted small" style={{ margin: 0 }}>
            {props.subjectName} · Understanding checks: {checks.passed} got it
            {checks.failed ? `, ${checks.failed} not yet` : ""}
          </p>
        </div>
      </div>

      <div className="chat" aria-live="polite">
        {lines.length === 0 && (
          <p className="muted small">
            {channel === "voice"
              ? `Press Start talking and ${BUDDY_NAME} will begin. Captions show up here.`
              : `${BUDDY_NAME} is getting ready...`}
          </p>
        )}
        {lines.map((l, i) => (
          <div key={i} className={`msg ${l.who === "student" ? "me" : "sara"}`}>
            {l.text}
          </div>
        ))}
        {waiting && <div className="msg sara muted">{BUDDY_NAME} is typing...</div>}
        <div ref={end} />
      </div>

      {err && (
        <p className="error">
          {err} {upgrade && <a href="/pricing">See options</a>}
        </p>
      )}
      {finishing && <p className="small muted">Saving your recap and practice questions...</p>}

      {channel === "text" ? (
        <form onSubmit={send} className="row" style={{ marginTop: 12 }}>
          <input
            style={{ flex: 1 }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Answer ${BUDDY_NAME} or ask a question`}
            maxLength={1000}
            aria-label={`Message ${BUDDY_NAME}`}
          />
          <button className="btn" disabled={waiting || !input.trim() || phase === "connecting"}>
            Send
          </button>
        </form>
      ) : (
        <div className="voice-actions">
          {!live && phase !== "connecting" && (
            <button className="btn" onClick={() => connect("voice")}>
              🎙️ {lines.length ? "Keep talking" : "Start talking"}
            </button>
          )}
          {phase === "connecting" && (
            <button className="btn" disabled>
              Connecting...
            </button>
          )}
          {live && (
            <>
              <button
                className="btn secondary"
                onClick={() => {
                  conv.current?.setMicMuted?.(!muted);
                  setMuted(!muted);
                }}
              >
                {muted ? "Unmute" : "Mute"}
              </button>
              <button className="btn secondary" onClick={() => conv.current?.endSession().catch(() => {})}>
                Pause
              </button>
              <span className="muted small">{fmt(left)} left in this call</span>
            </>
          )}
          {!live && <span className="muted small">{minutes} voice minutes left</span>}
        </div>
      )}

      <p className="small" style={{ marginTop: 12, marginBottom: 0 }}>
        {channel === "text" ? (
          <button className="linklike" onClick={() => switchTo("voice")}>
            Switch to voice
          </button>
        ) : (
          <button className="linklike" onClick={() => switchTo("text")}>
            Switch to text
          </button>
        )}{" "}
        ·{" "}
        <button className="linklike" onClick={finish}>
          I&apos;m done, show my recap
        </button>
      </p>
    </section>
  );
}
