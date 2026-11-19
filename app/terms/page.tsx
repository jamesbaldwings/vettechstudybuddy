import Link from "next/link";
import { BRAND_NAME, BUDDY_NAME, TRADEMARK_NOTE } from "@/config";

export const metadata = { title: "Terms of use" };

export default function Terms() {
  return (
    <article className="card prose">
      <h1>Terms of use</h1>
      <p className="muted small">Last updated November 17, 2026</p>
      <p>
        {BRAND_NAME} (vettechstudybuddy.com) is run by Agsperience Inc., Murfreesboro, Tennessee (&quot;we&quot;). By creating an account or
        buying a pass you agree to these terms.
      </p>

      <h2>What you get</h2>
      <p>
        A free account includes the diagnostic, a study plan, check-in emails, a limited number of practice questions each day, and a short
        voice session with {BUDDY_NAME}. Passes add full practice, practice exams, text chat, and voice minutes for a set number of days that
        start when you press Start. A pass must be started within 12 months of purchase. Voice minutes from a pass can be used while you have
        them; extra voice time never expires.
      </p>

      <h2>{BUDDY_NAME} is an AI</h2>
      <p>
        {BUDDY_NAME} is an AI study partner. She can make mistakes. Use her to study, and check anything important against your textbooks and
        instructors. Nothing on this site is veterinary advice for a real patient. Voice and text conversations are processed by our AI
        provider so {BUDDY_NAME} can respond, and we may review them to improve the service. See the <Link href="/privacy">privacy policy</Link>.
      </p>

      <h2>Tutor Mode is tutoring, not homework help</h2>
      <p>
        In Tutor Mode, {BUDDY_NAME} teaches the concepts from your vet tech courses. She won&apos;t write graded assignments, essays, lab reports
        or answers to take-home exams, and she&apos;ll steer back to teaching the idea if asked. Follow your program&apos;s academic integrity
        rules. A Semester Pass starts the day you buy it and gives unlimited Tutor Mode for the number of days shown at checkout. If your school
        gives you a seat, your school can see summary progress (such as topics the class finds hard and whether you&apos;re passing
        understanding checks), never your conversations.
      </p>

      <h2>Your account</h2>
      <p>
        Accounts are for one person. Don&apos;t share your sign-in or resell access. Don&apos;t copy, scrape or republish our questions. We may
        limit or close accounts that misuse the service, including heavy automated use of {BUDDY_NAME}.
      </p>

      <h2>Payments and refunds</h2>
      <p>
        Payments are processed by Stripe. Prices are one-time, not subscriptions. See{" "}
        <Link href="/refunds">refunds and pass guarantee</Link>.
      </p>

      <h2>Passes from your school</h2>
      <p>
        If your school gives you a pass, it works like any Exam Pass and starts when you press Start. When you accept it, your school can see your name
        and email, whether you&apos;ve joined and started, when you were last active, how many questions you&apos;ve answered, your accuracy and
        readiness, your weakest topic, practice exam scores, how often you mark answers as guesses, how you said you feel about the exam, your VTNE
        date and the result you report. Your school can&apos;t see your conversations with {BUDDY_NAME} or your individual answers. Each school link
        works once and can&apos;t be transferred. School seats are refunded under the school&apos;s own agreement with us, not the student refund
        policy.
      </p>

      <h2>No guarantee of results</h2>
      <p>
        We work hard to make practice questions accurate and representative, but they are not the real VTNE, and readiness scores are
        estimates. Except for the pass guarantee, the service is provided as is, and our total liability is limited to what you paid us in the
        last 12 months.
      </p>

      <h2>Changes and contact</h2>
      <p>
        We may update these terms and will note the date above. Questions: <a href="mailto:hello@vettechstudybuddy.com">hello@vettechstudybuddy.com</a>.
        These terms are governed by Tennessee law.
      </p>
      <p className="small muted">{TRADEMARK_NOTE}</p>
    </article>
  );
}
