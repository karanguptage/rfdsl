"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ProductDetailView from "@/components/ProductDetailView";
import { PRODUCT_CATEGORIES } from "@/lib/catalog";
import { adminApi, ApiError, type Suggestions } from "./api";
import { emptyDraft, fromProduct, slugify, toInput, toPreview, type Draft } from "./draft";
import HighlightsEditor from "./HighlightsEditor";
import ImagesEditor from "./ImagesEditor";
import LinksEditor from "./LinksEditor";
import SpecsEditor from "./SpecsEditor";
import { FREQUENCY_PRESETS } from "./templates";
import { AutoTextarea, Button, Field, Icon, ICON, IconButton, TextInput, Toggle } from "./ui";

const SECTIONS = [
  { id: "basics", title: "Basics" },
  { id: "photos", title: "Photos" },
  { id: "text", title: "Headline & text" },
  { id: "highlights", title: "Highlights" },
  { id: "specs", title: "Specifications" },
  { id: "links", title: "Downloads & links" },
  { id: "featured", title: "Homepage sections" },
  { id: "visibility", title: "Visibility" },
];

export default function ProductEditor({
  productId,
  suggestions,
  onBack,
  onCreated,
  onSaved,
  onDirtyChange,
  initialToast = "",
}: {
  initialToast?: string;
  productId: number | null;
  suggestions: Suggestions | null;
  onBack: () => void;
  onCreated: (id: number) => void;
  onSaved: () => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(productId === null ? emptyDraft() : null);
  const [original, setOriginal] = useState(() => (productId === null ? JSON.stringify(toInput(emptyDraft())) : ""));
  const [slugTouched, setSlugTouched] = useState(productId !== null);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<{ message: string; details: string[] } | null>(null);
  const [toast, setToast] = useState(initialToast);
  const [preview, setPreview] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  // Load the product being edited.
  useEffect(() => {
    if (productId === null) return;
    let cancelled = false;
    adminApi
      .get(productId)
      .then((p) => {
        if (cancelled) return;
        const d = fromProduct(p);
        setDraft(d);
        setOriginal(JSON.stringify(toInput(d)));
      })
      .catch((e) => !cancelled && setLoadError(e.message));
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const dirty = !!draft && JSON.stringify(toInput(draft)) !== original;
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const update = useCallback(<K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }, []);

  const save = useCallback(async () => {
    if (!draft || saving) return;
    if (!draft.name.trim()) {
      setError({ message: "Please enter the product name.", details: [] });
      document.getElementById("f-name")?.focus();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const input = toInput(draft);
      const saved = productId === null ? await adminApi.create(input) : await adminApi.update(productId, input);
      const d = fromProduct(saved);
      setDraft(d);
      setOriginal(JSON.stringify(toInput(d)));
      setSlugTouched(true);
      setToast(saved.slug !== draft.slug && draft.slug ? `Saved. The address became /products/${saved.slug} (already in use).` : "Saved");
      onSaved();
      if (productId === null) {
        onDirtyChange(false);
        onCreated(saved.id);
      }
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError("Save failed", 0);
      setError({ message: err.message, details: err.details });
      requestAnimationFrame(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
    } finally {
      setSaving(false);
    }
  }, [draft, saving, productId, onCreated, onSaved, onDirtyChange]);

  // Ctrl/Cmd+S saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [save]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  if (loadError)
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-neutral-700">{loadError}</p>
        <Button className="mt-4" onClick={onBack}>
          Back to products
        </Button>
      </div>
    );
  if (!draft) return <p className="px-4 py-16 text-center text-slate-500">Loading…</p>;

  const isSoftware = draft.category === "software";
  const subOptions = suggestions?.subcategories?.[draft.category] ?? [];

  return (
    <div>
      {/* Action bar, fixed below the site header. */}
      <div className="sticky top-20 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md lg:top-28">
        <div className="flex items-center gap-2 px-4 py-3 lg:px-6">
          <IconButton label="Back to all products" icon={ICON.left} onClick={onBack} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-neutral-950 sm:text-lg">{draft.name || (productId === null ? "New product" : "Untitled")}</p>
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <span className={`inline-block size-2 rounded-full ${draft.is_published ? "bg-emerald-500" : "bg-slate-400"}`} />
              {draft.is_published ? "Published" : "Hidden"}
              {dirty && <span className="font-semibold text-amber-600">· Unsaved changes</span>}
            </p>
          </div>
          <Button variant="ghost" onClick={() => setPreview(true)} className="max-sm:px-2">
            <Icon d={ICON.eye} className="size-4" />
            <span className="max-sm:hidden">Preview</span>
          </Button>
          {productId !== null && draft.is_published && !dirty && (
            <a
              href={`/products/${draft.slug}`}
              target="_blank"
              rel="noopener"
              className="hidden h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-neutral-700 hover:bg-slate-100 sm:inline-flex"
            >
              <Icon d={ICON.external} className="size-4" />
              View
            </a>
          )}
          <Button variant="primary" onClick={save} disabled={saving || (!dirty && productId !== null)} title="Save (Ctrl+S)">
            {saving ? "Saving…" : productId === null ? "Create product" : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid gap-8 px-4 py-6 lg:px-6 xl:grid-cols-[12rem_minmax(0,1fr)]">
        <nav aria-label="Editor sections" className="hidden xl:block">
          <ul className="sticky top-52 space-y-0.5 text-sm">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} onClick={(e) => (e.preventDefault(), document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" }))} className="block rounded-md px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 hover:text-neutral-950">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-6">
          {error && (
            <div ref={errorRef} role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <p className="font-semibold">{error.message}</p>
              {error.details.length > 0 && (
                <ul className="mt-1 list-disc pl-5">
                  {error.details.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <Section id="basics" title="Basics" description="What the product is. Category and subcategory decide where it is listed.">
            <Field label="Category" required>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" role="radiogroup" aria-label="Category">
                {PRODUCT_CATEGORIES.map((c) => {
                  const on = draft.category === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => {
                        update("category", c.value);
                        if (c.value === "software") update("frequency", "");
                      }}
                      className={`flex h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                        on ? "border-[#0b1f45] bg-[#0b1f45] text-white" : "border-slate-300 bg-white text-neutral-700 hover:border-slate-400"
                      }`}
                    >
                      <Icon d={c.icon} className="size-4" />
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </Field>

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Product name" required htmlFor="f-name" hint="As shown on the page, e.g. “MC51 Built-in UHF”.">
                <TextInput
                  id="f-name"
                  value={draft.name}
                  maxLength={200}
                  onChange={(e) => {
                    update("name", e.target.value);
                    if (!slugTouched) update("slug", slugify(e.target.value));
                  }}
                  placeholder="Product name"
                />
              </Field>
              <Field label="Web address" htmlFor="f-slug" hint={<>rfdsl.co.nz/products/<b>{draft.slug || slugify(draft.name) || "…"}</b></>}>
                <TextInput
                  id="f-slug"
                  value={draft.slug}
                  maxLength={160}
                  onChange={(e) => {
                    setSlugTouched(true);
                    update("slug", slugify(e.target.value.replace(/\s/g, "-")) + (e.target.value.endsWith("-") ? "-" : ""));
                  }}
                  placeholder="auto from the name"
                />
              </Field>
              <Field label="Model" htmlFor="f-model">
                <TextInput id="f-model" value={draft.model} maxLength={120} onChange={(e) => update("model", e.target.value)} placeholder="e.g. MC51" />
              </Field>
              <Field label={isSoftware ? "Developer / brand" : "Brand"} htmlFor="f-brand">
                <TextInput id="f-brand" value={draft.brand} maxLength={120} list="brand-list" onChange={(e) => update("brand", e.target.value)} placeholder={isSoftware ? "e.g. RF Data Systems" : "e.g. Chainway, Zebra"} />
                <datalist id="brand-list">
                  {(suggestions?.brands ?? []).map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </Field>
              <Field label="Subcategory" htmlFor="f-sub" hint="Groups similar products, e.g. Handheld Readers / Fixed Readers. Shown as filter chips on the list.">
                <TextInput id="f-sub" value={draft.subcategory} maxLength={100} list="sub-list" onChange={(e) => update("subcategory", e.target.value)} placeholder={isSoftware ? "e.g. Asset Management" : "e.g. Handheld Readers"} />
                <datalist id="sub-list">
                  {subOptions.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                {subOptions.length > 0 && (
                  <QuickPicks options={subOptions} value={draft.subcategory} onPick={(v) => update("subcategory", v)} />
                )}
              </Field>
              {!isSoftware && (
                <Field label="RFID frequency" htmlFor="f-freq" hint="Leave empty if not applicable (e.g. a barcode printer).">
                  <TextInput id="f-freq" value={draft.frequency} maxLength={40} list="freq-list" onChange={(e) => update("frequency", e.target.value)} placeholder="e.g. UHF" />
                  <datalist id="freq-list">
                    {Array.from(new Set([...FREQUENCY_PRESETS, ...(suggestions?.frequencies ?? [])])).map((f) => (
                      <option key={f} value={f} />
                    ))}
                  </datalist>
                  <QuickPicks options={FREQUENCY_PRESETS} value={draft.frequency} onPick={(v) => update("frequency", v)} />
                </Field>
              )}
            </div>
          </Section>

          <Section id="photos" title="Photos" description="The first photo is the cover on the product list. Square photos on a white or light background look best.">
            <ImagesEditor value={draft.gallery} onChange={(v) => update("gallery", v)} />
          </Section>

          <Section id="text" title="Headline & text">
            <Field label="Headline" htmlFor="f-tagline" aside={`${draft.tagline.length}/300`} hint="Big line beside the photos, e.g. “Breakthrough in Read Rates and Accuracy.”">
              <TextInput id="f-tagline" value={draft.tagline} maxLength={300} onChange={(e) => update("tagline", e.target.value)} />
            </Field>
            <Field label="Summary" htmlFor="f-summary" aside={`${draft.summary.length}/600`} hint="One or two sentences. Shown when hovering the product on the list, under the headline, and to search engines.">
              <AutoTextarea id="f-summary" minRows={2} value={draft.summary} maxLength={600} onChange={(e) => update("summary", e.target.value)} />
            </Field>
            <Field
              label="Overview"
              htmlFor="f-description"
              hint={
                <>
                  Optional longer text (useful for software). Leave a blank line between paragraphs. Start a line with <code>## </code> for a subheading,
                  or with <code>- </code> for a bullet point.
                </>
              }
            >
              <AutoTextarea id="f-description" minRows={4} value={draft.description} maxLength={20000} onChange={(e) => update("description", e.target.value)} />
            </Field>
          </Section>

          <Section
            id="highlights"
            title="Highlights"
            description="Short icon lines beside the photos. Use any section titles that suit the product."
          >
            <HighlightsEditor
              value={draft.highlights}
              onChange={(v) => update("highlights", v)}
              productType={isSoftware ? "software" : "hardware"}
              titleSuggestions={suggestions?.highlight_titles ?? []}
            />
          </Section>

          <Section id="specs" title="Specifications" description="Grouped label / value tables. Each product can have its own groups and rows.">
            <SpecsEditor value={draft.specs} onChange={(v) => update("specs", v)} category={draft.category} suggestions={suggestions} currentId={productId ?? undefined} />
          </Section>

          <Section id="links" title="Downloads & links">
            <LinksEditor value={draft.links} onChange={(v) => update("links", v)} />
          </Section>

          <Section
            id="featured"
            title="Homepage sections"
            description="Show this product in the home page sections below. A section only appears on the home page when at least one published product is in it."
          >
            <div className="grid gap-3 md:grid-cols-3">
              <FlagCard
                title="Popular product"
                where="“The most popular products”"
                badge="Popular"
                badgeClass="border border-slate-200 bg-white text-neutral-800"
                checked={draft.is_popular}
                onChange={(v) => update("is_popular", v)}
              />
              <FlagCard
                title="New arrival"
                where="“New arrivals”"
                badge="New"
                badgeClass="bg-neutral-950 text-white"
                checked={draft.is_new}
                onChange={(v) => update("is_new", v)}
              />
              <FlagCard
                title="On sale"
                where="“Special offers”"
                badge={draft.sale_label.trim() || "Sale"}
                badgeClass="bg-red-600 text-white"
                checked={draft.is_on_sale}
                onChange={(v) => update("is_on_sale", v)}
              >
                {draft.is_on_sale && (
                  <label className="mt-3 block">
                    <span className="text-xs font-semibold text-neutral-900">Badge text (optional)</span>
                    <TextInput
                      value={draft.sale_label}
                      maxLength={40}
                      onChange={(e) => update("sale_label", e.target.value)}
                      placeholder="e.g. 20% off, Clearance"
                      className="mt-1 h-9 text-sm"
                    />
                  </label>
                )}
              </FlagCard>
            </div>
            {!draft.is_published && (draft.is_popular || draft.is_new || draft.is_on_sale) && (
              <p className="text-sm text-amber-700">This product is hidden, so it won&apos;t appear in these sections until it&apos;s published.</p>
            )}
          </Section>

          <Section id="visibility" title="Visibility & search">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
              <div>
                <p className="font-semibold text-neutral-950">Published</p>
                <p className="text-sm text-slate-500">Hidden products are kept here but not shown on the website.</p>
              </div>
              <Toggle checked={draft.is_published} onChange={(v) => update("is_published", v)} label="Published" />
            </div>
            <div className="grid gap-5 md:grid-cols-[12rem_1fr]">
              <Field label="Sort order" htmlFor="f-sort" hint="Lower numbers are listed first.">
                <TextInput id="f-sort" type="number" value={String(draft.sort_order)} onChange={(e) => update("sort_order", parseInt(e.target.value, 10) || 0)} />
              </Field>
              <Field label="Extra search words" htmlFor="f-keywords" hint="Not shown on the page; helps visitors find it (other names, part numbers, common misspellings).">
                <TextInput id="f-keywords" value={draft.keywords} maxLength={600} onChange={(e) => update("keywords", e.target.value)} placeholder="e.g. handheld terminal, PDA, MC-51" />
              </Field>
            </div>
          </Section>

          <div className="flex justify-end gap-2 pb-10">
            <Button onClick={() => setPreview(true)}>
              <Icon d={ICON.eye} className="size-4" />
              Preview
            </Button>
            <Button variant="primary" onClick={save} disabled={saving || (!dirty && productId !== null)}>
              {saving ? "Saving…" : productId === null ? "Create product" : "Save changes"}
            </Button>
          </div>
        </div>
      </div>

      {toast && (
        <div role="status" className="fixed bottom-6 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-full bg-neutral-950 px-5 py-3 text-sm font-semibold text-white shadow-xl transition starting:translate-y-2 starting:opacity-0">
          <Icon d={ICON.check} className="size-4 text-emerald-400" />
          {toast}
        </div>
      )}

      {preview && <PreviewOverlay draft={draft} id={productId ?? 0} onClose={() => setPreview(false)} />}
    </div>
  );
}

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-48 rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgb(15_23_42/0.04)] sm:p-6">
      <h2 id={`${id}-h`} className="text-lg font-bold text-neutral-950">
        {title}
      </h2>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function FlagCard({
  title,
  where,
  badge,
  badgeClass,
  checked,
  onChange,
  children,
}: {
  title: string;
  where: string;
  badge: string;
  badgeClass: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className={`rounded-lg border p-4 transition-colors ${checked ? "border-neutral-950 bg-slate-50" : "border-slate-200"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-neutral-950">{title}</p>
          <p className="mt-0.5 text-xs text-slate-500">Home page: {where}</p>
          <span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-[11px] leading-none font-bold tracking-wide ${badgeClass}`}>{badge}</span>
        </div>
        <Toggle checked={checked} onChange={onChange} label={title} />
      </div>
      {children}
    </div>
  );
}

function QuickPicks({ options, value, onPick }: { options: string[]; value: string; onPick: (v: string) => void }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {options.slice(0, 8).map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onPick(o)}
          className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
            o === value ? "border-[#0b1f45] bg-[#0b1f45] text-white" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:text-neutral-950"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

// Full-screen preview of the product page with the unsaved changes.
function PreviewOverlay({ draft, id, onClose }: { draft: Draft; id: number; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label="Preview" className="fixed inset-0 z-[60] flex flex-col bg-white">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm font-semibold text-neutral-700">
          Preview <span className="font-normal text-slate-500">· how the product page will look (unsaved changes included)</span>
        </p>
        <Button variant="primary" size="sm" onClick={onClose}>
          Close preview
        </Button>
      </div>
      <div className="@container/page flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1536px]">
          <ProductDetailView product={toPreview(draft, id)} preview />
        </div>
      </div>
    </div>
  );
}
