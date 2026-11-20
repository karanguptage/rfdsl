"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { isTrackingExcluded } from "@/lib/tracking";

// Reports each page view to /api/track (shown in /admin > Visitors): on first
// load and on every in-site navigation, including filter / page changes on
// /products. The visitor's IP is read on the server. Skips /admin and the
// administrator's own browser. Renders nothing.

let initialReferrerSent = false;

// External site the visitor came from (e.g. Google), sent with the first view only.
function takeReferrer(): string {
  if (initialReferrerSent) return "";
  initialReferrerSent = true;
  try {
    const r = document.referrer;
    return r && new URL(r).origin !== window.location.origin ? r.slice(0, 500) : "";
  } catch {
    return "";
  }
}

export default function VisitTracker() {
  const pathname = usePathname();
  const search = useSearchParams();
  const query = search.toString();

  useEffect(() => {
    if (pathname.startsWith("/admin") || isTrackingExcluded()) return;
    const path = query ? `${pathname}?${query}` : pathname;
    // Wait a moment so the new page's title is in place (and rapid redirects collapse).
    const timer = setTimeout(() => {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, title: document.title, referrer: takeReferrer() }),
        keepalive: true,
      }).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [pathname, query]);

  return null;
}
