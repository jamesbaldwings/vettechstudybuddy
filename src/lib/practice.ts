import { db } from "@/lib/db";
import { DOMAINS, DomainId } from "@/data/questions";
import { getReadiness } from "@/lib/readiness";

export interface PublicQuestion {
  id: string;
  domain: DomainId;
  stem: string;
  options: string[];
}
export type PracticeSet = "mixed" | "missed" | DomainId;

// Picks the next practice question.
// Mixed: picks a topic weighted by VTNE weight and how shaky it is, then within it prefers unseen,
// then missed, then least recently seen. Missed: questions whose latest answer was wrong.
export async function nextQuestion(leadId: string, set: PracticeSet, excludeId?: string): Promise<PublicQuestion | null> {
  let domain: DomainId | null = null;
  if (set === "mixed") {
    const r = await getReadiness(leadId);
    const weights = r.domains.map((d) => ({ id: d.id, w: d.weight * (1.25 - d.pct / 100) }));
    const avail = await db().query<{ domain: DomainId }>(`SELECT DISTINCT domain FROM questions WHERE status = 'reviewed'`);
    const have = new Set(avail.rows.map((x) => x.domain));
    const pool = weights.filter((x) => have.has(x.id));
    const total = pool.reduce((s, x) => s + x.w, 0);
    let roll = Math.random() * total;
    for (const x of pool) {
      roll -= x.w;
      if (roll <= 0) {
        domain = x.id;
        break;
      }
    }
    domain ??= pool[0]?.id ?? null;
  } else if (set !== "missed") {
    if (!DOMAINS.some((d) => d.id === set)) return null;
    domain = set;
  }

  const r = await db().query<PublicQuestion & { last_correct: boolean | null }>(
    `WITH latest AS (
       SELECT DISTINCT ON (question_id) question_id, correct, answered_at FROM practice_answers
       WHERE lead_id = $1 ORDER BY question_id, answered_at DESC
     )
     SELECT q.id, q.domain, q.stem, q.options, l.correct AS last_correct FROM questions q LEFT JOIN latest l ON l.question_id = q.id
     WHERE q.status = 'reviewed' AND ($2::text IS NULL OR q.domain = $2) AND ($3::text IS NULL OR q.id <> $3)
       AND ($4::boolean IS FALSE OR l.correct = false)
     ORDER BY (l.question_id IS NULL) DESC, (l.correct = false) DESC, l.answered_at ASC NULLS FIRST, random()
     LIMIT 1`,
    [leadId, domain, excludeId ?? null, set === "missed"],
  );
  const q = r.rows[0];
  if (!q && excludeId) return nextQuestion(leadId, set); // only one question left in the set
  return q ? { id: q.id, domain: q.domain, stem: q.stem, options: q.options } : null;
}

export async function missedCount(leadId: string) {
  const r = await db().query<{ n: string }>(
    `SELECT count(*) n FROM (SELECT DISTINCT ON (question_id) correct FROM practice_answers WHERE lead_id = $1 ORDER BY question_id, answered_at DESC) x WHERE NOT correct`,
    [leadId],
  );
  return Number(r.rows[0].n);
}
