import { NextRequest, NextResponse } from "next/server";

// Remembers where a visitor first came from (Facebook, Instagram, Google, a UTM link...) so the owner's
// sign-up alert can say which channel brought each new account. First touch wins; kept for 90 days.
export const SOURCE_COOKIE = "vtsb_src";

function describe(req: NextRequest): string {
  const p = req.nextUrl.searchParams;
  const utm = [p.get("utm_source"), p.get("utm_medium"), p.get("utm_campaign")].filter(Boolean).join(" / ");
  if (utm) return utm;
  const ref = req.headers.get("referer") || "";
  let host = "";
  try {
    host = ref ? new URL(ref).hostname.replace(/^www\./, "") : "";
  } catch {}
  if (host === req.nextUrl.hostname.replace(/^www\./, "")) host = "";
  if (/(^|\.)instagram\.com$/.test(host)) return "instagram";
  if (p.get("fbclid") || /(^|\.)(facebook\.com|fb\.com|fb\.me)$/.test(host)) return "facebook";
  if (p.get("gclid")) return "google ads";
  if (/(^|\.)google\./.test(host)) return "google search";
  if (/(^|\.)bing\.com$/.test(host)) return "bing search";
  if (host) return host;
  if (p.get("source")) return p.get("source")!;
  return "direct (typed the address, bookmark, email or app link)";
}

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  if (!req.cookies.get(SOURCE_COOKIE)) {
    res.cookies.set(SOURCE_COOKIE, `${describe(req)} | landed on ${req.nextUrl.pathname}`.slice(0, 200), {
      maxAge: 60 * 60 * 24 * 90,
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: req.nextUrl.protocol === "https:",
    });
  }
  return res;
}

// Page visits only: skip API calls, Next.js assets and files with an extension.
export const config = { matcher: ["/((?!api|_next|.*\\..*).*)"] };
