import "server-only";
import type { FeaturedProducts, Product, ProductList } from "@/lib/catalog";

// Server-side calls to the Python API (backend/). Uncached on purpose so
// changes made in /admin show up immediately; callers render inside <Suspense>.
const API_URL = (process.env.API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

export class ApiUnavailableError extends Error {}

async function get<T>(path: string): Promise<T | null> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`);
  } catch {
    throw new ApiUnavailableError("The product service is not reachable.");
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new ApiUnavailableError(`The product service returned ${res.status}.`);
  return (await res.json()) as T;
}

export async function fetchProducts(params: {
  category?: string;
  subcategory?: string;
  q?: string;
  page?: number;
}): Promise<ProductList> {
  const sp = new URLSearchParams();
  if (params.category && params.category !== "all") sp.set("category", params.category);
  if (params.subcategory) sp.set("subcategory", params.subcategory);
  if (params.q) sp.set("q", params.q);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  return (await get<ProductList>(`/api/products?${sp}`))!;
}

export async function fetchFeatured(): Promise<FeaturedProducts> {
  return (await get<FeaturedProducts>("/api/products/featured")) ?? { popular: [], new: [], sale: [] };
}

export function fetchProduct(slug: string): Promise<Product | null> {
  return get<Product>(`/api/products/${encodeURIComponent(slug)}`);
}
