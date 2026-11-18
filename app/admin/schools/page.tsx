import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { money, SCHOOL_PACKAGES } from "@/config";
import AdminNav from "../AdminNav";
import NewSchool from "./NewSchool";
import AddSeats from "./AddSeats";

export const dynamic = "force-dynamic";
export const metadata = { title: "Schools", robots: { index: false } };

export default async function Schools() {
  await requireAdmin();
  const rows = await db()
    .query<{ id: string; name: string; note: string | null; total: string; assigned: string; claimed: string; revenue: string; admins: string | null }>(
      `SELECT s.id, s.name, s.note,
         (SELECT coalesce(sum(seats),0) FROM school_seat_orders o WHERE o.school_id = s.id) total,
         (SELECT count(*) FROM school_invites i WHERE i.school_id = s.id AND i.kind='student' AND i.revoked_at IS NULL) assigned,
         (SELECT count(*) FROM school_invites i WHERE i.school_id = s.id AND i.kind='student' AND i.used_at IS NOT NULL) claimed,
         (SELECT coalesce(sum(amount_cents),0) FROM school_seat_orders o WHERE o.school_id = s.id) revenue,
         (SELECT string_agg(email || CASE WHEN used_at IS NULL THEN ' (invited)' ELSE '' END, ', ') FROM school_invites i WHERE i.school_id = s.id AND i.kind='admin' AND i.revoked_at IS NULL) admins
       FROM schools s ORDER BY s.created_at DESC`,
    )
    .then((r) => r.rows);
  return (
    <>
      <AdminNav current="/admin/schools" />
      <h1>Schools</h1>
      <p className="small muted">
        Packages: {SCHOOL_PACKAGES.map((p) => `${p.seats} seats ${money(p.priceCents)}`).join(" · ")}. Schools can buy more seats themselves in blocks of 10.
      </p>
      <NewSchool />
      <section className="card" style={{ overflowX: "auto" }}>
        <table className="stats">
          <thead>
            <tr>
              <th>School</th>
              <th>Seats</th>
              <th>Revenue</th>
              <th>Admins</th>
              <th>Add seats</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/school/${r.id}`}>{r.name}</Link>
                  {r.note && <div className="small muted">{r.note}</div>}
                </td>
                <td className="small">
                  {r.assigned}/{r.total} assigned · {r.claimed} claimed
                </td>
                <td className="small">{money(Number(r.revenue))}</td>
                <td className="small">{r.admins ?? "–"}</td>
                <td>
                  <AddSeats schoolId={r.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="small muted">No schools yet.</p>}
      </section>
    </>
  );
}
