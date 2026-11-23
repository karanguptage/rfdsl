"use client";

// Small form building blocks for the admin pages, in the site's style
// (slate borders, navy focus ring, black primary buttons).

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 text-[15px] text-neutral-950 transition outline-none placeholder:text-slate-400 hover:border-slate-400 focus:border-[#0b1f45] focus:ring-4 focus:ring-sky-500/15 disabled:bg-slate-50";

export function Field({
  label,
  hint,
  required,
  htmlFor,
  className,
  children,
  aside,
}: {
  label: string;
  hint?: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-semibold text-neutral-900">
          {label}
          {required && <span className="ml-0.5 text-red-600">*</span>}
        </label>
        {aside && <span className="text-xs text-slate-500">{aside}</span>}
      </div>
      {children}
      {hint && <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{hint}</p>}
    </div>
  );
}

export function TextInput(props: React.ComponentProps<"input">) {
  return <input type="text" {...props} className={`h-10 ${inputClass} ${props.className ?? ""}`} />;
}

// Textarea that grows with its content (no inner scrollbar for long spec values).
export function AutoTextarea({ minRows = 1, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { minRows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [props.value]);
  return (
    <textarea
      ref={ref}
      rows={minRows}
      {...props}
      className={`block resize-none overflow-hidden py-2 leading-relaxed ${inputClass} ${props.className ?? ""}`}
    />
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "dangerSolid";
const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-black text-white hover:bg-[#0b1f45] border border-black hover:border-[#0b1f45]",
  secondary: "border border-slate-300 bg-white text-neutral-900 hover:border-slate-400 hover:bg-slate-50",
  ghost: "text-neutral-700 hover:bg-slate-100 hover:text-neutral-950",
  danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50 hover:border-red-300",
  dangerSolid: "border border-red-600 bg-red-600 text-white hover:bg-red-700 hover:border-red-700",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "sm" | "md" }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        size === "sm" ? "h-8 px-2.5 text-[13px]" : "h-10 px-4 text-sm"
      } ${VARIANTS[variant]} ${className ?? ""}`}
    />
  );
}

export function IconButton({
  label,
  icon,
  className,
  tone = "default",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; icon: string; tone?: "default" | "danger" }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...props}
      className={`flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-30 ${
        tone === "danger" ? "text-slate-400 hover:bg-red-50 hover:text-red-600" : "text-slate-500 hover:bg-slate-100 hover:text-neutral-950"
      } ${className ?? ""}`}
    >
      <Icon d={icon} className="size-4" />
    </button>
  );
}

export function Icon({ d, className, strokeWidth = 2 }: { d: string; className?: string; strokeWidth?: number }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={d} />
    </svg>
  );
}

export const ICON = {
  up: "M18 15l-6-6-6 6",
  down: "M6 9l6 6 6-6",
  left: "M15 18l-6-6 6-6",
  right: "M9 18l6-6-6-6",
  trash: "M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6",
  plus: "M12 5v14M5 12h14",
  close: "M6 6l12 12M18 6L6 18",
  edit: "M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z",
  copy: "M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2zM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  external: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3",
  upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
  clipboard: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6v4H9z",
  template: "M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z",
  note: "M4 7h16M4 12h10M4 17h6",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  search: "M21 21l-4.35-4.35M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  check: "M5 12l5 5L20 7",
  wand: "M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M3 21l9-9M12.2 6.2L11 5",
};

// Centered dialog with a dimmed backdrop; Esc or the backdrop closes it.
export function Modal({
  title,
  onClose,
  children,
  footer,
  wide = false,
  size,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
  size?: "md";
}) {
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
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px] sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`my-8 flex max-h-[calc(100vh-4rem)] w-full flex-col overflow-hidden rounded-xl bg-white shadow-2xl transition duration-150 starting:scale-95 starting:opacity-0 ${wide ? "max-w-4xl" : size === "md" ? "max-w-2xl" : "max-w-lg"}`}
      >
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-bold text-neutral-950">{title}</h2>
          <IconButton label="Close" icon={ICON.close} onClick={onClose} />
        </div>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? "bg-emerald-600" : "bg-slate-300"
      }`}
    >
      <span className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5.5" : "translate-x-0.5"}`} />
    </button>
  );
}

export function Checkbox({
  checked,
  indeterminate = false,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      title={label}
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      className="size-4 shrink-0 cursor-pointer accent-neutral-950 disabled:cursor-not-allowed"
    />
  );
}

// ------------------------------------------------------------------ bulk delete

export type Selection = ReturnType<typeof useSelection>;

// The rows ticked on the current page of a list. Cleared when the list's
// filter, search or page changes (resetKey); rows no longer shown don't count.
export function useSelection(pageIds: number[], resetKey: string) {
  const [picked, setPicked] = useState<ReadonlySet<number>>(() => new Set());
  const [key, setKey] = useState(resetKey);
  if (key !== resetKey) {
    setKey(resetKey);
    setPicked(new Set());
  }
  const selected = pageIds.filter((id) => picked.has(id));
  return {
    selected,
    has: (id: number) => picked.has(id),
    toggle: (id: number) =>
      setPicked((p) => {
        const next = new Set(p);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    setAll: (on: boolean) => setPicked(on ? new Set(pageIds) : new Set()),
    clear: () => setPicked(new Set()),
  };
}

// Toolbar on top of a list: tick all on this page, delete the ticked rows, or
// delete everything matching the list's current filter (all pages). Deleting
// is confirmed in a dialog; "all" must be confirmed by typing DELETE.
export function BulkBar({
  pageIds,
  selection,
  total,
  noun,
  scope,
  deleteSelected,
  deleteAll,
  onDeleted,
}: {
  pageIds: number[];
  selection: Selection;
  total: number; // everything matching the filter, all pages
  noun: [singular: string, plural: string];
  scope: string; // e.g. the filter's name, for the confirmation
  deleteSelected: (ids: number[]) => Promise<unknown>;
  deleteAll: () => Promise<unknown>;
  onDeleted: (ids: number[] | "all") => void;
}) {
  const [confirming, setConfirming] = useState<"selected" | "all" | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const n = selection.selected.length;
  const word = (count: number) => (count === 1 ? noun[0] : noun[1]);
  const allOnPage = pageIds.length > 0 && n === pageIds.length;

  const close = () => {
    if (busy) return;
    setConfirming(null);
    setTyped("");
    setError("");
  };
  const run = async () => {
    setBusy(true);
    setError("");
    try {
      if (confirming === "all") {
        await deleteAll();
        onDeleted("all");
      } else {
        const ids = selection.selected;
        await deleteSelected(ids);
        onDeleted(ids);
      }
      selection.clear();
      setBusy(false);
      setConfirming(null);
      setTyped("");
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Couldn't delete. Please try again.");
    }
  };

  const count = confirming === "all" ? total : n;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-200 bg-slate-50/70 px-4 py-2">
      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600">
        <Checkbox
          checked={allOnPage}
          indeterminate={n > 0 && !allOnPage}
          disabled={pageIds.length === 0}
          onChange={(on) => selection.setAll(on)}
          label={allOnPage ? "Untick all on this page" : "Tick all on this page"}
        />
        {n > 0 ? <span className="font-semibold text-neutral-950">{n} selected</span> : "Select"}
      </label>
      {n > 0 && (
        <>
          <Button size="sm" variant="danger" onClick={() => setConfirming("selected")}>
            <Icon d={ICON.trash} className="size-3.5" />
            Delete selected
          </Button>
          <button type="button" onClick={selection.clear} className="cursor-pointer text-xs font-semibold text-slate-500 hover:text-neutral-950">
            Clear
          </button>
        </>
      )}
      <button
        type="button"
        disabled={total === 0}
        onClick={() => setConfirming("all")}
        className="ml-auto cursor-pointer text-xs font-semibold text-red-700 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
      >
        Delete all {total > 0 ? total : ""}
      </button>

      {confirming && (
        <Modal
          title={confirming === "all" ? `Delete all ${word(2)}?` : `Delete ${count} ${word(count)}?`}
          onClose={close}
          footer={
            <>
              <Button onClick={close} disabled={busy}>
                Cancel
              </Button>
              <Button
                variant="dangerSolid"
                onClick={run}
                disabled={busy || (confirming === "all" && typed.trim().toUpperCase() !== "DELETE")}
              >
                {busy ? "Deleting…" : `Delete ${count} ${word(count)}`}
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-sm leading-relaxed text-neutral-800">
            {confirming === "all" ? (
              <p>
                This permanently deletes <b>all {total} {word(total)}</b> in <b>{scope}</b>, including the ones on other pages.
              </p>
            ) : (
              <p>
                This permanently deletes the {count} {word(count)} you ticked.
              </p>
            )}
            <p className="text-slate-500">This can&apos;t be undone.</p>
            {confirming === "all" && (
              <label className="block">
                <span className="mb-1.5 block font-semibold text-neutral-900">Type DELETE to confirm</span>
                <input
                  autoFocus
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && typed.trim().toUpperCase() === "DELETE" && !busy && run()}
                  className={`h-10 ${inputClass}`}
                  aria-label="Type DELETE to confirm"
                />
              </label>
            )}
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{error}</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}

let uidCounter = 0;
// Stable keys for list items the admin can reorder (not saved).
export function uid(): string {
  uidCounter += 1;
  return `k${Date.now().toString(36)}${uidCounter}`;
}

export function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
