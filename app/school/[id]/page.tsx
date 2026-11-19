import Link from "next/link";
import { requireSchool } from "./guard";
import SchoolNav from "./SchoolNav";
import { seatSummary } from "@/lib/school";
import { TUTOR_FLAG_FAILED_CHECKS } from "@/config";
import { schoolStudents, schoolTopics, schoolTutorTopics } from "@/lib/schoolReports";

export const dynamic = "force-dynamic";
export const metadata = { title: "School dashboard", robots: { index: false } };

const avg = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x !== null);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
};
const pct = (n: number | null) => (n === null ? "–" : `${n}%`);
const FEEL = ["", "Panicking", "Nervous", "Unsure", "Okay", "Confident"];

export default async function SchoolDashboard({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ seats?: string }> }) {
  const { id } = await params;
  const { seats: seatsMsg } = await searchParams;
  const { school } = await requireSchool(id, `/school/${id}`);
  const [seats, all, topics, tutorTopics] = await Promise.all([seatSummary(id), schoolStudents(id), schoolTopics(id), schoolTutorTopics(id)]);
  const students = all.filter((s) => s.status !== "removed");
  const joined = students.filter((s) => s.status !== "invited");
  const started = students.filter((s) => s.passStartedAt);
  const active7 = joined.filter((s) => s.lastActive && Date.now() - s.lastActive.getTime() < 7 * 86400_000);
  const flagged = students.filter((s) => s.flags.length);
  const reported = joined.filter((s) => s.outcome);
  const passed = reported.filter((s) => s.outcome === "passed");
  const feelings = joined.map((s) => s.examFeeling).filter((x): x is number => x !== null);
  const feelCounts = [1, 2, 3, 4, 5].map((n) => feelings.filter((f) => f === n).length);
  const studied = topics.filter((t) => t.pct !== null);
  const weakest = [...studied].sort((a, b) => a.pct! - b.pct!)[0];

  return (
    <>
      <SchoolNav id={id} name={school.name} current={`/school/${id}`} />
      <h1>How your students are doing</h1>
      {seatsMsg === "added" && <p className="pill">Thanks. Your new seats will appear here within a minute of payment.</p>}

      <section className="grid3">
        <div className="card">
          <p className="small muted">Seats</p>
          <p style={{ fontSize: 28, margin: 0 }}>
            {seats.assigned} <span className="small muted">of {seats.total} assigned</span>
          </p>
          <p className="small">
            {seats.available} open · <Link href={`/school/${id}/students`}>Add students</Link>
          </p>
        </div>
        <div className="card">
          <p className="small muted">Joined and started</p>
          <p style={{ fontSize: 28, margin: 0 }}>
            {joined.length} <span className="small muted">joined</span>
          </p>
          <p className="small">
            {started.length} started their pass · {active7.length} active this week
          </p>
        </div>
        <div className="card">
          <p className="small muted">Class averages</p>
          <p style={{ fontSize: 28, margin: 0 }}>
            {avg(joined.map((s) => s.readiness)) ?? "–"} <span className="small muted">readiness</span>
          </p>
          <p className="small">
            Recent accuracy {pct(avg(joined.map((s) => s.recentAccuracy)))} · practice exams {pct(avg(joined.map((s) => s.lastExamPct)))}
          </p>
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Students who may need a check-in ({flagged.length})</h2>
        {flagged.length ? (
          <table className="stats">
            <tbody>
              {flagged.slice(0, 15).map((s) => (
                <tr key={s.inviteId}>
                  <td>
                    {s.name || s.email}
                    {s.name && <div className="small muted">{s.email}</div>}
                  </td>
                  <td>
                    {s.flags.map((f) => (
                      <span key={f} className="tag">
                        {f}
                      </span>
                    ))}
                  </td>
                  <td className="small muted">{s.readiness !== null ? `Readiness ${s.readiness}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="small muted">Nobody flagged right now.</p>
        )}
        <p className="small muted" style={{ marginBottom: 0 }}>
          Flags: hasn&apos;t joined after 7 days, inactive 7+ days, VTNE within 30 days with readiness under 60, marks 40%+ of answers as guesses, or said
          they feel anxious about the exam, or missed {TUTOR_FLAG_FAILED_CHECKS}+ Tutor Mode understanding checks in the last 14 days (more missed than passed).
        </p>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Class accuracy by VTNE topic</h2>
        <p className="small muted">Last 60 days of practice and exam answers.{weakest && ` Weakest so far: ${weakest.name}.`}</p>
        <div className="bars">
          {topics.map((t) => (
            <div key={t.id} className="bar-row">
              <div className="bar-label">
                {t.name} <span className="w">({t.weight}% of the VTNE)</span>
                <div className={`bar ${t.pct !== null && t.pct < 60 ? "weak" : ""}`}>
                  <span style={{ width: `${t.pct ?? 0}%` }} />
                </div>
              </div>
              <div className="bar-num">{t.pct !== null ? `${t.pct}%` : "–"}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Tutor Mode: topics your class is working on</h2>
        <p className="small muted">
          Last 60 days. Hardest first, by the share of Sara&apos;s understanding checks students got right. {joined.reduce((a, s) => a + s.tutorSessions, 0)}{" "}
          tutor sessions so far.
        </p>
        {tutorTopics.length ? (
          <table className="stats">
            <thead>
              <tr>
                <th>Topic</th>
                <th>Students</th>
                <th>Checks right</th>
                <th>Sessions ending in &quot;got it&quot;</th>
              </tr>
            </thead>
            <tbody>
              {tutorTopics.slice(0, 20).map((t) => (
                <tr key={`${t.subject}-${t.topic}`}>
                  <td>
                    {t.topic}
                    <div className="small muted">{t.subject}</div>
                  </td>
                  <td>{t.students}</td>
                  <td className={t.checkPct !== null && t.checkPct < 60 ? "error" : ""}>
                    {t.checkPct !== null ? `${t.checkPct}% of ${t.checks}` : "–"}
                  </td>
                  <td>{t.masteredPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="small muted" style={{ marginBottom: 0 }}>
            When students use Tutor Mode for their courses, the topics they&apos;re working on and how they&apos;re doing show up here.
          </p>
        )}
      </section>

      <section className="grid3">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>How they feel</h2>
          {feelings.length ? (
            <table className="stats">
              <tbody>
                {[5, 4, 3, 2, 1].map((n) => (
                  <tr key={n}>
                    <td>{FEEL[n]}</td>
                    <td>{feelCounts[n - 1]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="small muted">Students rate how they feel about the exam when they take the diagnostic.</p>
          )}
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Understanding</h2>
          {avg(joined.map((s) => s.guessingPct)) === null ? (
            <p className="small">After students rate 10 answers (&quot;I&apos;m sure / I think so / Guessing&quot;), you&apos;ll see how often they&apos;re guessing.</p>
          ) : (
            <p className="small">
              On average students mark <strong>{pct(avg(joined.map((s) => s.guessingPct)))}</strong> of answers as guesses. Lower is better: it means
              they know why, not just what.
            </p>
          )}
          <p className="small" style={{ marginBottom: 0 }}>
            &quot;Why&quot; chats with Sara: <strong>{joined.reduce((a, s) => a + s.whyChats, 0)}</strong> total.
          </p>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>VTNE results</h2>
          {reported.length ? (
            <p>
              {passed.length} of {reported.length} reported passing.
            </p>
          ) : (
            <p className="small muted">No results reported yet. Students report their result after the exam.</p>
          )}
        </div>
      </section>

      <p className="small muted">
        Your students&apos; conversations with Sara stay private, including in Tutor Mode. You see progress and summary numbers, not what they said or their individual answers.
      </p>
    </>
  );
}
