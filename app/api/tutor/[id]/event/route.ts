import { NextResponse } from "next/server";
import { currentLead } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTutorSession } from "@/lib/tutor";

export const dynamic = "force-dynamic";

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, n) : "");
const truthy = (v: unknown) => v === true || v === "true" || v === "yes" || v === 1 || v === "1";
const list = (v: unknown, max: number) =>
  clip(v, 1500)
    .split(/\s*[;,|\n]\s*/)
    .map((x) => x.trim())
    .filter((x) => x && x.toLowerCase() !== "none")
    .slice(0, max)
    .map((x) => x.slice(0, 120));

// Events from a tutor session: transcript lines, understanding checks and the wrap-up Sara reports
// through her tools, and the student ending the session.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const lead = await currentLead();
  if (!lead) return NextResponse.json({ error: "Sign in." }, { status: 401 });
  const { id } = await params;
  const s = await getTutorSession(id, lead.id);
  if (!s) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const b = await req.json().catch(() => null);
  const type = String(b?.type ?? "");

  if (type === "message") {
    const who = b?.who === "sara" ? "sara" : "student";
    const text = clip(b?.text, 2000);
    if (!text) return NextResponse.json({ ok: true });
    await db().query(
      `UPDATE tutor_sessions SET transcript = CASE WHEN jsonb_array_length(transcript) < 400 THEN transcript || $2::jsonb ELSE transcript END,
         last_activity_at = now() WHERE id = $1`,
      [s.id, JSON.stringify([{ who, text, at: new Date().toISOString() }])],
    );
    return NextResponse.json({ ok: true });
  }

  if (type === "check") {
    const passed = truthy(b?.passed);
    await db().query(`INSERT INTO tutor_checks (session_id, lead_id, concept, passed) VALUES ($1, $2, $3, $4)`, [
      s.id,
      lead.id,
      clip(b?.concept, 200) || null,
      passed,
    ]);
    await db().query(
      `UPDATE tutor_sessions SET checks_passed = checks_passed + $2, checks_failed = checks_failed + $3, last_activity_at = now() WHERE id = $1`,
      [s.id, passed ? 1 : 0, passed ? 0 : 1],
    );
    return NextResponse.json({ ok: true, passed });
  }

  if (type === "finish") {
    // Practice questions come as "question => answer | question => answer".
    const practice = clip(b?.practice, 4000)
      .split(/\s*\|\s*/)
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 6)
      .map((x) => {
        const [q, a] = x.split(/\s*=>\s*/);
        return { q: q.slice(0, 400), a: a ? a.slice(0, 400) : null };
      });
    await db().query(
      `UPDATE tutor_sessions SET recap = $2, mastered = $3, struggled = $4, related = $5, practice = $6, last_activity_at = now() WHERE id = $1`,
      [
        s.id,
        clip(b?.recap, 1500) || null,
        truthy(b?.mastered),
        JSON.stringify(list(b?.struggled, 8)),
        JSON.stringify(list(b?.related, 6)),
        JSON.stringify(practice),
      ],
    );
    return NextResponse.json({ ok: true });
  }

  if (type === "end") {
    // If Sara never wrapped up, judge mastery from the checks: at least 3 passed and more passed than missed.
    await db().query(
      `UPDATE tutor_sessions SET ended_at = COALESCE(ended_at, now()),
         mastered = COALESCE(mastered, CASE WHEN checks_passed + checks_failed = 0 THEN NULL ELSE checks_passed >= 3 AND checks_passed > checks_failed END)
       WHERE id = $1`,
      [s.id],
    );
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown event." }, { status: 400 });
}
