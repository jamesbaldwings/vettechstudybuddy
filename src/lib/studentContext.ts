import { db } from "@/lib/db";
import { getReadiness } from "@/lib/readiness";
import { Lead } from "@/lib/auth";
import { daysBetween, prettyDate, prettyMonth, todayISO } from "@/lib/dates";

const LETTERS = ["A", "B", "C", "D"];

// What Sara knows about the student at the start of a conversation.
// Sara's first line only offers what the student actually has: missed questions, a weak topic, or a fresh start.
function openingLine(name: string, missedCount: number, weakest: string | null) {
  if (missedCount > 0)
    return `Hey ${name}! It's Sara. Want to talk through ${missedCount === 1 ? "the question" : missedCount < 12 ? `the ${missedCount} questions` : "the questions"} you missed, or should I quiz you?`;
  if (weakest) return `Hey ${name}! It's Sara. Want me to quiz you on ${weakest}, or is there a topic you'd rather work on?`;
  return `Hey ${name}! It's Sara. What would you like to work on today? I can quiz you, or we can dig into any topic you pick.`;
}

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
         WHERE a.lead_id = $1 AND NOT a.correct AND q.status = 'reviewed' ORDER BY q.id, a.answered_at DESC LIMIT 12`,
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
    weak_areas: readiness.basis === "none" ? "not enough answers yet to tell" : weak.map((d) => `${d.name} (${d.pct}%)`).join(", "),
    missed_questions: missedText || "none recorded yet",
    session_mode: "study",
    focus: "none",
    opening_line: openingLine(lead.first_name?.trim() || "there", missed.length, readiness.basis === "none" ? null : weak[0]?.name ?? null),
  };
}

const CONF = ["", "guessing", "thought so but wasn't sure", "sure"];

// Context for a focused "why" chat about the student's latest answer to one question.
export async function whyContext(leadId: string, questionId: string) {
  const r = await db().query<{
    stem: string; options: string[]; answer: number; explanation: string; domain: string;
    chosen: number | null; correct: boolean; confidence: number | null;
  }>(
    `SELECT q.stem, q.options, q.answer, q.explanation, q.domain, a.chosen, a.correct, a.confidence
     FROM practice_answers a JOIN questions q ON q.id = a.question_id
     WHERE a.lead_id = $1 AND a.question_id = $2 AND q.status = 'reviewed' ORDER BY a.answered_at DESC LIMIT 1`,
    [leadId, questionId],
  );
  const x = r.rows[0];
  if (!x) return null;
  const opts = x.options.map((o, i) => `${LETTERS[i]}. ${o}`).join(" | ");
  const picked = x.chosen == null ? "nothing" : `${LETTERS[x.chosen]} (${x.options[x.chosen]})`;
  const focus =
    `Question: "${x.stem}" Choices: ${opts}. Correct answer: ${LETTERS[x.answer]} (${x.options[x.answer]}). ` +
    `The student picked ${picked}, which is ${x.correct ? "correct" : "wrong"}` +
    (x.confidence ? `, and said they were ${CONF[x.confidence]}.` : ".") +
    ` Reviewed explanation: ${x.explanation}`;
  let opening: string;
  if (x.chosen == null) opening = "You left that one blank. Let's work through it together. What do you know about this topic so far?";
  else if (!x.correct)
    opening = `You went with ${LETTERS[x.chosen]}, ${x.options[x.chosen].replace(/[.]$/, "")}. Before I explain anything, what made that one look right to you?`;
  else if ((x.confidence ?? 3) < 3)
    opening = `You got it right, but you weren't sure. What made you lean toward ${LETTERS[x.chosen]}?`;
  else opening = `Nice, that's right. Can you tell me in your own words why ${LETTERS[x.chosen]} is the answer?`;
  return { focus, opening, correct: x.correct };
}
