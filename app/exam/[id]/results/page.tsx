import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireLead } from "@/lib/auth";
import { getExam } from "@/lib/exam";
import { db } from "@/lib/db";
import { domainById } from "@/data/questions";
import { Buddy } from "@/components/Buddy";
import { BUDDY_NAME } from "@/config";
import AskWhy from "@/components/AskWhy";

export const dynamic = "force-dynamic";
export const metadata = { title: "Exam results", robots: { index: false } };
const LETTERS = ["A", "B", "C", "D"];

export default async function ExamResults({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await requireLead(`/exam/${id}/results`);
  const e = await getExam(id, lead.id);
  if (!e) notFound();
  if (!e.finished_at) redirect(`/exam/${id}`);
  const qs = await db().query<{ id: string; domain: string; stem: string; options: string[]; answer: number; explanation: string }>(
    `SELECT id, domain, stem, options, answer, explanation FROM questions WHERE id = ANY($1)`,
    [e.question_ids],
  );
  const map = new Map(qs.rows.map((q) => [q.id, q]));
  const pct = Math.round((100 * (e.score ?? 0)) / Math.max(1, e.total ?? 0));
  const topics = (e.domain_scores ?? [])
    .map((d) => ({ ...d, name: domainById(d.domain).name, pct: Math.round((100 * d.correct) / Math.max(1, d.total)) }))
    .sort((a, b) => a.pct - b.pct);
  const missed = e.question_ids
    .map((qid, i) => ({ q: map.get(qid)!, i, chosen: e.answers[i], flagged: e.flagged.includes(i) }))
    .filter((m) => m.q && m.chosen !== m.q.answer);

  return (
    <>
      <p className="small">
        <Link href="/home">← Study home</Link>
      </p>
      <Buddy>
        <p>
          {pct >= 75
            ? "That's a strong result. Keep your weak topics warm and you'll walk in ready."
            : pct >= 60
              ? "Solid work. The topics at the top of the list below are where your next points are."
              : "Every exam shows us exactly what to work on. Let's go after the top of this list."}
        </p>
      </Buddy>
      <section className="card center">
        <div className="score-big">{pct}%</div>
        <p className="muted" style={{ marginBottom: 0 }}>
          {e.score} of {e.total} correct. Practice exam scores aren&apos;t VTNE scaled scores, but a steady 70%+ on weighted practice is a
          good sign.
        </p>
      </section>
      <section className="card">
        <h2>By topic</h2>
        {topics.map((t) => (
          <div key={t.domain} style={{ marginBottom: 10 }}>
            <div className="spread small">
              <span>{t.name}</span>
              <span>
                {t.correct}/{t.total}
              </span>
            </div>
            <div className="bar">
              <i style={{ width: `${t.pct}%` }} />
            </div>
          </div>
        ))}
        <div className="row" style={{ marginTop: 14 }}>
          <Link href="/practice" className="btn">
            Practice weak topics
          </Link>
          <Link href="/sara" className="btn secondary">
            Go over it with {BUDDY_NAME}
          </Link>
        </div>
      </section>
      {missed.length > 0 && (
        <section className="card">
          <h2>Questions to review ({missed.length})</h2>
          {missed.map(({ q, i, chosen, flagged }) => (
            <div key={q.id} style={{ borderTop: "1px solid var(--line)", paddingTop: 12, marginTop: 12 }}>
              <p className="small muted" style={{ margin: 0 }}>
                Q{i + 1} · {domainById(q.domain as never).name} {flagged && "· ★ flagged"}
              </p>
              <p style={{ fontWeight: 600 }}>{q.stem}</p>
              <p className="small" style={{ margin: "0 0 4px" }}>
                Your answer: {chosen == null ? "blank" : `${LETTERS[chosen]}. ${q.options[chosen]}`}
              </p>
              <p className="small" style={{ margin: "0 0 4px" }}>
                <strong>
                  Correct: {LETTERS[q.answer]}. {q.options[q.answer]}
                </strong>
              </p>
              <p className="small muted">{q.explanation}</p>
              <AskWhy questionId={q.id} />
            </div>
          ))}
        </section>
      )}
    </>
  );
}
