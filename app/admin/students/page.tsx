import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminNav from "../AdminNav";
import GrantForm from "./GrantForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Students", robots: { index: false } };

export default async function Students({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q } = await searchParams;
  const rows = await db()
    .query<{
      email: string;
      first_name: string | null;
      exam: string | null;
      outcome: string | null;
      created_at: Date;
      last_login_at: Date | null;
      answered: string;
      pass: string | null;
      minutes: string | null;
    }>(
      `SELECT l.email, l.first_name, coalesce(to_char(l.exam_date,'YYYY-MM-DD'), to_char(l.target_month,'YYYY-MM')) exam, l.outcome, l.created_at, l.last_login_at,
         (SELECT count(*) FROM practice_answers a WHERE a.lead_id = l.id) answered,
         (SELECT string_agg(p.plan || CASE WHEN p.activated_at IS NULL THEN ' (waiting)' WHEN p.expires_at < now() THEN ' (ended)' ELSE ' (active)' END, ', ')
            FROM purchases p WHERE p.lead_id = l.id AND p.status = 'paid') pass,
         (SELECT sum(minutes) FROM voice_ledger v WHERE v.lead_id = l.id) minutes
       FROM leads l WHERE ($1::text IS NULL OR l.email ILIKE '%' || $1 || '%' OR l.first_name ILIKE '%' || $1 || '%')
       ORDER BY l.created_at DESC LIMIT 100`,
      [q?.trim() || null],
    )
    .then((r) => r.rows);
  return (
    <>
      <AdminNav current="/admin/students" />
      <h1>Students</h1>
      <form className="row" style={{ marginBottom: 14 }}>
        <input name="q" defaultValue={q} placeholder="Search email or name" style={{ flex: 1 }} />
        <button className="btn">Search</button>
      </form>
      <GrantForm />
      <section className="card" style={{ overflowX: "auto" }}>
        <table className="data">
          <thead>
            <tr>
              <th>Student</th>
              <th>VTNE</th>
              <th>Passes</th>
              <th>Voice min</th>
              <th>Answers</th>
              <th>Last sign-in</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.email}>
                <td>
                  {r.first_name} <span className="small muted">{r.email}</span>
                </td>
                <td>
                  {r.exam ?? "–"} {r.outcome && <span className="tag">{r.outcome}</span>}
                </td>
                <td className="small">{r.pass ?? "free"}</td>
                <td>{r.minutes ? Math.round(Number(r.minutes)) : 0}</td>
                <td>{r.answered}</td>
                <td className="small">{r.last_login_at ? r.last_login_at.toLocaleDateString() : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
