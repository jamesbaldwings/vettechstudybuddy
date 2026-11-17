import { db } from "@/lib/db";
import { DOMAINS, DomainId } from "@/data/questions";
import { EXAM_MAX_QUESTIONS, EXAM_SECONDS_PER_QUESTION } from "@/config";
import { DomainScore } from "@/lib/scoring";

export interface ExamRow {
  id: string;
  lead_id: string;
  question_ids: string[];
  answers: (number | null)[];
  flagged: number[];
  time_limit_sec: number;
  started_at: Date;
  finished_at: Date | null;
  score: number | null;
  total: number | null;
  domain_scores: DomainScore[] | null;
}

const shuffle = <T,>(a: T[]) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Builds an exam that mirrors the VTNE's topic weights, preferring questions the student hasn't seen.
export async function createExam(leadId: string) {
  const r = await db().query<{ id: string; domain: DomainId; seen: boolean }>(
    `SELECT q.id, q.domain, EXISTS (SELECT 1 FROM practice_answers a WHERE a.lead_id = $1 AND a.question_id = q.id) seen
     FROM questions q WHERE q.status = 'reviewed'`,
    [leadId],
  );
  const n = Math.min(EXAM_MAX_QUESTIONS, r.rows.length);
  const byDomain = new Map<DomainId, { id: string; seen: boolean }[]>();
  for (const q of shuffle(r.rows)) byDomain.set(q.domain, [...(byDomain.get(q.domain) ?? []), q]);
  for (const list of byDomain.values()) list.sort((a, b) => Number(a.seen) - Number(b.seen));
  const picked: string[] = [];
  for (const d of DOMAINS) {
    const want = Math.round((n * d.weight) / 100);
    picked.push(...(byDomain.get(d.id) ?? []).splice(0, want).map((x) => x.id));
  }
  // Top up (or trim) to exactly n from whatever is left.
  const rest = shuffle([...byDomain.values()].flat()).sort((a, b) => Number(a.seen) - Number(b.seen));
  while (picked.length < n && rest.length) picked.push(rest.shift()!.id);
  const ids = shuffle(picked).slice(0, n);
  const ins = await db().query<{ id: string }>(
    `INSERT INTO practice_exams (lead_id, question_ids, answers, flagged, time_limit_sec) VALUES ($1, $2, $3, '[]', $4) RETURNING id`,
    [leadId, JSON.stringify(ids), JSON.stringify(ids.map(() => null)), ids.length * EXAM_SECONDS_PER_QUESTION],
  );
  return ins.rows[0].id;
}

export async function getExam(id: string, leadId: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const r = await db().query<ExamRow>(`SELECT * FROM practice_exams WHERE id = $1 AND lead_id = $2`, [id, leadId]);
  return r.rows[0] ?? null;
}

export const secondsLeft = (e: ExamRow) => Math.max(0, Math.round(e.time_limit_sec - (Date.now() - e.started_at.getTime()) / 1000));

export async function finishExam(e: ExamRow) {
  if (e.finished_at) return e;
  const qs = await db().query<{ id: string; domain: DomainId; answer: number }>(`SELECT id, domain, answer FROM questions WHERE id = ANY($1)`, [
    e.question_ids,
  ]);
  const key = new Map(qs.rows.map((q) => [q.id, q]));
  const tally = new Map<DomainId, { correct: number; total: number }>();
  let score = 0;
  const rows: { qid: string; chosen: number | null; correct: boolean }[] = [];
  e.question_ids.forEach((qid, i) => {
    const q = key.get(qid);
    if (!q) return;
    const chosen = e.answers[i] ?? null;
    const correct = chosen === q.answer;
    if (correct) score++;
    const t = tally.get(q.domain) ?? { correct: 0, total: 0 };
    t.total++;
    if (correct) t.correct++;
    tally.set(q.domain, t);
    rows.push({ qid, chosen, correct });
  });
  const domainScores: DomainScore[] = DOMAINS.filter((d) => tally.has(d.id)).map((d) => ({ domain: d.id, ...tally.get(d.id)! }));
  const c = await db().connect();
  try {
    await c.query("BEGIN");
    const u = await c.query(
      `UPDATE practice_exams SET finished_at = now(), score = $2, total = $3, domain_scores = $4 WHERE id = $1 AND finished_at IS NULL`,
      [e.id, score, rows.length, JSON.stringify(domainScores)],
    );
    // Unanswered questions don't count toward readiness; answered ones do.
    if (u.rowCount)
      for (const x of rows.filter((x) => x.chosen !== null))
        await c.query(`INSERT INTO practice_answers (lead_id, question_id, chosen, correct, mode, exam_id) VALUES ($1,$2,$3,$4,'exam',$5)`, [
          e.lead_id,
          x.qid,
          x.chosen,
          x.correct,
          e.id,
        ]);
    await c.query("COMMIT");
  } catch (err) {
    await c.query("ROLLBACK");
    throw err;
  } finally {
    c.release();
  }
  return { ...e, finished_at: new Date(), score, total: rows.length, domain_scores: domainScores };
}
