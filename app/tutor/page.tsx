import Link from "next/link";
import { isOwner, requireLead } from "@/lib/auth";
import { pastSessions, pathLine, tutorAccess, tutorProgress, tutorStruggles } from "@/lib/tutor";
import { Buddy } from "@/components/Buddy";
import { BUDDY_NAME, money, PLANS, subjectById } from "@/config";
import TutorStart from "./TutorStart";
import PreviewToggle from "./PreviewToggle";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tutor Mode", robots: { index: false } };

const when = (d: Date) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Chicago" });

export default async function TutorHome({ searchParams }: { searchParams: Promise<{ subject?: string; topic?: string }> }) {
  const lead = await requireLead("/tutor");
  const { subject, topic } = await searchParams;
  const [access, sessions, progress, struggles] = await Promise.all([
    tutorAccess(lead),
    pastSessions(lead.id),
    tutorProgress(lead.id),
    tutorStruggles(lead.id),
  ]);
  const path = pathLine(progress.mastered);
  const sp = PLANS.semester_pass;

  return (
    <>
      <p className="small">
        <Link href="/home">← Study home</Link>
      </p>
      <Buddy>
        <p>
          Stuck on a topic in class? Tell me what it is and I&apos;ll explain it until it clicks. I&apos;ll check what you already know,
          go step by step with real clinic examples, and quiz you as we go.
        </p>
      </Buddy>

      <section className="card">
        {access.unlimited ? (
          <p style={{ margin: 0 }}>
            <strong>Unlimited Tutor Mode</strong>{" "}
            <span className="muted small">
              {access.via === "pass" && "· included with your pass"}
              {access.via === "semester" && "· Semester Pass"}
              {access.via === "school" && "· included with your school's license"}
              {access.via === "owner" && "· owner account"}
            </span>
          </p>
        ) : (
          <p style={{ margin: 0 }}>
            <strong>
              {access.freeLeft} of {access.freePerWeek} free tutor sessions left this week
            </strong>{" "}
            <span className="muted small">· resets Monday</span>
            <br />
            <span className="small">
              Want more? The <Link href="/pricing#semester">Semester Pass</Link> gives you unlimited Tutor Mode for {sp.accessDays} days for{" "}
              {money(sp.priceCents)}. Any VTNE pass includes it too.
            </span>
          </p>
        )}
        {isOwner(lead) && (
          <p className="small muted" style={{ margin: "8px 0 0" }}>
            Owner: <PreviewToggle on={access.previewingFree} />
          </p>
        )}
      </section>

      <TutorStart
        defaultSubject={subject && subjectById(subject) ? subject : undefined}
        defaultTopic={topic?.slice(0, 120)}
        locked={!access.unlimited && access.freeLeft <= 0}
      />

      {(path || struggles.length > 0) && (
        <section className="card">
          {path && <p style={{ marginTop: 0 }}>{path}</p>}
          {struggles.length > 0 && (
            <p className="small" style={{ marginBottom: 0 }}>
              Worth another look:{" "}
              {struggles.map((t) => (
                <Link key={t.topic} className="tag" href={`/tutor?subject=${t.subject}&topic=${encodeURIComponent(t.topic)}`}>
                  {t.topic}
                </Link>
              ))}
            </p>
          )}
        </section>
      )}

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Your past sessions</h2>
        {sessions.length ? (
          <table className="stats">
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link href={`/tutor/${s.id}`}>{s.topic}</Link>
                    <div className="small muted">{subjectById(s.subject)?.name ?? s.subject}</div>
                  </td>
                  <td className="small">
                    {s.mastered ? <span className="tag">Got it</span> : s.ended_at ? <span className="tag">Keep practicing</span> : "In progress"}
                  </td>
                  <td className="small muted">{when(s.started_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="small muted" style={{ marginBottom: 0 }}>
            Your sessions with {BUDDY_NAME} will show up here, with the recap and practice questions from each one.
          </p>
        )}
      </section>
    </>
  );
}
