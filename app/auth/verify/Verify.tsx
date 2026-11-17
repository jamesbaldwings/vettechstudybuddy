"use client";

import { useState } from "react";
import { Buddy } from "@/components/Buddy";

// Signing in takes a tap, so email link scanners can't use up the link.
export default function Verify({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function go() {
    setBusy(true);
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(j.error || "That link didn't work.");
      setBusy(false);
      return;
    }
    window.location.href = j.next || "/home";
  }
  return (
    <div>
      <Buddy>
        <p>Ready when you are.</p>
      </Buddy>
      {err ? (
        <p className="error">
          {err} <a href="/signin">Get a new link</a>
        </p>
      ) : (
        <button className="btn" onClick={go} disabled={busy || !token}>
          {busy ? "Signing in..." : "Sign in to Vet Tech Study Buddy"}
        </button>
      )}
    </div>
  );
}
