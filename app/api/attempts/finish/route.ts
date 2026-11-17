import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { QUESTIONS } from "@/data/questions";
import { bandFor, scoreAnswers } from "@/lib/scoring";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const token = typeof body?.attemptToken === "string" ? body.attemptToken : "";
  const raw = Array.isArray(body?.answers) ? body.answers : [];
  if (!token || raw.length !== QUESTIONS.length) return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  const answers = raw.map((a: unknown) => (Number.isInteger(a) && (a as number) >= 0 && (a as number) <= 3 ? (a as number) : null));
  const result = scoreAnswers(answers);
  const upd = await db().query(
    `UPDATE attempts SET answers = $1, score = $2, domain_scores = $3, completed_at = now()
     WHERE public_token = $4 AND completed_at IS NULL RETURNING id`,
    [JSON.stringify(answers), result.score, JSON.stringify(result.domainScores), token],
  );
  if (!upd.rowCount) return NextResponse.json({ error: "Attempt not found or already submitted" }, { status: 404 });
  return NextResponse.json({ score: result.score, total: result.total, band: bandFor(result.score) });
}
