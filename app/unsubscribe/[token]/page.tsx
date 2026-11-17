import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import Unsub from "./Unsub";

export const dynamic = "force-dynamic";
export const metadata = { title: "Unsubscribe", robots: { index: false } };

export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const res = await db().query(`SELECT 1 FROM leads WHERE token = $1`, [token]);
  if (!res.rowCount) notFound();
  return <Unsub token={token} />;
}
