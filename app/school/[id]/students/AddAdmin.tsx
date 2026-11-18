"use client";
import { useState } from "react";

export default function AddAdmin({ schoolId }: { schoolId: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  async function add() {
    const res = await fetch("/api/school/admins", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ schoolId, name, email }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg(j.error || "That didn't work.");
    setMsg("Added and emailed their link.");
    setTimeout(() => window.location.reload(), 1000);
  }
  return (
    <div className="row" style={{ marginTop: 10 }}>
      <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ flex: 1 }} />
      <button className="btn secondary" onClick={add} disabled={!email.trim()}>
        Add admin
      </button>
      {msg && <span className="small">{msg}</span>}
    </div>
  );
}
