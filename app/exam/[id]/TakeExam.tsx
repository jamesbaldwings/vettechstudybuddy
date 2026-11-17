"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Q {
  id: string;
  stem: string;
  options: string[];
}
const LETTERS = ["A", "B", "C", "D"];
const clock = (s: number) => `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function TakeExam(p: { id: string; questions: Q[]; answers: (number | null)[]; flagged: number[]; secondsLeft: number }) {
  const [i, setI] = useState(() => Math.max(0, p.answers.findIndex((a) => a === null)));
  const [answers, setAnswers] = useState(p.answers);
  const [flagged, setFlagged] = useState<number[]>(p.flagged);
  const [left, setLeft] = useState(p.secondsLeft);
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const dirty = useRef(false);
  const state = useRef({ answers, flagged });
  state.current = { answers, flagged };

  const save = useCallback(
    async (finish = false) => {
      dirty.current = false;
      const r = await fetch(`/api/exam/${p.id}/save`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...state.current, finish }),
        keepalive: true,
      }).catch(() => null);
      const j = await r?.json().catch(() => null);
      if (j?.finished) window.location.href = `/exam/${p.id}/results`;
      if (typeof j?.secondsLeft === "number") setLeft(j.secondsLeft);
    },
    [p.id],
  );

  useEffect(() => {
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    const s = setInterval(() => dirty.current && save(), 15000);
    const onHide = () => dirty.current && save();
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(t);
      clearInterval(s);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [save]);

  useEffect(() => {
    if (left === 0) void save(true);
  }, [left, save]);

  const choose = (k: number) => {
    setAnswers((a) => a.map((x, j) => (j === i ? k : x)));
    dirty.current = true;
  };
  const toggleFlag = () => {
    setFlagged((f) => (f.includes(i) ? f.filter((x) => x !== i) : [...f, i]));
    dirty.current = true;
  };
  const answered = answers.filter((a) => a !== null).length;
  const q = p.questions[i];

  async function finish() {
    setBusy(true);
    await save(true);
  }

  return (
    <section className="card">
      <div className="spread">
        <strong>
          Question {i + 1} of {p.questions.length}
        </strong>
        <span className={`timer ${left < 300 ? "error" : ""}`} style={{ margin: 0 }}>
          ⏱ {clock(left)}
        </span>
      </div>
      <div className="bar" style={{ margin: "10px 0 16px" }}>
        <i style={{ width: `${(100 * answered) / p.questions.length}%` }} />
      </div>

      {!review ? (
        <>
          <p style={{ fontSize: 18, fontWeight: 600 }}>{q.stem}</p>
          {q.options.map((o, k) => (
            <button key={k} className={`q-opt ${answers[i] === k ? "on" : ""}`} onClick={() => choose(k)}>
              <strong>{LETTERS[k]}.</strong> {o}
            </button>
          ))}
          <div className="spread" style={{ marginTop: 8 }}>
            <button className="btn ghost" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0}>
              ← Back
            </button>
            <button className="btn secondary" onClick={toggleFlag}>
              {flagged.includes(i) ? "★ Flagged" : "☆ Flag"}
            </button>
            {i < p.questions.length - 1 ? (
              <button className="btn" onClick={() => setI((x) => x + 1)}>
                Next →
              </button>
            ) : (
              <button className="btn" onClick={() => (save(), setReview(true))}>
                Review
              </button>
            )}
          </div>
          <p className="center small" style={{ marginBottom: 0 }}>
            <button className="linklike" onClick={() => (save(), setReview(true))}>
              See all questions
            </button>
          </p>
        </>
      ) : (
        <>
          <p className="small muted">
            {answered} answered, {p.questions.length - answered} blank, {flagged.length} flagged. Tap a number to go back to it.
          </p>
          <div className="nav-grid">
            {p.questions.map((_, k) => (
              <button
                key={k}
                className={`${answers[k] !== null ? "done" : ""} ${flagged.includes(k) ? "flag" : ""} ${k === i ? "cur" : ""}`}
                onClick={() => (setI(k), setReview(false))}
              >
                {k + 1}
              </button>
            ))}
          </div>
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn secondary" onClick={() => setReview(false)}>
              Keep working
            </button>
            <button className="btn" onClick={finish} disabled={busy}>
              {busy ? "Scoring..." : "Submit exam"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
