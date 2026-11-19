import Link from "next/link";
import { notFound } from "next/navigation";
import { requireLead } from "@/lib/auth";
import { getAccess } from "@/lib/access";
import { canContinue, getTutorSession } from "@/lib/tutor";
import TutorLive from "@/components/TutorLive";
import { BUDDY_NAME, subjectById } from "@/config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tutor session", robots: { index: false } };

export default async function TutorSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await requireLead(`/tutor/${id}`);
  const s = await getTutorSession(id, lead.id);
  if (!s) notFound();
  const subjectName = subjectById(s.subject)?.name ?? s.subject;

  if (canContinue(s)) {
    const access = await getAccess(lead.id);
    return (
      <>
        <p className="small">
          <Link href="/tutor">← Tutor Mode</Link>
        </p>
        <TutorLive
          sessionId={s.id}
          topic={s.topic}
          subjectName={subjectName}
          channel={s.channel}
          initial={s.transcript.map((t) => ({ who: t.who, text: t.text }))}
          checksPassed={s.checks_passed}
          checksFailed={s.checks_failed}
          voiceMinutes={access.voiceMinutes}
        />
        <p className="small muted">
          {BUDDY_NAME} teaches; she doesn&apos;t do graded work. She won&apos;t guess at drug doses, and she&apos;ll tell you when something
          goes beyond our reviewed material so you can check with your instructor or textbook.
        </p>
      </>
    );
  }

  return (
    <>
      <p className="small">
        <Link href="/tutor">← Tutor Mode</Link>
      </p>
      <section className="card">
        <p className="small muted" style={{ marginTop: 0 }}>
          {subjectName} · {new Date(s.started_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "America/Chicago" })}
        </p>
        <h1 style={{ marginTop: 0 }}>{s.topic}</h1>
        <p>
          {s.mastered ? <span className="tag">Got it</span> : <span className="tag">Keep practicing</span>}{" "}
          <span className="small muted">
            Understanding checks: {s.checks_passed} got it{s.checks_failed ? `, ${s.checks_failed} not yet` : ""}
          </span>
        </p>
        {s.recap ? <p>{s.recap}</p> : <p className="muted small">This session ended before {BUDDY_NAME} gave a recap.</p>}
        {s.struggled.length > 0 && (
          <p className="small">
            To review:{" "}
            {s.struggled.map((x) => (
              <span key={x} className="tag">
                {x}
              </span>
            ))}
          </p>
        )}
      </section>

      {s.practice.length > 0 && (
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Practice questions</h2>
          <ol>
            {s.practice.map((p, i) => (
              <li key={i} style={{ marginBottom: 10 }}>
                {p.q}
                {p.a && (
                  <details className="small">
                    <summary>Show answer</summary>
                    {p.a}
                  </details>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Keep going</h2>
        <p className="small">
          <Link className="btn" href={`/tutor?subject=${s.subject}&topic=${encodeURIComponent(s.topic)}`}>
            {s.mastered ? "Go deeper on this topic" : "Work on this topic again"}
          </Link>
        </p>
        {s.related.length > 0 && (
          <p className="small" style={{ marginBottom: 0 }}>
            Related topics:{" "}
            {s.related.map((r) => (
              <Link key={r} className="tag" href={`/tutor?subject=${s.subject}&topic=${encodeURIComponent(r)}`}>
                {r}
              </Link>
            ))}
          </p>
        )}
      </section>

      {s.transcript.length > 0 && (
        <details className="card">
          <summary>
            <strong>Full conversation</strong> <span className="small muted">(only you can see this)</span>
          </summary>
          <div className="chat" style={{ marginTop: 12 }}>
            {s.transcript.map((t, i) => (
              <div key={i} className={`msg ${t.who === "student" ? "me" : "sara"}`}>
                {t.text}
              </div>
            ))}
          </div>
        </details>
      )}
    </>
  );
}
