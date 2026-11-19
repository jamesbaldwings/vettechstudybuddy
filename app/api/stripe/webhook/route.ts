import { NextResponse } from "next/server";
import { verifyStripeSignature } from "@/lib/stripe";
import { recordPurchase } from "@/lib/access";
import { db } from "@/lib/db";
import { PLANS, PlanId } from "@/config";
import { addSeats } from "@/lib/school";
import { alertPurchase } from "@/lib/ownerAlerts";

export async function POST(req: Request) {
  const payload = await req.text();
  if (!verifyStripeSignature(payload, req.headers.get("stripe-signature"), process.env.STRIPE_WEBHOOK_SECRET || ""))
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  const event = JSON.parse(payload);
  const obj = event.data?.object ?? {};
  // The Stripe account is shared with other Agsperience products: only act on checkouts this app created.
  if (event.type === "checkout.session.completed" && obj.metadata?.app !== "vtsb") return NextResponse.json({ received: true, ignored: true });

  if (event.type === "checkout.session.completed" && obj.payment_status === "paid" && obj.metadata?.kind === "school_seats") {
    const seats = Number(obj.metadata.seats);
    if (obj.metadata.school_id && Number.isInteger(seats) && seats > 0)
      await addSeats(obj.metadata.school_id, seats, obj.amount_total ?? 0, "stripe", obj.id, null);
    await alertPurchase({ leadId: obj.metadata?.lead_id || obj.client_reference_id, what: `${seats} school seats`, amountCents: obj.amount_total ?? 0 });
    return NextResponse.json({ received: true });
  }
  if (event.type === "checkout.session.completed" && obj.payment_status === "paid") {
    const plan = obj.metadata?.plan as PlanId;
    const leadId = obj.metadata?.lead_id || obj.client_reference_id;
    if (PLANS[plan] && leadId) {
      await recordPurchase({
        leadId,
        plan,
        amountCents: obj.amount_total ?? 0,
        founding: obj.metadata?.founding === "1",
        source: "stripe",
        stripeSessionId: obj.id,
        stripePaymentIntent: obj.payment_intent ?? null,
      });
      await alertPurchase({ leadId, what: PLANS[plan].name, amountCents: obj.amount_total ?? 0 });
    }
  }
  if (event.type === "charge.refunded" && obj.payment_intent && obj.refunded) {
    const r = await db().query<{ id: string; lead_id: string; voice_minutes: number; activated_at: Date | null }>(
      `UPDATE purchases SET status = 'refunded' WHERE stripe_payment_intent = $1 AND status = 'paid' RETURNING id, lead_id, voice_minutes, activated_at`,
      [obj.payment_intent],
    );
    // Take back any voice minutes the refunded purchase added.
    for (const p of r.rows)
      if (p.activated_at)
        await db().query(`INSERT INTO voice_ledger (lead_id, minutes, reason) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, [
          p.lead_id,
          -p.voice_minutes,
          `refund:${p.id}`,
        ]);
  }
  return NextResponse.json({ received: true });
}
