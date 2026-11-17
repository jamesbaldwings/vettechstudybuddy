import { notFound, redirect } from "next/navigation";
import { requireLead } from "@/lib/auth";
import { finishExam, getExam, secondsLeft } from "@/lib/exam";
import { db } from "@/lib/db";
import TakeExam from "./TakeExam";

export const dynamic = "force-dynamic";
export const metadata = { title: "Practice exam", robots: { index: false } };

export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await requireLead(`/exam/${id}`);
  const e = await getExam(id, lead.id);
  if (!e) notFound();
  if (!e.finished_at && secondsLeft(e) <= 0) await finishExam(e);
  if (e.finished_at || secondsLeft(e) <= 0) redirect(`/exam/${id}/results`);
  const qs = await db().query<{ id: string; stem: string; options: string[] }>(`SELECT id, stem, options FROM questions WHERE id = ANY($1)`, [
    e.question_ids,
  ]);
  const map = new Map(qs.rows.map((q) => [q.id, q]));
  const questions = e.question_ids.map((qid) => map.get(qid)!).filter(Boolean);
  return <TakeExam id={e.id} questions={questions} answers={e.answers} flagged={e.flagged} secondsLeft={secondsLeft(e)} />;
}
