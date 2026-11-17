import { db } from "@/lib/db";
import { addDays, prettyDate, todayISO } from "@/lib/dates";
import { layout, links, sendEmail } from "@/lib/email";
import { examLabel, outcomeCheckDate } from "@/lib/plan";
import { rankWeakDomains, DomainScore, bandFor, BAND_COPY } from "@/lib/scoring";
import {
  DATE_CHECK_DAYS_AFTER_SIGNUP,
  OUTCOME_CHECK_DAYS_AFTER,
  OUTCOME_REMINDER_DAYS_AFTER_FIRST,
} from "@/config";

export interface LeadRow {
  id: string;
  token: string;
  email: string;
  first_name: string | null;
  exam_date: string | null;
  target_month: string | null;
  unsubscribed_at: Date | null;
  outcome: "passed" | "failed" | null;
  created_at: Date;
  attempt_token: string | null;
  score: number | null;
  domain_scores: DomainScore[] | null;
}

const hi = (lead: LeadRow) => `Hi ${lead.first_name?.trim() || "there"},`;

// ---------- Email builders ----------

export function welcomeEmail(lead: LeadRow) {
  const unsub = links.unsubscribe(lead.token);
  const weak = lead.domain_scores ? rankWeakDomains(lead.domain_scores).slice(0, 3).map((d) => d.name) : [];
  const band = lead.score != null ? BAND_COPY[bandFor(lead.score)] : null;
  const { html, text } = layout({
    greeting: hi(lead),
    unsubscribeUrl: unsub,
    blocks: [
      {
        paragraphs: [
          `Nice work finishing the diagnostic. You scored ${lead.score ?? "?"} out of 25${band ? `: ${band.label}` : ""}. ${band?.line ?? ""}`,
          "Based on this short check, here's where I'd focus first:",
        ],
        list: weak,
      },
      {
        paragraphs: [
          `Your exam: ${examLabel(lead.exam_date, lead.target_month)}. Your week-by-week plan and the explanation for every question you missed are on your results page.`,
        ],
        buttons: lead.attempt_token ? [{ label: "See my plan", url: links.results(lead.attempt_token) }] : [],
      },
      {
        paragraphs: [
          "I'll check in before your exam and again afterward to see how it went. Hit reply anytime. A real person reads these.",
        ],
      },
    ],
  });
  return { to: lead.email, subject: "Your VTNE diagnostic results and study plan", html, text, unsubscribeUrl: unsub };
}

function weekBeforeEmail(lead: LeadRow) {
  const unsub = links.unsubscribe(lead.token);
  const { html, text } = layout({
    greeting: hi(lead),
    unsubscribeUrl: unsub,
    blocks: [
      {
        paragraphs: [
          `One week until your VTNE on ${prettyDate(lead.exam_date!)}. You've put in the work. This week is about sharpening, not cramming.`,
          "Here's what I'd do:",
        ],
        list: [
          "Take one full-length timed practice exam early this week, so test day feels familiar.",
          "Spend the rest of the week on whatever that exam shows is weakest.",
          "No new material in the last two days.",
          "Confirm your test center and check that the name on your ID matches your application exactly.",
        ],
        buttons: lead.attempt_token ? [{ label: "Review my weak areas", url: links.results(lead.attempt_token) }] : [],
      },
    ],
  });
  return { to: lead.email, subject: "One week to go", html, text, unsubscribeUrl: unsub };
}

function dayBeforeEmail(lead: LeadRow) {
  const unsub = links.unsubscribe(lead.token);
  const { html, text } = layout({
    greeting: hi(lead),
    unsubscribeUrl: unsub,
    blocks: [
      {
        paragraphs: ["Tomorrow's the day. Quick checklist, then put the books away:"],
        list: [
          "Government photo ID with a signature, name matching your application",
          "Test center address and arrival time",
          "A real dinner and a real night's sleep",
          "Breakfast, water, and leave early",
        ],
      },
      {
        paragraphs: [
          "If a question stumps you tomorrow, flag it, breathe, and move on. One hard question doesn't decide anything. You've got this, and I'll check in after to see how it went.",
        ],
      },
    ],
  });
  return { to: lead.email, subject: "Tomorrow's the day", html, text, unsubscribeUrl: unsub };
}

function outcomeEmail(lead: LeadRow, reminder: boolean) {
  const unsub = links.unsubscribe(lead.token);
  const { html, text } = layout({
    greeting: hi(lead),
    unsubscribeUrl: unsub,
    blocks: [
      {
        paragraphs: [
          reminder
            ? "Just circling back. Did you get your VTNE results? One tap tells me, and it helps me make this better for the next student."
            : "How did the VTNE go? Your score should be in your MyAAVSB portal by now. Tap one so I know what to send you next:",
        ],
        buttons: [
          { label: "I passed!", url: links.outcome(lead.token, "passed") },
          { label: "I didn't pass this time", url: links.outcome(lead.token, "failed") },
          { label: "I haven't taken it yet", url: links.outcome(lead.token, "not_yet") },
        ],
      },
      {
        paragraphs: [
          "If it didn't go your way, you're not alone. About a third of first-time takers don't pass. I'll help you build a retake plan around your score report.",
        ],
      },
    ],
  });
  return {
    to: lead.email,
    subject: reminder ? "Quick check-in: did you get your results?" : "How did the VTNE go?",
    html,
    text,
    unsubscribeUrl: unsub,
  };
}

function dateCheckEmail(lead: LeadRow) {
  const unsub = links.unsubscribe(lead.token);
  const { html, text } = layout({
    greeting: hi(lead),
    unsubscribeUrl: unsub,
    blocks: [
      {
        paragraphs: [
          "Have you booked your VTNE date yet? Once I know the exact day, I can line up your plan week by week and check in at the right times.",
        ],
        buttons: [{ label: "Add my exam date", url: links.outcome(lead.token, "not_yet") }],
      },
    ],
  });
  return { to: lead.email, subject: "Booked your VTNE date yet?", html, text, unsubscribeUrl: unsub };
}

// ---------- Scheduling ----------

interface DueEmail {
  kind: string;
  build: () => ReturnType<typeof welcomeEmail>;
}

export function dueEmails(lead: LeadRow, today: string, sentKinds: Set<string>): DueEmail[] {
  if (lead.unsubscribed_at || lead.outcome === "passed") return [];
  const due: DueEmail[] = [];
  const signupDay = lead.created_at.toISOString().slice(0, 10);

  if (lead.exam_date && lead.outcome !== "failed") {
    const exam = lead.exam_date;
    const wb = addDays(exam, -7);
    const db1 = addDays(exam, -1);
    // Skip the week-before note if they signed up inside that week.
    if (today >= wb && today < db1 && signupDay < wb) due.push({ kind: `week_before:${exam}`, build: () => weekBeforeEmail(lead) });
    if (today >= db1 && today <= exam) due.push({ kind: `day_before:${exam}`, build: () => dayBeforeEmail(lead) });
  }

  if (lead.outcome !== "failed") {
    const check = outcomeCheckDate(lead.exam_date, lead.target_month, OUTCOME_CHECK_DAYS_AFTER);
    if (check) {
      const key = lead.exam_date ?? lead.target_month;
      const firstKind = `outcome_1:${key}`;
      if (today >= check) due.push({ kind: firstKind, build: () => outcomeEmail(lead, false) });
      if (today >= addDays(check, OUTCOME_REMINDER_DAYS_AFTER_FIRST) && sentKinds.has(firstKind))
        due.push({ kind: `outcome_2:${key}`, build: () => outcomeEmail(lead, true) });
    }
  }

  if (!lead.exam_date && !lead.outcome && today >= addDays(signupDay, DATE_CHECK_DAYS_AFTER_SIGNUP)) {
    due.push({ kind: `date_check:${lead.target_month ?? "none"}`, build: () => dateCheckEmail(lead) });
  }

  return due.filter((d) => !sentKinds.has(d.kind));
}

export const LEAD_SELECT = `
  SELECT l.*, a.public_token AS attempt_token, a.score, a.domain_scores
  FROM leads l
  LEFT JOIN LATERAL (
    SELECT public_token, score, domain_scores FROM attempts
    WHERE lead_id = l.id AND completed_at IS NOT NULL
    ORDER BY completed_at DESC LIMIT 1
  ) a ON true`;

// Claim the email in the log first, so two overlapping runs can't double-send.
export async function sendOnce(lead: LeadRow, kind: string, build: () => ReturnType<typeof welcomeEmail>) {
  const claim = await db().query(
    `INSERT INTO email_log (lead_id, kind, status) VALUES ($1, $2, 'pending')
     ON CONFLICT (lead_id, kind) DO UPDATE SET status = 'pending', error = NULL WHERE email_log.status = 'error'
     RETURNING id`,
    [lead.id, kind],
  );
  if (!claim.rowCount) return null;
  const result = await sendEmail(build());
  await db().query(`UPDATE email_log SET status = $1, error = $2, sent_at = now() WHERE id = $3`, [
    result.status,
    result.error ?? null,
    claim.rows[0].id,
  ]);
  return result.status;
}

export async function runFollowups(today = todayISO()) {
  const leads = (await db().query<LeadRow>(`${LEAD_SELECT} WHERE l.unsubscribed_at IS NULL AND (l.outcome IS NULL OR l.outcome <> 'passed')`)).rows;
  const logs = await db().query<{ lead_id: string; kind: string }>(`SELECT lead_id, kind FROM email_log WHERE status <> 'error'`);
  const sentByLead = new Map<string, Set<string>>();
  for (const r of logs.rows) {
    if (!sentByLead.has(r.lead_id)) sentByLead.set(r.lead_id, new Set());
    sentByLead.get(r.lead_id)!.add(r.kind);
  }
  const summary: Record<string, number> = {};
  for (const lead of leads) {
    const sent = sentByLead.get(lead.id) ?? new Set<string>();
    for (const d of dueEmails(lead, today, sent)) {
      const status = await sendOnce(lead, d.kind, d.build);
      if (status) {
        const k = `${d.kind.split(":")[0]}:${status}`;
        summary[k] = (summary[k] ?? 0) + 1;
      }
    }
  }
  return { today, leadsChecked: leads.length, sent: summary };
}
