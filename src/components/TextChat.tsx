"use client";

import { useEffect, useRef, useState } from "react";
import { BUDDY_NAME } from "@/config";

interface Msg {
  who: "me" | "sara";
  text: string;
}
interface TextSession {
  sendUserMessage: (t: string) => void;
  endSession: () => Promise<void>;
}

// Text chat with Sara. Same agent as voice, in text-only mode. Reconnects quietly if a session times out.
export default function TextChat() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [err, setErr] = useState("");
  const conv = useRef<TextSession | null>(null);
  const sessionId = useRef<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [msgs, waiting]);
  useEffect(() => () => void conv.current?.endSession().catch(() => {}), []);

  async function connect() {
    const res = await fetch("/api/voice/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: "text" }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || `${BUDDY_NAME} can't connect right now.`);
    sessionId.current = j.sessionId;
    const report = (data: Record<string, unknown>) =>
      fetch("/api/voice/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: j.sessionId, ...data }),
        keepalive: true,
      }).catch(() => {});
    const { Conversation } = await import("@elevenlabs/client");
    let firstMessage = true;
    conv.current = (await Conversation.startSession({
      signedUrl: j.signedUrl,
      textOnly: true,
      overrides: { conversation: { textOnly: true } },
      dynamicVariables: j.dynamicVariables,
      onConnect: ({ conversationId }) => report({ conversationId }),
      onDisconnect: () => {
        conv.current = null;
        report({ ended: true });
      },
          onError: (message) => console.error("sara error", message),
      onMessage: ({ message, role }) => {
        if (role === "user" || !message?.trim()) return;
        // Sara's greeting is skipped once a conversation is under way.
        if (firstMessage) {
          firstMessage = false;
          if (msgsRef.current.length) return;
        }
        setWaiting(false);
        setMsgs((m) => [...m, { who: "sara", text: message }]);
      },
    })) as unknown as TextSession;
  }

  const msgsRef = useRef<Msg[]>([]);
  useEffect(() => {
    msgsRef.current = msgs;
  }, [msgs]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || waiting) return;
    setErr("");
    setInput("");
    setMsgs((m) => [...m, { who: "me", text }]);
    setWaiting(true);
    try {
      if (!conv.current) await connect();
      conv.current!.sendUserMessage(text);
    } catch (e2) {
      setErr(sessionId.current ? `${BUDDY_NAME} couldn't connect. Check your internet connection and try again.` : String((e2 as Error).message));
      conv.current = null;
      setWaiting(false);
    }
  }

  return (
    <section className="card">
      <h2>Chat with {BUDDY_NAME}</h2>
      <div className="chat">
        {msgs.length === 0 && (
          <p className="muted small">
            Ask about anything on the VTNE: a drug calculation, why an answer was right, or &quot;quiz me on anesthesia.&quot;
          </p>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`msg ${m.who}`}>
            {m.text}
          </div>
        ))}
        {waiting && <div className="msg sara muted">{BUDDY_NAME} is typing...</div>}
        <div ref={end} />
      </div>
      {err && <p className="error">{err}</p>}
      <form onSubmit={send} className="row" style={{ marginTop: 12 }}>
        <input
          style={{ flex: 1 }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Message ${BUDDY_NAME}`}
          maxLength={1000}
          aria-label={`Message ${BUDDY_NAME}`}
        />
        <button className="btn" disabled={waiting || !input.trim()}>
          Send
        </button>
      </form>
    </section>
  );
}
