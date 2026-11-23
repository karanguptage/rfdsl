import { productBadges } from "@/components/ProductBadges";
import ProductCarousel, { type PanelTone, type Product } from "@/components/ProductCarousel";
import { fetchFeatured } from "@/lib/api";
import type { ProductSummary } from "@/lib/catalog";

// Home page product sections, filled from the products flagged in /admin:
// "The most popular products" (Popular), "New arrivals" (New arrival) and
// "Special offers" (On sale). A section with no flagged (published) products
// isn't shown at all. Read per request, so changes in /admin show straight away.
// Each section's panels (name strip + hover tint) use the colour of its badge
// in ProductBadges.tsx: Popular navy, New maroon, Sale rust.
const SECTIONS = [
  { key: "popular", id: "popular-products-title", title: "The most popular products", tone: { strip: "bg-[#0b1f45]", tint: "bg-[#0b1f45]/50" } },
  { key: "new", id: "new-arrivals-title", title: "New arrivals", tone: { strip: "bg-[#6e0303]", tint: "bg-[#6e0303]/50" } },
  { key: "sale", id: "special-offers-title", title: "Special offers", tone: { strip: "bg-[#651803]", tint: "bg-[#651803]/50" } },
] as const satisfies readonly { key: string; id: string; title: string; tone: PanelTone }[];

function toPanel(p: ProductSummary, section: (typeof SECTIONS)[number]["key"]): Product {
  // Show the badge that matches the section first (e.g. the sale label in "Special offers").
  const badges = productBadges(p).sort((a, b) => Number(b.key === section) - Number(a.key === section));
  return {
    name: p.name,
    src: p.image,
    href: `/products/${p.slug}`,
    description: p.summary ?? undefined,
    badges: section === "popular" ? badges.filter((b) => b.key !== "popular") : badges,
  };
}

export default async function HomeFeatured() {
  let featured;
  try {
    featured = await fetchFeatured();
  } catch {
    return null; // product service down: leave the sections out rather than break the home page
  }

  return (
    <>
      {SECTIONS.map((s) => {
        const items = featured[s.key];
        if (!items.length) return null;
        return (
          // Same section gap and side alignment as the industry images above.
          <section key={s.key} aria-labelledby={s.id} className="mt-8 md:mt-12 lg:mt-16 @max-[1537px]/page:px-6 @max-[640px]/page:px-4">
            <div className="flex items-end gap-8">
              <h2 id={s.id} className="text-[clamp(1.75rem,2.4vw,2.5rem)] leading-tight font-extrabold tracking-[-0.02em] text-neutral-950">
                {s.title}
              </h2>
              <span aria-hidden="true" className="mb-[0.9em] hidden h-px flex-1 bg-linear-to-r from-slate-300 to-transparent sm:block" />
            </div>
            <ProductCarousel products={items.map((p) => toPanel(p, s.key))} tone={s.tone} className="mt-8 lg:mt-10" />
          </section>
        );
      })}
    </>
  );
}
