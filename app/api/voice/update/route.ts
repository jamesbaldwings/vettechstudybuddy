import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Records the ElevenLabs conversation id and when the session ended, so transcripts can be reviewed later.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const id = String(body?.sessionId ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "Invalid session" }, { status: 400 });
  const conversationId = typeof body?.conversationId === "string" ? body.conversationId.slice(0, 100) : null;
  const ended = body?.ended === true;
  await db().query(
    `UPDATE voice_sessions SET conversation_id = COALESCE($2, conversation_id), ended_at = CASE WHEN $3 THEN now() ELSE ended_at END WHERE id = $1`,
    [id, conversationId, ended],
  );
  return NextResponse.json({ ok: true });
}
