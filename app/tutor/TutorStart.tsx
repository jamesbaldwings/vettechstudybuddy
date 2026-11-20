"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BUDDY_NAME, SUBJECTS, TUTOR_MATERIAL_MAX } from "@/config";

export default function TutorStart(props: { defaultSubject?: string; defaultTopic?: string; locked: boolean }) {
  const router = useRouter();
  const [subject, setSubject] = useState(props.defaultSubject ?? "");
  const [topic, setTopic] = useState(props.defaultTopic ?? "");
  const [material, setMaterial] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [channel, setChannel] = useState<"text" | "voice">("text");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [upgrade, setUpgrade] = useState(props.locked);
  const starting = useRef(false);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    // A ref, not state, so a second tap before React re-renders can't send a second start.
    if (starting.current) return;
    starting.current = true;
    setErr("");
    setBusy(true);
    try {
      const res = await fetch("/api/tutor/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subject, topic, material, channel }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.id) {
        setErr(j.error || "Something went wrong. Try again.");
        setUpgrade(!!j.upgrade);
        starting.current = false;
        setBusy(false);
        return;
      }
      router.push(`/tutor/${j.id}`);
    } catch {
      // Dropped connection: let them try again. If the session was created, the server hands the same one back.
      setErr("We couldn't reach the server. Check your connection and try again.");
      starting.current = false;
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={start}>
      <h2 style={{ marginTop: 0 }}>What are you stuck on?</h2>
      <div className="field">
        <label htmlFor="subject">Course or subject</label>
        <select id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required>
          <option value="">Choose one</option>
          {SUBJECTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="topic">Topic</label>
        <input
          id="topic"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="For example: acid-base balance, alpha-2 agonists, the heartworm life cycle"
          maxLength={120}
          required
        />
      </div>
      {showNotes ? (
        <div className="field">
          <label htmlFor="notes">Your notes, study guide or learning objectives (optional)</label>
          <textarea
            id="notes"
            rows={6}
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            maxLength={TUTOR_MATERIAL_MAX}
            placeholder={`Paste them here and ${BUDDY_NAME} will teach from them.`}
          />
          <p className="small muted" style={{ margin: "4px 0 0" }}>
            {material.length} / {TUTOR_MATERIAL_MAX} characters
          </p>
        </div>
      ) : (
        <p className="small">
          <button type="button" className="linklike" onClick={() => setShowNotes(true)}>
            + Add your notes, a study guide or learning objectives
          </button>
        </p>
      )}
      <div className="field">
        <label>How do you want to study?</label>
        <div className="choices">
          {(["text", "voice"] as const).map((c) => (
            <label key={c} className="choice">
              <input type="radio" name="channel" checked={channel === c} onChange={() => setChannel(c)} />{" "}
              {c === "text" ? "Text chat" : "Talk out loud (uses voice minutes)"}
            </label>
          ))}
        </div>
      </div>
      {err && (
        <p className="error">
          {err} {upgrade && <a href="/pricing#semester">See the Semester Pass</a>}
        </p>
      )}
      <button className="btn" disabled={busy || !subject || topic.trim().length < 2}>
        {busy ? "Starting..." : `Start with ${BUDDY_NAME}`}
      </button>
      <p className="small muted" style={{ marginBottom: 0 }}>
        {BUDDY_NAME} is a tutor, not a homework service. She&apos;ll teach you the concept until it clicks, but she won&apos;t write graded
        assignments, essays or take-home exam answers.
      </p>
    </form>
  );
}
