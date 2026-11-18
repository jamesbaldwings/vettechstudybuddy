"use client";
import { useState } from "react";

export default function RowActions({ schoolId, inviteId, link, noRemove }: { schoolId: string; inviteId: string; link: string; noRemove?: boolean }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  async function post(path: string) {
    setBusy(true);
    const res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ schoolId, inviteId }) });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    return { ok: res.ok, error: j.error as string | undefined };
  }
  return (
    <div className="small" style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
      <button
        className="linkish"
        disabled={busy}
        onClick={async () => {
          const r = await post("/api/school/resend");
          setNote(r.ok ? "Sent" : r.error || "Didn't send");
        }}
      >
        Resend
      </button>
      <button
        className="linkish"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(link);
            setNote("Copied");
          } catch {
            window.prompt("Copy this link:", link);
          }
        }}
      >
        Copy link
      </button>
      {!noRemove && (
        <button
          className="linkish"
          disabled={busy}
          onClick={async () => {
            if (!window.confirm("Remove this student and free the seat? Their link will stop working.")) return;
            const r = await post("/api/school/revoke");
            if (r.ok) window.location.reload();
            else setNote(r.error || "Couldn't remove");
          }}
        >
          Remove
        </button>
      )}
      {note && <span className="muted">{note}</span>}
    </div>
  );
}
