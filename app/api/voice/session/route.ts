import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentLead, Lead } from "@/lib/auth";
import { getAccess } from "@/lib/access";
import { saraContext, whyContext } from "@/lib/studentContext";
import { BUDDY_NAME, VOICE_SESSION_MINUTES, VOICE_SESSIONS_PER_DAY, WHY_FREE_PER_DAY, WHY_PASS_PER_DAY } from "@/config";

export const dynamic = "force-dynamic";
const TEXT_SESSIONS_PER_DAY = 40;

// Starts a conversation with Sara (voice, or text for pass holders). Gets a one-time signed URL from
// ElevenLabs so the API key never reaches the browser, and passes the student's context to Sara.
export async function POST(req: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!apiKey || !agentId) return NextResponse.json({ error: `${BUDDY_NAME} isn't switched on yet. Check back soon!` }, { status: 503 });

  const body = await req.json().catch(() => null);
  const mode: "voice" | "text" | "why" = body?.mode === "text" ? "text" : body?.mode === "why" ? "why" : "voice";

  let lead: Lead | null = await currentLead();
  if (!lead && body?.attemptToken) {
    const r = await db().query<Lead>(
      `SELECT l.* FROM attempts a JOIN leads l ON l.id = a.lead_id WHERE a.public_token = $1 AND a.completed_at IS NOT NULL`,
      [String(body.attemptToken)],
    );
    lead = r.rows[0] ?? null;
  }
  if (!lead) return NextResponse.json({ error: `Sign in to talk with ${BUDDY_NAME}.`, signin: true }, { status: 401 });

  const access = await getAccess(lead.id);
  let maxMinutes = VOICE_SESSION_MINUTES;
  let why: Awaited<ReturnType<typeof whyContext>> = null;
  if (mode === "why") {
    // Always built from the student's own saved answer, never from what the browser sends.
    why = await whyContext(lead.id, String(body?.questionId ?? ""));
    if (!why) return NextResponse.json({ error: "Answer the question first, then ask me why." }, { status: 400 });
  } else if (mode === "text") {
    if (!access.activePass)
      return NextResponse.json({ error: `Text chat with ${BUDDY_NAME} comes with a pass.`, upgrade: true }, { status: 402 });
  } else {
    if (access.voiceMinutes < 1)
      return NextResponse.json(
        { error: `You're out of voice minutes. Add more to keep talking with ${BUDDY_NAME}.`, upgrade: true },
        { status: 402 },
      );
    maxMinutes = Math.min(VOICE_SESSION_MINUTES, Math.floor(access.voiceMinutes));
  }

  const used = await db().query<{ n: string }>(
    `SELECT count(*) n FROM voice_sessions WHERE lead_id = $1 AND mode = $2 AND started_at > now() - interval '24 hours'`,
    [lead.id, mode],
  );
  const cap =
    mode === "voice" ? VOICE_SESSIONS_PER_DAY : mode === "why" ? (access.activePass ? WHY_PASS_PER_DAY : WHY_FREE_PER_DAY) : TEXT_SESSIONS_PER_DAY;
  if (Number(used.rows[0].n) >= cap)
    return NextResponse.json(
      mode === "why" && !access.activePass
        ? { error: `That's your ${WHY_FREE_PER_DAY} free "why" chats for today. A pass gives you as many as you need.`, upgrade: true }
        : { error: `That's a lot of studying today! ${BUDDY_NAME} will be ready again tomorrow.` },
      { status: 429 },
    );

  const signed = await fetch(
    `${process.env.ELEVENLABS_API_BASE || "https://api.elevenlabs.io"}/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`,
    { headers: { "xi-api-key": apiKey }, cache: "no-store" },
  );
  if (!signed.ok) {
    console.error("ElevenLabs signed URL failed", signed.status, (await signed.text()).slice(0, 300));
    return NextResponse.json({ error: `${BUDDY_NAME} can't connect right now. Please try again in a minute.` }, { status: 502 });
  }
  const { signed_url } = (await signed.json()) as { signed_url: string };

  const attempt = await db().query<{ id: string }>(
    `SELECT id FROM attempts WHERE lead_id = $1 AND completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 1`,
    [lead.id],
  );
  const session = await db().query<{ id: string }>(
    `INSERT INTO voice_sessions (lead_id, attempt_id, mode, question_id) VALUES ($1, $2, $3, $4) RETURNING id`,
    [lead.id, attempt.rows[0]?.id ?? null, mode, mode === "why" ? String(body.questionId) : null],
  );

  return NextResponse.json({
    sessionId: session.rows[0].id,
    signedUrl: signed_url,
    maxSeconds: maxMinutes * 60,
    voiceMinutes: access.voiceMinutes,
    dynamicVariables: why
      ? { ...(await saraContext(lead)), session_mode: "why", focus: why.focus, opening_line: why.opening }
      : await saraContext(lead),
  });
}
