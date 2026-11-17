import { db } from "@/lib/db";
import { ACTIVATE_WITHIN_DAYS, FREE_DAILY_PRACTICE, FREE_VOICE_MINUTES, PLANS, PlanId } from "@/config";

export interface Purchase {
  id: string;
  lead_id: string;
  plan: PlanId;
  amount_cents: number;
  founding: boolean;
  source: string;
  status: string;
  access_days: number;
  voice_minutes: number;
  activate_by: Date | null;
  activated_at: Date | null;
  expires_at: Date | null;
  created_at: Date;
}

export interface Access {
  activePass: Purchase | null; // started and not expired
  waitingPasses: Purchase[]; // paid, not started yet
  hasPaid: boolean;
  voiceMinutes: number; // balance
  freePracticeLeft: number | null; // null = unlimited
}

export async function voiceBalance(leadId: string) {
  const r = await db().query<{ m: string | null }>(`SELECT sum(minutes) m FROM voice_ledger WHERE lead_id = $1`, [leadId]);
  return Math.max(0, Math.floor(Number(r.rows[0].m ?? 0) * 10) / 10);
}

// Every account gets a few free minutes with Sara, once.
export async function ensureFreeTrial(leadId: string) {
  await db().query(
    `INSERT INTO voice_ledger (lead_id, minutes, reason) VALUES ($1, $2, 'free_trial') ON CONFLICT (lead_id, reason) DO NOTHING`,
    [leadId, FREE_VOICE_MINUTES],
  );
}

export async function getAccess(leadId: string): Promise<Access> {
  await chargeAbandonedSessions(leadId);
  const p = await db().query<Purchase>(
    `SELECT * FROM purchases WHERE lead_id = $1 AND status = 'paid' AND plan <> 'extra_voice' ORDER BY created_at`,
    [leadId],
  );
  const now = Date.now();
  const active = p.rows.filter((x) => x.activated_at && x.expires_at && x.expires_at.getTime() > now);
  const waiting = p.rows.filter((x) => !x.activated_at && (!x.activate_by || x.activate_by.getTime() > now));
  const activePass = active.sort((a, b) => b.expires_at!.getTime() - a.expires_at!.getTime())[0] ?? null;
  let freePracticeLeft: number | null = null;
  if (!activePass) {
    const used = await db().query<{ n: string }>(
      `SELECT count(*) n FROM practice_answers WHERE lead_id = $1 AND mode = 'practice' AND answered_at > date_trunc('day', now())`,
      [leadId],
    );
    freePracticeLeft = Math.max(0, FREE_DAILY_PRACTICE - Number(used.rows[0].n));
  }
  const paid = await db().query(`SELECT 1 FROM purchases WHERE lead_id = $1 AND status = 'paid' LIMIT 1`, [leadId]);
  return {
    activePass,
    waitingPasses: waiting,
    hasPaid: !!paid.rowCount,
    voiceMinutes: await voiceBalance(leadId),
    freePracticeLeft,
  };
}

// Record a paid (or granted) plan. Extra voice minutes are credited right away;
// passes wait until the student presses Start.
export async function recordPurchase(opts: {
  leadId: string;
  plan: PlanId;
  amountCents: number;
  founding?: boolean;
  source?: "stripe" | "comp" | "school";
  stripeSessionId?: string | null;
  stripePaymentIntent?: string | null;
  note?: string | null;
}) {
  const plan = PLANS[opts.plan];
  const r = await db().query<{ id: string }>(
    `INSERT INTO purchases (lead_id, plan, amount_cents, founding, source, stripe_session_id, stripe_payment_intent, access_days, voice_minutes, activate_by, note)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now() + ($10 || ' days')::interval, $11)
     ON CONFLICT (stripe_session_id) DO NOTHING RETURNING id`,
    [
      opts.leadId,
      plan.id,
      opts.amountCents,
      !!opts.founding,
      opts.source ?? "stripe",
      opts.stripeSessionId ?? null,
      opts.stripePaymentIntent ?? null,
      plan.accessDays,
      plan.voiceMinutes,
      String(ACTIVATE_WITHIN_DAYS),
      opts.note ?? null,
    ],
  );
  const id = r.rows[0]?.id;
  if (id && plan.id === "extra_voice") {
    await db().query(`UPDATE purchases SET activated_at = now() WHERE id = $1`, [id]);
    await db().query(`INSERT INTO voice_ledger (lead_id, minutes, reason) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, [
      opts.leadId,
      plan.voiceMinutes,
      `extra:${id}`,
    ]);
  }
  return id ?? null;
}

// "Start my 90 days": starts now, or right after a pass that's already running.
export async function activatePurchase(leadId: string, purchaseId: string) {
  const c = await db().connect();
  try {
    await c.query("BEGIN");
    const p = await c.query<Purchase>(
      `SELECT * FROM purchases WHERE id = $1 AND lead_id = $2 AND status = 'paid' AND activated_at IS NULL AND plan <> 'extra_voice' FOR UPDATE`,
      [purchaseId, leadId],
    );
    const row = p.rows[0];
    if (!row) {
      await c.query("ROLLBACK");
      return null;
    }
    const cur = await c.query<{ e: Date | null }>(
      `SELECT max(expires_at) e FROM purchases WHERE lead_id = $1 AND status = 'paid' AND expires_at > now()`,
      [leadId],
    );
    const start = cur.rows[0].e && cur.rows[0].e.getTime() > Date.now() ? cur.rows[0].e : new Date();
    const expires = new Date(start.getTime() + row.access_days * 86400_000);
    await c.query(`UPDATE purchases SET activated_at = now(), expires_at = $2 WHERE id = $1`, [row.id, expires]);
    await c.query(`INSERT INTO voice_ledger (lead_id, minutes, reason) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, [
      leadId,
      row.voice_minutes,
      `pass:${row.id}`,
    ]);
    await c.query("COMMIT");
    return { ...row, activated_at: new Date(), expires_at: expires };
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}

// Voice sessions are charged when they end. A session the browser never reported ending
// (closed tab, lost signal) is charged the full 10 minutes after 15 minutes.
export async function chargeVoiceSession(sessionId: string, minutes: number) {
  const r = await db().query<{ lead_id: string; mode: string }>(
    `UPDATE voice_sessions SET ended_at = COALESCE(ended_at, now()), minutes_charged = $2
     WHERE id = $1 AND minutes_charged IS NULL RETURNING lead_id, mode`,
    [sessionId, minutes],
  );
  const s = r.rows[0];
  if (!s || s.mode !== "voice" || minutes <= 0) return;
  await db().query(`INSERT INTO voice_ledger (lead_id, minutes, reason) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, [
    s.lead_id,
    -minutes,
    `session:${sessionId}`,
  ]);
}

export async function chargeAbandonedSessions(leadId?: string) {
  const r = await db().query<{ id: string }>(
    `SELECT id FROM voice_sessions WHERE minutes_charged IS NULL AND mode = 'voice' AND started_at < now() - interval '15 minutes'
     ${leadId ? "AND lead_id = $1" : ""}`,
    leadId ? [leadId] : [],
  );
  for (const row of r.rows) await chargeVoiceSession(row.id, 10);
}

export async function foundingSpotsLeft() {
  const { FOUNDING_LIMIT } = await import("@/config");
  const r = await db().query<{ n: string }>(
    `SELECT count(*) n FROM purchases WHERE plan = 'exam_pass' AND founding AND status = 'paid'`,
  );
  return Math.max(0, FOUNDING_LIMIT - Number(r.rows[0].n));
}
