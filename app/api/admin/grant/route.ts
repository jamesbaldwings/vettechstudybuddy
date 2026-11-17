import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { recordPurchase } from "@/lib/access";
import { newToken } from "@/lib/tokens";
import { PLANS, PlanId } from "@/config";

// Give a student a pass or voice minutes at no charge (comps, pass guarantee, school seats).
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "no" }, { status: 401 });
  const b = await req.json().catch(() => null);
  const email = String(b?.email ?? "").trim().toLowerCase();
  const plan = b?.plan as PlanId;
  if (!email.includes("@") || !PLANS[plan]) return NextResponse.json({ error: "Email and plan are required." }, { status: 400 });
  const r = await db().query<{ id: string }>(
    `INSERT INTO leads (token, email, consent_at, marketing_ok) VALUES ($1, $2, now(), false)
     ON CONFLICT ((lower(email))) DO UPDATE SET updated_at = now() RETURNING id`,
    [newToken(), email],
  );
  const source = b?.source === "school" ? "school" : "comp";
  await recordPurchase({ leadId: r.rows[0].id, plan, amountCents: 0, source, stripeSessionId: null, note: String(b?.note ?? "").slice(0, 300) || null });
  return NextResponse.json({ ok: true });
}
