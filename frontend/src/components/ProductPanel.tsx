import Image from "next/image";
import Link from "next/link";
import ProductBadges from "@/components/ProductBadges";
import { categoryOf, isRemoteImage, type ProductSummary } from "@/lib/catalog";

// One product in the Products list, in the same frame as the home page
// carousel panels: 1px slate border with a 1px white gap, square photo on
// white (never cropped), then a white name strip (black text) under a
// hairline. No hover effect; keyboard focus shows a ring.
export default function ProductPanel({ product, priority = false }: { product: ProductSummary; priority?: boolean }) {
  const category = categoryOf(product.category);
  const chip = product.subcategory || category?.label;
  const meta = [product.brand, product.frequency].filter(Boolean).join(" · ");
  return (
    <Link
      href={`/products/${product.slug}`}
      className="block h-full rounded-lg border border-slate-300 bg-white p-px outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
    >
      <div className="flex h-full flex-col overflow-hidden rounded-[6px] bg-white">
        <div className="@container relative aspect-square">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              preload={priority}
              unoptimized={isRemoteImage(product.image)}
              sizes="(min-width: 1536px) 366px, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, (min-width: 450px) 50vw, 100vw"
              className="object-contain p-[10%]"
            />
          ) : (
            <ImagePlaceholder icon={category?.icon} />
          )}
          {chip && (
            <span
              className={`absolute top-3 left-3 z-[1] truncate rounded-full ${
                product.is_popular || product.is_new || product.is_on_sale ? "max-w-[42%]" : "max-w-[calc(100%-1.5rem)]"
              } border border-slate-200 bg-white/90 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-slate-600 backdrop-blur-sm`}
            >
              {chip}
            </span>
          )}
          <ProductBadges product={product} className="absolute top-3 right-3 z-[1] max-w-[55%] justify-end" />
        </div>
        <div className="mt-auto border-t border-slate-200 bg-white px-3 py-3 text-center lg:py-3.5">
          <p className="truncate text-[15px] font-semibold tracking-tight text-neutral-950 lg:text-base">
            {product.name}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">{meta || category?.label}</p>
        </div>
      </div>
    </Link>
  );
}

export function ProductGrid({ products, className }: { products: ProductSummary[]; className?: string }) {
  return (
    <ul className={`grid grid-cols-1 gap-4 min-[450px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-6 ${className ?? ""}`}>
      {products.map((p, i) => (
        <li key={p.id}>
          <ProductPanel product={p} priority={i < 4} />
        </li>
      ))}
    </ul>
  );
}

// Shown where a product has no photo yet.
export function ImagePlaceholder({ icon, className }: { icon?: string; className?: string }) {
  return (
    <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-50 text-slate-300 ${className ?? ""}`}>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" className="size-1/4">
        <path d={icon ?? "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"} />
      </svg>
      <span className="text-xs font-medium tracking-wide text-slate-400">Image coming soon</span>
    </div>
  );
}
