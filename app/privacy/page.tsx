import { BRAND_NAME } from "@/config";

export const metadata = { title: "Privacy" };

export default function Privacy() {
  return (
    <div className="card">
      <h1>Privacy</h1>
      <p>
        {BRAND_NAME} collects what you give it: your diagnostic answers, how you&apos;re feeling about the exam, your first
        name, email, exam date, and, if you choose to share it, whether you passed.
      </p>
      <p>
        This is used to build your study plan, send the check-ins you asked for, and improve the questions and the service.
        Pass rates are reported only in aggregate. Your information is never sold.
      </p>
      <p>
        A few trusted services help run the site: Stripe processes payments (we never see your card number), ElevenLabs runs voice and text
        conversations with Sara, SendGrid sends email, and Railway hosts the site and database. Conversations with Sara are stored so you
        and we can review them, and they may be used to improve Sara. Sign-in uses a cookie that keeps you signed in; we don&apos;t use
        advertising trackers.
      </p>
      <p>Every email has an unsubscribe link. To have your data deleted, reply to any email and ask.</p>
    </div>
  );
}
