"use client";
import { useState } from "react";
import type { PlanId } from "@/config";

export default function BuyButton(p: { plan: PlanId; signedIn: boolean; open: boolean; label: string; secondary?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const cls = `btn${p.secondary ? " secondary" : ""}`;
  if (!p.open) return <button className={cls} disabled>Coming soon</button>;
  if (!p.signedIn)
    return (
      <a className={cls} href={`/signin?next=${encodeURIComponent("/pricing")}`}>
        Sign in to buy
      </a>
    );
  async function buy() {
    setBusy(true);
    setErr("");
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plan: p.plan }),
    });
    const j = await res.json().catch(() => ({}));
    if (res.ok && j.url) window.location.href = j.url;
    else {
      setErr(j.error || "Couldn't start checkout.");
      setBusy(false);
    }
  }
  return (
    <div>
      <button className={cls} onClick={buy} disabled={busy}>
        {busy ? "Opening checkout..." : p.label}
      </button>
      {err && <p className="error small">{err}</p>}
    </div>
  );
}
