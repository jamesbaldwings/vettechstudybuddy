import { NextResponse } from "next/server";
import { runFollowups } from "@/lib/followups";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  if (!secret || auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  // ?today=YYYY-MM-DD lets you test the schedule; ignored unless ALLOW_TEST_DATES=1.
  const override = process.env.ALLOW_TEST_DATES === "1" ? url.searchParams.get("today") : null;
  const result = await runFollowups(override || undefined);
  return NextResponse.json(result);
}
