import Link from "next/link";
import FeatureIcon from "@/components/FeatureIcon";
import ProductBadges from "@/components/ProductBadges";
import ProductGallery from "@/components/ProductGallery";
import ScrollToHash from "@/components/ScrollToHash";
import { ProductGrid } from "@/components/ProductPanel";
import { categoryOf, LINK_KINDS, productsHref, specAnchor, type Product } from "@/lib/catalog";

const PLURAL: Record<string, string> = {
  reader: "Readers",
  antenna: "Antennas",
  tag: "Tags",
  printer: "Printers",
  accessory: "Accessories",
  software: "Software",
};

// The product page body. Every block is optional, so a tag with six spec rows,
// a handheld with eight spec groups and a software product with modules and
// platforms all render from the same data without empty boxes:
//   photos | name, tagline, summary, highlight sections (icon + text)
//   Overview (description) - Specifications (grouped label/value cards)
//   Downloads & links - Related products
// Also used by the /admin preview, so it must stay a plain (hook-free) component.
export default function ProductDetailView({ product, preview = false }: { product: Product; preview?: boolean }) {
  const category = categoryOf(product.category);
  const backLabel = product.subcategory || PLURAL[product.category] || "Products";
  const backHref = productsHref({ category: product.category, subcategory: product.subcategory ?? undefined });
  const facts = [
    product.brand && { label: "Brand", value: product.brand },
    product.model && product.model !== product.name && { label: "Model", value: product.model },
    product.frequency && { label: "Frequency", value: product.frequency },
  ].filter(Boolean) as { label: string; value: string }[];
  const datasheet = product.links.find((l) => l.kind === "datasheet");

  return (
    <article className="pt-6 pb-16 lg:pt-8 lg:pb-24 @max-[1537px]/page:px-6 @max-[640px]/page:px-4">
      {!preview && <ScrollToHash />}
      {/*
        Back to the list this product belongs to: outline pill button with the
        arrow in a small circle. On hover the border darkens, the circle turns
        black and the arrow nudges left (no underline). It stays pinned just
        below the site header (80px phones / 112px desktop) while scrolling;
        the soft shadow keeps it readable over the content passing under it.
      */}
      <nav
        aria-label="Breadcrumb"
        className={`sticky z-20 flex w-fit ${preview ? "top-4" : "top-[92px] lg:top-[124px]"}`}
      >
        <Link
          href={backHref}
          className="group inline-flex h-10 items-center gap-2.5 rounded-full border border-slate-300 bg-white pr-4 pl-1.5 text-sm font-semibold text-neutral-900 no-underline transition-colors duration-200 outline-none shadow-[0_8px_24px_-12px_rgb(15_23_42/0.35)] hover:border-neutral-950 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-neutral-100 text-neutral-950 transition-colors duration-200 group-hover:bg-neutral-950 group-hover:text-white">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5">
              <path d="M19 12H5M11 18l-6-6 6-6" />
            </svg>
          </span>
          Back to {backLabel}
        </Link>
      </nav>

      {/*
        Desktop: photos on the left, heading and details stacked on the right.
        Phones (one column): heading (category, badges, name) first, then the
        photos, then the details. The right column's wrapper is display:contents
        on phones, so the heading and details become grid items of their own and
        the heading can move above the photos (order-first).
      */}
      <div className="mt-6 grid gap-6 lg:mt-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12 xl:gap-16">
        {/* Photos stay in view on desktop, just below the pinned back button. */}
        <div className={`lg:sticky lg:self-start ${preview ? "lg:top-[72px]" : "lg:top-[180px]"}`}>
          <ProductGallery images={product.gallery} name={product.name} icon={category?.icon} />
        </div>

        <div className="contents lg:block lg:min-w-0">
          <div className="min-w-0 max-lg:order-first">
            <p className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
              <span>{category?.label ?? product.category}</span>
              {product.subcategory && (
                <>
                  <span aria-hidden="true" className="text-slate-300">/</span>
                  <span>{product.subcategory}</span>
                </>
              )}
            </p>
            <ProductBadges product={product} className="mt-3" />
            <h1 className="mt-2 text-[clamp(1.875rem,3vw,2.75rem)] leading-tight font-extrabold tracking-[-0.02em] text-neutral-950">
              {product.name}
            </h1>
          </div>

          <div className="min-w-0">
            {product.tagline && (
              <p className="mt-3 text-lg leading-snug font-semibold text-neutral-800 lg:text-xl">{product.tagline}</p>
            )}
            {product.summary && <p className="mt-4 max-w-3xl leading-relaxed text-neutral-600">{product.summary}</p>}

            {facts.length > 0 && (
              <dl className="mt-5 flex flex-wrap gap-2">
                {facts.map((f) => (
                  <div key={f.label} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm">
                    <dt className="text-slate-500">{f.label}</dt>
                    <dd className="font-semibold text-neutral-900">{f.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {product.highlights.map((section, si) => (
              <section
                key={si}
                aria-label={section.title || undefined}
                className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white"
              >
                {section.title && (
                  <h2 className="border-b border-slate-200 bg-slate-50 px-5 py-3.5 font-semibold text-neutral-950">{section.title}</h2>
                )}
                <ul className="grid gap-x-8 gap-y-1 px-5 py-4 sm:grid-cols-2">
                  {section.items.map((item, ii) => (
                    <li key={ii} className="flex items-start gap-3 py-2 text-[15px] leading-snug text-neutral-800">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-950">
                        <FeatureIcon name={item.icon} className="size-5" />
                      </span>
                      <span className="pt-2">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href={preview ? undefined : `/#contact`}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-black px-6 text-[15px] font-semibold text-white transition-colors outline-none hover:bg-[#0b1f45] focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
              >
                Enquire about this product
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" className="size-4">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </a>
              {datasheet && (
                <a
                  href={datasheet.url}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex h-12 items-center gap-2 rounded-full border border-slate-300 bg-white px-6 text-[15px] font-semibold text-neutral-900 transition-colors outline-none hover:border-[#0b1f45] focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
                >
                  <LinkIcon kind="datasheet" />
                  Datasheet
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {product.description && (
        <section id="overview" aria-labelledby="overview-title" className="mt-14 scroll-mt-44 lg:mt-20">
          <SectionTitle id="overview-title">Overview</SectionTitle>
          <RichText text={product.description} className="mt-6 max-w-4xl" />
        </section>
      )}

      {product.specs.length > 0 && (
        <section aria-labelledby="specs-title" className="mt-14 lg:mt-20">
          <SectionTitle id="specs-title">Specifications</SectionTitle>
          <div className="mt-6 grid gap-6 lg:mt-8 lg:grid-cols-2">
            {product.specs.map((group, gi) => (
              <section
                key={gi}
                id={group.group ? specAnchor(group.group) : undefined}
                className="scroll-mt-44 overflow-hidden rounded-lg border border-slate-200 bg-white"
                aria-label={group.group || undefined}
              >
                {group.group && (
                  <h3 className="border-b border-slate-200 bg-slate-50 px-5 py-4 font-semibold text-neutral-950 sm:px-6">{group.group}</h3>
                )}
                <dl className="px-5 py-2 sm:px-6">
                  {group.rows.map((row, ri) => (
                    <div
                      key={ri}
                      className="grid gap-1 border-b border-slate-100 py-3 last:border-0 sm:grid-cols-[minmax(8rem,30%)_minmax(0,1fr)] sm:gap-5"
                    >
                      <dt className="text-sm font-semibold text-neutral-950">{row.label}</dt>
                      <dd className="min-w-0 text-sm leading-relaxed text-neutral-700">
                        {row.value && <p className="break-words whitespace-pre-wrap">{row.value}</p>}
                        {row.note && <p className="mt-1 text-xs leading-relaxed break-words whitespace-pre-wrap text-slate-500">{row.note}</p>}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </section>
      )}

      {product.links.length > 0 && (
        <section aria-labelledby="downloads-title" className="mt-14 lg:mt-20">
          <SectionTitle id="downloads-title">Downloads &amp; links</SectionTitle>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {product.links.map((link, i) => (
              <li key={i}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener"
                  className="group flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 transition-colors outline-none hover:border-slate-400 focus-visible:ring-2 focus-visible:ring-sky-400"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-950">
                    <LinkIcon kind={link.kind} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-neutral-950 group-hover:underline">{link.label}</span>
                    <span className="block text-xs text-slate-500">{LINK_KINDS.find((k) => k.value === link.kind)?.label ?? "Link"}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!preview && product.related && product.related.length > 0 && (
        <section aria-labelledby="related-title" className="mt-14 lg:mt-20">
          <SectionTitle id="related-title">Related products</SectionTitle>
          <ProductGrid products={product.related} className="mt-6 lg:mt-8" />
        </section>
      )}
    </article>
  );
}

// Lower section headings (Overview, Specifications, ...): a step smaller and a
// softer black than the product name at the top, so they read as secondary.
function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div className="flex items-end gap-8">
      <h2 id={id} className="scroll-mt-44 text-[clamp(1.25rem,1.7vw,1.75rem)] leading-tight font-extrabold tracking-[-0.01em] text-neutral-700 uppercase">
        {children}
      </h2>
      <span aria-hidden="true" className="mb-[0.7em] hidden h-px flex-1 bg-linear-to-r from-slate-300 to-transparent sm:block" />
    </div>
  );
}

// Plain-text description: blank lines split paragraphs, "## " starts a
// subheading and lines starting with "- " become a bullet list.
function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n\s*\n/);
  return (
    <div className={`space-y-4 leading-relaxed text-neutral-700 ${className ?? ""}`}>
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim());
        if (lines.length === 0) return null;
        if (lines[0].startsWith("## ") && lines.length === 1)
          return (
            <h3 key={i} className="pt-2 text-lg font-bold text-neutral-950">
              {lines[0].slice(3)}
            </h3>
          );
        if (lines.every((l) => l.trim().startsWith("- ")))
          return (
            <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-slate-400">
              {lines.map((l, j) => (
                <li key={j}>{l.trim().slice(2)}</li>
              ))}
            </ul>
          );
        return (
          <p key={i} className="whitespace-pre-line">
            {block.trim()}
          </p>
        );
      })}
    </div>
  );
}

const LINK_ICON_PATHS: Record<string, string> = {
  datasheet: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M12 18v-6M9 15l3 3 3-3",
  manual: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z",
  brochure: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  video: "M23 7l-7 5 7 5V7zM3 5h11a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z",
  demo: "M5 3l14 9-14 9V3z",
  link: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3",
};

function LinkIcon({ kind }: { kind: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className="size-5">
      <path d={LINK_ICON_PATHS[kind] ?? LINK_ICON_PATHS.link} />
    </svg>
  );
}
