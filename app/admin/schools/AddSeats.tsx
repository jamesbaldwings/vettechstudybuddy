"use client";
import { useState } from "react";

export default function AddSeats({ schoolId }: { schoolId: string }) {
  const [seats, setSeats] = useState("10");
  const [amount, setAmount] = useState("");
  const [msg, setMsg] = useState("");
  async function add() {
    const res = await fetch("/api/admin/schools/seats", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ schoolId, seats: Number(seats), amount: Number(amount || 0), source: amount ? "invoice" : "comp" }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg(j.error || "Didn't save");
    window.location.reload();
  }
  return (
    <div className="row small" style={{ flexWrap: "nowrap" }}>
      <input value={seats} onChange={(e) => setSeats(e.target.value)} style={{ width: 50 }} aria-label="Seats" />
      <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="$ (blank = free)" style={{ width: 110 }} aria-label="Amount" />
      <button className="btn secondary" style={{ padding: "4px 10px" }} onClick={add}>
        Add
      </button>
      {msg && <span>{msg}</span>}
    </div>
  );
}
