import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ProductDetailView from "@/components/ProductDetailView";
import { ApiUnavailableError, fetchProduct } from "@/lib/api";
import { categoryOf } from "@/lib/catalog";
import { SITE, SITE_URL } from "@/lib/site";

// /products/<slug>: one product's page, read from the RFDSL database.
export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProduct(slug).catch(() => null);
  if (!product) return { title: "Product not found", robots: { index: false, follow: true } };
  const description =
    product.summary ||
    product.tagline ||
    `${product.name}${product.brand ? ` by ${product.brand}` : ""} from ${SITE.name}, Auckland.`;
  return {
    title: product.name,
    description: description.slice(0, 160),
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { title: product.name, description, images: product.image ? [product.image] : undefined },
  };
}

export default function ProductPage({ params }: PageProps<"/products/[slug]">) {
  return (
    <main className="flex-1">
      <Suspense fallback={<DetailSkeleton />}>
        <ProductContent params={params} />
      </Suspense>
    </main>
  );
}

async function ProductContent({ params }: { params: PageProps<"/products/[slug]">["params"] }) {
  const { slug } = await params;
  let product;
  try {
    product = await fetchProduct(slug);
  } catch (e) {
    if (!(e instanceof ApiUnavailableError)) throw e;
    return (
      <p className="px-4 py-24 text-center text-neutral-600">
        This product can&apos;t be shown right now. Please try again in a moment.
      </p>
    );
  }
  if (!product) notFound();

  // Structured data so search engines can show the product properly.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": product.product_type === "software" ? "SoftwareApplication" : "Product",
    name: product.name,
    description: product.summary || product.tagline || undefined,
    image: product.gallery.map((src) => (src.startsWith("http") ? src : `${SITE_URL}${src}`)),
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    model: product.model || undefined,
    category: [categoryOf(product.category)?.label, product.subcategory].filter(Boolean).join(" / "),
    url: `${SITE_URL}/products/${product.slug}`,
    ...(product.product_type === "software" ? { applicationCategory: "BusinessApplication" } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <ProductDetailView product={product} />
    </>
  );
}

function DetailSkeleton() {
  return (
    <div aria-hidden="true" className="pt-6 pb-16 lg:pt-8 @max-[1537px]/page:px-6 @max-[640px]/page:px-4">
      <div className="h-5 w-40 animate-pulse rounded bg-slate-100" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
        <div className="aspect-square animate-pulse rounded-lg bg-slate-50" />
        <div className="space-y-4">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
          <div className="h-10 w-2/3 animate-pulse rounded bg-slate-100" />
          <div className="h-6 w-full animate-pulse rounded bg-slate-100" />
          <div className="mt-6 h-56 animate-pulse rounded-lg bg-slate-50" />
        </div>
      </div>
    </div>
  );
}
