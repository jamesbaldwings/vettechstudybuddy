import type { MetadataRoute } from "next";
import { appUrl } from "@/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/admin", "/school", "/join/", "/home", "/settings", "/practice", "/exam", "/results/", "/reset", "/auth/"] }],
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
