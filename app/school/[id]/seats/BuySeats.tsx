"use client";
import { useState } from "react";
import { money, SCHOOL_SEAT_BLOCK, schoolSeatPrice } from "@/config";

export default function BuySeats({ schoolId }: { schoolId: string }) {
  const [seats, setSeats] = useState(SCHOOL_SEAT_BLOCK);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const unit = schoolSeatPrice(seats);
  async function buy() {
    setBusy(true);
    setErr("");
    const res = await fetch("/api/school/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ schoolId, seats }) });
    const j = await res.json().catch(() => ({}));
    if (res.ok && j.url) return void (window.location.href = j.url);
    setErr(j.error || "Checkout didn't open.");
    setBusy(false);
  }
  return (
    <div className="row" style={{ alignItems: "center", marginTop: 12 }}>
      <select value={seats} onChange={(e) => setSeats(Number(e.target.value))}>
        {Array.from({ length: 30 }, (_, i) => (i + 1) * SCHOOL_SEAT_BLOCK).map((n) => (
          <option key={n} value={n}>
            {n} seats
          </option>
        ))}
      </select>
      <span>
        {money(unit)} each · <strong>{money(unit * seats)}</strong>
      </span>
      <button className="btn" onClick={buy} disabled={busy}>
        {busy ? "Opening checkout..." : "Buy seats"}
      </button>
      {err && <p className="error">{err}</p>}
    </div>
  );
}
