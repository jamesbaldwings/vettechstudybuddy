import Link from "next/link";
import { Buddy } from "@/components/Buddy";
import { BUDDY_NAME, FOUNDER_LINE } from "@/config";

export default function Home() {
  return (
    <>
      <section className="hero">
        <h1>A study buddy for the VTNE. Only the VTNE.</h1>
        <p className="lede">
          Take a free 25-question diagnostic weighted like the real exam. See where you stand, get a plan built around your
          test date, and have someone in your corner until you pass.
        </p>
        <Link href="/quiz" className="btn">
          Start the free diagnostic
        </Link>
        <div className="pills">
          <span className="pill">About 15 minutes</span>
          <span className="pill">No timer</span>
          <span className="pill">Free</span>
          <span className="pill">🎙️ Voice study buddy</span>
        </div>
      </section>

      <section style={{ margin: "34px 0" }}>
        <Buddy>
          <p>
            Hi, I&apos;m {BUDDY_NAME}. We&apos;ll go through it together, one question at a time, and I&apos;ll explain every
            answer as we go. Then we can talk through what you missed, out loud, and I&apos;ll check in before and after
            your exam.
          </p>
        </Buddy>
      </section>

      <section className="grid3" style={{ marginBottom: 30 }}>
        <div className="card">
          <div className="step-num">1</div>
          <h3>Take the diagnostic</h3>
          <p className="muted small">25 questions across all 10 VTNE domains, in the same proportions as the real exam.</p>
        </div>
        <div className="card">
          <div className="step-num">2</div>
          <h3>Get your plan</h3>
          <p className="muted small">See your weakest areas and a week-by-week plan counting down to your exam date.</p>
        </div>
        <div className="card">
          <div className="step-num">3</div>
          <h3>Talk it through out loud</h3>
          <p className="muted small">Review what you missed or get quizzed by voice with {BUDDY_NAME}, like studying with a classmate.</p>
        </div>
      </section>

      <section className="card">
        <h2>Why VTNE-only matters</h2>
        <p>
          General test-prep sites cover hundreds of exams. This one covers one. That means questions that sound like the
          clinic, explanations that tell you <em>why</em>, and a plan shaped around how the VTNE is actually weighted.
        </p>
        <p className="muted">{FOUNDER_LINE}</p>
        <p className="muted">
          Nervous? Most people are. That&apos;s why practice here is built to make test day feel familiar.
        </p>
        <Link href="/quiz" className="btn secondary">
          Start the free diagnostic
        </Link>
      </section>
    </>
  );
}
