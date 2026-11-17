import { NextResponse } from "next/server";
import { currentLead } from "@/lib/auth";
import { getAccess } from "@/lib/access";
import { nextQuestion, PracticeSet } from "@/lib/practice";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const lead = await currentLead();
  if (!lead) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const u = new URL(req.url);
  const set = (u.searchParams.get("set") || "mixed") as PracticeSet;
  const access = await getAccess(lead.id);
  if (access.freePracticeLeft === 0) return NextResponse.json({ limit: true, freePracticeLeft: 0 });
  const q = await nextQuestion(lead.id, set, u.searchParams.get("exclude") || undefined);
  return NextResponse.json({ question: q, freePracticeLeft: access.freePracticeLeft });
}
