"use client";

import { useState } from "react";
import { Buddy } from "@/components/Buddy";
import Turnstile from "@/components/Turnstile";

type Mode = "signin" | "create" | "forgot";

export default function SignInForm({ next, initialMode, siteKey }: { next: string; initialMode: Mode; siteKey: string | null }) {
  const [token, setToken] = useState("");
  const [resetN, setResetN] = useState(0);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [agree, setAgree] = useState(false);
  const [checkIns, setCheckIns] = useState(true);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [noPassword, setNoPassword] = useState(false);

  const go = (m: Mode) => {
    setMode(m);
    setErr("");
    setSent(false);
    setNoPassword(false);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const url = mode === "signin" ? "/api/auth/login" : mode === "create" ? "/api/auth/register" : "/api/auth/forgot";
    const body =
      mode === "signin" ? { email, password, next } : mode === "create" ? { email, password, firstName, agree, checkIns, next } : { email };
    Object.assign(body, { turnstile: token });
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    setResetN((n) => n + 1);
    if (!res.ok) {
      setErr(j.error || "Something went wrong.");
      setNoPassword(!!j.noPassword);
      return;
    }
    if (mode === "forgot") return setSent(true);
    window.location.href = j.next || "/home";
  }

  if (mode === "forgot" && sent)
    return (
      <Buddy>
        <p>
          If there&apos;s an account for <strong>{email}</strong>, I just sent a link to set a new password. It works once and expires in
          30 minutes.
        </p>
        <p className="small">
          <button className="linklike" onClick={() => go("signin")}>
            Back to sign in
          </button>
        </p>
      </Buddy>
    );

  return (
    <div>
      <Buddy>
        <p>
          {mode === "signin" && "Welcome back! Sign in to pick up where you left off."}
          {mode === "create" && "Let's set up your account. It's free, and your progress saves as you study."}
          {mode === "forgot" && "No problem. Enter your email and I'll send you a link to set a new password."}
        </p>
      </Buddy>
      <form className="card" onSubmit={submit}>
        <h1 style={{ fontSize: "1.4rem", marginTop: 0 }}>
          {mode === "signin" ? "Sign in" : mode === "create" ? "Create your account" : "Reset your password"}
        </h1>
        {mode === "create" && (
          <div className="field">
            <label htmlFor="fn">First name</label>
            <input id="fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
          </div>
        )}
        <div className="field">
          <label htmlFor="em">Email</label>
          <input id="em" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {mode !== "forgot" && (
          <div className="field">
            <div className="spread">
              <label htmlFor="pw">{mode === "create" ? "Create a password" : "Password"}</label>
              {mode === "signin" && (
                <button type="button" className="linklike small" onClick={() => go("forgot")}>
                  Forgot password?
                </button>
              )}
            </div>
            <input
              id="pw"
              type="password"
              required
              minLength={mode === "create" ? 8 : undefined}
              autoComplete={mode === "create" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {mode === "create" && <span className="small muted">At least 8 characters.</span>}
          </div>
        )}
        {mode === "create" && (
          <>
            <label className="choice">
              <input type="checkbox" checked={checkIns} onChange={(e) => setCheckIns(e.target.checked)} /> Email me study check-ins before
              and after my VTNE
            </label>
            <label className="choice">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} required /> I agree to the{" "}
              <a href="/terms" target="_blank">
                terms
              </a>
            </label>
          </>
        )}
        {err && (
          <p className="error">
            {err}{" "}
            {noPassword && (
              <button type="button" className="linklike" onClick={() => go("forgot")}>
                Set a password
              </button>
            )}
          </p>
        )}
        <Turnstile siteKey={siteKey} onToken={setToken} reset={resetN} />
        <button className="btn block" disabled={busy || (!!siteKey && !token)}>
          {busy ? "One moment..." : mode === "signin" ? "Sign in" : mode === "create" ? "Create account" : "Email me a reset link"}
        </button>
      </form>
      <p className="center small muted">
        {mode === "signin" ? (
          <>
            New here?{" "}
            <button className="linklike" onClick={() => go("create")}>
              Create an account
            </button>{" "}
            or <a href="/quiz">take the free diagnostic</a> first.
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button className="linklike" onClick={() => go("signin")}>
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  );
}
