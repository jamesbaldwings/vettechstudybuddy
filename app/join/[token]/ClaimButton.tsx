"use client";
import { useState } from "react";

export default function ClaimButton({ token, kind, done }: { token: string; kind: "student" | "admin"; done: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const dest = kind === "admin" ? "/school" : "/home";
  if (done)
    return (
      <a className="btn" href={dest}>
        {kind === "admin" ? "Go to the school dashboard" : "Go to my study home"}
      </a>
    );
  async function claim() {
    setBusy(true);
    setErr("");
    const res = await fetch("/api/school/claim", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(j.error || "That didn't work.");
      setBusy(false);
      return;
    }
    window.location.href = dest;
  }
  return (
    <>
      <button className="btn block" onClick={claim} disabled={busy}>
        {busy ? "One moment..." : kind === "admin" ? "Become a school admin" : "Add my pass and share my progress with my school"}
      </button>
      {err && <p className="error">{err}</p>}
    </>
  );
}
