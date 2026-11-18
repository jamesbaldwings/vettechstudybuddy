import { NextResponse } from "next/server";
import { consumeLoginToken, startSession } from "@/lib/auth";
import { clearFailures, passwordProblem, setPassword } from "@/lib/password";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const problem = passwordProblem(b?.password);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  const t = await consumeLoginToken(String(b?.token ?? ""));
  if (!t) return NextResponse.json({ error: "This link has expired or was already used. Request a new one." }, { status: 400 });
  await setPassword(t.lead_id, b.password);
  const e = await db().query<{ email: string }>(`SELECT email FROM leads WHERE id = $1`, [t.lead_id]);
  if (e.rows[0]) await clearFailures(e.rows[0].email);
  // Signing out everywhere else is the safe default after a reset.
  await db().query(`DELETE FROM sessions WHERE lead_id = $1`, [t.lead_id]);
  await startSession(t.lead_id);
  return NextResponse.json({ next: "/home" });
}
