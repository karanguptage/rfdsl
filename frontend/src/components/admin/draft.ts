// The editor's working copy of a product. Lists carry a `k` key so rows can be
// reordered without React mixing up their inputs; keys are dropped on save.

import type { Product, ProductLink, SpecRow } from "@/lib/catalog";
import type { ProductInput } from "./api";
import { uid } from "./ui";

export type DraftItem = { k: string; icon: string; text: string };
export type DraftSection = { k: string; title: string; items: DraftItem[] };
export type DraftRow = SpecRow & { k: string; showNote: boolean };
export type DraftGroup = { k: string; group: string; rows: DraftRow[]; collapsed: boolean };
export type DraftLink = ProductLink & { k: string };

export type Draft = Omit<ProductInput, "highlights" | "specs" | "links"> & {
  highlights: DraftSection[];
  specs: DraftGroup[];
  links: DraftLink[];
};

export const newRow = (label = "", value = "", note = ""): DraftRow => ({ k: uid(), label, value, note, showNote: !!note });
export const newGroup = (group = "", labels: string[] = [""]): DraftGroup => ({
  k: uid(),
  group,
  rows: labels.map((l) => newRow(l)),
  collapsed: false,
});
export const newItem = (text = "", icon = ""): DraftItem => ({ k: uid(), icon, text });
export const newSection = (title = ""): DraftSection => ({ k: uid(), title, items: [newItem()] });
export const newLink = (kind = "datasheet"): DraftLink => ({ k: uid(), kind, label: "", url: "" });

export function emptyDraft(category = "reader"): Draft {
  return {
    slug: "",
    name: "",
    model: "",
    brand: "",
    category,
    subcategory: "",
    frequency: "",
    tagline: "",
    summary: "",
    description: "",
    keywords: "",
    gallery: [],
    highlights: [],
    specs: [],
    links: [],
    is_published: true,
    is_popular: false,
    is_new: false,
    is_on_sale: false,
    home_popular: false,
    home_new: false,
    home_sale: false,
    sale_label: "",
    sort_order: 0,
  };
}

export function fromProduct(p: Product): Draft {
  return {
    slug: p.slug,
    name: p.name,
    model: p.model ?? "",
    brand: p.brand ?? "",
    category: p.category,
    subcategory: p.subcategory ?? "",
    frequency: p.frequency ?? "",
    tagline: p.tagline ?? "",
    summary: p.summary ?? "",
    description: p.description ?? "",
    keywords: p.keywords ?? "",
    gallery: p.gallery ?? [],
    highlights: (p.highlights ?? []).map((s) => ({ k: uid(), title: s.title, items: s.items.map((i) => ({ k: uid(), ...i })) })),
    specs: (p.specs ?? []).map((g) => ({
      k: uid(),
      group: g.group,
      collapsed: false,
      rows: g.rows.map((r) => newRow(r.label, r.value, r.note)),
    })),
    links: (p.links ?? []).map((l) => ({ k: uid(), ...l })),
    is_published: p.is_published,
    is_popular: p.is_popular,
    is_new: p.is_new,
    is_on_sale: p.is_on_sale,
    home_popular: p.home_popular,
    home_new: p.home_new,
    home_sale: p.home_sale,
    sale_label: p.sale_label ?? "",
    sort_order: p.sort_order,
  };
}

export function toInput(d: Draft): ProductInput {
  return {
    ...d,
    highlights: d.highlights.map((s) => ({ title: s.title, items: s.items.map(({ icon, text }) => ({ icon, text })) })),
    specs: d.specs.map((g) => ({ group: g.group, rows: g.rows.map(({ label, value, note }) => ({ label, value, note })) })),
    links: d.links.map(({ label, url, kind }) => ({ label, url, kind })),
  };
}

// The draft as the public page would show it (empty parts removed like the API does).
export function toPreview(d: Draft, id = 0): Product {
  const input = toInput(d);
  return {
    id,
    slug: d.slug || "preview",
    name: d.name || "Untitled product",
    model: d.model || null,
    brand: d.brand || null,
    product_type: d.category === "software" ? "software" : "hardware",
    category: d.category,
    subcategory: d.subcategory || null,
    frequency: d.frequency || null,
    tagline: d.tagline || null,
    summary: d.summary || null,
    description: d.description || null,
    keywords: d.keywords || null,
    image: d.gallery[0] ?? null,
    gallery: d.gallery,
    highlights: input.highlights
      .map((s) => ({ ...s, items: s.items.filter((i) => i.text.trim()) }))
      .filter((s) => s.items.length),
    specs: input.specs
      .map((g) => ({ ...g, rows: g.rows.filter((r) => r.value.trim() || r.note.trim()) }))
      .filter((g) => g.rows.length),
    links: input.links.filter((l) => l.url.trim()).map((l) => ({ ...l, label: l.label || l.url.split("/").pop() || l.url })),
    is_published: d.is_published,
    is_popular: d.is_popular,
    is_new: d.is_new,
    is_on_sale: d.is_on_sale,
    home_popular: d.home_popular,
    home_new: d.home_new,
    home_sale: d.home_sale,
    sale_label: d.is_on_sale ? d.sale_label || null : null,
    sort_order: d.sort_order,
    created_at: "",
    updated_at: "",
  };
}

export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 150);
}
