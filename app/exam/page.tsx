import Link from "next/link";
import { requireLead } from "@/lib/auth";
import { getAccess } from "@/lib/access";
import { db } from "@/lib/db";
import { EXAM_MAX_QUESTIONS, EXAM_SECONDS_PER_QUESTION } from "@/config";
import StartExam from "./StartExam";

export const dynamic = "force-dynamic";
export const metadata = { title: "Practice exam", robots: { index: false } };

export default async function ExamHome() {
  const lead = await requireLead("/exam");
  const access = await getAccess(lead.id);
  const [count, past] = await Promise.all([
    db().query<{ n: string }>(`SELECT count(*) n FROM questions WHERE status = 'reviewed'`).then((r) => Number(r.rows[0].n)),
    db()
      .query<{ id: string; finished_at: Date; score: number; total: number }>(
        `SELECT id, finished_at, score, total FROM practice_exams WHERE lead_id = $1 AND finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 10`,
        [lead.id],
      )
      .then((r) => r.rows),
  ]);
  const n = Math.min(EXAM_MAX_QUESTIONS, count);
  const mins = Math.round((n * EXAM_SECONDS_PER_QUESTION) / 60);
  return (
    <>
      <p className="small">
        <Link href="/home">← Study home</Link>
      </p>
      <section className="card">
        <h1 style={{ fontSize: "1.5rem" }}>Practice exam</h1>
        <p>
          {n} questions, {mins} minutes, weighted by topic like the real VTNE. You can flag questions and come back to them. Your answers save
          as you go, so a dropped connection won&apos;t cost you.
        </p>
        {n < EXAM_MAX_QUESTIONS && (
          <p className="small muted">The full VTNE has 150 scored questions. This exam grows to full length as the question bank fills out.</p>
        )}
        {access.activePass ? (
          <StartExam />
        ) : (
          <Link href="/pricing" className="btn">
            Practice exams come with a pass
          </Link>
        )}
      </section>
      {past.length > 0 && (
        <section className="card">
          <h2>Past exams</h2>
          <table className="data">
            <tbody>
              {past.map((p) => (
                <tr key={p.id}>
                  <td>{p.finished_at.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
                  <td>
                    {p.score}/{p.total} ({Math.round((100 * p.score) / Math.max(1, p.total))}%)
                  </td>
                  <td>
                    <Link href={`/exam/${p.id}/results`}>Review</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
