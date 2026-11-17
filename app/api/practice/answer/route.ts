import { NextResponse } from "next/server";
import { currentLead } from "@/lib/auth";
import { getAccess } from "@/lib/access";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const lead = await currentLead();
  if (!lead) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const b = await req.json().catch(() => null);
  const chosen = Number(b?.chosen);
  if (!Number.isInteger(chosen) || chosen < 0 || chosen > 3) return NextResponse.json({ error: "Pick an answer." }, { status: 400 });
  const access = await getAccess(lead.id);
  if (access.freePracticeLeft === 0) return NextResponse.json({ limit: true }, { status: 402 });
  const q = await db().query<{ answer: number; explanation: string }>(
    `SELECT answer, explanation FROM questions WHERE id = $1 AND status = 'reviewed'`,
    [String(b?.questionId ?? "")],
  );
  if (!q.rowCount) return NextResponse.json({ error: "Question not found." }, { status: 404 });
  const correct = q.rows[0].answer === chosen;
  await db().query(`INSERT INTO practice_answers (lead_id, question_id, chosen, correct, mode) VALUES ($1, $2, $3, $4, 'practice')`, [
    lead.id,
    b.questionId,
    chosen,
    correct,
  ]);
  return NextResponse.json({
    correct,
    answer: q.rows[0].answer,
    explanation: q.rows[0].explanation,
    freePracticeLeft: access.freePracticeLeft === null ? null : access.freePracticeLeft - 1,
  });
}
