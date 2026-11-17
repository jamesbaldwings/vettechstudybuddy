"use client";
import { useState } from "react";

export default function GrantForm() {
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("retake_pass");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  async function go(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/admin/grant", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, plan, note }),
    });
    const j = await r.json();
    setMsg(r.ok ? `Granted to ${email}. They start it from their study home.` : j.error);
    if (r.ok) setEmail("");
  }
  return (
    <form className="card" onSubmit={go}>
      <h3 style={{ marginTop: 0 }}>Give a free pass or minutes</h3>
      <p className="small muted">For the pass guarantee, comps, or giveaways. Creates the account if needed.</p>
      <div className="row">
        <input type="email" required placeholder="Student email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ flex: 2 }} />
        <select value={plan} onChange={(e) => setPlan(e.target.value)} style={{ flex: 1 }}>
          <option value="retake_pass">Retake Pass (guarantee)</option>
          <option value="exam_pass">Exam Pass</option>
          <option value="final_stretch">Final Stretch</option>
          <option value="extra_voice">60 voice minutes</option>
        </select>
      </div>
      <input placeholder="Note (why)" value={note} onChange={(e) => setNote(e.target.value)} style={{ marginTop: 8 }} />
      <button className="btn" style={{ marginTop: 8 }}>
        Grant
      </button>
      {msg && <p className="small">{msg}</p>}
    </form>
  );
}
