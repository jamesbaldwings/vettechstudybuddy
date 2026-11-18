import { appUrl, BUDDY_NAME } from "@/config";
import { layout, links, sendEmail } from "@/lib/email";

const hi = (name: string | null) => `Hi ${name?.trim() || "there"},`;

export async function sendSignInEmail(to: string, name: string | null, leadToken: string, loginToken: string) {
  const url = `${appUrl()}/auth/verify?t=${encodeURIComponent(loginToken)}`;
  const unsub = links.unsubscribe(leadToken);
  const { html, text } = layout({
    greeting: hi(name),
    unsubscribeUrl: unsub,
    blocks: [
      {
        paragraphs: ["Here's your sign-in link for Vet Tech Study Buddy. It works once and expires in 30 minutes."],
        buttons: [{ label: "Sign in", url }],
      },
      { paragraphs: ["If you didn't ask for this, you can ignore this email."] },
    ],
  });
  return sendEmail({ to, subject: "Your sign-in link", html, text, unsubscribeUrl: unsub });
}

export async function sendPassStartedEmail(to: string, name: string | null, leadToken: string, planName: string, expires: Date, voiceMinutes: number) {
  const unsub = links.unsubscribe(leadToken);
  const end = expires.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const { html, text } = layout({
    greeting: hi(name),
    unsubscribeUrl: unsub,
    blocks: [
      {
        paragraphs: [
          `Your ${planName} is running. You have full access through ${end}, plus ${voiceMinutes} minutes to study out loud with me.`,
          "Best way to start: take a full practice exam this week so we know exactly where to focus.",
        ],
        buttons: [{ label: "Go to my study home", url: `${appUrl()}/home` }],
      },
      { paragraphs: [`Let's do this. — ${BUDDY_NAME}`] },
    ],
  });
  return sendEmail({ to, subject: `Your ${planName} has started`, html, text, unsubscribeUrl: unsub });
}

export function passEndingMessage(to: string, name: string | null, leadToken: string, planName: string, expires: Date) {
  const unsub = links.unsubscribe(leadToken);
  const end = expires.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const { html, text } = layout({
    greeting: hi(name),
    unsubscribeUrl: unsub,
    blocks: [
      {
        paragraphs: [
          `Heads up: your ${planName} ends on ${end}. If your exam is after that, you can add a Final Stretch pass so you don't lose momentum.`,
        ],
        buttons: [
          { label: "Keep studying", url: `${appUrl()}/home` },
          { label: "See passes", url: `${appUrl()}/pricing` },
        ],
      },
    ],
  });
  return { to, subject: `Your ${planName} ends ${end}`, html, text, unsubscribeUrl: unsub };
}

export async function sendResetEmail(to: string, name: string | null, leadToken: string, resetToken: string) {
  const url = `${appUrl()}/reset?t=${encodeURIComponent(resetToken)}`;
  const unsub = links.unsubscribe(leadToken);
  const { html, text } = layout({
    greeting: hi(name),
    unsubscribeUrl: unsub,
    blocks: [
      {
        paragraphs: ["Here's your link to set a new password for Vet Tech Study Buddy. It works once and expires in 30 minutes."],
        buttons: [{ label: "Set a new password", url }],
      },
      { paragraphs: ["If you didn't ask for this, you can ignore this email. Your password won't change."] },
    ],
  });
  return sendEmail({ to, subject: "Reset your password", html, text, unsubscribeUrl: unsub });
}
