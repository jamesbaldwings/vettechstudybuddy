import type { MetadataRoute } from "next";
import { BRAND_NAME } from "@/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND_NAME,
    short_name: "Study Buddy",
    description: "Your VTNE study buddy: a free diagnostic, a plan around your exam date, and check-ins until you pass.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f3ee",
    theme_color: "#0b5a45",
    categories: ["education", "medical"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "Take the diagnostic", url: "/quiz", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] }],
  };
}
