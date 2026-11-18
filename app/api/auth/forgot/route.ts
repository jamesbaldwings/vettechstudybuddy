import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createLoginToken } from "@/lib/auth";
import { sendResetEmail } from "@/lib/accountEmails";

// Emails a one-time link to set a new password. Answers the same way whether or not the email has an account.
export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const email = String(b?.email ?? "").trim().toLowerCase();
  if (!email.includes("@")) return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  const r = await db().query<{ id: string; token: string; first_name: string | null; recent: string }>(
    `SELECT l.id, l.token, l.first_name,
       (SELECT count(*) FROM login_tokens t WHERE t.lead_id = l.id AND t.expires_at > now() - interval '30 minutes') recent
     FROM leads l WHERE lower(l.email) = $1`,
    [email],
  );
  const lead = r.rows[0];
  if (lead && Number(lead.recent) < 5) await sendResetEmail(email, lead.first_name, lead.token, await createLoginToken(lead.id, "/home"));
  return NextResponse.json({ ok: true });
}
