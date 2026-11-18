import { NextResponse } from "next/server";
import { currentLead } from "@/lib/auth";
import { claimInvite } from "@/lib/school";

export async function POST(req: Request) {
  const lead = await currentLead();
  if (!lead) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  const b = await req.json().catch(() => null);
  const r = await claimInvite(String(b?.token ?? ""), lead);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json(r);
}
