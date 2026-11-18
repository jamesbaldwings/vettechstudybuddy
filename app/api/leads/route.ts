import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { newToken } from "@/lib/tokens";
import { addDays, todayISO, upcomingMonths } from "@/lib/dates";
import { LEAD_SELECT, LeadRow, sendOnce, welcomeEmail } from "@/lib/followups";
import { currentLead, startSession } from "@/lib/auth";
import { checkLogin, hashPassword, passwordProblem } from "@/lib/password";
import { QUESTIONS } from "@/data/questions";
import { ensureFreeTrial } from "@/lib/access";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const attemptToken =
    typeof body?.attemptToken === "string" ? body.attemptToken : "";
  const email = String(body?.email ?? "")
    .trim()
    .toLowerCase();
  const firstName =
    String(body?.firstName ?? "")
      .trim()
      .slice(0, 60) || null;
  const consent = body?.consent === true;
  let examDate: string | null =
    typeof body?.examDate === "string" && body.examDate ? body.examDate : null;
  let targetMonth: string | null =
    typeof body?.targetMonth === "string" && body.targetMonth
      ? body.targetMonth
      : null;

  if (!EMAIL_RE.test(email) || email.length > 200)
    return NextResponse.json(
      { error: "Please enter a valid email." },
      { status: 400 },
    );
  if (!consent)
    return NextResponse.json(
      { error: "Please check the box so I can send your plan." },
      { status: 400 },
    );
  const today = todayISO();
  if (examDate) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(examDate) ||
      examDate < addDays(today, -1) ||
      examDate > addDays(today, 400)
    )
      return NextResponse.json(
        {
          error:
            "That exam date doesn't look right. Pick a date in the next year.",
        },
        { status: 400 },
      );
    targetMonth = null;
  } else if (targetMonth) {
    if (!upcomingMonths().some((m) => m.value === targetMonth))
      targetMonth = null;
  }
  if (!examDate && !targetMonth)
    return NextResponse.json(
      { error: "Add your exam date, or the month you're aiming for." },
      { status: 400 },
    );

  const attempt = await db().query(
    `SELECT id FROM attempts WHERE public_token = $1 AND completed_at IS NOT NULL`,
    [attemptToken],
  );
  if (!attempt.rowCount)
    return NextResponse.json(
      { error: "Please finish the diagnostic first." },
      { status: 400 },
    );

  let signedIn = await currentLead();
  const existing = await db().query<{ id: string }>(
    `SELECT id FROM leads WHERE lower(email) = $1`,
    [email],
  );
  const password = typeof body?.password === "string" ? body.password : "";
  if (existing.rowCount && signedIn?.id !== existing.rows[0].id) {
    // The email already has an account: the student signs in with their password to save these results.
    // Nobody can change or enter someone else's account by typing their email.
    if (!password)
      return NextResponse.json(
        {
          error:
            "You already have an account with that email. Enter your password to save these results.",
          existingAccount: true,
        },
        { status: 409 },
      );
    const r = await checkLogin(email, password);
    if (!r.ok)
      return NextResponse.json(
        {
          error: r.error,
          existingAccount: true,
          noPassword: r.noPassword ?? false,
        },
        { status: 401 },
      );
    await startSession(r.leadId);
    signedIn = { id: r.leadId } as typeof signedIn;
  } else if (!existing.rowCount) {
    const problem = passwordProblem(password);
    if (problem)
      return NextResponse.json(
        { error: `Create a password: ${problem.toLowerCase()}` },
        { status: 400 },
      );
  }
  const passwordHash = !existing.rowCount ? await hashPassword(password) : null;
  const lead = await db().query<{ id: string; created: boolean }>(
    `INSERT INTO leads (token, email, first_name, exam_date, target_month, consent_at, marketing_ok, password_hash)
     VALUES ($1, $2, $3, $4, $5, now(), true, $6)
     ON CONFLICT ((lower(email))) DO UPDATE SET
       first_name = COALESCE(EXCLUDED.first_name, leads.first_name),
       exam_date = EXCLUDED.exam_date,
       target_month = EXCLUDED.target_month,
       consent_at = now(),
       unsubscribed_at = NULL,
       marketing_ok = true,
       outcome = CASE WHEN EXCLUDED.exam_date IS DISTINCT FROM leads.exam_date THEN NULL ELSE leads.outcome END,
       updated_at = now()
     RETURNING id, (xmax = 0) AS created`,
    [newToken(), email, firstName, examDate, targetMonth, passwordHash],
  );
  const mayUpdate = true;
  const leadId = lead.rows[0].id;
  await ensureFreeTrial(leadId);
  if (mayUpdate) {
    await db().query(
      `UPDATE attempts SET lead_id = $1 WHERE public_token = $2`,
      [leadId, attemptToken],
    );
    // Save the diagnostic answers so readiness and Sara can build on them.
    const a = await db().query<{ answers: (number | null)[] }>(
      `SELECT answers FROM attempts WHERE public_token = $1`,
      [attemptToken],
    );
    const answers = a.rows[0]?.answers ?? [];
    const ids = QUESTIONS.map((q) => q.id);
    await db().query(
      `INSERT INTO practice_answers (lead_id, question_id, chosen, correct, mode)
     SELECT $1, q.id, x.chosen, x.chosen IS NOT DISTINCT FROM q.answer AND x.chosen IS NOT NULL, 'diagnostic'
     FROM unnest($2::text[], $3::int[]) AS x(qid, chosen) JOIN questions q ON q.id = x.qid`,
      [leadId, ids, ids.map((_, i) => answers[i] ?? null)],
    );
  }
  // New accounts are signed in right away; existing ones were signed in by their password above.
  const signInSent = false;
  if (lead.rows[0].created || signedIn?.id !== leadId)
    await startSession(leadId);

  const row = (
    await db().query<LeadRow>(`${LEAD_SELECT} WHERE l.id = $1`, [leadId])
  ).rows[0];
  // Welcome email per attempt, so a retaker who redoes the diagnostic gets fresh results.
  await sendOnce(row, `welcome:${attemptToken}`, () => welcomeEmail(row));

  return NextResponse.json({
    resultsUrl: `/results/${attemptToken}`,
    signInSent,
  });
}
