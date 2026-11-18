import { requireSchool } from "../guard";
import SchoolNav from "../SchoolNav";
import { seatSummary } from "@/lib/school";
import { db } from "@/lib/db";
import { money, SCHOOL_SEAT_BLOCK, SCHOOL_SEAT_TIERS } from "@/config";
import BuySeats from "./BuySeats";

export const dynamic = "force-dynamic";
export const metadata = { title: "Seats", robots: { index: false } };

export default async function Seats({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { school } = await requireSchool(id, `/school/${id}/seats`);
  const [seats, orders] = await Promise.all([
    seatSummary(id),
    db()
      .query<{ seats: number; amount_cents: number; source: string; created_at: Date }>(
        `SELECT seats, amount_cents, source, created_at FROM school_seat_orders WHERE school_id = $1 ORDER BY created_at DESC`,
        [id],
      )
      .then((r) => r.rows),
  ]);
  const tiers = [...SCHOOL_SEAT_TIERS].reverse();
  return (
    <>
      <SchoolNav id={id} name={school.name} current={`/school/${id}/seats`} />
      <h1>Seats</h1>
      <section className="card">
        <p style={{ marginTop: 0 }}>
          <strong>{seats.total}</strong> seats · {seats.assigned} assigned · {seats.claimed} claimed · <strong>{seats.available}</strong> open
        </p>
        <p className="small muted" style={{ marginBottom: 0 }}>
          A seat is one student&apos;s 90-day Exam Pass. It&apos;s used when you add the student; you get it back if you remove them before they join.
          Once a student joins, the seat is theirs.
        </p>
      </section>
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Add seats</h2>
        <p className="small">Seats come in blocks of {SCHOOL_SEAT_BLOCK}. Bigger orders cost less per seat:</p>
        <table className="stats" style={{ maxWidth: 360 }}>
          <tbody>
            {tiers.map((t, i) => (
              <tr key={t.min}>
                <td>
                  {t.min}
                  {tiers[i + 1] ? `–${tiers[i + 1].min - SCHOOL_SEAT_BLOCK}` : "+"} seats
                </td>
                <td>{money(t.centsPerSeat)} each</td>
              </tr>
            ))}
          </tbody>
        </table>
        <BuySeats schoolId={id} />
        <p className="small muted">Need an invoice or purchase order instead? Email us and we&apos;ll set it up.</p>
      </section>
      {orders.length > 0 && (
        <section className="card">
          <h2 style={{ marginTop: 0 }}>History</h2>
          <table className="stats">
            <tbody>
              {orders.map((o, i) => (
                <tr key={i}>
                  <td>{o.created_at.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                  <td>{o.seats} seats</td>
                  <td>{o.source === "comp" ? "Included" : o.amount_cents ? money(o.amount_cents) : "–"}</td>
                  <td className="small muted">{o.source === "stripe" ? "Card" : o.source === "invoice" ? "Invoice" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </>
  );
}
