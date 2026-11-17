import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// One-click unsubscribe (RFC 8058) from mail clients, and the button on the unsubscribe page.
export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await db().query(`UPDATE leads SET unsubscribed_at = now(), updated_at = now() WHERE token = $1`, [token]);
  return NextResponse.json({ ok: true });
}
