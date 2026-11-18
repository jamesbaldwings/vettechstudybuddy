import { NextResponse } from "next/server";
import { currentOwner } from "@/lib/auth";
import { createSchool } from "@/lib/school";

export async function POST(req: Request) {
  const owner = await currentOwner();
  if (!owner) return NextResponse.json({ error: "no" }, { status: 401 });
  const b = await req.json().catch(() => null);
  const name = String(b?.name ?? "").trim().slice(0, 120);
  const seats = Number(b?.seats ?? 0);
  const amountCents = Math.round(Number(b?.amount ?? 0) * 100);
  if (!name) return NextResponse.json({ error: "Enter the school's name." }, { status: 400 });
  if (!Number.isInteger(seats) || seats < 0 || seats > 5000) return NextResponse.json({ error: "Seats must be a whole number." }, { status: 400 });
  if (!Number.isFinite(amountCents) || amountCents < 0) return NextResponse.json({ error: "Amount must be a number." }, { status: 400 });
  const id = await createSchool({
    name,
    note: String(b?.note ?? "").trim() || null,
    seats,
    amountCents,
    source: b?.source === "comp" ? "comp" : "invoice",
    adminEmail: String(b?.adminEmail ?? "").trim() || null,
    adminName: String(b?.adminName ?? "").trim() || null,
    by: owner.id,
  });
  return NextResponse.json({ ok: true, id });
}
