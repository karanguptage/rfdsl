"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Round "Ask Nemanja" button fixed to the bottom-right corner of every page
// (hidden on /solutions itself and in /admin). A light sweeps round its border
// and soft waves pulse out from it to draw the eye (still for visitors who
// prefer reduced motion). Opens the Solutions page with the AI consultant;
// on phones it stands in for the "Solutions" menu item tucked in the menu.
export default function HelpFab() {
  const pathname = usePathname();
  if (pathname.startsWith("/solutions") || pathname.startsWith("/admin")) return null;

  return (
    <Link
      href="/solutions"
      aria-label="Ask Nemanja, our AI RFID consultant"
      className="group fixed right-4 bottom-4 z-[45] flex size-14 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-4 sm:right-8 sm:bottom-8 sm:size-16"
    >
      {/* Pulse waves */}
      <span aria-hidden="true" className="rfdsl-fab-pulse absolute inset-0 rounded-full border-2 border-neutral-900" />
      <span aria-hidden="true" className="rfdsl-fab-pulse-late absolute inset-0 rounded-full border-2 border-neutral-900" />
      {/* Border with a sweeping light: a rotating conic gradient behind a white disc */}
      <span aria-hidden="true" className="absolute inset-0 overflow-hidden rounded-full shadow-[0_12px_30px_-10px_rgb(0_0_0/0.55)]">
        <span className="rfdsl-fab-ring absolute -inset-1/2 bg-[conic-gradient(from_0deg,#0a0a0a_0deg,#0a0a0a_200deg,#38bdf8_280deg,#ffffff_320deg,#0a0a0a_360deg)]" />
      </span>
      <span aria-hidden="true" className="absolute inset-[3px] rounded-full bg-white transition-colors duration-200 group-hover:bg-neutral-100" />
      {/* eslint-disable-next-line @next/next/no-img-element -- small static SVG icon */}
      <img src="/images/question.svg" alt="" width={32} height={32} className="relative size-7 transition-transform duration-200 group-hover:scale-110 sm:size-8" />
      {/* Label on hover / keyboard focus (pointer devices) */}
      <span className="pointer-events-none absolute right-full mr-3 hidden rounded-full bg-neutral-950 px-3.5 py-2 text-sm font-semibold whitespace-nowrap text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 sm:block">
        Ask Nemanja
      </span>
    </Link>
  );
}
