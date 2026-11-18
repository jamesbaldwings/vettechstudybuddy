"use client";
import { useState } from "react";
import WhyChat from "@/components/WhyChat";
import { BUDDY_NAME } from "@/config";

export default function AskWhy({ questionId }: { questionId: string }) {
  const [open, setOpen] = useState(false);
  return open ? (
    <WhyChat questionId={questionId} onClose={() => setOpen(false)} />
  ) : (
    <button className="btn secondary" style={{ padding: "6px 12px", fontSize: 14 }} onClick={() => setOpen(true)}>
      Ask {BUDDY_NAME} why
    </button>
  );
}
