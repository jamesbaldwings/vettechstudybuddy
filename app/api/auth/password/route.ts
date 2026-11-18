import { NextResponse } from "next/server";
import { currentLead } from "@/lib/auth";
import { db } from "@/lib/db";
import { passwordProblem, setPassword, verifyPassword } from "@/lib/password";

// Set or change the password while signed in.
export async function POST(req: Request) {
  const lead = await currentLead();
  if (!lead) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const b = await req.json().catch(() => null);
  const problem = passwordProblem(b?.password);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  const r = await db().query<{ password_hash: string | null }>(`SELECT password_hash FROM leads WHERE id = $1`, [lead.id]);
  const existing = r.rows[0]?.password_hash ?? null;
  if (existing && !(await verifyPassword(String(b?.current ?? ""), existing)))
    return NextResponse.json({ error: "Your current password isn't right." }, { status: 400 });
  await setPassword(lead.id, b.password);
  return NextResponse.json({ ok: true });
}
