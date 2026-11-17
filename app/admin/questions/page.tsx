import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { DOMAINS } from "@/data/questions";
import AdminNav from "../AdminNav";
import QuestionEditor from "./QuestionEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Questions", robots: { index: false } };

interface QRow {
  id: string;
  domain: string;
  stem: string;
  options: string[];
  answer: number;
  explanation: string;
  status: string;
  seen: string;
  right: string;
  reports: string;
}

export default async function Questions({ searchParams }: { searchParams: Promise<{ status?: string; domain?: string; edit?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const status = sp.status ?? "all";
  const [rows, counts] = await Promise.all([
    db()
      .query<QRow>(
        `SELECT q.*, (SELECT count(*) FROM practice_answers a WHERE a.question_id = q.id) seen,
           (SELECT count(*) FROM practice_answers a WHERE a.question_id = q.id AND a.correct) "right",
           (SELECT count(*) FROM question_reports r WHERE r.question_id = q.id AND r.status = 'open') reports
         FROM questions q WHERE ($1 = 'all' OR q.status = $1) AND ($2::text IS NULL OR q.domain = $2)
         ORDER BY q.status = 'draft' DESC, q.domain, q.created_at`,
        [status, sp.domain || null],
      )
      .then((r) => r.rows),
    db()
      .query<{ domain: string; status: string; n: string }>(`SELECT domain, status, count(*) n FROM questions GROUP BY 1, 2`)
      .then((r) => r.rows),
  ]);
  const count = (d: string, s: string) => Number(counts.find((c) => c.domain === d && c.status === s)?.n ?? 0);
  const editing = sp.edit === "new" ? null : rows.find((r) => r.id === sp.edit) ?? null;
  const total = (s: string) => counts.filter((c) => c.status === s).reduce((a, c) => a + Number(c.n), 0);

  return (
    <>
      <AdminNav current="/admin/questions" />
      <div className="spread">
        <h1>Question bank</h1>
        <Link href="/admin/questions?edit=new" className="btn">
          + New question
        </Link>
      </div>
      <p className="small muted">
        {total("reviewed")} live · {total("draft")} drafts waiting for review · {total("retired")} retired. Only reviewed questions reach
        students. A full-length practice exam needs 150.
      </p>
      {(sp.edit === "new" || editing) && <QuestionEditor q={editing} domains={DOMAINS.map((d) => ({ id: d.id, name: d.name }))} />}
      <section className="card" style={{ overflowX: "auto" }}>
        <h3 style={{ marginTop: 0 }}>Live questions by topic (target for 150-question exams)</h3>
        <table className="data">
          <tbody>
            {DOMAINS.map((d) => (
              <tr key={d.id}>
                <td>
                  <Link href={`/admin/questions?domain=${d.id}&status=${status}`}>{d.name}</Link>
                </td>
                <td>
                  {count(d.id, "reviewed")} / {Math.round(1.5 * d.weight)}
                </td>
                <td className="small muted">{count(d.id, "draft")} drafts</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <div className="row small" style={{ marginBottom: 10 }}>
        {["all", "draft", "reviewed", "retired"].map((s) => (
          <Link key={s} href={`/admin/questions?status=${s}${sp.domain ? `&domain=${sp.domain}` : ""}`} className={`btn ${s === status ? "" : "secondary"}`} style={{ padding: "4px 10px" }}>
            {s}
          </Link>
        ))}
      </div>
      <section className="card" style={{ overflowX: "auto" }}>
        <table className="data">
          <thead>
            <tr>
              <th>Question</th>
              <th>Topic</th>
              <th>Status</th>
              <th>% right</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  {r.stem.slice(0, 120)}
                  {r.stem.length > 120 ? "…" : ""}
                  {Number(r.reports) > 0 && <span className="tag">{r.reports} report(s)</span>}
                </td>
                <td className="small">{DOMAINS.find((d) => d.id === r.domain)?.name}</td>
                <td className="small">{r.status}</td>
                <td className="small">{Number(r.seen) ? `${Math.round((100 * Number(r.right)) / Number(r.seen))}% of ${r.seen}` : "–"}</td>
                <td>
                  <Link href={`/admin/questions?edit=${r.id}&status=${status}${sp.domain ? `&domain=${sp.domain}` : ""}`}>Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
