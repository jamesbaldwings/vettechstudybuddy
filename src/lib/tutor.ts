import { cookies } from "next/headers";
import type { PoolClient } from "pg";
import { db } from "@/lib/db";
import { isOwner, Lead } from "@/lib/auth";
import { getAccess } from "@/lib/access";
import {
  BUDDY_NAME,
  SUBJECTS,
  subjectById,
  TUTOR_FREE_PER_WEEK,
  TUTOR_MATERIAL_MAX,
  TUTOR_ON_TRACK_TOPICS,
  TUTOR_REOPEN_HOURS,
  TUTOR_START_REUSE_MINUTES,
} from "@/config";

export const PREVIEW_FREE_COOKIE = "vtsb_preview_free";

export interface TutorSession {
  id: string;
  lead_id: string;
  exam: string;
  subject: string;
  topic: string;
  topic_id: string | null;
  material: string | null;
  channel: "text" | "voice";
  free: boolean;
  checks_passed: number;
  checks_failed: number;
  mastered: boolean | null;
  recap: string | null;
  struggled: string[];
  related: string[];
  practice: { q: string; a: string | null }[];
  transcript: { who: "student" | "sara"; text: string; at?: string }[];
  started_at: Date;
  last_activity_at: Date;
  ended_at: Date | null;
}

export interface TutorAccess {
  unlimited: boolean;
  via: "pass" | "semester" | "school" | "owner" | "free";
  freeLeft: number; // sessions left this week on the free allowance (only meaningful when !unlimited)
  freePerWeek: number;
  previewingFree: boolean; // owner is looking at the site as a free student
}

// Students whose school seat is claimed get Tutor Mode, even before they start their 90 days.
export async function isSchoolStudent(leadId: string) {
  const r = await db().query(
    `SELECT 1 FROM school_invites WHERE kind = 'student' AND used_by = $1 AND revoked_at IS NULL LIMIT 1`,
    [leadId],
  );
  return !!r.rowCount;
}

export async function previewingFree(lead: Lead) {
  if (!isOwner(lead)) return false;
  return (await cookies()).get(PREVIEW_FREE_COOKIE)?.value === "1";
}

// Free sessions used since Monday (Central time).
async function freeUsedThisWeek(leadId: string, q: Pick<PoolClient, "query"> = db()) {
  const r = await q.query<{ n: string }>(
    `SELECT count(*) n FROM tutor_sessions WHERE lead_id = $1 AND free
       AND started_at >= (date_trunc('week', now() AT TIME ZONE 'America/Chicago') AT TIME ZONE 'America/Chicago')`,
    [leadId],
  );
  return Number(r.rows[0].n);
}

export async function tutorAccess(lead: Lead): Promise<TutorAccess> {
  const preview = await previewingFree(lead);
  const base = { freePerWeek: TUTOR_FREE_PER_WEEK, previewingFree: preview };
  const freeLeft = Math.max(0, TUTOR_FREE_PER_WEEK - (await freeUsedThisWeek(lead.id)));
  if (!preview) {
    if (isOwner(lead)) return { ...base, unlimited: true, via: "owner", freeLeft };
    const access = await getAccess(lead.id);
    if (access.activePass) return { ...base, unlimited: true, via: "pass", freeLeft };
    if (access.tutorPass) return { ...base, unlimited: true, via: "semester", freeLeft };
    if (await isSchoolStudent(lead.id)) return { ...base, unlimited: true, via: "school", freeLeft };
  }
  return { ...base, unlimited: false, via: "free", freeLeft };
}

const cleanTopic = (t: string) => t.replace(/\s+/g, " ").trim().slice(0, 120);

// Start a tutoring session. Free accounts use one of their weekly sessions.
export async function startTutorSession(lead: Lead, input: { subject: string; topic: string; material?: string; channel: string }) {
  const subject = subjectById(input.subject);
  if (!subject) return { ok: false as const, error: "Pick a course or subject first." };
  const topic = cleanTopic(input.topic || "");
  if (topic.length < 2) return { ok: false as const, error: "Tell Sara which topic you want to work on." };
  const material = (input.material || "").trim().slice(0, TUTOR_MATERIAL_MAX) || null;
  const channel = input.channel === "voice" ? "voice" : "text";

  const access = await tutorAccess(lead);
  const capMessage = `That's your ${access.freePerWeek} free tutor sessions this week. They reset Monday, or a Semester Pass gives you unlimited Tutor Mode.`;

  // One start per student at a time: the lock makes the weekly count and the insert atomic, so two requests
  // arriving together (double tap, two tabs, a retry) can't both slip under the free limit.
  const c = await db().connect();
  try {
    await c.query("BEGIN");
    await c.query(`SELECT pg_advisory_xact_lock(hashtext('tutor_start:' || $1))`, [lead.id]);

    // Same subject, topic and channel started in the last few minutes and never used: hand that one back
    // instead of charging another free session (a student retrying after a dropped connection, for example).
    const recent = await c.query<{ id: string }>(
      `SELECT id FROM tutor_sessions
        WHERE lead_id = $1 AND subject = $2 AND lower(topic) = lower($3) AND channel = $4
          AND ended_at IS NULL AND jsonb_array_length(transcript) = 0
          AND started_at > now() - make_interval(mins => $5)
        ORDER BY started_at DESC LIMIT 1`,
      [lead.id, subject.id, topic, channel, TUTOR_START_REUSE_MINUTES],
    );
    if (recent.rows[0]) {
      await c.query("COMMIT");
      return { ok: true as const, id: recent.rows[0].id, reused: true };
    }

    if (!access.unlimited && TUTOR_FREE_PER_WEEK - (await freeUsedThisWeek(lead.id, c)) <= 0) {
      await c.query("ROLLBACK");
      return { ok: false as const, upgrade: true, error: capMessage };
    }

    const t = await c.query<{ id: string }>(
      `INSERT INTO topics (exam, subject, name) VALUES ('course', $1, $2)
       ON CONFLICT (exam, subject, lower(name)) DO UPDATE SET name = topics.name RETURNING id`,
      [subject.id, topic],
    );
    const r = await c.query<{ id: string }>(
      `INSERT INTO tutor_sessions (lead_id, subject, topic, topic_id, material, channel, free)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [lead.id, subject.id, topic, t.rows[0].id, material, channel, !access.unlimited],
    );
    await c.query("COMMIT");
    return { ok: true as const, id: r.rows[0].id, reused: false };
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

export async function getTutorSession(id: string, leadId: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const r = await db().query<TutorSession>(`SELECT * FROM tutor_sessions WHERE id = $1 AND lead_id = $2`, [id, leadId]);
  return r.rows[0] ?? null;
}

// An unfinished session can be picked back up for a few hours after its last message.
export function canContinue(s: TutorSession) {
  return !s.ended_at && Date.now() - new Date(s.last_activity_at).getTime() < TUTOR_REOPEN_HOURS * 3600_000;
}

export async function pastSessions(leadId: string, limit = 30) {
  const r = await db().query<TutorSession>(
    `SELECT * FROM tutor_sessions WHERE lead_id = $1 ORDER BY started_at DESC LIMIT $2`,
    [leadId, limit],
  );
  return r.rows;
}

// ---- Grounding: the reviewed questions and explanations closest to the topic ----
const STOP = new Set(
  "about after again also and any are because been before being between both but can could does doing during each from have having here how into its just more most much need only other over same should some such than that the their them then there these they this those through under until very what when where which while who why will with would your topic topics understand explain help please class course exam test question questions".split(
    " ",
  ),
);

export function keywords(text: string) {
  const words = text.toLowerCase().match(/[a-z0-9][a-z0-9-]{2,}/g) ?? [];
  return [...new Set(words.filter((w) => !STOP.has(w)))].slice(0, 25);
}

export async function reviewedFor(subjectId: string, topic: string, material: string | null) {
  const subject = subjectById(subjectId);
  const topicWords = keywords(topic);
  const noteWords = material ? keywords(material).slice(0, 15) : [];
  if (!topicWords.length && !noteWords.length) return [];
  const r = await db().query<{ id: string; domain: string; subject: string | null; stem: string; options: string[]; answer: number; explanation: string }>(
    `SELECT id, domain, subject, stem, options, answer, explanation FROM questions WHERE status = 'reviewed'`,
  );
  const scored = r.rows
    .map((q) => {
      const hay = `${q.stem} ${q.options.join(" ")} ${q.explanation}`.toLowerCase();
      let score = 0;
      for (const w of topicWords) if (hay.includes(w)) score += 3;
      for (const w of noteWords) if (hay.includes(w)) score += 1;
      if (score && subject && (q.subject === subject.id || q.domain === subject.domain)) score += 2;
      return { q, score };
    })
    .filter((x) => x.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  return scored.map((x) => x.q);
}

const LETTERS = ["A", "B", "C", "D"];

// Dynamic variables for Sara in a tutor session.
export async function tutorVariables(s: TutorSession, firstName: string) {
  const subject = subjectById(s.subject);
  const reviewed = await reviewedFor(s.subject, s.topic, s.material);
  const reviewedText = reviewed.length
    ? reviewed
        .map(
          (q, i) =>
            `Reviewed item ${i + 1}: "${q.stem}" Correct answer: ${q.options[q.answer]}. Reviewed explanation: ${q.explanation}`,
        )
        .join("\n")
    : "No reviewed items match this topic. Anything you teach here goes beyond our reviewed material, so say so once, plainly, early on.";
  const history = s.transcript.length
    ? s.transcript
        .slice(-14)
        .map((t) => `${t.who === "student" ? "Student" : BUDDY_NAME}: ${t.text.slice(0, 300)}`)
        .join("\n")
        .slice(-3500)
    : "none (new session)";
  const resuming = s.transcript.length > 0;
  const opening = resuming
    ? `Welcome back${firstName === "there" ? "" : `, ${firstName}`}! We were working on ${s.topic}. Want to pick up where we left off?`
    : `Hey ${firstName}! Let's get ${s.topic} to click. ${s.material ? "I've got the notes you pasted, so I'll teach from those. " : ""}Before I explain anything, what do you already know about it, even if it's just a little?`;
  return {
    session_mode: "tutor",
    focus: "none",
    tutor_subject: subject?.name ?? s.subject,
    tutor_topic: s.topic,
    tutor_material: s.material ? s.material.replace(/\s+\n/g, "\n").slice(0, 6000) : "none provided",
    tutor_reviewed: reviewedText.slice(0, 6000),
    tutor_history: history,
    opening_line: opening,
  };
}

// Defaults so every conversation has all of Sara's tutor variables.
export const TUTOR_VARIABLE_DEFAULTS = {
  tutor_subject: "none",
  tutor_topic: "none",
  tutor_material: "none provided",
  tutor_reviewed: "none",
  tutor_history: "none (new session)",
};

// ---- Progress, for the student and the VTNE tie-in ----
export async function tutorProgress(leadId: string) {
  const r = await db().query<{ mastered: string; sessions: string }>(
    `SELECT count(DISTINCT lower(topic)) FILTER (WHERE mastered) mastered, count(*) sessions FROM tutor_sessions WHERE lead_id = $1`,
    [leadId],
  );
  const mastered = Number(r.rows[0].mastered);
  const sessions = Number(r.rows[0].sessions);
  return { mastered, sessions, onTrack: mastered >= TUTOR_ON_TRACK_TOPICS };
}

export function pathLine(mastered: number) {
  if (mastered >= TUTOR_ON_TRACK_TOPICS) return `You've mastered ${mastered} topics in Tutor Mode, so you're on track for the VTNE.`;
  if (mastered >= 10) return `You've mastered ${mastered} topics in Tutor Mode. Every one of them is on the VTNE too, so you're building toward it already.`;
  if (mastered >= 1) return `You've mastered ${mastered} topic${mastered === 1 ? "" : "s"} in Tutor Mode. Keep going: these same ideas show up on the VTNE.`;
  return null;
}

// Topics the student is still struggling with in Tutor Mode (last 60 days), newest first.
export async function tutorStruggles(leadId: string) {
  const r = await db().query<{ subject: string; topic: string; struggled: string[] }>(
    `SELECT DISTINCT ON (lower(topic)) subject, topic, struggled FROM tutor_sessions
     WHERE lead_id = $1 AND started_at > now() - interval '60 days'
       AND (mastered = false OR checks_failed > checks_passed OR jsonb_array_length(struggled) > 0)
       AND lower(topic) NOT IN (SELECT lower(topic) FROM tutor_sessions WHERE lead_id = $1 AND mastered)
     ORDER BY lower(topic), started_at DESC LIMIT 8`,
    [leadId],
  );
  return r.rows.map((x) => ({ ...x, subjectName: subjectById(x.subject)?.name ?? x.subject, domain: subjectById(x.subject)?.domain ?? null }));
}

export const SUBJECT_OPTIONS = SUBJECTS;
