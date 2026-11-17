"use client";
export default function ResolveButton({ id }: { id: number }) {
  return (
    <button
      className="btn ghost"
      onClick={async () => {
        await fetch("/api/admin/report", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
        window.location.reload();
      }}
    >
      Mark resolved
    </button>
  );
}
