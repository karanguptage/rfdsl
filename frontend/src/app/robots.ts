import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// /robots.txt - lets all search engines crawl the whole site (except the
// admin page and the API) and points them to the sitemap. /api/ is closed so
// crawlers that run JavaScript (Googlebot) don't start a Nemanja chat every
// time they render /solutions.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
