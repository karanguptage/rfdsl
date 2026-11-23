"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";

// Opens every new page at the top. Next.js only scrolls on navigation when the
// new page would otherwise be out of view, so a click from halfway down a long
// page (e.g. a product panel on the home page) used to open the next long page
// (the product page) halfway down as well.
// - Back / forward are left alone: the browser and Next.js restore the old position.
// - Links to a #section are left alone: the browser scrolls to that section.
// - Only path changes count, so filters and search (?query changes) keep their place.
export default function ScrollToTop() {
  const pathname = usePathname();
  const first = useRef(true);
  const historyMove = useRef(false); // set by back / forward

  useEffect(() => {
    const onPopState = () => {
      historyMove.current = true;
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Layout effect: runs before the new page is painted, so it never shows mid-page.
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false; // first load: the browser decides
      return;
    }
    if (historyMove.current) {
      historyMove.current = false;
      return;
    }
    if (window.location.hash) return;
    // "instant" skips the site-wide smooth scrolling used for in-page links.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
