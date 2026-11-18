"use client";

import { useState } from "react";
import { BUDDY_NAME } from "@/config";
import WhyChat from "@/components/WhyChat";

interface Q {
  id: string;
  domain: string;
  stem: string;
  options: string[];
}
interface Result {
  correct: boolean;
  answer: number;
  explanation: string;
}
const LETTERS = ["A", "B", "C", "D"];
const CHEERS = ["Nice!", "Yes! That's it.", "You got it.", "Exactly right.", "Look at you go."];

export default function Practice({
  domains,
  missed,
  freeLeft: initialFree,
}: {
  domains: { id: string; name: string; pct: number; total: number }[];
  missed: number;
  freeLeft: number | null;
}) {
  const [set, setSet] = useState<string | null>(null);
  const [q, setQ] = useState<Q | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  const [res, setRes] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [freeLeft, setFreeLeft] = useState(initialFree);
  const [streak, setStreak] = useState({ right: 0, total: 0 });
  const [reporting, setReporting] = useState(false);
  const [report, setReport] = useState("");
  const [reported, setReported] = useState(false);
  const [conf, setConf] = useState<number | null>(null);
  const [why, setWhy] = useState(false);
  const nameOf = (id: string) => domains.find((d) => d.id === id)?.name ?? id;

  async function load(s: string, exclude?: string) {
    setBusy(true);
    setChosen(null);
    setRes(null);
    setReporting(false);
    setReported(false);
    setReport("");
    setConf(null);
    setWhy(false);
    const j = await fetch(`/api/practice/next?set=${encodeURIComponent(s)}${exclude ? `&exclude=${exclude}` : ""}`).then((r) => r.json());
    setBusy(false);
    if (j.limit) return setLimit(true);
    setFreeLeft(j.freePracticeLeft);
    setEmpty(!j.question);
    setQ(j.question);
  }

  async function submit(confidence: number) {
    if (chosen === null || !q) return;
    setConf(confidence);
    setBusy(true);
    const r = await fetch("/api/practice/answer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ questionId: q.id, chosen, confidence }),
    });
    const j = await r.json();
    setBusy(false);
    if (j.limit) return setLimit(true);
    setRes(j);
    setFreeLeft(j.freePracticeLeft);
    setStreak((s) => ({ right: s.right + (j.correct ? 1 : 0), total: s.total + 1 }));
  }

  async function sendReport() {
    if (!q || !report.trim()) return;
    await fetch("/api/questions/report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ questionId: q.id, message: report }),
    });
    setReported(true);
    setReporting(false);
  }

  if (limit)
    return (
      <section className="card">
        <h2>That&apos;s today&apos;s free practice</h2>
        <p>
          Nice work today. Free accounts get a few questions a day. Come back tomorrow, or get a pass for unlimited practice, full practice
          exams and more time with {BUDDY_NAME}.
        </p>
        <a href="/pricing" className="btn">
          See passes
        </a>
      </section>
    );

  if (!set)
    return (
      <section className="card">
        <h1 style={{ fontSize: "1.5rem" }}>Practice</h1>
        <p className="muted">
          Pick what to work on. {freeLeft !== null && `${freeLeft} free questions left today.`}
        </p>
        <button className="q-opt on" onClick={() => (setSet("mixed"), load("mixed"))}>
          <strong>Smart mix</strong>
          <br />
          <span className="small muted">Weighted toward your weakest topics, the way the VTNE weighs them</span>
        </button>
        {missed > 0 && (
          <button className="q-opt" onClick={() => (setSet("missed"), load("missed"))}>
            <strong>Questions I missed ({missed})</strong>
            <br />
            <span className="small muted">Clear them by getting them right</span>
          </button>
        )}
        <h3 style={{ marginTop: 18 }}>By topic</h3>
        {domains.map((d) => (
          <button key={d.id} className="q-opt" onClick={() => (setSet(d.id), load(d.id))}>
            <div className="spread">
              <span>{d.name}</span>
              <span className="small muted">{d.total ? `${d.pct}%` : "new"}</span>
            </div>
          </button>
        ))}
      </section>
    );

  if (empty)
    return (
      <section className="card">
        <p>{set === "missed" ? "You've cleared every question you missed. 🎉" : "No questions here yet. More are on the way."}</p>
        <button className="btn" onClick={() => (setSet(null), setEmpty(false))}>
          Pick something else
        </button>
      </section>
    );

  return (
    <section className="card">
      <div className="spread small muted">
        <span>{q ? nameOf(q.domain) : "Loading..."}</span>
        <span>
          {streak.total > 0 && `${streak.right}/${streak.total} this round`}
          {freeLeft !== null && ` · ${freeLeft} free left today`}
        </span>
      </div>
      {q && (
        <>
          <p style={{ fontSize: 18, fontWeight: 600, margin: "12px 0 16px" }}>{q.stem}</p>
          {q.options.map((o, i) => {
            const cls = res ? (i === res.answer ? "right" : i === chosen ? "wrong" : "") : chosen === i ? "on" : "";
            return (
              <button key={i} className={`q-opt ${cls}`} disabled={!!res || busy} onClick={() => setChosen(i)}>
                <strong>{LETTERS[i]}.</strong> {o}
              </button>
            );
          })}
          {!res ? (
            <div>
              <p className="small muted" style={{ margin: "4px 0 6px" }}>
                How sure are you?
              </p>
              <div className="conf-row">
                {[
                  [3, "I'm sure"],
                  [2, "I think so"],
                  [1, "Guessing"],
                ].map(([v, label]) => (
                  <button key={v} className="btn secondary" onClick={() => submit(v as number)} disabled={chosen === null || busy}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="card" style={{ background: res.correct ? "var(--good-soft)" : "var(--accent-soft)", marginTop: 8 }}>
                <p style={{ marginTop: 0 }}>
                  <strong>{res.correct ? CHEERS[streak.total % CHEERS.length] : `Not quite. The answer is ${LETTERS[res.answer]}.`}</strong>
                </p>
                <p style={{ marginBottom: 0 }}>{res.explanation}</p>
                {res.correct && conf === 1 && (
                  <p className="small" style={{ marginBottom: 0, marginTop: 8 }}>
                    You got it, but you were guessing, so this one still counts as &quot;learning&quot; in your readiness.
                  </p>
                )}
              </div>
              {why ? (
                <WhyChat questionId={q.id} onClose={() => setWhy(false)} />
              ) : (
                <button className={`btn ${!res.correct || conf === 1 ? "" : "secondary"} block`} onClick={() => setWhy(true)} style={{ marginBottom: 10 }}>
                  {!res.correct ? `Ask ${BUDDY_NAME} why` : conf === 1 ? `Ask ${BUDDY_NAME} why it's right` : `Explain it to ${BUDDY_NAME}`}
                </button>
              )}
              <div className="spread">
                <button className="linklike small" onClick={() => setReporting((r) => !r)} disabled={reported}>
                  {reported ? "Thanks, we'll take a look." : "Something off with this question?"}
                </button>
                <button className="btn" onClick={() => load(set, q.id)} disabled={busy}>
                  Next question
                </button>
              </div>
              {reporting && (
                <div style={{ marginTop: 10 }}>
                  <textarea rows={3} value={report} onChange={(e) => setReport(e.target.value)} placeholder="What looks wrong?" />
                  <button className="btn secondary" onClick={sendReport} disabled={!report.trim()}>
                    Send
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
      <p className="center small" style={{ marginTop: 16, marginBottom: 0 }}>
        <button className="linklike" onClick={() => (setSet(null), setQ(null), setStreak({ right: 0, total: 0 }))}>
          Change topic
        </button>
      </p>
    </section>
  );
}
