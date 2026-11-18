import Link from "next/link";
import { currentLead } from "@/lib/auth";
import { inviteByToken } from "@/lib/school";
import { Buddy } from "@/components/Buddy";
import { BUDDY_NAME } from "@/config";
import ClaimButton from "./ClaimButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Join your school", robots: { index: false } };

export default async function Join({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [inv, lead] = await Promise.all([inviteByToken(token), currentLead()]);
  if (!inv || inv.revoked_at)
    return (
      <Buddy>
        <p>This link isn&apos;t active anymore. Ask your school for a new one.</p>
      </Buddy>
    );
  if (inv.used_at && inv.used_by !== lead?.id)
    return (
      <Buddy>
        <p>
          This link has already been used. Each link works once. If it was yours, <Link href={`/signin?next=/join/${token}`}>sign in</Link>{" "}
          with the account you used.
        </p>
      </Buddy>
    );
  const next = `/join/${token}`;
  const isAdmin = inv.kind === "admin";
  return (
    <>
      <Buddy>
        <p>
          {isAdmin ? (
            <>
              You&apos;ve been added as a school admin for <strong>{inv.school_name}</strong>. Once you&apos;re in, you can add students and
              see how they&apos;re doing.
            </>
          ) : (
            <>
              <strong>{inv.school_name}</strong> is giving you a free Exam Pass: 90 days of practice, timed practice exams, &quot;why&quot;
              chats with me, and 5 hours of voice study. Your 90 days start when you press Start, so you can begin when you&apos;re ready.
            </>
          )}
        </p>
      </Buddy>
      {!isAdmin && (
        <section className="card">
          <h2 style={{ marginTop: 0 }}>What your school will see</h2>
          <p className="small">
            Your name and email, whether you&apos;ve joined and started, when you were last active, how many questions you&apos;ve answered,
            your accuracy and readiness, your weakest topic, practice exam scores, how often you mark answers as guesses, how you said you feel
            about the exam, your VTNE date and the result you report.
          </p>
          <p className="small" style={{ marginBottom: 0 }}>
            Your school will <strong>not</strong> see your conversations with {BUDDY_NAME} or your individual answers.
          </p>
        </section>
      )}
      <section className="card">
        {lead ? (
          <>
            <p className="small muted" style={{ marginTop: 0 }}>
              Signed in as {lead.email}.
              {lead.email.toLowerCase() !== inv.email.toLowerCase() && ` This link was sent to ${inv.email}.`}
            </p>
            <ClaimButton token={token} kind={inv.kind} done={!!inv.used_at} />
          </>
        ) : (
          <>
            <p style={{ marginTop: 0 }}>First, sign in or create your free account. Then come back to this page to {isAdmin ? "finish" : "add your pass"}.</p>
            <div className="row">
              <Link className="btn" href={`/signin?mode=create&next=${encodeURIComponent(next)}`}>
                Create account
              </Link>
              <Link className="btn secondary" href={`/signin?next=${encodeURIComponent(next)}`}>
                Sign in
              </Link>
            </div>
          </>
        )}
      </section>
    </>
  );
}
