import "./globals.css";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { BRAND_NAME, TRADEMARK_NOTE } from "@/config";
import { BuddyAvatar } from "@/components/Buddy";
import { RegisterSW } from "@/components/PWA";

export const metadata: Metadata = {
  title: `${BRAND_NAME}: free VTNE diagnostic and study plan`,
  description:
    "A free 25-question VTNE diagnostic weighted like the real exam, with a study plan built around your exam date and a study buddy who checks in until test day.",
  applicationName: BRAND_NAME,
  appleWebApp: { capable: true, title: "Study Buddy", statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#1f6f5c",
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
            <Link href="/" className="brand">
              <BuddyAvatar size={34} />
              {BRAND_NAME}
            </Link>
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer className="site-footer">
          <div className="wrap">
            <p>
              {TRADEMARK_NOTE} <Link href="/privacy">Privacy</Link>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
