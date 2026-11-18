"use client";
import { useState } from "react";
import { SCHOOL_PACKAGES } from "@/config";

export default function NewSchool() {
  const [f, setF] = useState({ name: "", adminName: "", adminEmail: "", seats: "25", amount: "1500", source: "invoice", note: "" });
  const [msg, setMsg] = useState("");
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));
  async function save() {
    setMsg("");
    const res = await fetch("/api/admin/schools", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(f) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg(j.error || "Didn't save.");
    setMsg("School created. The admin's link was emailed.");
    setTimeout(() => window.location.reload(), 1000);
  }
  return (
    <section className="card">
      <h2 style={{ marginTop: 0 }}>Add a school</h2>
      <div className="row">
        <input placeholder="School name" value={f.name} onChange={set("name")} style={{ flex: 2 }} />
        <input placeholder="Admin name" value={f.adminName} onChange={set("adminName")} />
        <input placeholder="Admin email" type="email" value={f.adminEmail} onChange={set("adminEmail")} style={{ flex: 1 }} />
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <select
          onChange={(e) => {
            const p = SCHOOL_PACKAGES[Number(e.target.value)];
            if (p) setF((x) => ({ ...x, seats: String(p.seats), amount: String(p.priceCents / 100) }));
          }}
          defaultValue="0"
        >
          {SCHOOL_PACKAGES.map((p, i) => (
            <option key={p.seats} value={i}>
              {p.seats}-seat package
            </option>
          ))}
          <option value="-1">Custom</option>
        </select>
        <label className="small">
          Seats <input value={f.seats} onChange={set("seats")} style={{ width: 70 }} />
        </label>
        <label className="small">
          Amount $ <input value={f.amount} onChange={set("amount")} style={{ width: 90 }} />
        </label>
        <select value={f.source} onChange={set("source")}>
          <option value="invoice">Invoice / PO</option>
          <option value="comp">Free (pilot)</option>
        </select>
        <input placeholder="Note (PO #, contact)" value={f.note} onChange={set("note")} style={{ flex: 1 }} />
        <button className="btn" onClick={save} disabled={!f.name.trim()}>
          Create
        </button>
      </div>
      {msg && <p className="small">{msg}</p>}
    </section>
  );
}
