import { NextResponse } from "next/server";
import { currentLead } from "@/lib/auth";
import { canManage, sendInvite } from "@/lib/school";
import { db } from "@/lib/db";

// Re-email the same join link to a student (or admin) who hasn't used it yet.
export async function POST(req: Request) {
  const lead = await currentLead();
  const b = await req.json().catch(() => null);
  const schoolId = String(b?.schoolId ?? "");
  const inviteId = String(b?.inviteId ?? "");
  if (!(await canManage(lead, schoolId))) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  if (!/^[0-9a-f-]{36}$/.test(inviteId)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const own = await db().query(`SELECT 1 FROM school_invites WHERE id = $1 AND school_id = $2`, [inviteId, schoolId]);
  if (!own.rowCount) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const r = await sendInvite(inviteId, true);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
