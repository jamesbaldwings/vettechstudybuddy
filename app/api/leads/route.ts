import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { newToken } from "@/lib/tokens";
import { addDays, todayISO, upcomingMonths } from "@/lib/dates";
import { LEAD_SELECT, LeadRow, sendOnce, welcomeEmail } from "@/lib/followups";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const attemptToken = typeof body?.attemptToken === "string" ? body.attemptToken : "";
  const email = String(body?.email ?? "").trim().toLowerCase();
  const firstName = String(body?.firstName ?? "").trim().slice(0, 60) || null;
  const consent = body?.consent === true;
  let examDate: string | null = typeof body?.examDate === "string" && body.examDate ? body.examDate : null;
  let targetMonth: string | null = typeof body?.targetMonth === "string" && body.targetMonth ? body.targetMonth : null;

  if (!EMAIL_RE.test(email) || email.length > 200) return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  if (!consent) return NextResponse.json({ error: "Please check the box so I can send your plan." }, { status: 400 });
  const today = todayISO();
  if (examDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(examDate) || examDate < addDays(today, -1) || examDate > addDays(today, 400))
      return NextResponse.json({ error: "That exam date doesn't look right. Pick a date in the next year." }, { status: 400 });
    targetMonth = null;
  } else if (targetMonth) {
    if (!upcomingMonths().some((m) => m.value === targetMonth)) targetMonth = null;
  }
  if (!examDate && !targetMonth) return NextResponse.json({ error: "Add your exam date, or the month you're aiming for." }, { status: 400 });

  const attempt = await db().query(`SELECT id FROM attempts WHERE public_token = $1 AND completed_at IS NOT NULL`, [attemptToken]);
  if (!attempt.rowCount) return NextResponse.json({ error: "Please finish the diagnostic first." }, { status: 400 });

  const lead = await db().query<{ id: string }>(
    `INSERT INTO leads (token, email, first_name, exam_date, target_month, consent_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT ((lower(email))) DO UPDATE SET
       first_name = COALESCE(EXCLUDED.first_name, leads.first_name),
       exam_date = EXCLUDED.exam_date,
       target_month = EXCLUDED.target_month,
       consent_at = now(),
       unsubscribed_at = NULL,
       outcome = CASE WHEN EXCLUDED.exam_date IS DISTINCT FROM leads.exam_date THEN NULL ELSE leads.outcome END,
       updated_at = now()
     RETURNING id`,
    [newToken(), email, firstName, examDate, targetMonth],
  );
  const leadId = lead.rows[0].id;
  await db().query(`UPDATE attempts SET lead_id = $1 WHERE public_token = $2`, [leadId, attemptToken]);

  const row = (await db().query<LeadRow>(`${LEAD_SELECT} WHERE l.id = $1`, [leadId])).rows[0];
  // Welcome email per attempt, so a retaker who redoes the diagnostic gets fresh results.
  await sendOnce(row, `welcome:${attemptToken}`, () => welcomeEmail(row));

  return NextResponse.json({ resultsUrl: `/results/${attemptToken}` });
}
