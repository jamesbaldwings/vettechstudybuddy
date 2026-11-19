import { cookies } from "next/headers";
import { appUrl } from "@/config";
import { db } from "@/lib/db";
import { layout, sendEmail } from "@/lib/email";

// Short emails to the owner about new accounts and purchases, so he can see which posts bring in users.
// Goes to OWNER_ALERT_EMAIL (default hello@vettechstudybuddy.com). Set OWNER_ALERT_EMAIL=off to stop them.
// Never throws: a failed alert must not break a student's sign-up or a Stripe webhook.

const SOURCE_COOKIE = "vtsb_src";

export async function signupSource(): Promise<string> {
  try {
    const v = (await cookies()).get(SOURCE_COOKIE)?.value;
    return v ? v.slice(0, 200) : "unknown (visited before tracking started)";
  } catch {
    return "unknown";
  }
}

async function counts() {
  const r = await db().query<{ today: string; week: string; total: string }>(
    `SELECT count(*) FILTER (WHERE created_at >= date_trunc('day', now() AT TIME ZONE 'America/Chicago') AT TIME ZONE 'America/Chicago') today,
            count(*) FILTER (WHERE created_at >= now() - interval '7 days') week,
            count(*) total
       FROM leads WHERE role = 'student'`,
  );
  return r.rows[0];
}

async function send(subject: string, lines: string[]) {
  const to = (process.env.OWNER_ALERT_EMAIL || "hello@vettechstudybuddy.com").trim();
  if (!to || to.toLowerCase() === "off") return;
  const unsub = `mailto:${to}?subject=Stop%20owner%20alerts`;
  const { html, text } = layout({
    greeting: "New activity on Vet Tech Study Buddy:",
    unsubscribeUrl: unsub,
    blocks: [{ paragraphs: [], list: lines, buttons: [{ label: "Open admin", url: `${appUrl()}/admin` }] }],
  });
  await sendEmail({ to, subject, html, text, unsubscribeUrl: unsub });
}

export async function alertNewSignup(opts: { email: string; firstName: string | null; how: string; examDate?: string | null; targetMonth?: string | null }) {
  try {
    const source = await signupSource();
    const c = await counts();
    await send(`New sign-up: ${opts.firstName || opts.email} (from ${source.split(" | ")[0]})`, [
      `Who: ${opts.firstName ? `${opts.firstName}, ` : ""}${opts.email}`,
      `How: ${opts.how}`,
      ...(opts.examDate ? [`Exam date: ${opts.examDate}`] : opts.targetMonth ? [`Aiming for: ${opts.targetMonth}`] : []),
      `Came from: ${source}`,
      `Student accounts: ${c.today} today, ${c.week} in the last 7 days, ${c.total} total`,
    ]);
  } catch (e) {
    console.error("[owner alert] signup", e);
  }
}

export async function alertPurchase(opts: { leadId?: string | null; what: string; amountCents: number }) {
  try {
    let who = "unknown buyer";
    let source = "unknown";
    if (opts.leadId) {
      const r = await db().query<{ email: string; first_name: string | null; signup_source: string | null; created_at: Date }>(
        `SELECT email, first_name, signup_source, created_at FROM leads WHERE id = $1`,
        [opts.leadId],
      );
      if (r.rowCount) {
        const l = r.rows[0];
        who = `${l.first_name ? `${l.first_name}, ` : ""}${l.email}`;
        source = `${l.signup_source || "unknown"} (signed up ${l.created_at.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`;
      }
    }
    const amount = `$${(opts.amountCents / 100).toFixed(2)}`;
    await send(`New purchase: ${opts.what}, ${amount}`, [`What: ${opts.what}`, `Paid: ${amount}`, `Who: ${who}`, `Originally came from: ${source}`]);
  } catch (e) {
    console.error("[owner alert] purchase", e);
  }
}
