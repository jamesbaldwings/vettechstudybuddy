import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { newToken } from "@/lib/tokens";
import { createLoginToken, safeNext } from "@/lib/auth";
import { sendSignInEmail } from "@/lib/accountEmails";
import { ensureFreeTrial } from "@/lib/access";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Emails a one-time sign-in link. Creates the account if it's new.
// Always answers the same way, so it doesn't reveal who has an account.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const next = safeNext(body?.next);
  if (!EMAIL_RE.test(email) || email.length > 200) return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });

  // Light rate limit: at most 5 links per email per hour.
  const recent = await db().query<{ n: string }>(
    `SELECT count(*) n FROM login_tokens t JOIN leads l ON l.id = t.lead_id
     WHERE lower(l.email) = $1 AND t.expires_at > now() - interval '30 minutes'`,
    [email],
  );
  if (Number(recent.rows[0].n) >= 5) return NextResponse.json({ ok: true });

  const r = await db().query<{ id: string; token: string; first_name: string | null }>(
    `INSERT INTO leads (token, email, consent_at, marketing_ok) VALUES ($1, $2, now(), false)
     ON CONFLICT ((lower(email))) DO UPDATE SET updated_at = now()
     RETURNING id, token, first_name`,
    [newToken(), email],
  );
  const lead = r.rows[0];
  await ensureFreeTrial(lead.id);
  const t = await createLoginToken(lead.id, next);
  await sendSignInEmail(email, lead.first_name, lead.token, t);
  return NextResponse.json({ ok: true });
}
