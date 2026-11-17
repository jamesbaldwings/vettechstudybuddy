import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import Outcome from "./Outcome";

export const dynamic = "force-dynamic";
export const metadata = { title: "How did the VTNE go?", robots: { index: false } };

export default async function OutcomePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ r?: string }>;
}) {
  const { token } = await params;
  const { r } = await searchParams;
  const res = await db().query<{ first_name: string | null; exam_date: string | null }>(
    `SELECT first_name, exam_date FROM leads WHERE token = $1`,
    [token],
  );
  if (!res.rowCount) notFound();
  const initial = r === "passed" || r === "failed" || r === "not_yet" ? r : null;
  return <Outcome token={token} firstName={res.rows[0].first_name} initial={initial} />;
}
