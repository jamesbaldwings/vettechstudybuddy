"use client";
import { useState } from "react";
import { upcomingMonths } from "@/lib/dates";

export default function Settings(p: { email: string; firstName: string; examDate: string; targetMonth: string; checkIns: boolean }) {
  const [firstName, setFirstName] = useState(p.firstName);
  const [mode, setMode] = useState(p.examDate ? "exact" : p.targetMonth ? "month" : "unknown");
  const [examDate, setExamDate] = useState(p.examDate);
  const [targetMonth, setTargetMonth] = useState(p.targetMonth);
  const [checkIns, setCheckIns] = useState(p.checkIns);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ firstName, dateMode: mode, examDate, targetMonth, checkIns }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? "Saved." : j.error || "Couldn't save.");
  }

  return (
    <form className="card" onSubmit={save}>
      <h1 style={{ fontSize: "1.5rem" }}>Settings</h1>
      <p className="muted small">Signed in as {p.email}</p>
      <div className="field">
        <label htmlFor="fn">First name</label>
        <input id="fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
      </div>
      <div className="field">
        <label>Your VTNE date</label>
        <div className="choices">
          {[
            ["exact", "I have a date"],
            ["month", "I know the month"],
            ["unknown", "Not sure yet"],
          ].map(([v, l]) => (
            <label key={v} className="choice">
              <input type="radio" name="mode" checked={mode === v} onChange={() => setMode(v)} /> {l}
            </label>
          ))}
        </div>
        {mode === "exact" && <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />}
        {mode === "month" && (
          <select value={targetMonth} onChange={(e) => setTargetMonth(e.target.value)}>
            <option value="">Pick a month</option>
            {upcomingMonths().map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        )}
      </div>
      <label className="choice">
        <input type="checkbox" checked={checkIns} onChange={(e) => setCheckIns(e.target.checked)} /> Email me study check-ins before and
        after my VTNE
      </label>
      {msg && <p className="small">{msg}</p>}
      <button className="btn block" disabled={busy}>
        {busy ? "Saving..." : "Save"}
      </button>
      <p className="center small">
        <a href="/home">Back to study home</a>
      </p>
    </form>
  );
}
