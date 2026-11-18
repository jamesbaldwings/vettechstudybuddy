import Link from "next/link";
import { isOwner, requireLead } from "@/lib/auth";
import { getAccess } from "@/lib/access";
import { getReadiness } from "@/lib/readiness";
import { db } from "@/lib/db";
import { Buddy } from "@/components/Buddy";
import StartPassButton from "@/components/StartPassButton";
import SignOutButton from "@/components/SignOutButton";
import { BUDDY_NAME, PLANS } from "@/config";
import { daysBetween, prettyDate, prettyMonth, todayISO } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your study home", robots: { index: false } };

const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

export default async function Home({ searchParams }: { searchParams: Promise<{ purchased?: string }> }) {
  const lead = await requireLead("/home");
  const { purchased } = await searchParams;
  const [access, readiness, latest] = await Promise.all([
    getAccess(lead.id),
    getReadiness(lead.id),
    db()
      .query<{ public_token: string }>(
        `SELECT public_token FROM attempts WHERE lead_id = $1 AND completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 1`,
        [lead.id],
      )
      .then((r) => r.rows[0]?.public_token ?? null),
  ]);

  const today = todayISO();
  const examText = lead.exam_date
    ? (() => {
        const d = daysBetween(today, lead.exam_date!);
        return d > 0 ? `${d} days until your VTNE (${prettyDate(lead.exam_date!)})` : d === 0 ? "Your VTNE is today. You've got this." : "Your VTNE date has passed";
      })()
    : lead.target_month
      ? `Aiming for ${prettyMonth(lead.target_month)}`
      : "No VTNE date set yet";

  const pass = access.activePass;
  const passDaysLeft = pass ? Math.max(0, Math.ceil((pass.expires_at!.getTime() - Date.now()) / 86400_000)) : 0;
  const weakest = [...readiness.domains].sort((a, b) => a.pct * 1 - b.pct * 1 || b.weight - a.weight).slice(0, 3);

  return (
    <>
      <Buddy>
        <p>
          {lead.first_name ? `Hey ${lead.first_name}!` : "Hey there!"} {examText}.{" "}
          <Link href="/settings">{lead.exam_date ? "Change date" : "Set your date"}</Link>
        </p>
      </Buddy>

      {purchased && (
        <div className="card notice">
          <strong>Thank you!</strong> Your purchase went through. A receipt is on its way to your email.
        </div>
      )}

      {/* Plan status */}
      <section className="card">
        {pass ? (
          <>
            <h2 style={{ marginBottom: 4 }}>{PLANS[pass.plan].name}</h2>
            <p className="muted" style={{ marginBottom: 0 }}>
              {passDaysLeft} days left · ends {fmtDate(pass.expires_at!)}
            </p>
          </>
        ) : access.waitingPasses.length ? (
          <>
            <h2 style={{ marginBottom: 4 }}>Your {PLANS[access.waitingPasses[0].plan].name} is ready</h2>
            <p className="muted">
              Your {PLANS[access.waitingPasses[0].plan].accessDays} days start when you press Start, so start when you&apos;re ready to
              study hard. Start by {fmtDate(access.waitingPasses[0].activate_by!)}.
            </p>
            <StartPassButton purchaseId={access.waitingPasses[0].id} days={PLANS[access.waitingPasses[0].plan].accessDays} />
          </>
        ) : (
          <>
            <h2 style={{ marginBottom: 4 }}>Free account</h2>
            <p className="muted">
              You get the diagnostic, your plan, {access.freePracticeLeft} more practice questions today, and a free voice session with{" "}
              {BUDDY_NAME}. Ready to go all in? Your pass only starts when you press Start.
            </p>
            <Link href="/pricing" className="btn">
              See passes
            </Link>
          </>
        )}
        {pass && access.waitingPasses.length > 0 && (
          <p className="small muted" style={{ marginTop: 10, marginBottom: 0 }}>
            You also have a {PLANS[access.waitingPasses[0].plan].name} waiting. It will start after this one ends, or you can start it
            now and it will add on.
          </p>
        )}
      </section>

      {/* Readiness */}
      <section className="card">
        <div className="readiness">
          <div className="ring" style={{ ["--p" as string]: `${readiness.score ?? 0}` }}>
            <span>{readiness.score ?? "–"}</span>
          </div>
          <div>
            <h2 style={{ marginBottom: 4 }}>Readiness</h2>
            <p className="muted small" style={{ marginBottom: 6 }}>
              {readiness.label}{" "}
              {readiness.basis === "diagnostic" && "Based on your diagnostic; practice to sharpen it."}
              {readiness.basis === "practice" && `Based on your last ${readiness.answered} answers, weighted like the VTNE.`}
            </p>
            {readiness.score !== null && (
              <p className="small" style={{ margin: 0 }}>
                Focus on:{" "}
                {weakest.map((d) => (
                  <span key={d.id} className="tag">
                    {d.name}
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Actions */}
      <section className="tiles">
        <Link href="/practice" className="tile">
          <strong>Practice</strong>
          <span className="muted small">
            By topic, mixed, or what you missed{access.freePracticeLeft !== null ? ` · ${access.freePracticeLeft} left today` : ""}
          </span>
        </Link>
        <Link href={pass ? "/exam" : "/pricing"} className="tile">
          <strong>Practice exam {pass ? "" : "🔒"}</strong>
          <span className="muted small">Timed and weighted like the VTNE</span>
        </Link>
        <Link href="/sara" className="tile">
          <strong>Talk with {BUDDY_NAME} 🎙️</strong>
          <span className="muted small">{access.voiceMinutes} voice minutes left</span>
        </Link>
        <Link href={pass ? "/sara?mode=text" : "/pricing"} className="tile">
          <strong>Chat with {BUDDY_NAME} {pass ? "" : "🔒"}</strong>
          <span className="muted small">Ask anything, by text</span>
        </Link>
        {latest && (
          <Link href={`/results/${latest}`} className="tile">
            <strong>Diagnostic results</strong>
            <span className="muted small">Your first plan and missed questions</span>
          </Link>
        )}
        <Link href="/quiz" className="tile">
          <strong>Retake the diagnostic</strong>
          <span className="muted small">See how far you&apos;ve come</span>
        </Link>
      </section>

      <p className="center small" style={{ marginTop: 20 }}>
        {isOwner(lead) && (
          <>
            <Link href="/admin">Owner admin</Link> ·{" "}
          </>
        )}
        <Link href="/settings">Settings</Link> · <SignOutButton />
      </p>
    </>
  );
}
