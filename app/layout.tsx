import "./globals.css";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { BRAND_NAME, TRADEMARK_NOTE } from "@/config";
import { RegisterSW } from "@/components/PWA";

export const metadata: Metadata = {
  title: `${BRAND_NAME}: tutoring for vet tech school and VTNE prep`,
  description:
    "An AI study buddy for vet tech students. Sara tutors you through any course topic until it clicks, and gets you ready for the VTNE with a free diagnostic, practice and voice study.",
  applicationName: BRAND_NAME,
  metadataBase: new URL(process.env.APP_URL || "https://vettechstudybuddy.com"),
  openGraph: {
    title: `${BRAND_NAME}: from first semester to the VTNE`,
    description: "Stuck on a topic in class? Sara explains it until it clicks. Getting ready for the VTNE? Start with a free diagnostic.",
    images: [{ url: "/images/og.jpg", width: 1200, height: 630 }],
    type: "website",
  },
  appleWebApp: { capable: true, title: "Study Buddy", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0b5a45",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <RegisterSW />
        <header className="site-header">
          <div className="wrap">
            <Link href="/" className="brand" aria-label={`${BRAND_NAME} home`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo.webp" alt={BRAND_NAME} width={760} height={176} className="logo" />
            </Link>
            <nav className="site-nav">
              <Link href="/pricing">Pricing</Link>
              <Link href="/home" className="btn secondary">
                My study home
              </Link>
            </nav>
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer className="site-footer">
          <div className="wrap">
            <p>
              {TRADEMARK_NOTE} <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link> ·{" "}
              <Link href="/refunds">Refunds and pass guarantee</Link>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
