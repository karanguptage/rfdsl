import Link from "next/link";

// Page links for the Products list: previous / numbered pages / next.
// Long ranges collapse to 1 … 4 5 6 … 12 around the current page.
export default function Pagination({
  page,
  pages,
  hrefFor,
  className,
}: {
  page: number;
  pages: number;
  hrefFor: (page: number) => string;
  className?: string;
}) {
  if (pages <= 1) return null;

  const numbers: (number | "gap")[] = [];
  for (let n = 1; n <= pages; n++) {
    if (n === 1 || n === pages || Math.abs(n - page) <= 1) numbers.push(n);
    else if (numbers[numbers.length - 1] !== "gap") numbers.push("gap");
  }

  const base =
    "flex h-10 min-w-10 items-center justify-center rounded-lg border text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2";
  const idle = "border-slate-300 bg-white text-neutral-700 hover:border-slate-400 hover:text-neutral-950";

  return (
    <nav aria-label="Product pages" className={className}>
      <ul className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        <li>
          <PageLink href={page > 1 ? hrefFor(page - 1) : null} label="Previous page" className={`${base} ${idle} gap-1 px-3`}>
            <Chevron prev />
            <span className="hidden sm:inline">Previous</span>
          </PageLink>
        </li>
        {numbers.map((n, i) =>
          n === "gap" ? (
            <li key={`gap-${i}`} aria-hidden="true" className="px-1 text-slate-400">
              …
            </li>
          ) : (
            <li key={n}>
              {n === page ? (
                <span aria-current="page" className={`${base} border-black bg-black px-3 text-white`}>
                  {n}
                </span>
              ) : (
                <Link href={hrefFor(n)} aria-label={`Page ${n}`} className={`${base} ${idle} px-3`}>
                  {n}
                </Link>
              )}
            </li>
          ),
        )}
        <li>
          <PageLink href={page < pages ? hrefFor(page + 1) : null} label="Next page" className={`${base} ${idle} gap-1 px-3`}>
            <span className="hidden sm:inline">Next</span>
            <Chevron />
          </PageLink>
        </li>
      </ul>
    </nav>
  );
}

function PageLink({ href, label, className, children }: { href: string | null; label: string; className: string; children: React.ReactNode }) {
  if (!href)
    return (
      <span aria-disabled="true" aria-label={label} className={`${className} pointer-events-none opacity-40`}>
        {children}
      </span>
    );
  return (
    <Link href={href} aria-label={label} className={className}>
      {children}
    </Link>
  );
}

function Chevron({ prev = false }: { prev?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" className="size-4">
      <path d={prev ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}
