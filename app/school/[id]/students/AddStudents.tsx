"use client";
import { useState } from "react";

export default function AddStudents({ schoolId, available, total }: { schoolId: string; available: number; total: number }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  async function add() {
    setBusy(true);
    setErr("");
    setMsg("");
    const res = await fetch("/api/school/students", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ schoolId, text }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    const bad = j.bad?.length ? ` Couldn't read: ${j.bad.slice(0, 5).join(", ")}${j.bad.length > 5 ? "…" : ""}` : "";
    if (!res.ok) return setErr((j.error || "That didn't work.") + bad);
    setMsg(`Added ${j.added} student${j.added === 1 ? "" : "s"} and emailed their links.${j.skipped ? ` ${j.skipped} were already on the roster.` : ""}${bad}`);
    setText("");
    setTimeout(() => window.location.reload(), 1200);
  }
  return (
    <section className="card">
      <h2 style={{ marginTop: 0 }}>Add students</h2>
      <p className="small">
        <strong>{available}</strong> of {total} seats open. Paste one student per line: an email, or a name and email (for example{" "}
        <code>Jamie Lee, jamie@school.edu</code>). You can paste a column straight from a spreadsheet.
      </p>
      <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} style={{ width: "100%" }} placeholder={"Jamie Lee, jamie@school.edu\nsam@school.edu"} />
      <button className="btn" onClick={add} disabled={busy || !text.trim() || available < 1} style={{ marginTop: 8 }}>
        {busy ? "Adding..." : "Add and email links"}
      </button>
      {available < 1 && <p className="small muted">No open seats. Add seats on the Seats tab.</p>}
      {msg && <p className="small">{msg}</p>}
      {err && <p className="error">{err}</p>}
    </section>
  );
}
