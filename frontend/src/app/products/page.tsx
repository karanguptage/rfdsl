import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import Pagination from "@/components/Pagination";
import { ProductGrid } from "@/components/ProductPanel";
import ProductToolbar, { ProductToolbarFromUrl } from "@/components/ProductToolbar";
import { ApiUnavailableError, fetchProducts } from "@/lib/api";
import { categoryOf, PAGE_SIZE, productsHref } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Products",
  description:
    "RFID readers, antennas, tags, printers and software from RF Data Systems, Auckland: browse by category or search for a model.",
  alternates: { canonical: "/products" },
};

const PLURAL: Record<string, string> = {
  reader: "Readers",
  antenna: "Antennas",
  tag: "Tags",
  printer: "Printers",
  accessory: "Accessories",
  software: "Software",
};

// Same side alignment as the home page sections.
const GUTTER = "@max-[1537px]/page:px-6 @max-[640px]/page:px-4";

// /products: every registered product, 8 per page, as panels. The toolbar's
// category picker and search narrow the list through the URL:
//   /products?category=reader&subcategory=Handheld%20Readers&q=uhf&page=2
export default function ProductsPage({ searchParams }: PageProps<"/products">) {
  return (
    <main className="flex-1">
      {/* Category picker + search, fixed below the site header while scrolling. */}
      <Suspense fallback={<ProductToolbar />}>
        <ProductToolbarFromUrl />
      </Suspense>

      <Suspense fallback={<ResultsSkeleton />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

async function Results({ searchParams }: { searchParams: PageProps<"/products">["searchParams"] }) {
  const sp = await searchParams;
  const category = categoryOf(one(sp.category))?.value ?? "all";
  const subcategory = category === "all" ? "" : one(sp.subcategory);
  const q = one(sp.q).slice(0, 200);
  const page = Math.max(1, parseInt(one(sp.page), 10) || 1);

  let data;
  try {
    data = await fetchProducts({ category, subcategory, q, page });
  } catch (e) {
    if (!(e instanceof ApiUnavailableError)) throw e;
    return (
      <Notice title="Products are temporarily unavailable" className={GUTTER}>
        We couldn&apos;t load the product list just now. Please try again in a moment, or contact us on{" "}
        <a href="mailto:info@rfdsl.co.nz" className="font-semibold text-[#0b1f45] underline">
          info@rfdsl.co.nz
        </a>
        .
      </Notice>
    );
  }

  const label = category === "all" ? "All products" : PLURAL[category];
  const title = q ? `Results for “${q}”` : subcategory || label;
  const first = (data.page - 1) * data.per_page + 1;
  const last = first + data.items.length - 1;
  const hasChips = data.subcategories.length > 1;

  return (
    <section aria-labelledby="products-title" className={`mt-6 mb-16 lg:mt-8 lg:mb-24 ${GUTTER}`}>
      {/*
        No visible title row (the toolbar already shows the category and
        search): the heading and result count stay for screen readers and
        search engines only.
      */}
      <h1 id="products-title" className="sr-only">
        {q && subcategory ? `${title} in ${subcategory}` : q && category !== "all" ? `${title} in ${label}` : title}
      </h1>
      <p className="sr-only" aria-live="polite">
        {data.total === 0
          ? "No products"
          : data.pages > 1
            ? `Showing ${first}–${last} of ${data.total}`
            : `${data.total} product${data.total === 1 ? "" : "s"}`}
      </p>

      {/* Subcategory chips inside a category (e.g. Handheld / Fixed readers). */}
      {hasChips && (
        <ul className="mb-5 flex flex-wrap gap-2 lg:mb-6" aria-label={`${label} types`}>
          <li>
            <Chip href={productsHref({ category, q })} active={!subcategory}>
              All {label.toLowerCase()}
            </Chip>
          </li>
          {data.subcategories.map((s) => (
            <li key={s.value}>
              <Chip href={productsHref({ category, subcategory: s.value, q })} active={s.value === subcategory} count={s.count}>
                {s.value}
              </Chip>
            </li>
          ))}
        </ul>
      )}

      {data.items.length > 0 ? (
        <>
          <ProductGrid products={data.items} />
          <Pagination
            page={data.page}
            pages={data.pages}
            hrefFor={(n) => productsHref({ category, subcategory, q, page: n })}
            className="mt-10 lg:mt-12"
          />
        </>
      ) : (
        <Notice title="No products found">
          {q ? (
            <>Nothing matches “{q}”{category !== "all" && ` in ${label.toLowerCase()}`}. Try a model number, a brand or a shorter keyword.</>
          ) : (
            <>There are no products in this category yet.</>
          )}
          <Link
            href="/products"
            className="mt-5 inline-flex h-10 items-center rounded-full bg-black px-5 text-sm font-semibold text-white transition-colors outline-none hover:bg-[#0b1f45] focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
          >
            Show all products
          </Link>
        </Notice>
      )}
    </section>
  );
}

function Chip({ href, active, count, children }: { href: string; active: boolean; count?: number; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 ${
        active ? "border-black bg-black text-white" : "border-slate-300 bg-white text-neutral-700 hover:border-slate-400 hover:text-neutral-950"
      }`}
    >
      {children}
      {count !== undefined && <span className={`text-xs ${active ? "text-white/60" : "text-slate-400"}`}>{count}</span>}
    </Link>
  );
}

function Notice({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <div className="flex flex-col items-center rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-6 py-16 text-center">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="size-10 text-slate-300">
          <path d="M21 21l-4.35-4.35M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z" />
        </svg>
        <h2 className="mt-4 text-xl font-bold text-neutral-950">{title}</h2>
        <div className="mt-2 flex max-w-md flex-col items-center text-neutral-600">{children}</div>
      </div>
    </div>
  );
}

// Grey placeholders shaped like the panels while the list loads.
function ResultsSkeleton() {
  return (
    <div aria-hidden="true" className={`mt-6 mb-16 lg:mt-8 ${GUTTER}`}>
      <ul className="grid grid-cols-1 gap-4 min-[450px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
        {Array.from({ length: PAGE_SIZE }, (_, i) => (
          <li key={i} className="overflow-hidden rounded-lg border border-slate-200">
            <div className="aspect-square animate-pulse bg-slate-50" />
            <div className="h-[60px] border-t border-slate-200 bg-white" />
          </li>
        ))}
      </ul>
    </div>
  );
}
