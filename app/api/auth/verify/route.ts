import { NextResponse } from "next/server";
import { consumeLoginToken, startSession } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const token = String(body?.token ?? "");
  const r = token ? await consumeLoginToken(token) : null;
  if (!r) return NextResponse.json({ error: "This link has expired or was already used. Request a new one." }, { status: 400 });
  await startSession(r.lead_id);
  return NextResponse.json({ next: r.next_path || "/home" });
}
