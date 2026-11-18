import { NextResponse } from "next/server";
import { currentLead } from "@/lib/auth";
import { addAdminInvite, canManage } from "@/lib/school";
import { appUrl } from "@/config";

// A school admin (or the owner) adds another admin for the school, such as a program director.
export async function POST(req: Request) {
  const lead = await currentLead();
  const b = await req.json().catch(() => null);
  const schoolId = String(b?.schoolId ?? "");
  if (!(await canManage(lead, schoolId))) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const token = await addAdminInvite(schoolId, String(b?.email ?? ""), String(b?.name ?? "").trim() || null, lead!.id);
  if (!token) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  return NextResponse.json({ ok: true, link: `${appUrl()}/join/${token}` });
}
