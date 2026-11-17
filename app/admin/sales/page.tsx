import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { money, PLANS, PlanId } from "@/config";
import { foundingSpotsLeft } from "@/lib/access";
import AdminNav from "../AdminNav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sales", robots: { index: false } };

export default async function Sales() {
  await requireAdmin();
  const q = <T,>(sql: string, p: unknown[] = []) => db().query(sql, p).then((r) => r.rows as T[]);
  const [[t], byPlan, byMonth, recent, [voice], spots] = await Promise.all([
    q<{ gross: string; refunded: string; paid_n: string; students: string; accounts: string }>(
      `SELECT coalesce(sum(amount_cents) FILTER (WHERE status = 'paid'), 0) gross,
              coalesce(sum(amount_cents) FILTER (WHERE status = 'refunded'), 0) refunded,
              count(*) FILTER (WHERE status = 'paid' AND source = 'stripe') paid_n,
              count(DISTINCT lead_id) FILTER (WHERE status = 'paid' AND source = 'stripe') students,
              (SELECT count(*) FROM leads) accounts
       FROM purchases`,
    ),
    q<{ plan: PlanId; n: string; cents: string; started: string }>(
      `SELECT plan, count(*) n, sum(amount_cents) cents, count(*) FILTER (WHERE activated_at IS NOT NULL) started
       FROM purchases WHERE status = 'paid' GROUP BY plan ORDER BY 3 DESC`,
    ),
    q<{ month: string; cents: string; n: string }>(
      `SELECT to_char(created_at, 'YYYY-MM') AS month, sum(amount_cents) cents, count(*) n FROM purchases WHERE status = 'paid' AND source = 'stripe' GROUP BY 1 ORDER BY 1 DESC LIMIT 12`,
    ),
    q<{ email: string; plan: PlanId; amount_cents: number; source: string; status: string; created_at: Date; activated_at: Date | null; note: string | null }>(
      `SELECT l.email, p.plan, p.amount_cents, p.source, p.status, p.created_at, p.activated_at, p.note FROM purchases p JOIN leads l ON l.id = p.lead_id ORDER BY p.created_at DESC LIMIT 50`,
    ),
    q<{ sessions: string; minutes: string }>(
      `SELECT count(*) sessions, coalesce(sum(minutes_charged), 0) minutes FROM voice_sessions WHERE mode = 'voice' AND started_at > now() - interval '30 days'`,
    ),
    foundingSpotsLeft(),
  ]);
  const fmtD = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return (
    <>
      <AdminNav current="/admin/sales" />
      <h1>Sales</h1>
      <div className="kpis" style={{ marginBottom: 18 }}>
        <div className="kpi">
          <b>{money(Number(t.gross))}</b>
          <span>gross revenue</span>
        </div>
        <div className="kpi">
          <b>{t.paid_n}</b>
          <span>paid orders</span>
        </div>
        <div className="kpi">
          <b>
            {t.students}/{t.accounts}
          </b>
          <span>paying / all accounts</span>
        </div>
        <div className="kpi">
          <b>{spots}</b>
          <span>founding spots left</span>
        </div>
        <div className="kpi">
          <b>{Math.round(Number(voice.minutes))}</b>
          <span>voice minutes, 30 days (~${(Number(voice.minutes) * 0.1).toFixed(0)} cost)</span>
        </div>
      </div>
      {Number(t.refunded) > 0 && <p className="small muted">Refunded: {money(Number(t.refunded))}</p>}
      <section className="card">
        <h2>By plan</h2>
        <table className="data">
          <thead>
            <tr>
              <th>Plan</th>
              <th>Orders</th>
              <th>Revenue</th>
              <th>Started</th>
            </tr>
          </thead>
          <tbody>
            {byPlan.map((r) => (
              <tr key={r.plan}>
                <td>{PLANS[r.plan]?.name ?? r.plan}</td>
                <td>{r.n}</td>
                <td>{money(Number(r.cents))}</td>
                <td>{r.started}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="card">
        <h2>By month</h2>
        <table className="data">
          <tbody>
            {byMonth.map((r) => (
              <tr key={r.month}>
                <td>{r.month}</td>
                <td>{r.n} orders</td>
                <td>{money(Number(r.cents))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="card">
        <h2>Recent</h2>
        <table className="data">
          <thead>
            <tr>
              <th>When</th>
              <th>Student</th>
              <th>Plan</th>
              <th>Amount</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((r, i) => (
              <tr key={i}>
                <td>{fmtD(r.created_at)}</td>
                <td>{r.email}</td>
                <td>
                  {PLANS[r.plan]?.name}
                  {r.note && <div className="small muted">{r.note}</div>}
                </td>
                <td>{r.source === "stripe" ? money(r.amount_cents) : r.source}</td>
                <td>{r.status === "refunded" ? "refunded" : r.activated_at ? `started ${fmtD(r.activated_at)}` : "not started"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
