"use client";

import { useState } from "react";
import { Buddy } from "@/components/Buddy";

type Result = "passed" | "failed" | "not_yet";

// The email link only pre-selects a choice. Saving takes a click, so link scanners in email clients can't record a fake answer.
export default function Outcome({ token, firstName, initial }: { token: string; firstName: string | null; initial: Result | null }) {
  const [choice, setChoice] = useState<Result | null>(initial);
  const [examDate, setExamDate] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState<Result | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const name = firstName?.trim() || "friend";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!choice) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/outcome", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, result: choice, examDate: examDate || null, note }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Something went wrong.");
      setSaved(choice);
    } catch (e2) {
      setErr(String((e2 as Error).message));
    } finally {
      setBusy(false);
    }
  }

  if (saved === "passed")
    return (
      <Buddy>
        <p>
          <strong>YOU PASSED! Congratulations, {name}!</strong> All those hours paid off. Go celebrate. You&apos;ve earned
          it. Thank you for letting me know; it genuinely helps me make this better for the next student.
        </p>
      </Buddy>
    );
  if (saved === "failed")
    return (
      <Buddy>
        <p>
          Thank you for telling me, {name}. That takes guts. One exam doesn&apos;t define the tech you&apos;re going to be,
          and a lot of great techs passed on their second try.
        </p>
        <p>
          {examDate
            ? "Your retake date is saved. I'll check in before it, just like last time."
            : "Whenever you're ready, add your retake date from any of my emails and I'll build a new plan around it."}
        </p>
      </Buddy>
    );
  if (saved === "not_yet")
    return (
      <Buddy>
        <p>Got it, {name}. {examDate ? "Your new date is saved, and I'll time my check-ins around it." : "I'll check back in later."}</p>
      </Buddy>
    );

  return (
    <form onSubmit={save}>
      <Buddy>
        <p>Hey {name}! How did the VTNE go?</p>
      </Buddy>
      <div className="choices" role="radiogroup">
        {(
          [
            ["passed", "🎉 I passed!"],
            ["failed", "I didn't pass this time"],
            ["not_yet", "I haven't taken it yet"],
          ] as [Result, string][]
        ).map(([v, label]) => (
          <button type="button" key={v} className={`choice-btn ${choice === v ? "on" : ""}`} onClick={() => setChoice(v)} aria-pressed={choice === v}>
            {label}
          </button>
        ))}
      </div>

      {choice && (
        <div className="card" style={{ marginTop: 18 }}>
          {choice === "passed" && (
            <div className="field">
              <label htmlFor="note">Anything that helped you most? (optional)</label>
              <textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          )}
          {choice === "failed" && (
            <>
              <div className="field">
                <label htmlFor="d">Retake date, if you&apos;ve booked it (optional)</label>
                <input id="d" type="date" min={today} value={examDate} onChange={(e) => setExamDate(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="note">Which areas were lowest on your score report? (optional)</label>
                <textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </>
          )}
          {choice === "not_yet" && (
            <div className="field">
              <label htmlFor="d">When is your exam now?</label>
              <input id="d" type="date" min={today} value={examDate} onChange={(e) => setExamDate(e.target.value)} />
              <p className="muted small" style={{ marginTop: 6 }}>Leave it blank if you&apos;re not sure yet.</p>
            </div>
          )}
          {err && <p className="error">{err}</p>}
          <button className="btn block" type="submit" disabled={busy}>
            {busy ? "Saving..." : "Save"}
          </button>
        </div>
      )}
    </form>
  );
}
