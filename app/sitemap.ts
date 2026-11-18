import type { MetadataRoute } from "next";
import { appUrl } from "@/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = appUrl();
  return ["", "/quiz", "/pricing", "/terms", "/privacy", "/refunds"].map((p) => ({
    url: `${base}${p}`,
    changeFrequency: p === "" ? "weekly" : "monthly",
    priority: p === "" ? 1 : p === "/quiz" || p === "/pricing" ? 0.8 : 0.3,
  }));
}
