import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { newToken } from "@/lib/tokens";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const c = Number(body.confidence);
  const confidence = Number.isInteger(c) && c >= 1 && c <= 5 ? c : null;
  const token = newToken();
  await db().query(`INSERT INTO attempts (public_token, confidence) VALUES ($1, $2)`, [token, confidence]);
  return NextResponse.json({ attemptToken: token });
}
