import { NextResponse } from "next/server";
import { currentLead } from "@/lib/auth";
import { addStudents, canManage, parseRoster } from "@/lib/school";

export async function POST(req: Request) {
  const lead = await currentLead();
  const b = await req.json().catch(() => null);
  const schoolId = String(b?.schoolId ?? "");
  if (!(await canManage(lead, schoolId))) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const { students, bad } = parseRoster(String(b?.text ?? "").slice(0, 100_000));
  if (!students.length) return NextResponse.json({ error: "Add at least one student email.", bad }, { status: 400 });
  const r = await addStudents(schoolId, lead!.id, students);
  if (!r.ok) return NextResponse.json({ error: r.error, bad }, { status: 409 });
  return NextResponse.json({ ...r, bad });
}
