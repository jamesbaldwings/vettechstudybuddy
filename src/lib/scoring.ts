import { DOMAINS, QUESTIONS, DomainId } from "@/data/questions";

export interface DomainScore {
  domain: DomainId;
  correct: number;
  total: number;
}

export interface ScoreResult {
  score: number;
  total: number;
  domainScores: DomainScore[];
}

// answers[i] is the chosen option index for QUESTIONS[i], or null if skipped.
export function scoreAnswers(answers: (number | null)[]): ScoreResult {
  const byDomain = new Map<DomainId, DomainScore>();
  for (const d of DOMAINS) byDomain.set(d.id, { domain: d.id, correct: 0, total: 0 });
  let score = 0;
  QUESTIONS.forEach((q, i) => {
    const ds = byDomain.get(q.domain)!;
    ds.total += 1;
    if (answers[i] === q.answer) {
      ds.correct += 1;
      score += 1;
    }
  });
  return { score, total: QUESTIONS.length, domainScores: [...byDomain.values()] };
}

export type Band = "on_track" | "building" | "early";

export function bandFor(score: number): Band {
  if (score >= 20) return "on_track";
  if (score >= 14) return "building";
  return "early";
}

export const BAND_COPY: Record<Band, { label: string; line: string }> = {
  on_track: { label: "On track", line: "You've got a strong base. Now it's about staying sharp and not letting anything slip." },
  building: { label: "Building", line: "You've got a real foundation. A focused plan on your weak spots will move this number fast." },
  early: { label: "Early stage", line: "Totally normal at this point. Starting now, with a plan, is exactly the right move." },
};

// Rank domains by how much study time they deserve: VTNE weight × share missed.
export function rankWeakDomains(domainScores: DomainScore[]) {
  return DOMAINS.map((d) => {
    const ds = domainScores.find((s) => s.domain === d.id)!;
    const missRate = ds.total ? (ds.total - ds.correct) / ds.total : 0;
    return { ...d, correct: ds.correct, total: ds.total, missRate, priority: d.weight * (0.25 + missRate) };
  }).sort((a, b) => b.priority - a.priority);
}
