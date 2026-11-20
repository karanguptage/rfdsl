"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import CategorySelect from "@/components/CategorySelect";
import { CATEGORIES, productsHref } from "@/lib/catalog";

// Products page toolbar, fixed just below the site header while scrolling
// (80px header on phones, 112px from 1024px). One row: the Select2-style
// category picker, then the search bar (magnifier, "/" shortcut badge, clear
// button and a Search button). Translucent white with a soft blur so the
// page shows faintly behind it as it scrolls.
// The filters live in the URL (/products?category=reader&q=uhf), so results
// can be shared and the back button works: picking a category navigates
// straight away (keeping the current search); the search runs on Enter or the
// Search button. Each change starts again from page 1.
export default function ProductToolbar({
  initialCategory = "all",
  initialQuery = "",
}: {
  initialCategory?: string;
  initialQuery?: string;
}) {
  const router = useRouter();
  const [category, setCategory] = useState(initialCategory);
  const [query, setQuery] = useState(initialQuery);
  const searchRef = useRef<HTMLInputElement>(null);

  // Follow the URL when it changes from outside (back/forward, links).
  const [synced, setSynced] = useState({ initialCategory, initialQuery });
  if (synced.initialCategory !== initialCategory || synced.initialQuery !== initialQuery) {
    setSynced({ initialCategory, initialQuery });
    setCategory(initialCategory);
    setQuery(initialQuery);
  }

  const go = (nextCategory: string, nextQuery: string) => {
    router.push(productsHref({ category: nextCategory, q: nextQuery.trim() }));
  };

  // "/" jumps to the search bar (unless you're already typing somewhere).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="sticky top-20 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md lg:top-28">
      <form
        role="search"
        aria-label="Find products"
        onSubmit={(e) => {
          e.preventDefault();
          go(category, query);
        }}
        className="flex items-center gap-3 px-4 py-4 sm:gap-4 lg:px-6"
      >
        <CategorySelect
          options={CATEGORIES}
          value={category}
          onChange={(value) => {
            setCategory(value);
            go(value, initialQuery);
          }}
          className="w-36 shrink-0 sm:w-56"
        />

        <div className="group relative min-w-0 flex-1">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#0b1f45] sm:left-4">
            <path d="M21 21l-4.35-4.35M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z" />
          </svg>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Escape") return;
              setQuery("");
              if (initialQuery) go(category, "");
            }}
            placeholder="Search products, models or keywords"
            aria-label="Search products"
            className="peer h-12 w-full rounded-xl border border-slate-300 bg-white pr-12 pl-11 sm:pl-12 text-[15px] text-neutral-950 shadow-[inset_0_1px_2px_rgb(15_23_42/0.04)] transition outline-none placeholder:text-slate-400 hover:border-slate-400 focus:border-[#0b1f45] focus:ring-4 focus:ring-sky-500/15 sm:pr-36 [&::-webkit-search-cancel-button]:hidden"
          />
          <div className="absolute inset-y-0 right-1.5 flex items-center gap-1.5">
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  searchRef.current?.focus();
                  if (initialQuery) go(category, "");
                }}
                aria-label="Clear search"
                className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors outline-none hover:bg-slate-100 hover:text-neutral-950 focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" className="size-4">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            ) : (
              <kbd
                aria-hidden="true"
                className="hidden h-6 min-w-6 items-center justify-center rounded-md border border-slate-300 bg-slate-50 px-1.5 font-sans text-xs font-medium text-slate-500 sm:flex sm:group-focus-within:hidden"
              >
                /
              </kbd>
            )}
            <button
              type="submit"
              className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-black px-3 text-sm font-semibold text-white transition-colors outline-none hover:bg-[#0b1f45] focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 sm:px-4"
            >
              <span className="hidden sm:inline">Search</span>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" className="size-4 sm:hidden">
                <path d="M21 21l-4.35-4.35M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z" />
              </svg>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// The toolbar filled in from the current URL. useSearchParams needs a
// <Suspense> boundary; use <ProductToolbar /> (defaults) as its fallback.
export function ProductToolbarFromUrl() {
  const params = useSearchParams();
  return <ProductToolbar initialCategory={params.get("category") || "all"} initialQuery={params.get("q") ?? ""} />;
}
