import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { DOMAINS, QUESTIONS } from "@/data/questions";
import { BAND_COPY, DomainScore, bandFor, rankWeakDomains } from "@/lib/scoring";
import { buildPlan, examLabel } from "@/lib/plan";
import { todayISO } from "@/lib/dates";
import { Buddy } from "@/components/Buddy";
import { InstallPrompt } from "@/components/PWA";
import VoiceBuddy from "@/components/VoiceBuddy";
import AskWhy from "@/components/AskWhy";
import { currentLead } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your VTNE diagnostic results", robots: { index: false } };

const LETTERS = ["A", "B", "C", "D"];

interface Row {
  confidence: number | null;
  answers: (number | null)[];
  score: number;
  domain_scores: DomainScore[];
  first_name: string | null;
  exam_date: string | null;
  target_month: string | null;
  lead_token: string | null;
  lead_id: string | null;
}

export default async function ResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ signin?: string }>;
}) {
  const { token } = await params;
  const { signin } = await searchParams;
  const me = await currentLead();
  const res = await db().query<Row>(
    `SELECT a.confidence, a.answers, a.score, a.domain_scores, l.first_name, l.exam_date, l.target_month, l.token AS lead_token, a.lead_id
     FROM attempts a LEFT JOIN leads l ON l.id = a.lead_id
     WHERE a.public_token = $1 AND a.completed_at IS NOT NULL`,
    [token],
  );
  if (!res.rowCount) notFound();
  const r = res.rows[0];
  // "Ask Sara why" needs the student's own saved answers, so only the signed-in owner of this attempt sees it.
  const canAsk = !!me && me.id === r.lead_id;
  const band = BAND_COPY[bandFor(r.score)];
  const ranked = rankWeakDomains(r.domain_scores);
  const weakIds = new Set(ranked.slice(0, 3).map((d) => d.id));
  const plan = buildPlan({
    domainScores: r.domain_scores,
    examDate: r.exam_date,
    targetMonth: r.target_month,
    today: todayISO(),
    confidence: r.confidence,
  });
  const missed = QUESTIONS.map((q, i) => ({ q, i, chosen: r.answers[i] })).filter((m) => m.chosen !== m.q.answer);

  return (
    <>
      <Buddy>
        <p>
          {r.first_name ? `Here you go, ${r.first_name}.` : "Here you go."} This is your starting line, not a verdict.
          Everything below is built around your exam: <strong>{examLabel(r.exam_date, r.target_month)}</strong>.
        </p>
      </Buddy>

      <div className="card center">
        <div className="score-big">
          {r.score}
          <span style={{ fontSize: 26, color: "var(--muted)" }}>/{QUESTIONS.length}</span>
        </div>
        <p style={{ marginTop: 10 }}>
          <span className="band">{band.label}</span>
        </p>
        <p className="muted" style={{ marginBottom: 0 }}>
          {band.line}
        </p>
      </div>

      {signin === "sent" && (
        <div className="card notice">
          <strong>You already have an account with that email.</strong> We emailed you a sign-in link. Use it to get back to your study home.
        </div>
      )}
      {me && (
        <p className="center">
          <Link href="/home" className="btn">
            Go to my study home
          </Link>
        </p>
      )}

      {r.lead_token && <VoiceBuddy attemptToken={token} />}

      <InstallPrompt />

      <section className="card">
        <h2>Where to focus first</h2>
        <p>
          {ranked.slice(0, 3).map((d) => (
            <span key={d.id} className="tag">
              {d.name}
            </span>
          ))}
        </p>
        <p className="muted small">
          These combine what you missed with how much each area counts on the real exam. With only a few questions per area,
          treat this as an early signal; full practice exams will sharpen it.
        </p>
        <div className="bars">
          {DOMAINS.map((d) => {
            const ds = r.domain_scores.find((x) => x.domain === d.id)!;
            const pct = ds.total ? Math.round((ds.correct / ds.total) * 100) : 0;
            return (
              <div key={d.id} className="bar-row">
                <div className="bar-label">
                  {d.name} <span className="w">· {d.weight}% of the exam</span>
                  <div className={`bar ${weakIds.has(d.id) ? "weak" : ""}`}>
                    <span style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="bar-num">
                  {ds.correct}/{ds.total}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h2>Your plan</h2>
        <p>{plan.headline}</p>
        {plan.approximate && plan.daysLeft !== null && plan.daysLeft > 0 && (
          <p className="muted small">
            Based on the middle of your target month. Once you book your date, I&apos;ll tighten it up.
          </p>
        )}
        {plan.weeks.map((w) => (
          <div key={w.label} className="week">
            <h3>{w.label}</h3>
            <div>
              {w.focus.map((f) => (
                <span key={f} className="tag">
                  {f}
                </span>
              ))}
            </div>
            <ul>
              {w.tasks.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        ))}
        <Buddy>
          <p>{plan.anxietyTip}</p>
        </Buddy>
      </section>

      {missed.length > 0 && (
        <section className="card">
          <h2>Review what you missed ({missed.length})</h2>
          <p className="muted small">Tap a question to see the answer and why.</p>
          {missed.map(({ q, i, chosen }) => (
            <details key={q.id} className="review">
              <summary>
                <span className="small muted">
                  Question {i + 1} · {DOMAINS.find((d) => d.id === q.domain)!.name}
                </span>
                <br />
                <strong>{q.stem}</strong>
              </summary>
              <p className="small">
                {chosen !== null && chosen !== undefined && (
                  <span className="yours">
                    Your answer: {LETTERS[chosen]}. {q.options[chosen]}
                    <br />
                  </span>
                )}
                <span className="right">
                  Correct: {LETTERS[q.answer]}. {q.options[q.answer]}
                </span>
              </p>
              <p className="small">{q.explanation}</p>
              {canAsk && <AskWhy questionId={q.id} />}
            </details>
          ))}
        </section>
      )}

      <section className="card">
        <h2>What&apos;s next</h2>
        <p>
          Don&apos;t just reread the right answers. Pick one you missed and tap "Ask Sara why" under it, or start
          practicing your weakest topic. I&apos;ll also email you a week before your VTNE, the night before, and a few days after to
          see how it went.
        </p>
        <p style={{ marginBottom: 0 }}>
          <Link href="/quiz" className="btn secondary">
            Retake the diagnostic
          </Link>
        </p>
      </section>
    </>
  );
}
