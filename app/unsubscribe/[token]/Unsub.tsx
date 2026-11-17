"use client";

import { useState } from "react";
import { Buddy } from "@/components/Buddy";

export default function Unsub({ token }: { token: string }) {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    await fetch(`/api/unsubscribe/${token}`, { method: "POST" });
    setDone(true);
    setBusy(false);
  }
  return done ? (
    <Buddy>
      <p>You&apos;re unsubscribed. No more emails from me. Good luck on the exam. I&apos;m rooting for you.</p>
    </Buddy>
  ) : (
    <div>
      <Buddy>
        <p>Want me to stop emailing you? No hard feelings.</p>
      </Buddy>
      <button className="btn" onClick={go} disabled={busy}>
        {busy ? "Unsubscribing..." : "Unsubscribe me"}
      </button>
    </div>
  );
}
