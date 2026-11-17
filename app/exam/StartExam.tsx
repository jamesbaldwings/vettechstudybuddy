"use client";
import { useState } from "react";

export default function StartExam() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function go() {
    setBusy(true);
    const r = await fetch("/api/exam/start", { method: "POST" });
    const j = await r.json();
    if (r.ok) window.location.href = `/exam/${j.id}`;
    else {
      setErr(j.error || "Couldn't start the exam.");
      setBusy(false);
    }
  }
  return (
    <>
      <button className="btn" onClick={go} disabled={busy}>
        {busy ? "Building your exam..." : "Start (or resume) exam"}
      </button>
      {err && <p className="error">{err}</p>}
    </>
  );
}
