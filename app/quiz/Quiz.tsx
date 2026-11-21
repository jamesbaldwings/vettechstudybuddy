"use client";
import Turnstile from "@/components/Turnstile";

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

export default function Quiz({ siteKey, freePerWeek }: { siteKey: string | null; freePerWeek: number }) {
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

  return <Done s={s} siteKey={siteKey} freePerWeek={freePerWeek} restart={restart} onSaved={(url) => { try { localStorage.removeItem(KEY); } catch {} router.push(url); }} />;
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

// The course subject Tutor Mode opens on for each VTNE domain.
const DOMAIN_SUBJECT: Record<string, string> = {
  pharm: "pharmacology",
  surgery: "surgical_nursing",
  dentistry: "dentistry",
  lab: "clinical_pathology",
  nursing: "animal_nursing",
  imaging: "imaging",
  anesthesia: "anesthesia",
  ecc: "ecc",
  pain: "pain",
  communication: "communication",
};

// The domain with the most misses on this diagnostic (ties go to the one the VTNE weighs more).
function weakestDomain(answers: (number | null)[]) {
  const missed = new Map<string, number>();
  QUESTIONS.forEach((q, i) => {
    if (answers[i] !== q.answer) missed.set(q.domain, (missed.get(q.domain) ?? 0) + 1);
  });
  let best: { id: string; name: string; weight: number; n: number } | null = null;
  for (const [id, n] of missed) {
    const d = domainById(id as Parameters<typeof domainById>[0]);
    if (!best || n > best.n || (n === best.n && d.weight > best.weight)) best = { id, name: d.name, weight: d.weight, n };
  }
  return best;
}

function Done({
  s,
  siteKey,
  freePerWeek,
  restart,
  onSaved,
}: {
  s: Saved;
  siteKey: string | null;
  freePerWeek: number;
  restart: () => void;
  onSaved: (url: string) => void;
}) {
  const [token, setToken] = useState("");
  const [resetN, setResetN] = useState(0);
  const months = useMemo(upcomingMonths, []);
  const weak = useMemo(() => weakestDomain(s.answers), [s.answers]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  // One question for the exam: a booked date, or the month they're aiming for.
  const [when, setWhen] = useState("");
  const [examDate, setExamDate] = useState("");
  const [consent, setConsent] = useState(false);
  const [existing, setExisting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const r = s.result;
  if (!r) return null;
  const band = BAND_TEXT[r.band];
  const today = new Date().toISOString().slice(0, 10);
  const booked = when === "booked";
  const waitingOnCheck = !!siteKey && !token;

  // Where the student goes once the account exists: straight into Tutor Mode on their weakest area, or to the plan.
  function tutorUrl() {
    if (!weak) return "/tutor";
    const subject = DOMAIN_SUBJECT[weak.id] ?? "";
    const topic = `${weak.name} (what I missed on the diagnostic)`;
    return `/tutor?subject=${encodeURIComponent(subject)}&topic=${encodeURIComponent(topic)}`;
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const goTutor = submitter?.value !== "plan";
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          attemptToken: s.attemptToken,
          email,
          examDate: booked ? examDate : null,
          targetMonth: booked ? null : when || null,
          consent,
          password,
          turnstile: token,
        }),
      });
      const j = await res.json();
      if (j.existingAccount) setExisting(true);
      if (!res.ok) throw new Error(j.error || "Something went wrong.");
      onSaved(goTutor ? tutorUrl() : j.signInSent ? `${j.resultsUrl}?signin=sent` : j.resultsUrl);
    } catch (e2) {
      setErr(String((e2 as Error).message));
      setBusy(false);
      setResetN((n) => n + 1);
    }
  }

  return (
    <div>
      <div className="card center quiz-score">
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
        {weak ? (
          <p>
            Nice work getting through all 25. You missed {weak.n} in <strong>{weak.name}</strong>. Want me to walk you through
            it right now? Your first tutor session is on me.
          </p>
        ) : (
          <p>
            A perfect 25. Impressive. Want to try me on whatever you&apos;re covering in class? Your first tutor session is on me.
          </p>
        )}
      </Buddy>

      <form className="card tutor-offer" onSubmit={submit}>
        <h2 style={{ marginTop: 0, marginBottom: 4 }}>Free tutor session with {BUDDY_NAME}</h2>
        <p className="small muted" style={{ marginTop: 0 }}>
          Make a free account and you get {freePerWeek} tutor sessions every week, plus your study plan. No card needed.
        </p>
        <div className="field">
          <label htmlFor="em">Email</label>
          <input
            id="em"
            type="email"
            required
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setExisting(false);
            }}
            autoComplete="email"
          />
        </div>
        <div className="field">
          <label htmlFor="pw">{existing ? "Your password" : "Create a password"}</label>
          <div className="pw-wrap">
            <input
              id="pw"
              type={showPw ? "text" : "password"}
              required
              minLength={existing ? undefined : 8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={existing ? "current-password" : "new-password"}
            />
            <button type="button" className="pw-toggle" onClick={() => setShowPw((v) => !v)} aria-pressed={showPw}>
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
          <span className="small muted">
            {existing ? <a href="/signin?mode=forgot">Forgot password?</a> : "At least 8 characters."}
          </span>
        </div>
        <div className="field">
          <label htmlFor="when">When are you taking the VTNE?</label>
          <select id="when" required value={when} onChange={(e) => setWhen(e.target.value)}>
            <option value="">Choose one</option>
            <option value="booked">I&apos;ve booked a date</option>
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                Aiming for {m.label}
              </option>
            ))}
          </select>
        </div>
        {booked && (
          <div className="field">
            <label htmlFor="ed">Your exam date</label>
            <input id="ed" type="date" min={today} required value={examDate} onChange={(e) => setExamDate(e.target.value)} />
          </div>
        )}
        <div className="field">
          <label className="check">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
            <span className="small">
              Send me my plan and check-ins from {BUDDY_NAME} before and after my VTNE. I can unsubscribe anytime. I agree to
              the <a href="/terms" target="_blank">terms</a>.
            </span>
          </label>
        </div>
        {err && <p className="error">{err}</p>}
        <Turnstile siteKey={siteKey} onToken={setToken} reset={resetN} />
        <button className="btn block" type="submit" value="tutor" disabled={busy || waitingOnCheck}>
          {busy ? "Getting things ready..." : existing ? `Sign in and start with ${BUDDY_NAME}` : `Start my free session with ${BUDDY_NAME}`}
        </button>
        {waitingOnCheck && !busy && <p className="small muted center" style={{ margin: "8px 0 0" }}>One sec, running a quick security check...</p>}
        <p className="center" style={{ margin: "10px 0 0" }}>
          <button className="btn ghost" type="submit" value="plan" disabled={busy || waitingOnCheck}>
            Just show my study plan
          </button>
        </p>
      </form>
      <p className="center small">
        <button className="btn ghost" onClick={restart}>
          Start over
        </button>
      </p>
    </div>
  );
}
