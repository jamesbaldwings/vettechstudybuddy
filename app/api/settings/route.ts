import { NextResponse } from "next/server";
import { currentLead } from "@/lib/auth";
import { db } from "@/lib/db";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-\d{2}-01$/;

export async function POST(req: Request) {
  const lead = await currentLead();
  if (!lead) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const b = await req.json().catch(() => null);
  const firstName = String(b?.firstName ?? "").trim().slice(0, 60) || null;
  let examDate: string | null = null;
  let targetMonth: string | null = null;
  if (b?.dateMode === "exact") {
    if (!ISO.test(b?.examDate ?? "")) return NextResponse.json({ error: "Pick your exam date." }, { status: 400 });
    examDate = b.examDate;
  } else if (b?.dateMode === "month") {
    if (!MONTH.test(b?.targetMonth ?? "")) return NextResponse.json({ error: "Pick a month." }, { status: 400 });
    targetMonth = b.targetMonth;
  }
  const marketingOk = !!b?.checkIns;
  await db().query(
    `UPDATE leads SET first_name = $2, exam_date = $3, target_month = $4, marketing_ok = $5,
       unsubscribed_at = CASE WHEN $5 THEN NULL ELSE unsubscribed_at END, updated_at = now() WHERE id = $1`,
    [lead.id, firstName, examDate, targetMonth, marketingOk],
  );
  return NextResponse.json({ ok: true });
}
