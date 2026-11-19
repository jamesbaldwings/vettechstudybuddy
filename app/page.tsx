import Link from "next/link";
import { Buddy } from "@/components/Buddy";
import { BUDDY_NAME, FOUNDER_LINE, TUTOR_FREE_PER_WEEK } from "@/config";

export default function Home() {
  return (
    <>
      <section className="hero-photo">
        <picture>
          <source media="(max-width: 700px)" srcSet="/images/hero-vet-techs-800.webp" />
          <img
            src="/images/hero-vet-techs.webp"
            alt="Smiling veterinary technicians in scrubs holding a cat, a rabbit, a bearded dragon and a parrot, with a golden retriever"
            width={1280}
            height={720}
            fetchPriority="high"
          />
        </picture>
        <div className="hero-copy">
          <h1>A study buddy for the VTNE.</h1>
          <p className="lede">
            Learn the why, not just the answer. When you understand the concept, you can get the question right no matter how it&apos;s
            written. Start with a free 25-question diagnostic and see where you stand.
          </p>
          <Link href="/quiz" className="btn">
            Start the free diagnostic
          </Link>
          <div className="pills">
            <span className="pill">About 15 minutes</span>
            <span className="pill">No timer</span>
            <span className="pill">Free</span>
            <span className="pill">Text and voice with {BUDDY_NAME}</span>
          </div>
        </div>
      </section>

      <section style={{ margin: "34px 0" }}>
        <Buddy>
          <p>
            Hi, I&apos;m {BUDDY_NAME}, your AI study buddy. When you miss a question, I won&apos;t just tell you the answer. I&apos;ll
            ask what you were thinking, find where it went sideways, and walk you through the reasoning until you can explain it back to
            me.
          </p>
        </Buddy>
      </section>

      <section className="grid3" style={{ marginBottom: 30 }}>
        <div className="card">
          <div className="step-num">1</div>
          <h3>Take the diagnostic</h3>
          <p className="muted small">25 questions across all 10 VTNE topic areas, in about the same proportions as the real exam.</p>
        </div>
        <div className="card">
          <div className="step-num">2</div>
          <h3>Practice your weak spots</h3>
          <p className="muted small">
            Practice leans toward the topics you&apos;re missing. Tell us how sure you were, so a lucky guess doesn&apos;t count as
            learned.
          </p>
        </div>
        <div className="card">
          <div className="step-num">3</div>
          <h3>Ask {BUDDY_NAME} why</h3>
          <p className="muted small">
            After any question, work through the reasoning with {BUDDY_NAME} by text, or study out loud with her by voice.
          </p>
        </div>
      </section>

      <section className="card" id="tutor-mode">
        <span className="badge">New: Tutor Mode</span>
        <h2 style={{ marginTop: 10 }}>Stuck on a topic in class? {BUDDY_NAME} explains it until it clicks.</h2>
        <p>
          Pharmacology, anatomy and physiology, anesthesia, clinical pathology, surgical nursing, parasitology: pick the course, type the topic,
          and paste your notes or learning objectives if you have them. {BUDDY_NAME} checks what you already know, walks you through it step by
          step with real clinic examples, and asks a quick question after each step. If something doesn&apos;t land, she explains it a different
          way. You finish with a recap and practice questions. Text or voice, your choice.
        </p>
        <p>
          <strong>{BUDDY_NAME} is a tutor, not a homework service.</strong> She teaches the concept, but she won&apos;t write graded assignments,
          essays or take-home exam answers. She won&apos;t guess at drug doses, she shows her work on every calculation, and she tells you when a
          topic goes beyond our reviewed material so you can check with your instructor.
        </p>
        <p className="muted">
          {FOUNDER_LINE} Free accounts get {TUTOR_FREE_PER_WEEK} tutor sessions a week. Everything you master in class counts toward the VTNE too.
        </p>
        <Link href="/tutor" className="btn">
          Try Tutor Mode free
        </Link>
      </section>

      <section className="card">
        <h2>Why understanding beats memorizing</h2>
        <p>
          The VTNE can ask about the same idea a dozen different ways. If you memorized &quot;furosemide, low potassium,&quot; a question
          about a dog that&apos;s weak after starting a diuretic can still trip you up. If you understand why the drug pulls potassium out,
          you can answer any version of it.
        </p>
        <p>That&apos;s what {BUDDY_NAME} is for: the why behind every answer, so it sticks.</p>
        <p className="muted">{FOUNDER_LINE}</p>
        <Link href="/quiz" className="btn secondary">
          Start the free diagnostic
        </Link>
      </section>

      <section className="card">
        <h2>What this is, and what it isn&apos;t</h2>
        <div className="grid2">
          <div>
            <h3 style={{ marginTop: 0 }}>It is</h3>
            <ul>
              <li>Study prep for the VTNE, plus Tutor Mode for the courses you take on the way there.</li>
              <li>Practice questions reviewed and approved by veterinary technicians and instructors, each with an explanation of why.</li>
              <li>{BUDDY_NAME}, an AI study buddy you can talk to by text or voice.</li>
              <li>A readiness estimate based on your practice, and check-ins before and after your exam.</li>
            </ul>
          </div>
          <div>
            <h3 style={{ marginTop: 0 }}>It isn&apos;t</h3>
            <ul>
              <li>The real VTNE questions. Nobody outside the AAVSB has those.</li>
              <li>A replacement for your program, your textbooks or your instructors.</li>
              <li>A homework service. {BUDDY_NAME} teaches; she doesn&apos;t do graded work for you.</li>
              <li>Always right. {BUDDY_NAME} is an AI and can make mistakes, so check anything important against your textbook.</li>
              <li>A promise that you&apos;ll pass. Readiness is an estimate, not a predicted VTNE score.</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
