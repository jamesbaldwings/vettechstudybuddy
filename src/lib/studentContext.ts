import { db } from "@/lib/db";
import { getReadiness } from "@/lib/readiness";
import { Lead } from "@/lib/auth";
import { daysBetween, prettyDate, prettyMonth, todayISO } from "@/lib/dates";

const LETTERS = ["A", "B", "C", "D"];

// What Sara knows about the student at the start of a conversation.
export async function saraContext(lead: Lead) {
  const today = todayISO();
  let examText = "not set yet";
  let daysLeft = "date not set";
  if (lead.exam_date) {
    examText = prettyDate(lead.exam_date);
    const d = daysBetween(today, lead.exam_date);
    daysLeft = d > 0 ? `${d} days away` : d === 0 ? "today" : "already taken";
  } else if (lead.target_month) {
    examText = `sometime in ${prettyMonth(lead.target_month)}`;
    daysLeft = "exact date not booked yet";
  }

  const [readiness, attempt, missed] = await Promise.all([
    getReadiness(lead.id),
    db()
      .query<{ score: number; confidence: number | null }>(
        `SELECT score, confidence FROM attempts WHERE lead_id = $1 AND completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 1`,
        [lead.id],
      )
      .then((r) => r.rows[0]),
    // Most recent wrong answers, one per question, from the diagnostic bank and practice.
    db()
      .query<{ stem: string; options: string[]; answer: number; chosen: number | null; domain: string }>(
        `SELECT DISTINCT ON (q.id) q.stem, q.options, q.answer, a.chosen, q.domain FROM practice_answers a JOIN questions q ON q.id = a.question_id
         WHERE a.lead_id = $1 AND NOT a.correct ORDER BY q.id, a.answered_at DESC LIMIT 12`,
        [lead.id],
      )
      .then((r) => r.rows),
  ]);

  const weak = [...readiness.domains].sort((a, b) => a.pct - b.pct || b.weight - a.weight).slice(0, 3);
  const missedText = missed.length
    ? missed
        .slice(0, 8)
        .map(
          (m, i) =>
            `Missed ${i + 1}: "${m.stem}" They answered ${m.chosen == null ? "nothing" : `${LETTERS[m.chosen]} (${m.options[m.chosen]})`}; correct is ${LETTERS[m.answer]} (${m.options[m.answer]}).`,
        )
        .join(" ")
    : "";

  return {
    first_name: lead.first_name?.trim() || "there",
    exam_date: examText,
    days_left: daysLeft,
    confidence: String(attempt?.confidence ?? 3),
    score: readiness.score === null ? "no score yet" : `readiness ${readiness.score} out of 100`,
    weak_areas: weak.map((d) => `${d.name} (${d.pct}%)`).join(", "),
    missed_questions: missedText || "none recorded yet",
  };
}
