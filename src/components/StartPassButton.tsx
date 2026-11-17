"use client";
import { useState } from "react";

export default function StartPassButton({ purchaseId, days }: { purchaseId: string; days: number }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function go() {
    setBusy(true);
    const res = await fetch("/api/pass/start", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ purchaseId }),
    });
    if (res.ok) window.location.reload();
    else {
      setErr((await res.json().catch(() => ({}))).error || "Couldn't start your pass.");
      setBusy(false);
    }
  }
  if (!confirm)
    return (
      <button className="btn" onClick={() => setConfirm(true)}>
        Start my {days} days
      </button>
    );
  return (
    <div>
      <p className="small">
        Your {days} days start today and can&apos;t be paused. Ready?
      </p>
      <button className="btn" onClick={go} disabled={busy}>
        {busy ? "Starting..." : "Yes, start now"}
      </button>{" "}
      <button className="btn ghost" onClick={() => setConfirm(false)} disabled={busy}>
        Not yet
      </button>
      {err && <p className="error">{err}</p>}
    </div>
  );
}
