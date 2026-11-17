import { BRAND_NAME } from "@/config";

export const metadata = { title: "Refunds and pass guarantee" };

export default function Refunds() {
  return (
    <article className="card prose">
      <h1>Refunds and pass guarantee</h1>
      <p className="muted small">Last updated November 17, 2026</p>

      <h2>Refunds</h2>
      <p>
        If you haven&apos;t pressed Start on a pass, you can get a full refund within 14 days of buying it. Once a pass is started, it
        isn&apos;t refundable, but the pass guarantee below still applies. Extra voice time is refundable within 14 days if you haven&apos;t
        used any of it.
      </p>
      <p>
        To ask for a refund, email <a href="mailto:hello@vettechstudybuddy.com">hello@vettechstudybuddy.com</a> from the email on your account.
      </p>

      <h2>Pass guarantee</h2>
      <p>If you don&apos;t pass the VTNE after studying with an Exam Pass, we&apos;ll give you a free Retake Pass (60 days, 200 voice minutes) when all of these are true:</p>
      <ul>
        <li>You started your Exam Pass and took the VTNE while it was active, or within 30 days after it ended.</li>
        <li>You finished at least two full practice exams during your pass.</li>
        <li>You answered at least 500 practice questions during your pass.</li>
        <li>You tell us your result within 60 days of your exam (reply to Sara&apos;s check-in email, or email us).</li>
      </ul>
      <p>
        The guarantee is a free Retake Pass, not a cash refund, and it covers one retake per student. It doesn&apos;t cover AAVSB or exam
        fees.
      </p>
      <p className="small muted">
        {BRAND_NAME} is an independent study tool. Passing the VTNE depends on many things outside our control, and we can&apos;t promise any
        particular result.
      </p>
    </article>
  );
}
