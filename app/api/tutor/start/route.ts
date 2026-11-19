import { NextResponse } from "next/server";
import { currentLead } from "@/lib/auth";
import { startTutorSession } from "@/lib/tutor";

export const dynamic = "force-dynamic";

// Start a Tutor Mode session: subject, topic, optional pasted notes, text or voice.
export async function POST(req: Request) {
  const lead = await currentLead();
  if (!lead) return NextResponse.json({ error: "Sign in to work with Sara.", signin: true }, { status: 401 });
  const b = await req.json().catch(() => null);
  const r = await startTutorSession(lead, {
    subject: String(b?.subject ?? ""),
    topic: String(b?.topic ?? ""),
    material: typeof b?.material === "string" ? b.material : "",
    channel: String(b?.channel ?? "text"),
  });
  if (!r.ok) return NextResponse.json({ error: r.error, upgrade: "upgrade" in r ? r.upgrade : false }, { status: "upgrade" in r ? 402 : 400 });
  return NextResponse.json({ id: r.id });
}
