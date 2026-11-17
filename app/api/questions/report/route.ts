import { NextResponse } from "next/server";
import { currentLead } from "@/lib/auth";
import { db } from "@/lib/db";

// "Something's off with this question": goes to the owner's review queue.
export async function POST(req: Request) {
  const lead = await currentLead();
  if (!lead) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const b = await req.json().catch(() => null);
  const message = String(b?.message ?? "").trim().slice(0, 2000);
  if (!message) return NextResponse.json({ error: "Tell us what looks wrong." }, { status: 400 });
  const r = await db().query(`INSERT INTO question_reports (lead_id, question_id, message) SELECT $1, id, $3 FROM questions WHERE id = $2`, [
    lead.id,
    String(b?.questionId ?? ""),
    message,
  ]);
  if (!r.rowCount) return NextResponse.json({ error: "Question not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
