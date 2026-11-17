import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminNav from "../AdminNav";
import ResolveButton from "./ResolveButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reports", robots: { index: false } };

export default async function Reports() {
  await requireAdmin();
  const rows = await db()
    .query<{ id: number; message: string; created_at: Date; email: string; question_id: string; stem: string }>(
      `SELECT r.id, r.message, r.created_at, l.email, q.id question_id, q.stem FROM question_reports r
       JOIN leads l ON l.id = r.lead_id JOIN questions q ON q.id = r.question_id WHERE r.status = 'open' ORDER BY r.created_at`,
    )
    .then((r) => r.rows);
  return (
    <>
      <AdminNav current="/admin/reports" />
      <h1>Question reports</h1>
      {rows.length === 0 && <p className="muted">Nothing open. 🎉</p>}
      {rows.map((r) => (
        <section key={r.id} className="card">
          <p className="small muted" style={{ marginTop: 0 }}>
            {r.email} · {r.created_at.toLocaleDateString()}
          </p>
          <p>
            <strong>“{r.message}”</strong>
          </p>
          <p className="small">{r.stem}</p>
          <div className="row">
            <Link href={`/admin/questions?edit=${r.question_id}`} className="btn secondary">
              Edit question
            </Link>
            <ResolveButton id={r.id} />
          </div>
        </section>
      ))}
    </>
  );
}
