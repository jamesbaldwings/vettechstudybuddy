import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SESSION_COOKIE } from "@/config";

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const SESSION_DAYS = 60;

export interface Lead {
  id: string;
  token: string;
  email: string;
  first_name: string | null;
  exam_date: string | null;
  target_month: string | null;
  outcome: string | null;
  created_at: Date;
  marketing_ok: boolean;
  unsubscribed_at: Date | null;
  role: string;
}

// Sign-in links last 30 minutes and work once.
export async function createLoginToken(leadId: string, nextPath = "/home") {
  const token = randomBytes(24).toString("base64url");
  await db().query(
    `INSERT INTO login_tokens (token_hash, lead_id, next_path, expires_at) VALUES ($1, $2, $3, now() + interval '30 minutes')`,
    [sha256(token), leadId, safeNext(nextPath)],
  );
  return token;
}

export async function consumeLoginToken(token: string) {
  const r = await db().query<{ lead_id: string; next_path: string | null }>(
    `UPDATE login_tokens SET used_at = now()
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
     RETURNING lead_id, next_path`,
    [sha256(token)],
  );
  return r.rows[0] ?? null;
}

export async function startSession(leadId: string) {
  const id = randomBytes(32).toString("base64url");
  await db().query(`INSERT INTO sessions (id_hash, lead_id, expires_at) VALUES ($1, $2, now() + interval '${SESSION_DAYS} days')`, [
    sha256(id),
    leadId,
  ]);
  await db().query(`UPDATE leads SET last_login_at = now() WHERE id = $1`, [leadId]);
  (await cookies()).set(SESSION_COOKIE, id, {
    httpOnly: true,
    secure: (process.env.APP_URL || "").startsWith("https:"),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function endSession() {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (id) await db().query(`DELETE FROM sessions WHERE id_hash = $1`, [sha256(id)]);
  jar.delete(SESSION_COOKIE);
}

export async function currentLead(): Promise<Lead | null> {
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const r = await db().query<Lead>(
    `SELECT l.* FROM sessions s JOIN leads l ON l.id = s.lead_id WHERE s.id_hash = $1 AND s.expires_at > now()`,
    [sha256(id)],
  );
  return r.rows[0] ?? null;
}

export async function requireLead(nextPath: string): Promise<Lead> {
  const lead = await currentLead();
  if (!lead) redirect(`/signin?next=${encodeURIComponent(safeNext(nextPath))}`);
  return lead;
}

export function safeNext(p: string | null | undefined) {
  return p && p.startsWith("/") && !p.startsWith("//") ? p : "/home";
}

// ----- Owner admin: a signed-in account whose role is "owner" -----
const ownerEmails = () =>
  (process.env.OWNER_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
export const isOwner = (lead: Lead | null) => !!lead && (lead.role === "owner" || ownerEmails().includes(lead.email.toLowerCase()));

export async function currentOwner(): Promise<Lead | null> {
  const lead = await currentLead();
  return isOwner(lead) ? lead : null;
}

export async function isAdmin() {
  return !!(await currentOwner());
}

export async function requireAdmin() {
  const lead = await currentLead();
  if (!lead) redirect("/signin?next=/admin");
  if (!isOwner(lead)) redirect("/home");
  return lead;
}
