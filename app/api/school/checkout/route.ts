import { NextResponse } from "next/server";
import { currentLead } from "@/lib/auth";
import { canManage, getSchool } from "@/lib/school";
import { checkoutBranding, stripe, stripeEnabled } from "@/lib/stripe";
import { appUrl, SCHOOL_SEAT_BLOCK, schoolSeatPrice } from "@/config";

// Schools buy more seats in blocks of 10; the per-seat price drops with larger orders.
export async function POST(req: Request) {
  const lead = await currentLead();
  const b = await req.json().catch(() => null);
  const schoolId = String(b?.schoolId ?? "");
  if (!(await canManage(lead, schoolId))) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const seats = Number(b?.seats);
  if (!Number.isInteger(seats) || seats < SCHOOL_SEAT_BLOCK || seats % SCHOOL_SEAT_BLOCK || seats > 1000)
    return NextResponse.json({ error: `Seats come in blocks of ${SCHOOL_SEAT_BLOCK}.` }, { status: 400 });
  if (!stripeEnabled()) return NextResponse.json({ error: "Online checkout isn't open yet. Email us and we'll invoice you." }, { status: 503 });
  const school = await getSchool(schoolId);
  const unit = schoolSeatPrice(seats);
  const session = await stripe<{ url: string }>("checkout/sessions", {
    mode: "payment",
    branding_settings: checkoutBranding(appUrl()),
    customer_email: lead!.email,
    client_reference_id: lead!.id,
    success_url: `${appUrl()}/school/${schoolId}?seats=added`,
    cancel_url: `${appUrl()}/school/${schoolId}`,
    line_items: {
      0: {
        quantity: seats,
        price_data: {
          currency: "usd",
          unit_amount: unit,
          product_data: { name: "Student Exam Pass seat", description: `For ${school?.name ?? "your school"}. Each seat is one student's 90-day Exam Pass.` },
        },
      },
    },
    invoice_creation: { enabled: "true" },
    metadata: { app: "vtsb", kind: "school_seats", school_id: schoolId, seats: String(seats), lead_id: lead!.id },
  });
  return NextResponse.json({ url: session.url });
}
