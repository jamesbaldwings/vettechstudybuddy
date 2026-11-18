"use client";

import { useState } from "react";

export default function ResetForm({ token }: { token: string }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== pw2) return setErr("Those passwords don't match.");
    setBusy(true);
    setErr("");
    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password: pw }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(j.error || "That didn't work.");
      setBusy(false);
      return;
    }
    window.location.href = j.next || "/home";
  }
  return (
    <form className="card" onSubmit={submit}>
      <h1 style={{ fontSize: "1.4rem", marginTop: 0 }}>Set a new password</h1>
      <div className="field">
        <label htmlFor="pw">New password</label>
        <input id="pw" type="password" required minLength={8} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <span className="small muted">At least 8 characters.</span>
      </div>
      <div className="field">
        <label htmlFor="pw2">Type it again</label>
        <input id="pw2" type="password" required autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
      </div>
      {err && (
        <p className="error">
          {err} {err.includes("expired") && <a href="/signin?mode=forgot">Get a new link</a>}
        </p>
      )}
      <button className="btn block" disabled={busy || !token}>
        {busy ? "Saving..." : "Save and sign in"}
      </button>
    </form>
  );
}
