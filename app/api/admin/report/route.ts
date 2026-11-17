import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "no" }, { status: 401 });
  const b = await req.json().catch(() => null);
  await db().query(`UPDATE question_reports SET status = 'resolved' WHERE id = $1`, [Number(b?.id)]);
  return NextResponse.json({ ok: true });
}
