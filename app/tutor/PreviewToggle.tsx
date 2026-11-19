"use client";

import { useRouter } from "next/navigation";

// Owners only: flip between owner access and what a free student sees.
export default function PreviewToggle({ on }: { on: boolean }) {
  const router = useRouter();
  return (
    <button
      className="linklike"
      onClick={async () => {
        await fetch("/api/tutor/preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ on: !on }) });
        router.refresh();
      }}
    >
      {on ? "Stop previewing as a free student" : "Preview as a free student"}
    </button>
  );
}
