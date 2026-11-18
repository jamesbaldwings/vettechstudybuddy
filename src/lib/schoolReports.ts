import { db } from "@/lib/db";
import { DOMAINS, DomainId } from "@/data/questions";
import { getReadiness } from "@/lib/readiness";

export interface StudentRow {
  inviteId: string;
  email: string;
  name: string | null;
  status: "invited" | "joined" | "studying" | "pass ended" | "removed";
  token: string;
  invitedAt: Date;
  joinedAt: Date | null;
  passStartedAt: Date | null;
  passEndsAt: Date | null;
  lastActive: Date | null;
  answered: number;
  answered7d: number;
  recentAccuracy: number | null; // last 30 practice/exam answers
  readiness: number | null;
  weakest: string | null;
  examsTaken: number;
  lastExamPct: number | null;
  guessingPct: number | null; // share of rated answers marked "Guessing"
  examFeeling: number | null; // 1–5, from the diagnostic
  whyChats: number;
  examDate: string | null;
  outcome: "passed" | "failed" | null;
  flags: string[];
}

const daysAgo = (d: Date | null) => (d ? Math.floor((Date.now() - d.getTime()) / 86400_000) : null);

// Everything a school admin sees about its students. Never includes conversations with Sara.
export async function schoolStudents(schoolId: string): Promise<StudentRow[]> {
  const r = await db().query<{
    invite_id: string; email: string; name: string | null; token: string; created_at: Date; used_at: Date | null;
    revoked_at: Date | null; lead_id: string | null; first_name: string | null; activated_at: Date | null; expires_at: Date | null;
    last_login_at: Date | null; last_answer: Date | null; last_voice: Date | null; answered: string; answered7d: string;
    recent_correct: string | null; recent_total: string | null; rated: string; guessed: string; feeling: number | null;
    why_chats: string; exams: string; last_exam_score: number | null; last_exam_total: number | null;
    exam_date: string | null; outcome: "passed" | "failed" | null;
  }>(
    `SELECT i.id invite_id, i.email, i.name, i.token, i.created_at, i.used_at, i.revoked_at, l.id lead_id, l.first_name,
       p.activated_at, p.expires_at, l.last_login_at, l.exam_date, l.outcome,
       (SELECT max(answered_at) FROM practice_answers a WHERE a.lead_id = l.id) last_answer,
       (SELECT max(started_at) FROM voice_sessions v WHERE v.lead_id = l.id) last_voice,
       (SELECT count(*) FROM practice_answers a WHERE a.lead_id = l.id AND a.mode <> 'diagnostic') answered,
       (SELECT count(*) FROM practice_answers a WHERE a.lead_id = l.id AND a.mode <> 'diagnostic' AND a.answered_at > now() - interval '7 days') answered7d,
       (SELECT sum(CASE WHEN correct THEN 1 ELSE 0 END) FROM (SELECT correct FROM practice_answers a WHERE a.lead_id = l.id AND a.mode <> 'diagnostic' ORDER BY answered_at DESC LIMIT 30) x) recent_correct,
       (SELECT count(*) FROM (SELECT 1 FROM practice_answers a WHERE a.lead_id = l.id AND a.mode <> 'diagnostic' ORDER BY answered_at DESC LIMIT 30) x) recent_total,
       (SELECT count(*) FROM practice_answers a WHERE a.lead_id = l.id AND a.confidence IS NOT NULL) rated,
       (SELECT count(*) FROM practice_answers a WHERE a.lead_id = l.id AND a.confidence = 1) guessed,
       (SELECT confidence FROM attempts t WHERE t.lead_id = l.id AND t.completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 1) feeling,
       (SELECT count(*) FROM voice_sessions v WHERE v.lead_id = l.id AND v.mode = 'why') why_chats,
       (SELECT count(*) FROM practice_exams e WHERE e.lead_id = l.id AND e.finished_at IS NOT NULL) exams,
       (SELECT score FROM practice_exams e WHERE e.lead_id = l.id AND e.finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1) last_exam_score,
       (SELECT total FROM practice_exams e WHERE e.lead_id = l.id AND e.finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1) last_exam_total
     FROM school_invites i
     LEFT JOIN leads l ON l.id = i.used_by
     LEFT JOIN purchases p ON p.id = i.purchase_id
     WHERE i.school_id = $1 AND i.kind = 'student'
     ORDER BY i.revoked_at IS NOT NULL, i.used_at IS NULL, lower(coalesce(i.name, l.first_name, i.email))`,
    [schoolId],
  );

  const rows: StudentRow[] = [];
  for (const x of r.rows) {
    let readiness: number | null = null;
    let weakest: string | null = null;
    if (x.lead_id) {
      const rd = await getReadiness(x.lead_id);
      readiness = rd.score;
      if (rd.basis !== "none") weakest = [...rd.domains].sort((a, b) => a.pct - b.pct || b.weight - a.weight)[0]?.name ?? null;
    }
    const lastActive = [x.last_answer, x.last_voice, x.last_login_at].filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0] ?? null;
    const now = Date.now();
    const status: StudentRow["status"] = x.revoked_at
      ? "removed"
      : !x.used_at
        ? "invited"
        : x.expires_at && x.expires_at.getTime() < now
          ? "pass ended"
          : x.activated_at
            ? "studying"
            : "joined";
    const flags: string[] = [];
    const daysToExam = x.exam_date ? Math.ceil((new Date(x.exam_date + "T12:00:00").getTime() - now) / 86400_000) : null;
    if (status === "invited" && (daysAgo(x.created_at) ?? 0) >= 7) flags.push("Hasn't joined");
    if ((status === "studying" || status === "joined") && (daysAgo(lastActive) ?? 99) >= 7) flags.push("Inactive 7+ days");
    if (daysToExam !== null && daysToExam >= 0 && daysToExam <= 30 && readiness !== null && readiness < 60) flags.push("Exam soon, low readiness");
    const rated = Number(x.rated);
    const guessingPct = rated >= 10 ? Math.round((100 * Number(x.guessed)) / rated) : null;
    if (guessingPct !== null && guessingPct >= 40) flags.push("Guessing a lot");
    if (x.feeling !== null && x.feeling <= 2) flags.push("Anxious about the exam");
    rows.push({
      inviteId: x.invite_id,
      email: x.email,
      name: x.name || x.first_name,
      status,
      token: x.token,
      invitedAt: x.created_at,
      joinedAt: x.used_at,
      passStartedAt: x.activated_at,
      passEndsAt: x.expires_at,
      lastActive,
      answered: Number(x.answered),
      answered7d: Number(x.answered7d),
      recentAccuracy: Number(x.recent_total) ? Math.round((100 * Number(x.recent_correct)) / Number(x.recent_total)) : null,
      readiness,
      weakest,
      examsTaken: Number(x.exams),
      lastExamPct: x.last_exam_total ? Math.round((100 * (x.last_exam_score ?? 0)) / x.last_exam_total) : null,
      guessingPct,
      examFeeling: x.feeling,
      whyChats: Number(x.why_chats),
      examDate: x.exam_date,
      outcome: x.outcome,
      flags,
    });
  }
  return rows;
}

// Topic accuracy across the whole class (recent practice and exam answers).
export async function schoolTopics(schoolId: string) {
  const r = await db().query<{ domain: DomainId; correct: string; total: string; students: string }>(
    `SELECT q.domain, sum(CASE WHEN a.correct THEN 1 ELSE 0 END) correct, count(*) total, count(DISTINCT a.lead_id) students
     FROM practice_answers a JOIN questions q ON q.id = a.question_id
     JOIN school_invites i ON i.used_by = a.lead_id AND i.school_id = $1 AND i.kind = 'student'
     WHERE a.answered_at > now() - interval '60 days'
     GROUP BY q.domain`,
    [schoolId],
  );
  const by = new Map(r.rows.map((x) => [x.domain, x]));
  return DOMAINS.map((d) => {
    const x = by.get(d.id);
    const total = Number(x?.total ?? 0);
    return {
      id: d.id,
      name: d.name,
      weight: d.weight,
      total,
      students: Number(x?.students ?? 0),
      pct: total ? Math.round((100 * Number(x!.correct)) / total) : null,
    };
  });
}

export function csvFor(rows: StudentRow[]) {
  const head = [
    "Name", "Email", "Status", "Invited", "Joined", "Pass started", "Pass ends", "Last active", "Questions answered",
    "Answered last 7 days", "Recent accuracy %", "Readiness", "Weakest topic", "Practice exams", "Last exam %",
    "Marked guessing %", "Exam feeling (1-5)", "Why chats", "VTNE date", "Outcome", "Flags",
  ];
  const d = (x: Date | null) => (x ? x.toISOString().slice(0, 10) : "");
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    // Guard against spreadsheet formula injection.
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const lines = rows.map((r) =>
    [
      r.name, r.email, r.status, d(r.invitedAt), d(r.joinedAt), d(r.passStartedAt), d(r.passEndsAt), d(r.lastActive),
      r.answered, r.answered7d, r.recentAccuracy, r.readiness, r.weakest, r.examsTaken, r.lastExamPct, r.guessingPct,
      r.examFeeling, r.whyChats, r.examDate, r.outcome, r.flags.join("; "),
    ].map(esc).join(","),
  );
  return [head.join(","), ...lines].join("\n");
}
