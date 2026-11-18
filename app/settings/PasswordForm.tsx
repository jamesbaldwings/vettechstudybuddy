"use client";
import { useState } from "react";

export default function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [current, setCurrent] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [has, setHas] = useState(hasPassword);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    const res = await fetch("/api/auth/password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ current, password: pw }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg(j.error || "Couldn't save.");
    setMsg("Password saved.");
    setHas(true);
    setCurrent("");
    setPw("");
  }
  return (
    <form className="card" onSubmit={save}>
      <h2 style={{ marginTop: 0 }}>{has ? "Change password" : "Set a password"}</h2>
      {!has && <p className="small muted">Set a password so you can sign in with your email and password.</p>}
      {has && (
        <div className="field">
          <label htmlFor="cur">Current password</label>
          <input id="cur" type="password" required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
      )}
      <div className="field">
        <label htmlFor="npw">New password</label>
        <input id="npw" type="password" required minLength={8} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <span className="small muted">At least 8 characters.</span>
      </div>
      {msg && <p className="small">{msg}</p>}
      <button className="btn block" disabled={busy}>
        {busy ? "Saving..." : "Save password"}
      </button>
    </form>
  );
}
