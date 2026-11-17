import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { QUESTIONS, domainById } from "@/data/questions";
import { DomainScore, rankWeakDomains } from "@/lib/scoring";
import { daysBetween, prettyDate, prettyMonth, todayISO } from "@/lib/dates";
import { VOICE_SESSIONS_PER_DAY } from "@/config";

export const dynamic = "force-dynamic";
const LETTERS = ["A", "B", "C", "D"];

interface Row {
  attempt_id: string;
  answers: (number | null)[];
  score: number;
  domain_scores: DomainScore[];
  confidence: number | null;
  lead_id: string | null;
  first_name: string | null;
  exam_date: string | null;
  target_month: string | null;
}

// Starts a voice session with Sara: checks the daily limit, gets a one-time signed connection URL
// from ElevenLabs (the API key never reaches the browser), and passes the student's context to Sara.
export async function POST(req: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!apiKey || !agentId) return NextResponse.json({ error: "Voice study isn't switched on yet. Check back soon!" }, { status: 503 });

  const body = await req.json().catch(() => null);
  const token = String(body?.attemptToken ?? "");
  const res = await db().query<Row>(
    `SELECT a.id attempt_id, a.answers, a.score, a.domain_scores, a.confidence, l.id lead_id, l.first_name, l.exam_date, l.target_month
     FROM attempts a LEFT JOIN leads l ON l.id = a.lead_id
     WHERE a.public_token = $1 AND a.completed_at IS NOT NULL`,
    [token],
  );
  const r = res.rows[0];
  if (!r || !r.lead_id) return NextResponse.json({ error: "Finish the diagnostic and sign up to talk with Sara." }, { status: 403 });

  const used = await db().query<{ n: string }>(
    `SELECT count(*) n FROM voice_sessions WHERE lead_id = $1 AND started_at > now() - interval '24 hours'`,
    [r.lead_id],
  );
  const usedToday = Number(used.rows[0].n);
  if (usedToday >= VOICE_SESSIONS_PER_DAY)
    return NextResponse.json(
      { error: `You've had ${VOICE_SESSIONS_PER_DAY} voice sessions in the last 24 hours. Sara will be ready again tomorrow.` },
      { status: 429 },
    );

  const signed = await fetch(`${process.env.ELEVENLABS_API_BASE || "https://api.elevenlabs.io"}/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`, {
    headers: { "xi-api-key": apiKey },
    cache: "no-store",
  });
  if (!signed.ok) {
    console.error("ElevenLabs signed URL failed", signed.status, (await signed.text()).slice(0, 300));
    return NextResponse.json({ error: "Sara can't connect right now. Please try again in a minute." }, { status: 502 });
  }
  const { signed_url } = (await signed.json()) as { signed_url: string };

  const today = todayISO();
  let examText = "not set yet";
  let daysLeft = "date not set";
  if (r.exam_date) {
    examText = prettyDate(r.exam_date);
    const d = daysBetween(today, r.exam_date);
    daysLeft = d > 0 ? `${d} days away` : d === 0 ? "today" : "already taken";
  } else if (r.target_month) {
    examText = `sometime in ${prettyMonth(r.target_month)}`;
    daysLeft = "exact date not booked yet";
  }

  const missed = QUESTIONS.map((q, i) => ({ q, i, a: r.answers?.[i] }))
    .filter((m) => m.a !== m.q.answer)
    .map(
      ({ q, i, a }) =>
        `Question ${i + 1} (${domainById(q.domain).name}): "${q.stem}" They answered ${a == null ? "nothing" : `${LETTERS[a]} (${q.options[a]})`}; correct is ${LETTERS[q.answer]} (${q.options[q.answer]}).`,
    );

  const session = await db().query<{ id: string }>(
    `INSERT INTO voice_sessions (lead_id, attempt_id) VALUES ($1, $2) RETURNING id`,
    [r.lead_id, r.attempt_id],
  );

  return NextResponse.json({
    sessionId: session.rows[0].id,
    signedUrl: signed_url,
    remainingToday: VOICE_SESSIONS_PER_DAY - usedToday - 1,
    dynamicVariables: {
      first_name: r.first_name?.trim() || "there",
      exam_date: examText,
      days_left: daysLeft,
      confidence: String(r.confidence ?? 3),
      score: String(r.score),
      weak_areas: rankWeakDomains(r.domain_scores).slice(0, 3).map((d) => d.name).join(", "),
      missed_questions: missed.length ? missed.join(" ") : "none. They got everything right!",
    },
  });
}
