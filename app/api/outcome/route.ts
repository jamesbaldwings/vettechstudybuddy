import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { addDays, todayISO } from "@/lib/dates";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const token = String(body?.token ?? "");
  const result = String(body?.result ?? "");
  const note = String(body?.note ?? "").trim().slice(0, 1000) || null;
  const newDate: string | null = typeof body?.examDate === "string" && body.examDate ? body.examDate : null;
  if (!["passed", "failed", "not_yet"].includes(result)) return NextResponse.json({ error: "Invalid choice" }, { status: 400 });

  const lead = await db().query<{ id: string; exam_date: string | null }>(`SELECT id, exam_date FROM leads WHERE token = $1`, [token]);
  if (!lead.rowCount) return NextResponse.json({ error: "Link not found" }, { status: 404 });
  const { id, exam_date } = lead.rows[0];

  if (newDate) {
    const today = todayISO();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate) || newDate < today || newDate > addDays(today, 400))
      return NextResponse.json({ error: "Pick a date in the next year." }, { status: 400 });
  }

  await db().query(`INSERT INTO outcome_reports (lead_id, result, exam_date, note) VALUES ($1, $2, $3, $4)`, [id, result, exam_date, note]);

  if (result === "passed") {
    await db().query(`UPDATE leads SET outcome = 'passed', outcome_at = now(), updated_at = now() WHERE id = $1`, [id]);
  } else if (result === "failed") {
    // A new date starts a fresh cycle of check-ins for the retake.
    if (newDate)
      await db().query(`UPDATE leads SET outcome = NULL, outcome_at = now(), exam_date = $2, target_month = NULL, updated_at = now() WHERE id = $1`, [id, newDate]);
    else await db().query(`UPDATE leads SET outcome = 'failed', outcome_at = now(), updated_at = now() WHERE id = $1`, [id]);
  } else if (newDate) {
    await db().query(`UPDATE leads SET exam_date = $2, target_month = NULL, outcome = NULL, updated_at = now() WHERE id = $1`, [id, newDate]);
  }
  return NextResponse.json({ ok: true });
}
