"use client";

import { useState } from "react";
import { Buddy } from "@/components/Buddy";

export default function SignInForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const res = await fetch("/api/auth/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, next }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(j.error || "Something went wrong.");
    setSent(true);
  }

  if (sent)
    return (
      <Buddy>
        <p>
          Check your email. I sent a sign-in link to <strong>{email}</strong>. It works once and expires in 30 minutes.
        </p>
        <p className="muted small">Don&apos;t see it? Check spam or promotions, or try again in a minute.</p>
      </Buddy>
    );

  return (
    <div>
      <Buddy>
        <p>Welcome back! Enter your email and I&apos;ll send you a sign-in link. No password needed.</p>
      </Buddy>
      <form className="card" onSubmit={submit}>
        <div className="field">
          <label htmlFor="em">Email</label>
          <input id="em" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {err && <p className="error">{err}</p>}
        <button className="btn block" disabled={busy}>
          {busy ? "Sending..." : "Email me a sign-in link"}
        </button>
      </form>
      <p className="center small muted">
        New here? <a href="/quiz">Take the free diagnostic</a> first. It sets up your account.
      </p>
    </div>
  );
}
