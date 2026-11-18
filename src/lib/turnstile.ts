// Cloudflare Turnstile bot check. Switched on only when both keys are set (empty values leave it off).
export const turnstileSiteKey = () =>
  process.env.TURNSTILE_SITE_KEY?.trim() && process.env.TURNSTILE_SECRET_KEY?.trim() ? process.env.TURNSTILE_SITE_KEY.trim() : null;

export async function turnstileOk(req: Request, token: unknown): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret || !turnstileSiteKey()) return true;
  if (typeof token !== "string" || !token) return false;
  const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "";
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
      signal: AbortSignal.timeout(5000),
    });
    const j = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!j.success) console.warn("[turnstile] rejected", j["error-codes"]);
    return !!j.success;
  } catch (e) {
    // If Cloudflare can't be reached, don't lock real students out.
    console.error("[turnstile] verify failed, allowing", e);
    return true;
  }
}

export const TURNSTILE_ERROR = "Please complete the quick security check and try again.";
