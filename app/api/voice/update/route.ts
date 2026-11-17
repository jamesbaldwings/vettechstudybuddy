import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chargeVoiceSession, voiceBalance } from "@/lib/access";
import { VOICE_SESSION_MINUTES } from "@/config";

// Records the ElevenLabs conversation id and, when the session ends, charges the minutes used.
// Minutes are measured on the server from when the session was created, rounded up to a tenth.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const id = String(body?.sessionId ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  const conversationId = typeof body?.conversationId === "string" ? body.conversationId.slice(0, 100) : null;
  if (conversationId) await db().query(`UPDATE voice_sessions SET conversation_id = COALESCE(conversation_id, $2) WHERE id = $1`, [id, conversationId]);
  if (body?.ended === true) {
    const r = await db().query<{ secs: number; lead_id: string }>(
      `SELECT EXTRACT(EPOCH FROM now() - started_at)::float secs, lead_id FROM voice_sessions WHERE id = $1`,
      [id],
    );
    const row = r.rows[0];
    if (row) {
      // A few seconds of grace for connecting.
      const minutes = Math.min(VOICE_SESSION_MINUTES, Math.max(0.5, Math.ceil(Math.max(0, row.secs - 5) / 6) / 10));
      await chargeVoiceSession(id, minutes);
      return NextResponse.json({ ok: true, voiceMinutes: await voiceBalance(row.lead_id) });
    }
  }
  return NextResponse.json({ ok: true });
}
