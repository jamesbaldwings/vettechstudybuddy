import { requireSchool } from "../guard";
import SchoolNav from "../SchoolNav";
import { seatSummary } from "@/lib/school";
import { schoolStudents } from "@/lib/schoolReports";
import { db } from "@/lib/db";
import { appUrl } from "@/config";
import AddStudents from "./AddStudents";
import RowActions from "./RowActions";
import AddAdmin from "./AddAdmin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Students", robots: { index: false } };

const d = (x: Date | null) => (x ? x.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "–");

export default async function SchoolStudentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { school } = await requireSchool(id, `/school/${id}/students`);
  const [seats, rows, admins] = await Promise.all([
    seatSummary(id),
    schoolStudents(id),
    db()
      .query<{ id: string; email: string; name: string | null; used_at: Date | null; token: string; sent_count: number; last_sent_at: Date | null }>(
        `SELECT id, email, name, used_at, token, sent_count, last_sent_at FROM school_invites WHERE school_id = $1 AND kind = 'admin' AND revoked_at IS NULL ORDER BY created_at`,
        [id],
      )
      .then((r) => r.rows),
  ]);
  const sends = await db()
    .query<{ id: string; sent_count: number; last_sent_at: Date | null }>(`SELECT id, sent_count, last_sent_at FROM school_invites WHERE school_id = $1`, [id])
    .then((r) => new Map(r.rows.map((x) => [x.id, x])));
  const base = appUrl();
  return (
    <>
      <SchoolNav id={id} name={school.name} current={`/school/${id}/students`} />
      <h1>Students</h1>
      <AddStudents schoolId={id} available={seats.available} total={seats.total} />

      <section className="card" style={{ overflowX: "auto" }}>
        <h2 style={{ marginTop: 0 }}>Roster ({rows.filter((r) => r.status !== "removed").length})</h2>
        <p className="small muted">
          Each student gets their own link by email. It works once. If someone deletes the email, press <strong>Resend</strong> to send the same link
          again, or <strong>Copy link</strong> to send it yourself. You can remove a student who hasn&apos;t joined yet to get the seat back.
        </p>
        <table className="stats">
          <thead>
            <tr>
              <th>Student</th>
              <th>Status</th>
              <th>Last active</th>
              <th>Answered</th>
              <th>Readiness</th>
              <th>Weakest topic</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const s = sends.get(r.inviteId);
              return (
                <tr key={r.inviteId} style={r.status === "removed" ? { opacity: 0.5 } : undefined}>
                  <td>
                    {r.name || r.email}
                    {r.name && <div className="small muted">{r.email}</div>}
                    {r.flags.map((f) => (
                      <span key={f} className="tag">
                        {f}
                      </span>
                    ))}
                  </td>
                  <td className="small">
                    {r.status}
                    {r.status === "invited" && s?.last_sent_at && <div className="muted">emailed {d(s.last_sent_at)}{s.sent_count > 1 ? ` (${s.sent_count}×)` : ""}</div>}
                  </td>
                  <td className="small">{d(r.lastActive)}</td>
                  <td className="small">{r.answered}</td>
                  <td className="small">{r.readiness ?? "–"}</td>
                  <td className="small">{r.weakest ?? "–"}</td>
                  <td>{r.status === "invited" && <RowActions schoolId={id} inviteId={r.inviteId} link={`${base}/join/${r.token}`} />}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>School admins</h2>
        <p className="small muted">People who can see this dashboard and add students. Admins don&apos;t use a seat.</p>
        <table className="stats">
          <tbody>
            {admins.map((a) => (
              <tr key={a.id}>
                <td>
                  {a.name || a.email}
                  {a.name && <div className="small muted">{a.email}</div>}
                </td>
                <td className="small">{a.used_at ? "active" : "invited"}</td>
                <td>{!a.used_at && <RowActions schoolId={id} inviteId={a.id} link={`${base}/join/${a.token}`} noRemove />}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <AddAdmin schoolId={id} />
      </section>
    </>
  );
}
