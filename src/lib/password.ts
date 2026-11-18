import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { db } from "@/lib/db";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;
const N = 16384, R = 8, P = 1, LEN = 64;
export const MIN_PASSWORD = 8;
const MAX_FAILURES = 8;
const LOCK_MINUTES = 15;

export function passwordProblem(pw: unknown): string | null {
  if (typeof pw !== "string" || pw.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (pw.length > 200) return "That password is too long.";
  return null;
}

export async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, LEN, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(pw: string, stored: string | null) {
  if (!stored) return false;
  const [kind, n, r, p, salt, hash] = stored.split("$");
  if (kind !== "scrypt") return false;
  const expected = Buffer.from(hash, "base64");
  const key = await scrypt(pw, Buffer.from(salt, "base64"), expected.length, {
    N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024,
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

export async function setPassword(leadId: string, pw: string) {
  await db().query(`UPDATE leads SET password_hash = $2, updated_at = now() WHERE id = $1`, [leadId, await hashPassword(pw)]);
}

// After several wrong passwords for one email, that email is locked for 15 minutes.
export async function isLocked(email: string) {
  const r = await db().query<{ n: string }>(
    `SELECT count(*) n FROM login_failures WHERE lower(email) = $1 AND at > now() - ($2 || ' minutes')::interval`,
    [email.toLowerCase(), String(LOCK_MINUTES)],
  );
  return Number(r.rows[0].n) >= MAX_FAILURES;
}
export async function recordFailure(email: string) {
  await db().query(`INSERT INTO login_failures (email) VALUES ($1)`, [email.toLowerCase()]);
}
export async function clearFailures(email: string) {
  await db().query(`DELETE FROM login_failures WHERE lower(email) = $1`, [email.toLowerCase()]);
}
export const LOCKED_MESSAGE = `Too many tries. Wait ${LOCK_MINUTES} minutes, or reset your password.`;

// Check an email and password together. Same answer whether the email exists or not.
export async function checkLogin(email: string, pw: string) {
  const e = email.trim().toLowerCase();
  if (await isLocked(e)) return { ok: false as const, error: LOCKED_MESSAGE };
  const r = await db().query<{ id: string; password_hash: string | null }>(`SELECT id, password_hash FROM leads WHERE lower(email) = $1`, [e]);
  const row = r.rows[0];
  // Hash anyway when there is no account, so the response time doesn't reveal which emails exist.
  const good = row ? await verifyPassword(pw, row.password_hash) : (await hashPassword(pw), false);
  if (!good) {
    await recordFailure(e);
    const noPassword = !!row && !row.password_hash;
    return {
      ok: false as const,
      noPassword,
      error: noPassword
        ? "This account doesn't have a password yet. Use \"Forgot password?\" to set one."
        : "That email and password don't match.",
    };
  }
  await clearFailures(e);
  return { ok: true as const, leadId: row.id };
}
