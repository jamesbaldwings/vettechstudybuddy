import { NextResponse } from "next/server";
import { signInAdmin } from "@/lib/auth";

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  // Slow down guessing.
  await new Promise((r) => setTimeout(r, 400));
  if (!(await signInAdmin(String(b?.key ?? "")))) return NextResponse.json({ error: "no" }, { status: 401 });
  return NextResponse.json({ ok: true });
}
