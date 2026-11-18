import { NextResponse } from "next/server";
import { currentOwner } from "@/lib/auth";
import { addSeats, getSchool } from "@/lib/school";

// Owner records seats paid by invoice or PO, or given free.
export async function POST(req: Request) {
  const owner = await currentOwner();
  if (!owner) return NextResponse.json({ error: "no" }, { status: 401 });
  const b = await req.json().catch(() => null);
  const school = await getSchool(String(b?.schoolId ?? ""));
  const seats = Number(b?.seats);
  const amountCents = Math.round(Number(b?.amount ?? 0) * 100);
  if (!school) return NextResponse.json({ error: "School not found." }, { status: 404 });
  if (!Number.isInteger(seats) || seats < 1 || seats > 5000) return NextResponse.json({ error: "Seats must be a whole number." }, { status: 400 });
  await addSeats(school.id, seats, Math.max(0, amountCents || 0), b?.source === "comp" ? "comp" : "invoice", null, String(b?.note ?? "").trim() || null);
  return NextResponse.json({ ok: true });
}
