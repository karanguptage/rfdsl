// "Popular", "New" and sale badges for a product (set in /admin). Used on the
// product panels, the home page carousels and the product page.
type Flags = { is_popular?: boolean; is_new?: boolean; is_on_sale?: boolean; sale_label?: string | null };

export function productBadges(p: Flags): { key: string; text: string; className: string }[] {
  const out = [];
  // Each badge has its own solid-colour pill with white text. The home page sections
  // (HomeFeatured.tsx) use the same colours for their panel strips and hover tint.
  if (p.is_on_sale)
    out.push({ key: "sale", text: p.sale_label || "Sale", className: "bg-[#651803] text-white" });
  if (p.is_new)
    out.push({ key: "new", text: "New", className: "bg-[#6e0303] text-white" });
  if (p.is_popular)
    out.push({ key: "popular", text: "Popular", className: "bg-[#0b1f45] text-white" });
  return out;
}

export default function ProductBadges({ product, className }: { product: Flags; className?: string }) {
  const badges = productBadges(product);
  if (!badges.length) return null;
  return (
    <span className={`flex flex-wrap gap-1.5 ${className ?? ""}`}>
      {badges.map((b) => (
        <span key={b.key} className={`rounded-full px-2.5 py-1 text-[11px] leading-none font-bold tracking-wide ${b.className}`}>
          {b.text}
        </span>
      ))}
    </span>
  );
}
