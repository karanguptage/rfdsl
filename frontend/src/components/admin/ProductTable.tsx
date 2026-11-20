"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { categoryOf, CATEGORIES, isRemoteImage, type ProductList, type ProductSummary } from "@/lib/catalog";
import CategorySelect from "@/components/CategorySelect";
import { adminApi } from "./api";
import { Button, Icon, ICON, IconButton, inputClass, Toggle } from "./ui";

const PER_PAGE = 20;

// Every product (published and hidden) with search, category filter,
// publish switch and quick actions.
export default function ProductTable({ onEdit, onNew, refreshKey }: { onEdit: (id: number) => void; onNew: () => void; refreshKey: number }) {
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ProductList | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q);
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .list({ q: debouncedQ, category, page, per_page: PER_PAGE })
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setError("");
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [debouncedQ, category, page, reload, refreshKey]);

  const refresh = useCallback(() => setReload((n) => n + 1), []);

  const act = async (id: number, fn: () => Promise<unknown>) => {
    setBusyId(id);
    try {
      await fn();
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="px-4 py-6 lg:px-6 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(1.5rem,2.2vw,2rem)] font-extrabold tracking-[-0.02em] text-neutral-950">Products</h1>
          <p className="mt-1 text-sm text-slate-500">
            {data ? `${data.total} product${data.total === 1 ? "" : "s"}${debouncedQ || category !== "all" ? " found" : " registered"}` : " "}
          </p>
        </div>
        <Button variant="primary" onClick={onNew}>
          <Icon d={ICON.plus} className="size-4" />
          New product
        </Button>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Icon d={ICON.search} className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, model, brand, specs…"
            aria-label="Search products"
            className={`h-12 rounded-xl pl-10 ${inputClass}`}
          />
        </div>
        {/* Same Select2-style picker as the public Products toolbar. */}
        <CategorySelect
          options={CATEGORIES}
          value={category}
          onChange={(value) => {
            setCategory(value);
            setPage(1);
          }}
          className="shrink-0 sm:w-60"
        />
      </div>

      {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="hidden grid-cols-[4rem_minmax(0,2fr)_minmax(0,1.3fr)_7rem_7.5rem_9.5rem] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] font-semibold tracking-wider text-slate-500 uppercase lg:grid">
          <span />
          <span>Product</span>
          <span>Category</span>
          <span>Published</span>
          <span>Updated</span>
          <span className="text-right">Actions</span>
        </div>
        {!data && !error && <p className="px-4 py-10 text-center text-sm text-slate-500">Loading…</p>}
        {data?.items.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="font-semibold text-neutral-900">No products found</p>
            <p className="mt-1 text-sm text-slate-500">{debouncedQ || category !== "all" ? "Try another search or category." : "Register the first product."}</p>
          </div>
        )}
        <ul className="divide-y divide-slate-100">
          {data?.items.map((p) => (
            <Row
              key={p.id}
              p={p}
              busy={busyId === p.id}
              onEdit={() => onEdit(p.id)}
              onToggle={(v) => act(p.id, () => adminApi.patch(p.id, { is_published: v }))}
              onFlag={(flag, v) => act(p.id, () => adminApi.patch(p.id, { [flag]: v }))}
              onDuplicate={() =>
                act(p.id, async () => {
                  const copy = await adminApi.duplicate(p.id);
                  onEdit(copy.id);
                })
              }
              onDelete={() => confirm(`Delete “${p.name}” permanently? This can't be undone.\n(Tip: switch off "Published" to hide it instead.)`) && act(p.id, () => adminApi.remove(p.id))}
            />
          ))}
        </ul>
      </div>

      {data && data.pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-slate-500">
            Page {data.page} of {data.pages}
          </span>
          <div className="flex gap-2">
            <Button size="sm" disabled={data.page <= 1} onClick={() => setPage(data.page - 1)}>
              <Icon d={ICON.left} className="size-3.5" />
              Previous
            </Button>
            <Button size="sm" disabled={data.page >= data.pages} onClick={() => setPage(data.page + 1)}>
              Next
              <Icon d={ICON.right} className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  p,
  busy,
  onEdit,
  onToggle,
  onFlag,
  onDuplicate,
  onDelete,
}: {
  p: ProductSummary;
  busy: boolean;
  onEdit: () => void;
  onToggle: (v: boolean) => void;
  onFlag: (flag: "is_popular" | "is_new" | "is_on_sale", value: boolean) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const cat = categoryOf(p.category);
  return (
    <li className={`grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 transition-opacity lg:grid-cols-[4rem_minmax(0,2fr)_minmax(0,1.3fr)_7rem_7.5rem_9.5rem] ${busy ? "opacity-50" : ""}`}>
      <button type="button" onClick={onEdit} aria-label={`Edit ${p.name}`} className="relative size-14 cursor-pointer overflow-hidden rounded-md border border-slate-200 bg-white lg:size-16">
        {p.image ? (
          <Image src={p.image} alt="" fill sizes="64px" unoptimized={isRemoteImage(p.image)} className="object-contain p-1" />
        ) : (
          <span className="flex size-full items-center justify-center bg-slate-50 text-slate-300">
            <Icon d={cat?.icon ?? ICON.template} className="size-6" strokeWidth={1.5} />
          </span>
        )}
      </button>
      <div className="min-w-0">
        <button type="button" onClick={onEdit} className="block max-w-full cursor-pointer truncate text-left font-semibold text-neutral-950 hover:underline">
          {p.name}
        </button>
        <p className="truncate text-xs text-slate-500">{[p.brand, p.model !== p.name ? p.model : null, p.frequency].filter(Boolean).join(" · ") || "—"}</p>
        {/* Home page sections: click to switch on / off. */}
        <div className="mt-1.5 flex flex-wrap gap-1" role="group" aria-label={`Home page sections for ${p.name}`}>
          <FlagPill on={p.is_popular} onClick={() => onFlag("is_popular", !p.is_popular)} onClass="border-neutral-950 bg-white text-neutral-950">
            Popular
          </FlagPill>
          <FlagPill on={p.is_new} onClick={() => onFlag("is_new", !p.is_new)} onClass="border-neutral-950 bg-neutral-950 text-white">
            New
          </FlagPill>
          <FlagPill on={p.is_on_sale} onClick={() => onFlag("is_on_sale", !p.is_on_sale)} onClass="border-red-600 bg-red-600 text-white">
            {p.is_on_sale && p.sale_label ? p.sale_label : "Sale"}
          </FlagPill>
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-500 lg:hidden">
          {cat?.label}
          {p.subcategory && ` / ${p.subcategory}`}
        </p>
      </div>
      <div className="hidden min-w-0 text-sm lg:block">
        <span className="inline-flex items-center gap-1.5 font-medium text-neutral-800">
          <Icon d={cat?.icon ?? ""} className="size-3.5 text-slate-400" />
          {cat?.label ?? p.category}
        </span>
        {p.subcategory && <p className="truncate text-xs text-slate-500">{p.subcategory}</p>}
      </div>
      <div className="col-start-3 row-start-1 flex items-center justify-end gap-2 lg:col-start-auto lg:row-start-auto lg:justify-start">
        <Toggle checked={p.is_published} onChange={onToggle} label={`Published: ${p.name}`} />
        <span className="hidden text-xs text-slate-500 sm:inline lg:hidden xl:inline">{p.is_published ? "On" : "Off"}</span>
      </div>
      <span className="hidden text-xs text-slate-500 lg:block">{new Date(p.updated_at).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}</span>
      <div className="col-span-3 flex justify-end gap-0.5 lg:col-span-1">
        <IconButton label="Edit" icon={ICON.edit} onClick={onEdit} />
        <a
          href={`/products/${p.slug}`}
          target="_blank"
          rel="noopener"
          aria-label="View on website"
          title={p.is_published ? "View on website" : "Hidden: not on the website"}
          className={`flex size-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-neutral-950 ${p.is_published ? "" : "pointer-events-none opacity-30"}`}
        >
          <Icon d={ICON.external} className="size-4" />
        </a>
        <IconButton label="Duplicate (copy as a new hidden product)" icon={ICON.copy} onClick={onDuplicate} />
        <IconButton label="Delete" icon={ICON.trash} tone="danger" onClick={onDelete} />
      </div>
    </li>
  );
}

function FlagPill({ on, onClick, onClass, children }: { on: boolean; onClick: () => void; onClass: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      title={on ? "Shown in this home page section: click to remove" : "Click to show in this home page section"}
      className={`inline-flex h-6 cursor-pointer items-center gap-1 rounded-full border px-2 text-[11px] font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
        on ? onClass : "border-dashed border-slate-300 bg-white text-slate-400 hover:border-slate-400 hover:text-slate-600"
      }`}
    >
      {on && <Icon d={ICON.check} className="size-3" />}
      {children}
    </button>
  );
}
