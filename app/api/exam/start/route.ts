import { NextResponse } from "next/server";
import { currentLead } from "@/lib/auth";
import { getAccess } from "@/lib/access";
import { createExam } from "@/lib/exam";
import { db } from "@/lib/db";

export async function POST() {
  const lead = await currentLead();
  if (!lead) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  if (!(await getAccess(lead.id)).activePass)
    return NextResponse.json({ error: "Practice exams come with a pass.", upgrade: true }, { status: 402 });
  // Resume an exam that's still running instead of starting another.
  const open = await db().query<{ id: string }>(
    `SELECT id FROM practice_exams WHERE lead_id = $1 AND finished_at IS NULL AND started_at + (time_limit_sec || ' seconds')::interval > now() ORDER BY started_at DESC LIMIT 1`,
    [lead.id],
  );
  const id = open.rows[0]?.id ?? (await createExam(lead.id));
  return NextResponse.json({ id });
}
