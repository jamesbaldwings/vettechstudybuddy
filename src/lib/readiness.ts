import { db } from "@/lib/db";
import { DOMAINS, DomainId } from "@/data/questions";
import { DomainScore } from "@/lib/scoring";

export interface DomainReadiness {
  id: DomainId;
  name: string;
  weight: number;
  correct: number;
  total: number;
  pct: number; // smoothed estimate, 0–100
}
export interface Readiness {
  score: number | null; // 0–100, weighted like the VTNE
  answered: number;
  basis: "practice" | "diagnostic" | "none";
  domains: DomainReadiness[];
  label: string;
}

const RECENT_PER_DOMAIN = 30;
const PRIOR = 0.5; // pull small samples toward 50% so a lucky streak doesn't look like mastery
const PRIOR_WEIGHT = 4;

// Readiness = each domain's recent accuracy (smoothed), weighted by how much that domain counts on the VTNE.
// It's an estimate of how you'd do on exam-style questions today, not a predicted VTNE score.
export async function getReadiness(leadId: string): Promise<Readiness> {
  const r = await db().query<{ domain: DomainId; correct: string; total: string }>(
    // A right answer the student said was a guess counts as half: it isn't understood yet.
    `SELECT domain, sum(CASE WHEN correct AND confidence = 1 THEN 0.5 WHEN correct THEN 1 ELSE 0 END) correct, count(*) total FROM (
       SELECT q.domain, a.correct, a.confidence, row_number() OVER (PARTITION BY q.domain ORDER BY a.answered_at DESC) rn
       FROM practice_answers a JOIN questions q ON q.id = a.question_id
       WHERE a.lead_id = $1
     ) x WHERE rn <= $2 GROUP BY domain`,
    [leadId, RECENT_PER_DOMAIN],
  );
  let basis: Readiness["basis"] = "practice";
  let rows = new Map(r.rows.map((x) => [x.domain, { correct: Number(x.correct), total: Number(x.total) }]));
  let answered = r.rows.reduce((s, x) => s + Number(x.total), 0);

  if (answered === 0) {
    const d = await db().query<{ domain_scores: DomainScore[] }>(
      `SELECT domain_scores FROM attempts WHERE lead_id = $1 AND completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 1`,
      [leadId],
    );
    if (d.rowCount) {
      basis = "diagnostic";
      rows = new Map(d.rows[0].domain_scores.map((s) => [s.domain, { correct: s.correct, total: s.total }]));
      answered = d.rows[0].domain_scores.reduce((s, x) => s + x.total, 0);
    } else basis = "none";
  }

  const domains = DOMAINS.map((dm) => {
    const v = rows.get(dm.id) ?? { correct: 0, total: 0 };
    const est = (v.correct + PRIOR * PRIOR_WEIGHT) / (v.total + PRIOR_WEIGHT);
    return { id: dm.id, name: dm.name, weight: dm.weight, correct: Math.round(v.correct), total: v.total, pct: Math.round(est * 100) };
  });
  const score = basis === "none" ? null : Math.round(domains.reduce((s, d) => s + d.pct * d.weight, 0) / 100);
  const label =
    score === null
      ? "Take the diagnostic to get your first readiness score."
      : score >= 75
        ? "Looking strong. Keep it sharp with timed practice."
        : score >= 60
          ? "Getting there. Your weak areas are where the points are."
          : "Early days. Steady practice moves this fast.";
  return { score, answered, basis, domains, label };
}
