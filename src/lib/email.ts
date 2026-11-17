import { BRAND_NAME, BUDDY_NAME, TRADEMARK_NOTE, appUrl } from "@/config";

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl: string;
}

export type SendResult = { status: "sent" | "dry_run" | "error"; error?: string };

export async function sendEmail(msg: OutgoingEmail): Promise<SendResult> {
  const key = process.env.SENDGRID_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    console.log(`[email dry-run] to=${msg.to} subject="${msg.subject}"\n${msg.text}\n`);
    return { status: "dry_run" };
  }
  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: msg.to }] }],
        from: { email: from, name: process.env.EMAIL_FROM_NAME || `${BUDDY_NAME} from ${BRAND_NAME}` },
        ...(process.env.EMAIL_REPLY_TO ? { reply_to: { email: process.env.EMAIL_REPLY_TO } } : {}),
        subject: msg.subject,
        content: [
          { type: "text/plain", value: msg.text },
          { type: "text/html", value: msg.html },
        ],
        headers: {
          "List-Unsubscribe": `<${msg.unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
    });
    if (!res.ok) return { status: "error", error: `SendGrid ${res.status}: ${(await res.text()).slice(0, 300)}` };
    return { status: "sent" };
  } catch (e) {
    return { status: "error", error: String(e).slice(0, 300) };
  }
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export interface EmailBlock {
  paragraphs: string[]; // plain text paragraphs (escaped for HTML)
  buttons?: { label: string; url: string }[];
  list?: string[];
}

// Wraps content in the shared layout and builds the plain-text version too.
export function layout(opts: { greeting: string; blocks: EmailBlock[]; unsubscribeUrl: string }) {
  const address = process.env.POSTAL_ADDRESS || "";
  const htmlBlocks = opts.blocks
    .map((b) => {
      const ps = b.paragraphs.map((p) => `<p style="margin:0 0 14px;line-height:1.55">${esc(p)}</p>`).join("");
      const list = b.list?.length
        ? `<ul style="margin:0 0 14px;padding-left:20px;line-height:1.55">${b.list.map((li) => `<li>${esc(li)}</li>`).join("")}</ul>`
        : "";
      const btns = b.buttons?.length
        ? `<div style="margin:6px 0 18px">${b.buttons
            .map(
              (btn) =>
                `<a href="${btn.url}" style="display:inline-block;margin:0 8px 8px 0;padding:11px 18px;border-radius:999px;background:#1f6f5c;color:#fff;text-decoration:none;font-weight:600">${esc(btn.label)}</a>`,
            )
            .join("")}</div>`
        : "";
      return ps + list + btns;
    })
    .join("");
  const html = `<!doctype html><html><body style="margin:0;background:#f6f3ee;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1d2a26">
<div style="max-width:560px;margin:0 auto;padding:28px 20px">
<div style="font-weight:700;color:#1f6f5c;margin-bottom:18px">${esc(BRAND_NAME)}</div>
<div style="background:#fff;border-radius:14px;padding:24px">
<p style="margin:0 0 14px;line-height:1.55">${esc(opts.greeting)}</p>
${htmlBlocks}
<p style="margin:0;line-height:1.55">${esc(BUDDY_NAME)}<br><span style="color:#5b6b66">Your study buddy at ${esc(BRAND_NAME)}</span></p>
</div>
<p style="font-size:12px;color:#6b7a75;line-height:1.5;margin-top:18px">You're getting this because you took the free VTNE diagnostic and asked for your plan and check-ins.
<a href="${opts.unsubscribeUrl}" style="color:#6b7a75">Unsubscribe</a>.${address ? `<br>${esc(address)}` : ""}<br>${esc(TRADEMARK_NOTE)}</p>
</div></body></html>`;
  const text = [
    opts.greeting,
    "",
    ...opts.blocks.flatMap((b) => [
      ...b.paragraphs.flatMap((p) => [p, ""]),
      ...(b.list?.length ? [...b.list.map((li) => `- ${li}`), ""] : []),
      ...(b.buttons?.length ? [...b.buttons.map((btn) => `${btn.label}: ${btn.url}`), ""] : []),
    ]),
    BUDDY_NAME,
    `Your study buddy at ${BRAND_NAME}`,
    "",
    `Unsubscribe: ${opts.unsubscribeUrl}`,
    address,
    TRADEMARK_NOTE,
  ].join("\n");
  return { html, text };
}

export const links = {
  results: (attemptToken: string) => `${appUrl()}/results/${attemptToken}`,
  outcome: (leadToken: string, r?: string) => `${appUrl()}/outcome/${leadToken}${r ? `?r=${r}` : ""}`,
  unsubscribe: (leadToken: string) => `${appUrl()}/unsubscribe/${leadToken}`,
  quiz: () => `${appUrl()}/quiz`,
};
