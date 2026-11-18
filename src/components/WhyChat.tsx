"use client";

import { useEffect, useRef, useState } from "react";
import { BUDDY_NAME, WHY_IDLE_SECONDS, WHY_MAX_STUDENT_TURNS } from "@/config";

interface Msg {
  who: "me" | "sara";
  text: string;
}
interface TextSession {
  sendUserMessage: (t: string) => void;
  endSession: () => Promise<void>;
}
type Phase = "connecting" | "live" | "done" | "error";

// A short, focused text chat with Sara about one question the student just answered.
// It ends when the student taps "Got it", when Sara wraps up, after a few minutes of
// silence, after a set number of turns, or when the student leaves the page.
export default function WhyChat({ questionId, onClose }: { questionId: string; onClose: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<Phase>("connecting");
  const [waiting, setWaiting] = useState(true);
  const [err, setErr] = useState("");
  const [upgrade, setUpgrade] = useState(false);
  const [turns, setTurns] = useState(0);
  const [endedBy, setEndedBy] = useState<"" | "sara" | "idle" | "turns">("");
  const conv = useRef<TextSession | null>(null);
  const sessionId = useRef<string | null>(null);
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reason = useRef<"" | "sara" | "idle" | "turns" | "student">("");
  const end = useRef<HTMLDivElement>(null);

  const report = (data: Record<string, unknown>) =>
    sessionId.current &&
    fetch("/api/voice/update", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId: sessionId.current, ...data }),
      keepalive: true,
    }).catch(() => {});

  function armIdle() {
    if (idle.current) clearTimeout(idle.current);
    idle.current = setTimeout(() => stop("idle"), WHY_IDLE_SECONDS * 1000);
  }

  async function stop(why: "sara" | "idle" | "turns" | "student") {
    if (!reason.current) reason.current = why;
    if (idle.current) clearTimeout(idle.current);
    const c = conv.current;
    conv.current = null;
    await c?.endSession().catch(() => {});
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/voice/session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mode: "why", questionId }),
        });
        const j = await res.json();
        if (!res.ok) {
          setUpgrade(!!j.upgrade);
          throw new Error(j.error || `${BUDDY_NAME} can't connect right now.`);
        }
        if (cancelled) return;
        sessionId.current = j.sessionId;
        const { Conversation } = await import("@elevenlabs/client");
        conv.current = (await Conversation.startSession({
          signedUrl: j.signedUrl,
          textOnly: true,
          overrides: { conversation: { textOnly: true } },
          dynamicVariables: j.dynamicVariables,
          onConnect: ({ conversationId }) => {
            setPhase("live");
            report({ conversationId });
            armIdle();
          },
          onDisconnect: () => {
            if (idle.current) clearTimeout(idle.current);
            conv.current = null;
            // If we didn't end it, Sara did (she closes once the student has it).
            const r = reason.current || "sara";
            setEndedBy(r === "student" ? "" : r);
            setPhase("done");
            setWaiting(false);
            report({ ended: true });
          },
          onError: (message) => console.error("sara error", message),
          onMessage: ({ message, role }) => {
            if (role === "user" || !message?.trim()) return;
            setWaiting(false);
            setMsgs((m) => [...m, { who: "sara", text: message }]);
            armIdle();
          },
        })) as unknown as TextSession;
        if (cancelled) await stop("student");
      } catch (e) {
        // Our own API errors are written for students; connection errors from the SDK are not.
        setErr(sessionId.current ? `${BUDDY_NAME} couldn't connect. Check your internet connection and try again.` : String((e as Error).message));
        setPhase("error");
        setWaiting(false);
      }
    })();
    return () => {
      cancelled = true;
      void stop("student");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId]);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [msgs, waiting]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || waiting || !conv.current) return;
    setInput("");
    setMsgs((m) => [...m, { who: "me", text }]);
    const n = turns + 1;
    setTurns(n);
    setWaiting(true);
    conv.current.sendUserMessage(text);
    armIdle();
    // After the last allowed turn, let Sara answer, then close.
    if (n >= WHY_MAX_STUDENT_TURNS) setTimeout(() => stop("turns"), 20000);
  }

  const left = WHY_MAX_STUDENT_TURNS - turns;

  return (
    <div className="card why" style={{ marginTop: 12 }}>
      <div className="spread">
        <strong>Why? with {BUDDY_NAME}</strong>
        {phase === "live" && <span className="small muted">{left > 0 ? `${left} replies left` : "Wrapping up"}</span>}
      </div>
      <div className="chat" style={{ marginTop: 8 }}>
        {msgs.map((m, i) => (
          <div key={i} className={`msg ${m.who}`}>
            {m.text}
          </div>
        ))}
        {waiting && phase !== "error" && <div className="msg sara muted">{BUDDY_NAME} is thinking...</div>}
        <div ref={end} />
      </div>
      {err && (
        <p className="error">
          {err} {upgrade && <a href="/pricing">See passes</a>}
        </p>
      )}
      {phase === "live" && left > 0 && (
        <form onSubmit={send} className="row" style={{ marginTop: 10 }}>
          <input
            style={{ flex: 1 }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Explain your thinking..."
            maxLength={600}
            aria-label={`Reply to ${BUDDY_NAME}`}
            autoFocus
          />
          <button className="btn" disabled={waiting || !input.trim()}>
            Send
          </button>
        </form>
      )}
      {phase === "done" && (
        <p className="small muted" style={{ marginBottom: 6 }}>
          {endedBy === "sara" && "Sara wrapped up this one."}
          {endedBy === "idle" && "This chat closed after a few quiet minutes."}
          {endedBy === "turns" && "That's the end of this chat. The next question is the best test of it."}
        </p>
      )}
      <div className="row" style={{ marginTop: 8 }}>
        <button
          className="btn secondary"
          onClick={async () => {
            await stop("student");
            onClose();
          }}
        >
          {phase === "done" || phase === "error" ? "Close" : "Got it"}
        </button>
      </div>
    </div>
  );
}
