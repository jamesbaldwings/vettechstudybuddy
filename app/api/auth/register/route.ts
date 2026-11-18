import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { newToken } from "@/lib/tokens";
import { startSession, safeNext } from "@/lib/auth";
import { ensureFreeTrial } from "@/lib/access";
import { hashPassword, passwordProblem } from "@/lib/password";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Create an account without taking the diagnostic first.
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const email = String(b?.email ?? "").trim().toLowerCase();
  const firstName = String(b?.firstName ?? "").trim().slice(0, 60) || null;
  if (!EMAIL_RE.test(email) || email.length > 200) return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  const problem = passwordProblem(b?.password);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  if (b?.agree !== true) return NextResponse.json({ error: "Please agree to the terms to create an account." }, { status: 400 });
  const r = await db().query<{ id: string }>(
    `INSERT INTO leads (token, email, first_name, consent_at, marketing_ok, password_hash) VALUES ($1, $2, $3, now(), $4, $5)
     ON CONFLICT ((lower(email))) DO NOTHING RETURNING id`,
    [newToken(), email, firstName, b?.checkIns === true, await hashPassword(b.password)],
  );
  if (!r.rowCount)
    return NextResponse.json({ error: "There's already an account with that email. Sign in instead.", exists: true }, { status: 409 });
  await ensureFreeTrial(r.rows[0].id);
  await startSession(r.rows[0].id);
  return NextResponse.json({ next: safeNext(b?.next) });
}
