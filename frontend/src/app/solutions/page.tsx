import type { Metadata } from "next";
import { Suspense } from "react";
import NemanjaChat from "@/components/NemanjaChat";

export const metadata: Metadata = {
  title: "Solutions: ask our AI RFID consultant",
  description:
    "Describe what you need to track and Nemanja, RF Data Systems' AI consultant, recommends RFID readers, tags, printers and software from our range, with photos and specifications.",
  alternates: { canonical: "/solutions" },
};

// /solutions: the page is the chat with Nemanja, the AI asset-tracking
// consultant (heading kept for search engines and screen readers only).
export default function SolutionsPage() {
  return (
    <main className="flex-1">
      <h1 className="sr-only">Solutions: tell Nemanja, our AI asset-tracking consultant, what you need to track</h1>
      {/* The chat needs this browser's storage, so it renders after the page loads. */}
      <Suspense
        fallback={<div className="flex h-[calc(100dvh-5rem)] items-center justify-center text-sm text-slate-500 lg:h-[calc(100dvh-7rem)]">Loading the chat…</div>}
      >
        <NemanjaChat />
      </Suspense>
    </main>
  );
}
