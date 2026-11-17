import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { QUESTIONS, domainById } from "@/data/questions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false } };

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");

export default async function Admin({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const { key } = await searchParams;
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) notFound();
  const q = <T,>(sql: string, p: unknown[] = []) => db().query(sql, p).then((r) => r.rows as T[]);

  const [[totals], firstOutcomes, months, emails, answers, recent] = await Promise.all([
    q<{ starts: string; completions: string; signups: string; avg_score: string | null; avg_conf: string | null }>(
      `SELECT count(*) starts,
              count(*) FILTER (WHERE completed_at IS NOT NULL) completions,
              count(*) FILTER (WHERE completed_at IS NOT NULL AND lead_id IS NOT NULL) signups,
              round(avg(score) FILTER (WHERE completed_at IS NOT NULL), 1) avg_score,
              round(avg(confidence), 1) avg_conf
       FROM attempts`,
    ),
    // First pass/fail report per student is the closest thing to a first-attempt pass rate.
    q<{ result: string; n: string }>(
      `SELECT result, count(*) n FROM (
         SELECT DISTINCT ON (lead_id) result FROM outcome_reports WHERE result IN ('passed','failed') ORDER BY lead_id, created_at
       ) x GROUP BY result`,
    ),
    q<{ month: string; n: string }>(
      `SELECT to_char(coalesce(exam_date, target_month), 'YYYY-MM') AS month, count(*) AS n
       FROM leads WHERE unsubscribed_at IS NULL GROUP BY 1 ORDER BY 1`,
    ),
    q<{ kind: string; status: string; n: string }>(
      `SELECT split_part(kind, ':', 1) kind, status, count(*) n FROM email_log GROUP BY 1, 2 ORDER BY 1, 2`,
    ),
    q<{ answers: (number | null)[] }>(`SELECT answers FROM attempts WHERE completed_at IS NOT NULL`),
    q<{ email: string; first_name: string | null; exam: string | null; score: number | null; outcome: string | null; created_at: Date }>(
      `SELECT l.email, l.first_name, coalesce(to_char(l.exam_date,'YYYY-MM-DD'), to_char(l.target_month,'YYYY-MM') || ' (month)') exam,
              a.score, l.outcome, l.created_at
       FROM leads l
       LEFT JOIN LATERAL (SELECT score FROM attempts WHERE lead_id = l.id AND completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 1) a ON true
       ORDER BY l.created_at DESC LIMIT 50`,
    ),
  ]);

  const starts = +totals.starts, completions = +totals.completions, signups = +totals.signups;
  const passed = +(firstOutcomes.find((o) => o.result === "passed")?.n ?? 0);
  const failed = +(firstOutcomes.find((o) => o.result === "failed")?.n ?? 0);

  const perQ = QUESTIONS.map((qq, i) => {
    const n = answers.length;
    const right = answers.filter((a) => a.answers?.[i] === qq.answer).length;
    return { i, qq, n, right, rate: n ? right / n : 0 };
  }).sort((a, b) => a.rate - b.rate);

  return (
    <>
      <h1>Diagnostic dashboard</h1>
      <div className="kpis" style={{ marginBottom: 18 }}>
        <div className="kpi"><span className="muted small">Started</span><b>{starts}</b></div>
        <div className="kpi"><span className="muted small">Finished</span><b>{completions}</b><span className="small muted">{pct(completions, starts)} of starts</span></div>
        <div className="kpi"><span className="muted small">Gave email</span><b>{signups}</b><span className="small muted">{pct(signups, completions)} of finishers</span></div>
        <div className="kpi"><span className="muted small">Avg score</span><b>{totals.avg_score ?? "–"}</b><span className="small muted">out of 25</span></div>
        <div className="kpi"><span className="muted small">Avg confidence</span><b>{totals.avg_conf ?? "–"}</b><span className="small muted">1 to 5</span></div>
        <div className="kpi"><span className="muted small">Reported pass rate</span><b>{pct(passed, passed + failed)}</b><span className="small muted">{passed} passed, {failed} didn&apos;t</span></div>
      </div>

      <section className="card">
        <h2>Exam months (active subscribers)</h2>
        <table className="stats"><tbody>
          {months.map((m) => <tr key={m.month ?? "none"}><td>{m.month ?? "No date"}</td><td>{m.n}</td></tr>)}
        </tbody></table>
      </section>

      <section className="card">
        <h2>Most-missed questions</h2>
        <p className="muted small">If almost everyone misses one, check the question itself.</p>
        <table className="stats">
          <thead><tr><th>#</th><th>Domain</th><th>Question</th><th>Correct</th></tr></thead>
          <tbody>
            {perQ.map((p) => (
              <tr key={p.qq.id}><td>{p.i + 1}</td><td>{domainById(p.qq.domain).name}</td><td>{p.qq.stem.slice(0, 90)}{p.qq.stem.length > 90 ? "…" : ""}</td><td>{pct(p.right, p.n)}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Emails</h2>
        <table className="stats"><thead><tr><th>Type</th><th>Status</th><th>Count</th></tr></thead><tbody>
          {emails.map((e) => <tr key={e.kind + e.status}><td>{e.kind}</td><td>{e.status}</td><td>{e.n}</td></tr>)}
        </tbody></table>
      </section>

      <section className="card">
        <h2>Latest sign-ups</h2>
        <table className="stats">
          <thead><tr><th>Email</th><th>Name</th><th>Exam</th><th>Score</th><th>Outcome</th></tr></thead>
          <tbody>
            {recent.map((r) => (
              <tr key={r.email}><td>{r.email}</td><td>{r.first_name ?? ""}</td><td>{r.exam ?? ""}</td><td>{r.score ?? ""}</td><td>{r.outcome ?? ""}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
