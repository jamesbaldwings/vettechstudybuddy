import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ADMIN_COOKIE, SESSION_COOKIE } from "@/config";

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

// ----- Owner admin: a signed cookie derived from ADMIN_KEY -----
const adminSig = () => createHmac("sha256", process.env.ADMIN_KEY || "").update("vtsb-admin-v1").digest("hex");

export async function isAdmin() {
  if (!process.env.ADMIN_KEY) return false;
  const v = (await cookies()).get(ADMIN_COOKIE)?.value || "";
  const a = Buffer.from(v);
  const b = Buffer.from(adminSig());
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function signInAdmin(key: string) {
  const expected = process.env.ADMIN_KEY || "";
  const a = Buffer.from(key);
  const b = Buffer.from(expected);
  if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) return false;
  (await cookies()).set(ADMIN_COOKIE, adminSig(), {
    httpOnly: true,
    secure: (process.env.APP_URL || "").startsWith("https:"),
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 86400,
  });
  return true;
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
