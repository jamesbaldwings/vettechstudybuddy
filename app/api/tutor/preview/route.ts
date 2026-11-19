import { NextResponse } from "next/server";
import { currentLead, isOwner } from "@/lib/auth";
import { PREVIEW_FREE_COOKIE } from "@/lib/tutor";

// Owners only: see Tutor Mode as a free student would (weekly limit and upgrade prompts). Only ever reduces access.
export async function POST(req: Request) {
  const lead = await currentLead();
  if (!isOwner(lead)) return NextResponse.json({ error: "no" }, { status: 401 });
  const b = await req.json().catch(() => null);
  const res = NextResponse.json({ ok: true, previewFree: !!b?.on });
  res.cookies.set(PREVIEW_FREE_COOKIE, b?.on ? "1" : "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    maxAge: b?.on ? 60 * 60 * 8 : 0,
  });
  return res;
}
