import { NextResponse } from "next/server";
import { currentLead } from "@/lib/auth";
import { canManage, revokeInvite } from "@/lib/school";

// Removes a student who hasn't joined yet and returns their seat. A used seat can't be returned.
export async function POST(req: Request) {
  const lead = await currentLead();
  const b = await req.json().catch(() => null);
  const schoolId = String(b?.schoolId ?? "");
  if (!(await canManage(lead, schoolId))) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  if (!(await revokeInvite(schoolId, String(b?.inviteId ?? ""))))
    return NextResponse.json({ error: "That student has already joined, so the seat is used." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
