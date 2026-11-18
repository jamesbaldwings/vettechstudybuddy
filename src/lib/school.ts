import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { isOwner, Lead } from "@/lib/auth";
import { recordPurchase } from "@/lib/access";
import { sendSchoolInviteEmail } from "@/lib/accountEmails";

export interface School {
  id: string;
  name: string;
  note: string | null;
  created_at: Date;
}
export interface Invite {
  id: string;
  school_id: string;
  kind: "student" | "admin";
  email: string;
  name: string | null;
  token: string;
  created_at: Date;
  used_by: string | null;
  used_at: Date | null;
  revoked_at: Date | null;
  purchase_id: string | null;
  sent_count: number;
  last_sent_at: Date | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const newInviteToken = () => randomBytes(18).toString("base64url");

export async function getSchool(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  return (await db().query<School>(`SELECT * FROM schools WHERE id = $1`, [id])).rows[0] ?? null;
}

// Schools this account administers (owners can see every school).
export async function schoolsFor(lead: Lead) {
  if (isOwner(lead)) return (await db().query<School>(`SELECT * FROM schools ORDER BY name`)).rows;
  return (
    await db().query<School>(
      `SELECT s.* FROM schools s JOIN school_invites i ON i.school_id = s.id
       WHERE i.kind = 'admin' AND i.used_by = $1 AND i.revoked_at IS NULL ORDER BY s.name`,
      [lead.id],
    )
  ).rows;
}

export async function canManage(lead: Lead | null, schoolId: string) {
  if (!lead) return false;
  if (isOwner(lead)) return true;
  const r = await db().query(
    `SELECT 1 FROM school_invites WHERE school_id = $1 AND kind = 'admin' AND used_by = $2 AND revoked_at IS NULL`,
    [schoolId, lead.id],
  );
  return !!r.rowCount;
}

export async function seatSummary(schoolId: string) {
  const r = await db().query<{ total: string; assigned: string; claimed: string }>(
    `SELECT (SELECT coalesce(sum(seats), 0) FROM school_seat_orders WHERE school_id = $1) total,
            (SELECT count(*) FROM school_invites WHERE school_id = $1 AND kind = 'student' AND revoked_at IS NULL) assigned,
            (SELECT count(*) FROM school_invites WHERE school_id = $1 AND kind = 'student' AND used_at IS NOT NULL) claimed`,
    [schoolId],
  );
  const total = Number(r.rows[0].total);
  const assigned = Number(r.rows[0].assigned);
  return { total, assigned, claimed: Number(r.rows[0].claimed), available: Math.max(0, total - assigned) };
}

// Parse "Name, email" or "email" lines (or comma/semicolon-separated emails).
export function parseRoster(text: string) {
  const out: { email: string; name: string | null }[] = [];
  const bad: string[] = [];
  for (const raw of text.split(/\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const emails = line.match(/[^\s,;<>"]+@[^\s,;<>"]+/g) ?? [];
    if (emails.length === 1) {
      const name = line.replace(emails[0], "").replace(/[<>,;"\t]/g, " ").replace(/\s+/g, " ").trim() || null;
      (EMAIL_RE.test(emails[0]) ? out.push({ email: emails[0].toLowerCase(), name: name?.slice(0, 80) ?? null }) : bad.push(line));
    } else if (emails.length > 1) {
      for (const e of emails) (EMAIL_RE.test(e) ? out.push({ email: e.toLowerCase(), name: null }) : bad.push(e));
    } else bad.push(line);
  }
  const seen = new Set<string>();
  return { students: out.filter((s) => (seen.has(s.email) ? false : (seen.add(s.email), true))), bad };
}

// Add students to a school's roster, one seat each. All or nothing if seats run short.
export async function addStudents(schoolId: string, by: string, list: { email: string; name: string | null }[]) {
  const c = await db().connect();
  try {
    await c.query("BEGIN");
    await c.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [schoolId]);
    const existing = await c.query<{ e: string }>(
      `SELECT lower(email) e FROM school_invites WHERE school_id = $1 AND kind = 'student' AND revoked_at IS NULL`,
      [schoolId],
    );
    const have = new Set(existing.rows.map((r) => r.e));
    const fresh = list.filter((s) => !have.has(s.email));
    const seats = await c.query<{ total: string; assigned: string }>(
      `SELECT (SELECT coalesce(sum(seats), 0) FROM school_seat_orders WHERE school_id = $1) total,
              (SELECT count(*) FROM school_invites WHERE school_id = $1 AND kind = 'student' AND revoked_at IS NULL) assigned`,
      [schoolId],
    );
    const available = Number(seats.rows[0].total) - Number(seats.rows[0].assigned);
    if (fresh.length > available) {
      await c.query("ROLLBACK");
      return { ok: false as const, error: `You have ${Math.max(0, available)} open seats and tried to add ${fresh.length} new students. Add seats or shorten the list.`, available };
    }
    const ids: string[] = [];
    for (const s of fresh)
      ids.push(
        (
          await c.query<{ id: string }>(
            `INSERT INTO school_invites (school_id, kind, email, name, token, created_by) VALUES ($1, 'student', $2, $3, $4, $5) RETURNING id`,
            [schoolId, s.email, s.name, newInviteToken(), by],
          )
        ).rows[0].id,
      );
    await c.query("COMMIT");
    for (const id of ids) await sendInvite(id, false).catch((e) => console.error("invite email", e));
    return { ok: true as const, added: fresh.length, skipped: list.length - fresh.length };
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}

export async function inviteByToken(token: string) {
  if (!/^[A-Za-z0-9_-]{10,60}$/.test(token)) return null;
  const r = await db().query<Invite & { school_name: string }>(
    `SELECT i.*, s.name school_name FROM school_invites i JOIN schools s ON s.id = i.school_id WHERE i.token = $1`,
    [token],
  );
  return r.rows[0] ?? null;
}

// Use a join link. Student links put a school Exam Pass in the account (it starts when the student presses Start).
// Admin links make the account a school admin. Each link works once.
export async function claimInvite(token: string, lead: Lead) {
  const c = await db().connect();
  try {
    await c.query("BEGIN");
    const r = await c.query<Invite & { school_name: string }>(
      `SELECT i.*, s.name school_name FROM school_invites i JOIN schools s ON s.id = i.school_id WHERE i.token = $1 FOR UPDATE OF i`,
      [token],
    );
    const inv = r.rows[0];
    if (!inv || inv.revoked_at) {
      await c.query("ROLLBACK");
      return { ok: false as const, error: "This link is no longer active. Ask your school for a new one." };
    }
    if (inv.used_at) {
      await c.query("ROLLBACK");
      return inv.used_by === lead.id
        ? { ok: true as const, kind: inv.kind, schoolName: inv.school_name, already: true }
        : { ok: false as const, error: "This link has already been used. Each link works once." };
    }
    if (inv.kind === "student") {
      const dup = await c.query(
        `SELECT 1 FROM school_invites WHERE school_id = $1 AND kind = 'student' AND used_by = $2`,
        [inv.school_id, lead.id],
      );
      if (dup.rowCount) {
        await c.query("ROLLBACK");
        return { ok: false as const, error: "Your account already has a pass from this school." };
      }
    }
    await c.query(`UPDATE school_invites SET used_by = $2, used_at = now() WHERE id = $1`, [inv.id, lead.id]);
    await c.query("COMMIT");
    if (inv.kind === "student") {
      const pid = await recordPurchase({
        leadId: lead.id,
        plan: "exam_pass",
        amountCents: 0,
        source: "school",
        note: `School seat: ${inv.school_name}`,
      });
      await db().query(`UPDATE purchases SET school_id = $2 WHERE id = $1`, [pid, inv.school_id]);
      await db().query(`UPDATE school_invites SET purchase_id = $2 WHERE id = $1`, [inv.id, pid]);
    }
    return { ok: true as const, kind: inv.kind, schoolName: inv.school_name, already: false };
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

export async function revokeInvite(schoolId: string, inviteId: string) {
  const r = await db().query(
    `UPDATE school_invites SET revoked_at = now() WHERE id = $1 AND school_id = $2 AND used_at IS NULL AND revoked_at IS NULL`,
    [inviteId, schoolId],
  );
  return !!r.rowCount;
}

export async function createSchool(opts: { name: string; note?: string | null; seats: number; amountCents: number; source: "invoice" | "comp"; adminEmail?: string | null; adminName?: string | null; by: string }) {
  const s = await db().query<{ id: string }>(`INSERT INTO schools (name, note) VALUES ($1, $2) RETURNING id`, [opts.name, opts.note ?? null]);
  const id = s.rows[0].id;
  if (opts.seats > 0) await addSeats(id, opts.seats, opts.amountCents, opts.source, null, opts.note ?? null);
  if (opts.adminEmail) await addAdminInvite(id, opts.adminEmail, opts.adminName ?? null, opts.by);
  return id;
}

export async function addSeats(schoolId: string, seats: number, amountCents: number, source: string, stripeSessionId: string | null, note: string | null) {
  await db().query(
    `INSERT INTO school_seat_orders (school_id, seats, amount_cents, source, stripe_session_id, note) VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (stripe_session_id) DO NOTHING`,
    [schoolId, seats, amountCents, source, stripeSessionId, note],
  );
}

export const RESEND_WAIT_MINUTES = 5;
export const RESEND_MAX = 10;

// Email a join link. Resending sends the SAME link (nothing changes, no seat is used), only while it's unclaimed.
export async function sendInvite(inviteId: string, resend: boolean) {
  const r = await db().query<Invite & { school_name: string }>(
    `SELECT i.*, s.name school_name FROM school_invites i JOIN schools s ON s.id = i.school_id WHERE i.id = $1`,
    [inviteId],
  );
  const inv = r.rows[0];
  if (!inv) return { ok: false as const, error: "Not found." };
  if (inv.revoked_at) return { ok: false as const, error: "That link was removed." };
  if (inv.used_at) return { ok: false as const, error: "This student already joined, so there's nothing to resend." };
  if (resend) {
    if (inv.sent_count >= RESEND_MAX) return { ok: false as const, error: "This link has been sent the maximum number of times. Copy the link and send it yourself." };
    if (inv.last_sent_at && Date.now() - inv.last_sent_at.getTime() < RESEND_WAIT_MINUTES * 60_000)
      return { ok: false as const, error: `Sent a moment ago. You can resend again in a few minutes.` };
  }
  const sent = await sendSchoolInviteEmail(inv.email, inv.name, inv.school_name, inv.token, inv.kind, resend);
  if (sent.status === "error") return { ok: false as const, error: "The email didn't go through. Copy the link and send it yourself." };
  await db().query(`UPDATE school_invites SET sent_count = sent_count + 1, last_sent_at = now() WHERE id = $1`, [inv.id]);
  return { ok: true as const };
}

export async function addAdminInvite(schoolId: string, email: string, name: string | null, by: string) {
  const e = email.trim().toLowerCase();
  if (!EMAIL_RE.test(e)) return null;
  const r = await db().query<{ token: string }>(
    `INSERT INTO school_invites (school_id, kind, email, name, token, created_by) VALUES ($1, 'admin', $2, $3, $4, $5)
     ON CONFLICT (school_id, kind, lower(email)) WHERE revoked_at IS NULL DO UPDATE SET name = COALESCE(EXCLUDED.name, school_invites.name)
     RETURNING id, token, used_at`,
    [schoolId, e, name, newInviteToken(), by],
  );
  const row = r.rows[0] as unknown as { id: string; token: string; used_at: Date | null };
  if (!row.used_at) await sendInvite(row.id, false).catch((err) => console.error("admin invite email", err));
  return row.token;
}
