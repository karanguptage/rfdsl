"use client";

import { useEffect, useRef, useState } from "react";
import FeatureIcon, { ICON_NAMES, ICONS, suggestIcon } from "@/components/FeatureIcon";
import { newItem, newSection, type DraftItem, type DraftSection } from "./draft";
import { HIGHLIGHT_PRESETS } from "./templates";
import { AutoTextarea, Button, Icon, ICON, IconButton, inputClass, Modal, move, TextInput } from "./ui";

// Highlight sections shown beside the photos ("Features", "Functions", or for
// software "Key Features", "Benefits" ... any title). Each line = icon + text.
// - Typing a line picks a matching icon automatically (until you choose one).
// - Enter in a line adds the next line; Backspace on an empty line removes it.
// - "Paste list" turns a block of lines into items in one go.
export default function HighlightsEditor({
  value,
  onChange,
  productType,
  titleSuggestions,
}: {
  value: DraftSection[];
  onChange: (v: DraftSection[]) => void;
  productType: "hardware" | "software";
  titleSuggestions: string[];
}) {
  const [pasteFor, setPasteFor] = useState<number | null>(null);
  const [focusKey, setFocusKey] = useState<string | null>(null);

  const setSection = (i: number, s: DraftSection) => onChange(value.map((x, j) => (j === i ? s : x)));
  const titles = Array.from(new Set([...HIGHLIGHT_PRESETS[productType], ...titleSuggestions]));

  return (
    <div className="space-y-4">
      {value.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-5 text-sm text-slate-600">
          No highlight sections yet. Start with the usual pair for {productType === "software" ? "software" : "devices"}, or add your own.
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" size="sm" onClick={() => onChange(HIGHLIGHT_PRESETS[productType].map((t) => newSection(t)))}>
              <Icon d={ICON.wand} className="size-3.5" />
              Add “{HIGHLIGHT_PRESETS[productType].join("” + “")}”
            </Button>
          </div>
        </div>
      )}

      {value.map((section, si) => (
        <div key={section.k} className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
            <TextInput
              value={section.title}
              onChange={(e) => setSection(si, { ...section, title: e.target.value })}
              placeholder="Section title, e.g. Features"
              aria-label="Section title"
              list="highlight-titles"
              className="h-9 max-w-xs font-semibold"
            />
            <span className="ml-auto text-xs text-slate-500">{section.items.filter((i) => i.text.trim()).length} items</span>
            <IconButton label="Move section up" icon={ICON.up} disabled={si === 0} onClick={() => onChange(move(value, si, si - 1))} />
            <IconButton label="Move section down" icon={ICON.down} disabled={si === value.length - 1} onClick={() => onChange(move(value, si, si + 1))} />
            <IconButton
              label="Delete section"
              icon={ICON.trash}
              tone="danger"
              onClick={() => (section.items.every((i) => !i.text.trim()) || confirm(`Delete the “${section.title || "untitled"}” section?`)) && onChange(value.filter((_, j) => j !== si))}
            />
          </div>

          <ul className="space-y-1.5 p-3">
            {section.items.map((item, ii) => (
              <ItemRow
                key={item.k}
                item={item}
                autoFocus={focusKey === item.k}
                canMoveUp={ii > 0}
                canMoveDown={ii < section.items.length - 1}
                onChange={(next) => setSection(si, { ...section, items: section.items.map((x, j) => (j === ii ? next : x)) })}
                onMove={(d) => setSection(si, { ...section, items: move(section.items, ii, ii + d) })}
                onRemove={() => {
                  const items = section.items.filter((_, j) => j !== ii);
                  setSection(si, { ...section, items });
                  setFocusKey(items[Math.max(0, ii - 1)]?.k ?? null);
                }}
                onEnter={() => {
                  const created = newItem();
                  const items = section.items.slice();
                  items.splice(ii + 1, 0, created);
                  setSection(si, { ...section, items });
                  setFocusKey(created.k);
                }}
              />
            ))}
          </ul>
          <div className="flex flex-wrap gap-2 px-3 pb-3">
            <Button
              size="sm"
              onClick={() => {
                const created = newItem();
                setSection(si, { ...section, items: [...section.items, created] });
                setFocusKey(created.k);
              }}
            >
              <Icon d={ICON.plus} className="size-3.5" />
              Add line
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPasteFor(si)}>
              <Icon d={ICON.clipboard} className="size-3.5" />
              Paste list
            </Button>
          </div>
        </div>
      ))}

      {value.length > 0 && (
        <Button onClick={() => onChange([...value, newSection()])}>
          <Icon d={ICON.plus} className="size-4" />
          Add section
        </Button>
      )}

      <datalist id="highlight-titles">
        {titles.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>

      {pasteFor !== null && value[pasteFor] && (
        <PasteListDialog
          onClose={() => setPasteFor(null)}
          onApply={(lines, replace) => {
            const section = value[pasteFor];
            const items = lines.map((t) => newItem(t, suggestIcon(t)));
            const kept = replace ? [] : section.items.filter((i) => i.text.trim());
            setSection(pasteFor, { ...section, items: [...kept, ...items] });
            setPasteFor(null);
          }}
        />
      )}
    </div>
  );
}

function ItemRow({
  item,
  autoFocus,
  canMoveUp,
  canMoveDown,
  onChange,
  onMove,
  onRemove,
  onEnter,
}: {
  item: DraftItem;
  autoFocus: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChange: (i: DraftItem) => void;
  onMove: (d: number) => void;
  onRemove: () => void;
  onEnter: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Remembers whether the icon was chosen by hand (then typing won't change it).
  const [manualIcon, setManualIcon] = useState(!!item.icon && item.icon !== suggestIcon(item.text));

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  return (
    <li className="flex items-center gap-2">
      <IconPicker
        value={item.icon || suggestIcon(item.text)}
        onChange={(icon) => {
          setManualIcon(true);
          onChange({ ...item, icon });
        }}
      />
      <input
        ref={inputRef}
        type="text"
        value={item.text}
        maxLength={300}
        onChange={(e) => {
          const text = e.target.value;
          onChange({ ...item, text, icon: manualIcon ? item.icon : suggestIcon(text) });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onEnter();
          } else if (e.key === "Backspace" && !item.text) {
            e.preventDefault();
            onRemove();
          }
        }}
        placeholder="e.g. Wi-Fi 6E with 2x2 MIMO and Fast Roaming"
        aria-label="Highlight text"
        className={`h-10 ${inputClass}`}
      />
      <div className="flex">
        <IconButton label="Move up" icon={ICON.up} disabled={!canMoveUp} onClick={() => onMove(-1)} />
        <IconButton label="Move down" icon={ICON.down} disabled={!canMoveDown} onClick={() => onMove(1)} />
        <IconButton label="Remove line" icon={ICON.close} tone="danger" onClick={onRemove} />
      </div>
    </li>
  );
}

// Button showing the current icon; opens a searchable grid of all icons.
function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !rootRef.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const names = ICON_NAMES.filter((n) => `${n} ${ICONS[n].label}`.toLowerCase().includes(filter.trim().toLowerCase()));

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setFilter("");
          setOpen((o) => !o);
        }}
        aria-label={`Icon: ${ICONS[value]?.label ?? value}. Change icon`}
        title={`Icon: ${ICONS[value]?.label ?? value}`}
        className={`flex size-10 cursor-pointer items-center justify-center rounded-lg border bg-white text-neutral-950 transition outline-none hover:border-slate-400 focus-visible:ring-2 focus-visible:ring-sky-400 ${
          open ? "border-[#0b1f45]" : "border-slate-300"
        }`}
      >
        <FeatureIcon name={value} className="size-5" />
      </button>
      {open && (
        <div className="absolute top-full left-0 z-30 mt-2 w-[19rem] rounded-xl border border-slate-200 bg-white p-2 shadow-[0_20px_50px_-15px_rgb(11_31_69/0.35)]">
          <input
            autoFocus
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search icons (wifi, battery …)"
            aria-label="Search icons"
            className="mb-2 h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-slate-300 focus:bg-white"
          />
          <ul className="grid max-h-64 grid-cols-6 gap-1 overflow-y-auto">
            {names.map((n) => (
              <li key={n}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(n);
                    setOpen(false);
                  }}
                  title={ICONS[n].label}
                  aria-label={ICONS[n].label}
                  className={`flex size-11 cursor-pointer items-center justify-center rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                    n === value ? "bg-neutral-950 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-neutral-950"
                  }`}
                >
                  <FeatureIcon name={n} className="size-5" />
                </button>
              </li>
            ))}
            {names.length === 0 && <li className="col-span-6 px-2 py-3 text-sm text-slate-500">No matching icon</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

function PasteListDialog({ onClose, onApply }: { onClose: () => void; onApply: (lines: string[], replace: boolean) => void }) {
  const [text, setText] = useState("");
  const [replace, setReplace] = useState(false);
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-*•·▪◦]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);
  return (
    <Modal
      title="Paste a list"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!lines.length} onClick={() => onApply(lines, replace)}>
            Add {lines.length || ""} line{lines.length === 1 ? "" : "s"}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-slate-600">One item per line. Bullets and numbering are removed, and an icon is picked for each line (you can change it afterwards).</p>
      <AutoTextarea
        autoFocus
        minRows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"High-Performance Octa-Core 2.4 GHz\nAndroid 14 (Upgradable to Android 18+)\nWi-Fi 6E with 2x2 MIMO"}
        aria-label="List to paste"
      />
      {lines.length > 0 && (
        <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
          {lines.slice(0, 12).map((l, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-neutral-700">
              <FeatureIcon name={suggestIcon(l)} className="size-4 shrink-0 text-neutral-950" />
              <span className="truncate">{l}</span>
            </li>
          ))}
          {lines.length > 12 && <li className="text-sm text-slate-500">…and {lines.length - 12} more</li>}
        </ul>
      )}
      <label className="mt-4 flex items-center gap-2 text-sm text-neutral-800">
        <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="size-4 accent-black" />
        Replace the lines already in this section
      </label>
    </Modal>
  );
}
