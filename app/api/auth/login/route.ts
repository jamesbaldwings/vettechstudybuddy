import { NextResponse } from "next/server";
import { startSession, safeNext } from "@/lib/auth";
import { checkLogin } from "@/lib/password";

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const email = String(b?.email ?? "").trim().toLowerCase();
  const password = String(b?.password ?? "");
  if (!email || !password) return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  const r = await checkLogin(email, password);
  if (!r.ok) return NextResponse.json({ error: r.error, noPassword: r.noPassword ?? false }, { status: 401 });
  await startSession(r.leadId);
  return NextResponse.json({ next: safeNext(b?.next) });
}
