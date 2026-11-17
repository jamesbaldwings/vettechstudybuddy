"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { QUESTIONS, domainById } from "@/data/questions";
import { Buddy } from "@/components/Buddy";
import { BUDDY_NAME } from "@/config";

type Stage = "intro" | "question" | "done";
type Band = "on_track" | "building" | "early";

interface Saved {
  attemptToken: string | null;
  confidence: number | null;
  answers: (number | null)[];
  index: number;
  stage: Stage;
  result: { score: number; total: number; band: Band } | null;
}

const KEY = "vtne-diagnostic-v1";
const LETTERS = ["A", "B", "C", "D"];

const CONFIDENCE = [
  { v: 1, em: "😰", label: "Panicking" },
  { v: 2, em: "😟", label: "Nervous" },
  { v: 3, em: "😐", label: "Unsure" },
  { v: 4, em: "🙂", label: "Okay" },
  { v: 5, em: "😎", label: "Confident" },
];

const RIGHT = ["Nailed it.", "Yes! That's the one.", "Exactly right.", "You know your stuff.", "Clean answer.", "That's it."];
const WRONG = [
  "Close. This one trips up a lot of people.",
  "Not quite. Here's the thing to remember:",
  "Good guess, but let's lock this one in for test day.",
  "That's a common mix-up. Here's why:",
];
const CHECKPOINTS: Record<number, string> = {
  4: "Five down. You're warmed up.",
  11: "Halfway there. Roll your shoulders, sip some water.",
  19: "Five left. Finish strong.",
};

const BAND_TEXT: Record<Band, { label: string; line: string }> = {
  on_track: { label: "On track", line: "You've got a strong base. Now it's about staying sharp." },
  building: { label: "Building", line: "You've got a real foundation. A focused plan will move this number fast." },
  early: { label: "Early stage", line: "Totally normal right now. Starting with a plan is exactly the right move." },
};

const pick = (arr: string[], seed: number) => arr[seed % arr.length];

function upcomingMonths() {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
    return {
      value: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
    };
  });
}

const fresh = (): Saved => ({
  attemptToken: null,
  confidence: null,
  answers: Array(QUESTIONS.length).fill(null),
  index: 0,
  stage: "intro",
  result: null,
});

export default function Quiz() {
  const router = useRouter();
  const [s, setS] = useState<Saved>(fresh);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Restore progress if the page was refreshed.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setS({ ...fresh(), ...JSON.parse(raw) });
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {}
  }, [s, loaded]);

  async function start() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/attempts/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confidence: s.confidence }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Something went wrong.");
      setS((p) => ({ ...p, attemptToken: j.attemptToken, stage: "question", index: 0 }));
    } catch (e) {
      setErr(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  function choose(i: number) {
    if (s.answers[s.index] !== null) return;
    setS((p) => {
      const answers = [...p.answers];
      answers[p.index] = i;
      return { ...p, answers };
    });
  }

  async function next() {
    if (s.index < QUESTIONS.length - 1) {
      setS((p) => ({ ...p, index: p.index + 1 }));
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/attempts/finish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ attemptToken: s.attemptToken, answers: s.answers }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Something went wrong.");
      setS((p) => ({ ...p, stage: "done", result: j }));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setErr(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  function restart() {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    setS(fresh());
  }

  if (!loaded) return null;

  if (s.stage === "intro") {
    return (
      <div>
        <Buddy>
          <p>
            Hey! I&apos;m {BUDDY_NAME}. Here&apos;s how this works: 25 questions, one at a time, no timer. After each one
            I&apos;ll tell you why the answer is right, so you&apos;re learning the whole way through.
          </p>
          <p>Before we start: how are you feeling about the VTNE right now?</p>
        </Buddy>
        <div className="confidence" role="group" aria-label="How are you feeling about the VTNE?">
          {CONFIDENCE.map((c) => (
            <button key={c.v} className={s.confidence === c.v ? "on" : ""} onClick={() => setS((p) => ({ ...p, confidence: c.v }))}>
              <span className="em" aria-hidden>
                {c.em}
              </span>
              {c.label}
            </button>
          ))}
        </div>
        {s.confidence !== null && (
          <div style={{ marginTop: 18 }}>
            <Buddy>
              <p>
                {s.confidence <= 2
                  ? "That's the most common answer I hear, and it's fixable. Nerves fade with familiarity, and that's exactly what we're building."
                  : s.confidence === 3
                    ? "Fair. Let's find out where you really stand. That alone usually takes some pressure off."
                    : "Love it. Let's see if the questions agree with you."}
              </p>
            </Buddy>
            {err && <p className="error">{err}</p>}
            <button className="btn block" onClick={start} disabled={busy}>
              {busy ? "Getting ready..." : "Let's go"}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (s.stage === "question") return <QuestionView s={s} choose={choose} next={next} busy={busy} err={err} />;

  return <Done s={s} restart={restart} onSaved={(url) => { try { localStorage.removeItem(KEY); } catch {} router.push(url); }} />;
}

function QuestionView({
  s,
  choose,
  next,
  busy,
  err,
}: {
  s: Saved;
  choose: (i: number) => void;
  next: () => void;
  busy: boolean;
  err: string;
}) {
  const q = QUESTIONS[s.index];
  const chosen = s.answers[s.index];
  const answered = chosen !== null;
  const right = answered && chosen === q.answer;
  const last = s.index === QUESTIONS.length - 1;
  const pct = ((s.index + (answered ? 1 : 0)) / QUESTIONS.length) * 100;

  return (
    <div>
      <div className="qmeta">
        <span>
          Question {s.index + 1} of {QUESTIONS.length}
        </span>
        <span>{domainById(q.domain).name}</span>
      </div>
      <div className="progress" aria-hidden>
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="card">
        <p className="stem">{q.stem}</p>
        <div className="options">
          {q.options.map((opt, i) => {
            let cls = "option";
            if (answered && i === q.answer) cls += " correct";
            else if (answered && i === chosen) cls += " wrong";
            return (
              <button key={i} className={cls} onClick={() => choose(i)} disabled={answered}>
                <span className="letter">{LETTERS[i]}</span>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>
        {answered && (
          <div className={`feedback ${right ? "good" : "bad"}`}>
            <Buddy>
              <p>
                <strong>{right ? pick(RIGHT, s.index) : pick(WRONG, s.index)}</strong>
              </p>
              <p>{q.explanation}</p>
              {CHECKPOINTS[s.index] && <p className="muted">{CHECKPOINTS[s.index]}</p>}
            </Buddy>
            {err && <p className="error">{err}</p>}
            <button className="btn block" onClick={next} disabled={busy}>
              {last ? (busy ? "Scoring..." : "See my score") : "Next question"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Done({ s, restart, onSaved }: { s: Saved; restart: () => void; onSaved: (url: string) => void }) {
  const months = useMemo(upcomingMonths, []);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [examDate, setExamDate] = useState("");
  const [notBooked, setNotBooked] = useState(false);
  const [targetMonth, setTargetMonth] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const r = s.result;
  if (!r) return null;
  const band = BAND_TEXT[r.band];
  const today = new Date().toISOString().slice(0, 10);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          attemptToken: s.attemptToken,
          firstName,
          email,
          examDate: notBooked ? null : examDate,
          targetMonth: notBooked ? targetMonth : null,
          consent,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Something went wrong.");
      onSaved(j.signInSent ? `${j.resultsUrl}?signin=sent` : j.resultsUrl);
    } catch (e2) {
      setErr(String((e2 as Error).message));
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="card center">
        <p className="muted" style={{ marginBottom: 6 }}>
          Your score
        </p>
        <div className="score-big">
          {r.score}
          <span style={{ fontSize: 26, color: "var(--muted)" }}>/{r.total}</span>
        </div>
        <p style={{ marginTop: 10 }}>
          <span className="band">{band.label}</span>
        </p>
        <p className="muted" style={{ marginBottom: 0 }}>
          {band.line}
        </p>
      </div>

      <Buddy>
        <p>
          Nice work getting through all 25. Want me to show you exactly which areas to focus on and build a plan around your
          exam date? Tell me where to send it.
        </p>
      </Buddy>

      <form className="card" onSubmit={submit}>
        <div className="field">
          <label htmlFor="fn">First name</label>
          <input id="fn" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
        </div>
        <div className="field">
          <label htmlFor="em">Email</label>
          <input id="em" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        {!notBooked ? (
          <div className="field">
            <label htmlFor="ed">When is your VTNE?</label>
            <input id="ed" type="date" min={today} required={!notBooked} value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          </div>
        ) : (
          <div className="field">
            <label htmlFor="tm">Which month are you aiming for?</label>
            <select id="tm" required value={targetMonth} onChange={(e) => setTargetMonth(e.target.value)}>
              <option value="">Choose a month</option>
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="field">
          <label className="check">
            <input type="checkbox" checked={notBooked} onChange={(e) => setNotBooked(e.target.checked)} />
            <span>I haven&apos;t booked my exam date yet</span>
          </label>
        </div>
        <div className="field">
          <label className="check">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
            <span>
              Send me my plan and check-ins from {BUDDY_NAME} before and after my VTNE. I can unsubscribe anytime.
            </span>
          </label>
        </div>
        {err && <p className="error">{err}</p>}
        <button className="btn block" type="submit" disabled={busy}>
          {busy ? "Building your plan..." : "Show me my plan"}
        </button>
      </form>
      <p className="center small">
        <button className="btn ghost" onClick={restart}>
          Start over
        </button>
      </p>
    </div>
  );
}
