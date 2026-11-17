"use client";
import { useState } from "react";

export default function AdminLogin() {
  const [key, setKey] = useState("");
  const [err, setErr] = useState("");
  async function go(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key }) });
    if (r.ok) window.location.href = "/admin";
    else setErr("That key didn't work.");
  }
  return (
    <form className="card" onSubmit={go}>
      <h1 style={{ fontSize: "1.4rem" }}>Owner sign-in</h1>
      <div className="field">
        <label htmlFor="k">Admin key</label>
        <input id="k" type="password" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="current-password" />
      </div>
      {err && <p className="error">{err}</p>}
      <button className="btn">Sign in</button>
    </form>
  );
}
