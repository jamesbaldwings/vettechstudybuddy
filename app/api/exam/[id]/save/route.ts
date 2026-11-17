import { NextResponse } from "next/server";
import { currentLead } from "@/lib/auth";
import { finishExam, getExam, secondsLeft } from "@/lib/exam";
import { db } from "@/lib/db";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const lead = await currentLead();
  if (!lead) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const e = await getExam((await params).id, lead.id);
  if (!e) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (e.finished_at) return NextResponse.json({ finished: true });
  const b = await req.json().catch(() => null);
  const n = e.question_ids.length;
  const answers = Array.isArray(b?.answers) ? b.answers.slice(0, n).map((a: unknown) => (Number.isInteger(a) && (a as number) >= 0 && (a as number) <= 3 ? a : null)) : e.answers;
  while (answers.length < n) answers.push(null);
  const flagged = Array.isArray(b?.flagged) ? [...new Set(b.flagged.filter((x: unknown) => Number.isInteger(x) && (x as number) >= 0 && (x as number) < n))] : e.flagged;
  // Answers sent within a few seconds of the buzzer still count. Once time is up, the exam is scored.
  const elapsedMs = Date.now() - e.started_at.getTime();
  if (elapsedMs <= (e.time_limit_sec + 15) * 1000)
    await db().query(`UPDATE practice_exams SET answers = $2, flagged = $3 WHERE id = $1 AND finished_at IS NULL`, [
      e.id,
      JSON.stringify(answers),
      JSON.stringify(flagged),
    ]);
  if (secondsLeft(e) <= 0 || b?.finish === true) {
    await finishExam({ ...e, answers: elapsedMs <= (e.time_limit_sec + 15) * 1000 ? answers : e.answers });
    return NextResponse.json({ finished: true });
  }
  return NextResponse.json({ ok: true, secondsLeft: secondsLeft(e) });
}
