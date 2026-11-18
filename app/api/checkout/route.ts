import { NextResponse } from "next/server";
import { currentLead } from "@/lib/auth";
import { foundingSpotsLeft } from "@/lib/access";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { appUrl, PLANS, PlanId } from "@/config";

export async function POST(req: Request) {
  const lead = await currentLead();
  if (!lead) return NextResponse.json({ error: "Please sign in first.", signin: true }, { status: 401 });
  if (!stripeEnabled()) return NextResponse.json({ error: "Checkout isn't open yet. Check back soon!" }, { status: 503 });
  const body = await req.json().catch(() => null);
  const plan = PLANS[body?.plan as PlanId];
  if (!plan) return NextResponse.json({ error: "Unknown plan." }, { status: 400 });

  const founding = plan.id === "exam_pass" && !!plan.foundingPriceCents && (await foundingSpotsLeft()) > 0;
  const amount = founding ? plan.foundingPriceCents! : plan.priceCents;
  const session = await stripe<{ url: string; id: string }>("checkout/sessions", {
    mode: "payment",
    customer_email: lead.email,
    client_reference_id: lead.id,
    success_url: `${appUrl()}/home?purchased=1`,
    cancel_url: `${appUrl()}/pricing`,
    allow_promotion_codes: "true",
    line_items: {
      0: {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amount,
          product_data: { name: `${plan.name}${founding ? " (founding price)" : ""}`, description: plan.blurb },
        },
      },
    },
    payment_intent_data: { description: `Vet Tech Study Buddy: ${plan.name}`, metadata: { app: "vtsb" } },
    metadata: { app: "vtsb", lead_id: lead.id, plan: plan.id, founding: founding ? "1" : "0" },
  });
  return NextResponse.json({ url: session.url });
}
