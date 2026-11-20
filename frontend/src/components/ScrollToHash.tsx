"use client";

import { useEffect } from "react";

// Product page content streams in after the first paint, so the browser's own
// jump to "#spec-uhf-rfid"-style links (used by Nemanja) finds nothing yet.
// Rendered with that content, this scrolls to the target once it exists.
export default function ScrollToHash() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    const el = document.getElementById(id);
    if (el) requestAnimationFrame(() => el.scrollIntoView({ block: "start" }));
  }, []);
  return null;
}
