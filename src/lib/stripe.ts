import { createHmac, timingSafeEqual } from "node:crypto";

// Minimal Stripe client over REST, so there's no SDK to keep current.
const API = process.env.STRIPE_API_BASE || "https://api.stripe.com";
export const stripeEnabled = () => !!process.env.STRIPE_SECRET_KEY;

function encode(obj: Record<string, unknown>, prefix = ""): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") out.push(...encode(v as Record<string, unknown>, key));
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`);
  }
  return out;
}

export async function stripe<T = Record<string, unknown>>(path: string, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API}/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: body ? encode(body).join("&") : undefined,
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`Stripe ${path}: ${j?.error?.message || res.status}`);
  return j as T;
}

// Verifies the Stripe-Signature header (t=...,v1=...) with a 5-minute tolerance.
export function verifyStripeSignature(payload: string, header: string | null, secret: string, toleranceSec = 300) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]).filter((p) => p.length === 2));
  const sigs = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > toleranceSec || !sigs.length) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex"));
  return sigs.some((s) => {
    const b = Buffer.from(s);
    return b.length === expected.length && timingSafeEqual(b, expected);
  });
}
