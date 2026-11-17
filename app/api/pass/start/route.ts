import { NextResponse } from "next/server";
import { currentLead } from "@/lib/auth";
import { activatePurchase } from "@/lib/access";
import { sendPassStartedEmail } from "@/lib/accountEmails";
import { PLANS } from "@/config";

export async function POST(req: Request) {
  const lead = await currentLead();
  if (!lead) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const body = await req.json().catch(() => null);
  const p = await activatePurchase(lead.id, String(body?.purchaseId ?? ""));
  if (!p) return NextResponse.json({ error: "That pass can't be started." }, { status: 400 });
  await sendPassStartedEmail(lead.email, lead.first_name, lead.token, PLANS[p.plan].name, p.expires_at!, p.voice_minutes).catch(() => {});
  return NextResponse.json({ ok: true, expiresAt: p.expires_at });
}
