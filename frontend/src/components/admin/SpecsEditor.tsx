"use client";

import { useEffect, useRef, useState } from "react";
import { categoryOf, type ProductSummary } from "@/lib/catalog";
import { adminApi, type Suggestions } from "./api";
import { newGroup, newRow, type DraftGroup, type DraftRow } from "./draft";
import { parseSpecText, SPEC_TEMPLATES, type ParsedGroup } from "./templates";
import { AutoTextarea, Button, Icon, ICON, IconButton, inputClass, Modal, move, TextInput } from "./ui";

// Specification groups ("Physical Characteristics", "UHF RFID", "Modules" ...)
// each holding label / value rows. A value can span several lines (indent a
// line with spaces to nest it) and can carry a smaller grey note underneath.
// Quick starts: a template for the kind of device, copying the layout of a
// similar product, or pasting a spec table from a datasheet or web page.
// Rows left without a value are not saved, so templates can be filled partly.
export default function SpecsEditor({
  value,
  onChange,
  category,
  suggestions,
  currentId,
}: {
  value: DraftGroup[];
  onChange: (v: DraftGroup[]) => void;
  category: string;
  suggestions: Suggestions | null;
  currentId?: number;
}) {
  const [dialog, setDialog] = useState<"template" | "copy" | "paste" | null>(null);
  const [focusKey, setFocusKey] = useState<string | null>(null);

  const setGroup = (i: number, g: DraftGroup) => onChange(value.map((x, j) => (j === i ? g : x)));
  const filledRows = value.reduce((n, g) => n + g.rows.filter((r) => r.value.trim() || r.note.trim()).length, 0);

  // Add groups, merging into existing groups with the same name (never removes anything).
  const merge = (incoming: ParsedGroup[], replace = false) => {
    const next = replace ? [] : value.map((g) => ({ ...g, rows: g.rows.slice() }));
    for (const ig of incoming) {
      const existing = next.find((g) => g.group.trim().toLowerCase() === ig.group.trim().toLowerCase());
      if (existing) {
        for (const r of ig.rows) {
          const same = existing.rows.find((x) => x.label.trim().toLowerCase() === r.label.trim().toLowerCase());
          if (same && !same.value.trim() && !same.note.trim()) Object.assign(same, { value: r.value, note: r.note, showNote: !!r.note });
          else if (!same || r.value) existing.rows.push(newRow(r.label, r.value, r.note));
        }
      } else {
        next.push({ ...newGroup(ig.group, []), rows: ig.rows.map((r) => newRow(r.label, r.value, r.note)) });
      }
    }
    onChange(next);
    setDialog(null);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => setDialog("template")}>
          <Icon d={ICON.template} className="size-3.5" />
          Start from template
        </Button>
        <Button size="sm" onClick={() => setDialog("copy")}>
          <Icon d={ICON.copy} className="size-3.5" />
          Copy layout from a product
        </Button>
        <Button size="sm" onClick={() => setDialog("paste")}>
          <Icon d={ICON.clipboard} className="size-3.5" />
          Paste from datasheet
        </Button>
        <span className="ml-auto text-xs text-slate-500">
          {value.length} group{value.length === 1 ? "" : "s"} · {filledRows} filled row{filledRows === 1 ? "" : "s"}
        </span>
      </div>

      {value.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 p-5 text-sm text-slate-600">
          No specifications yet. Use one of the quick starts above, or add a group by hand. Every product can have its own groups
          and rows. Nothing is fixed.
        </div>
      )}

      <div className="space-y-4">
        {value.map((group, gi) => (
          <GroupCard
            key={group.k}
            group={group}
            index={gi}
            count={value.length}
            focusKey={focusKey}
            setFocusKey={setFocusKey}
            labelSuggestions={labelSuggestionsFor(group.group, suggestions)}
            onChange={(g) => setGroup(gi, g)}
            onMove={(d) => onChange(move(value, gi, gi + d))}
            onRemove={() => {
              const filled = group.rows.some((r) => r.value.trim());
              if (!filled || confirm(`Delete the “${group.group || "untitled"}” group and its rows?`)) onChange(value.filter((_, j) => j !== gi));
            }}
          />
        ))}
      </div>

      <Button
        className="mt-4"
        onClick={() => {
          const g = newGroup();
          onChange([...value, g]);
          setFocusKey(`group-${g.k}`);
        }}
      >
        <Icon d={ICON.plus} className="size-4" />
        Add group
      </Button>

      <datalist id="spec-groups">
        {Array.from(new Set([...(suggestions?.spec_groups ?? []), ...SPEC_TEMPLATES.flatMap((t) => t.groups.map((g) => g.group))])).map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>

      {dialog === "template" && (
        <TemplateDialog category={category} onClose={() => setDialog(null)} onApply={(groups) => merge(groups)} hasExisting={value.length > 0} />
      )}
      {dialog === "copy" && <CopyLayoutDialog currentId={currentId} onClose={() => setDialog(null)} onApply={merge} />}
      {dialog === "paste" && <PasteSpecsDialog onClose={() => setDialog(null)} onApply={merge} />}
    </div>
  );
}

function labelSuggestionsFor(groupName: string, suggestions: Suggestions | null): string[] {
  const fromDb = suggestions?.spec_labels?.[groupName] ?? [];
  const fromTemplates = SPEC_TEMPLATES.flatMap((t) => t.groups.filter((g) => g.group === groupName).flatMap((g) => g.labels));
  return Array.from(new Set([...fromDb, ...fromTemplates]));
}

function GroupCard({
  group,
  index,
  count,
  focusKey,
  setFocusKey,
  labelSuggestions,
  onChange,
  onMove,
  onRemove,
}: {
  group: DraftGroup;
  index: number;
  count: number;
  focusKey: string | null;
  setFocusKey: (k: string | null) => void;
  labelSuggestions: string[];
  onChange: (g: DraftGroup) => void;
  onMove: (d: number) => void;
  onRemove: () => void;
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (focusKey === `group-${group.k}`) titleRef.current?.focus();
  }, [focusKey, group.k]);

  const setRow = (i: number, r: DraftRow) => onChange({ ...group, rows: group.rows.map((x, j) => (j === i ? r : x)) });
  const addRow = (at = group.rows.length) => {
    const r = newRow();
    const rows = group.rows.slice();
    rows.splice(at, 0, r);
    onChange({ ...group, rows, collapsed: false });
    setFocusKey(`row-${r.k}`);
  };
  const filled = group.rows.filter((r) => r.value.trim() || r.note.trim()).length;
  const listId = `labels-${group.k}`;

  return (
    <section className="rounded-lg border border-slate-200 bg-white" aria-label={group.group || "Untitled group"}>
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <IconButton
          label={group.collapsed ? "Expand group" : "Collapse group"}
          icon={group.collapsed ? ICON.right : ICON.down}
          onClick={() => onChange({ ...group, collapsed: !group.collapsed })}
        />
        <TextInput
          ref={titleRef}
          value={group.group}
          onChange={(e) => onChange({ ...group, group: e.target.value })}
          placeholder="Group name, e.g. Physical Characteristics"
          aria-label="Group name"
          list="spec-groups"
          className="h-9 max-w-sm font-semibold"
        />
        <span className="ml-auto hidden text-xs text-slate-500 sm:inline">
          {filled}/{group.rows.length} filled
        </span>
        <IconButton label="Move group up" icon={ICON.up} disabled={index === 0} onClick={() => onMove(-1)} />
        <IconButton label="Move group down" icon={ICON.down} disabled={index === count - 1} onClick={() => onMove(1)} />
        <IconButton label="Delete group" icon={ICON.trash} tone="danger" onClick={onRemove} />
      </div>

      {!group.collapsed && (
        <div className="p-3">
          {group.rows.length > 0 && (
            <div className="mb-1 hidden grid-cols-[minmax(9rem,28%)_minmax(0,1fr)_auto] gap-2 px-1 text-[11px] font-semibold tracking-wider text-slate-500 uppercase md:grid">
              <span>Label</span>
              <span>Value (Enter = new line)</span>
              <span className="w-[8.5rem]" />
            </div>
          )}
          <ul className="space-y-2">
            {group.rows.map((row, ri) => (
              <RowEditor
                key={row.k}
                row={row}
                listId={listId}
                autoFocus={focusKey === `row-${row.k}`}
                canMoveUp={ri > 0}
                canMoveDown={ri < group.rows.length - 1}
                onChange={(r) => setRow(ri, r)}
                onMove={(d) => onChange({ ...group, rows: move(group.rows, ri, ri + d) })}
                onRemove={() => onChange({ ...group, rows: group.rows.filter((_, j) => j !== ri) })}
                onAddBelow={() => addRow(ri + 1)}
              />
            ))}
          </ul>
          <Button size="sm" className="mt-3" onClick={() => addRow()}>
            <Icon d={ICON.plus} className="size-3.5" />
            Add row
          </Button>
          <datalist id={listId}>
            {labelSuggestions.map((l) => (
              <option key={l} value={l} />
            ))}
          </datalist>
        </div>
      )}
    </section>
  );
}

function RowEditor({
  row,
  listId,
  autoFocus,
  canMoveUp,
  canMoveDown,
  onChange,
  onMove,
  onRemove,
  onAddBelow,
}: {
  row: DraftRow;
  listId: string;
  autoFocus: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChange: (r: DraftRow) => void;
  onMove: (d: number) => void;
  onRemove: () => void;
  onAddBelow: () => void;
}) {
  const labelRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) labelRef.current?.focus();
  }, [autoFocus]);
  const empty = !row.value.trim() && !row.note.trim();

  return (
    <li className={`grid gap-2 rounded-md md:grid-cols-[minmax(9rem,28%)_minmax(0,1fr)_auto] ${empty ? "opacity-80" : ""}`}>
      <input
        ref={labelRef}
        type="text"
        value={row.label}
        maxLength={120}
        list={listId}
        onChange={(e) => onChange({ ...row, label: e.target.value })}
        placeholder="Label"
        aria-label="Label"
        className={`h-10 font-medium ${inputClass}`}
      />
      <div className="min-w-0">
        <AutoTextarea
          value={row.value}
          maxLength={4000}
          onChange={(e) => onChange({ ...row, value: e.target.value })}
          onKeyDown={(e) => {
            // Ctrl/Cmd+Enter: add the next row straight away.
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              onAddBelow();
            }
          }}
          placeholder={empty ? "Value (left empty = not shown)" : "Value"}
          aria-label={`Value for ${row.label || "this row"}`}
        />
        {row.showNote && (
          <AutoTextarea
            value={row.note}
            maxLength={4000}
            onChange={(e) => onChange({ ...row, note: e.target.value })}
            placeholder="Small grey note under the value (e.g. imperial units, test standard)"
            aria-label={`Note for ${row.label || "this row"}`}
            className="mt-1.5 text-[13px] text-slate-600"
          />
        )}
      </div>
      <div className="flex items-start justify-end">
        <IconButton
          label={row.showNote ? "Remove note" : "Add a small note"}
          icon={ICON.note}
          className={row.showNote ? "bg-sky-50 text-[#0b1f45]" : ""}
          onClick={() => onChange({ ...row, showNote: !row.showNote, note: row.showNote ? "" : row.note })}
        />
        <IconButton label="Move row up" icon={ICON.up} disabled={!canMoveUp} onClick={() => onMove(-1)} />
        <IconButton label="Move row down" icon={ICON.down} disabled={!canMoveDown} onClick={() => onMove(1)} />
        <IconButton label="Delete row" icon={ICON.close} tone="danger" onClick={onRemove} />
      </div>
    </li>
  );
}

// ---------------------------------------------------------------- dialogs

function TemplateDialog({
  category,
  hasExisting,
  onClose,
  onApply,
}: {
  category: string;
  hasExisting: boolean;
  onClose: () => void;
  onApply: (groups: ParsedGroup[]) => void;
}) {
  const sorted = [...SPEC_TEMPLATES].sort((a, b) => Number(b.categories.includes(category)) - Number(a.categories.includes(category)));
  const [picked, setPicked] = useState(sorted[0].id);
  const tpl = SPEC_TEMPLATES.find((t) => t.id === picked)!;
  return (
    <Modal
      title="Start from a template"
      onClose={onClose}
      wide
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => onApply(tpl.groups.map((g) => ({ group: g.group, rows: g.labels.map((label) => ({ label, value: "", note: "" })) })))}
          >
            {hasExisting ? "Add missing groups & rows" : "Use this template"}
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-slate-600">
        Fills in group and row names only. Type the values you have, and leave the rest empty: empty rows are not saved or shown.
        {hasExisting && " Your existing rows are kept; only missing ones are added."}
      </p>
      <div className="grid gap-4 md:grid-cols-[14rem_1fr]">
        <ul className="space-y-1">
          {sorted.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setPicked(t.id)}
                className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  t.id === picked ? "bg-[#0b1f45] font-semibold text-white" : "text-neutral-700 hover:bg-slate-100"
                }`}
              >
                {t.label}
                {t.categories.includes(category) && (
                  <span className={`rounded-full px-1.5 text-[10px] font-semibold uppercase ${t.id === picked ? "bg-white/20" : "bg-slate-200 text-slate-600"}`}>
                    {categoryOf(category)?.label}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
        <div className="grid max-h-[50vh] gap-3 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
          {tpl.groups.map((g) => (
            <div key={g.group}>
              <p className="text-sm font-semibold text-neutral-950">{g.group}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">{g.labels.join(" · ")}</p>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function CopyLayoutDialog({
  currentId,
  onClose,
  onApply,
}: {
  currentId?: number;
  onClose: () => void;
  onApply: (groups: ParsedGroup[], replace: boolean) => void;
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<ProductSummary[]>([]);
  const [chosen, setChosen] = useState<number | null>(null);
  const [withValues, setWithValues] = useState(false);
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      adminApi
        .list({ q, per_page: 30 })
        .then((r) => !cancelled && setItems(r.items.filter((p) => p.id !== currentId)))
        .catch((e) => !cancelled && setError(e.message));
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, currentId]);

  const apply = async () => {
    if (chosen === null) return;
    setBusy(true);
    try {
      const p = await adminApi.get(chosen);
      if (!p.specs.length) {
        setError("That product has no specifications yet.");
        setBusy(false);
        return;
      }
      onApply(
        p.specs.map((g) => ({
          group: g.group,
          rows: g.rows.map((r) => (withValues ? { ...r } : { label: r.label, value: "", note: "" })),
        })),
        replace,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Copy the layout of another product"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={chosen === null || busy} onClick={apply}>
            {busy ? "Copying…" : "Copy"}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-slate-600">Best for a model similar to one you already listed (e.g. another handheld from the same brand).</p>
      <TextInput autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" aria-label="Search products" />
      <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto" role="listbox" aria-label="Products">
        {items.map((p) => (
          <li key={p.id} role="option" aria-selected={chosen === p.id}>
            <button
              type="button"
              onClick={() => setChosen(p.id)}
              className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                chosen === p.id ? "bg-[#0b1f45] text-white" : "hover:bg-slate-100"
              }`}
            >
              <span className="truncate font-semibold">{p.name}</span>
              <span className={`shrink-0 text-xs ${chosen === p.id ? "text-white/70" : "text-slate-500"}`}>{p.subcategory || categoryOf(p.category)?.label}</span>
            </button>
          </li>
        ))}
        {items.length === 0 && <li className="px-3 py-3 text-sm text-slate-500">No products found</li>}
      </ul>
      <div className="mt-4 space-y-2 text-sm text-neutral-800">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={withValues} onChange={(e) => setWithValues(e.target.checked)} className="size-4 accent-black" />
          Copy the values too (then edit what differs)
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="size-4 accent-black" />
          Replace this product&apos;s current specifications
        </label>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Modal>
  );
}

function PasteSpecsDialog({ onClose, onApply }: { onClose: () => void; onApply: (groups: ParsedGroup[], replace: boolean) => void }) {
  const [text, setText] = useState("");
  const [defaultGroup, setDefaultGroup] = useState("Specifications");
  const [replace, setReplace] = useState(false);
  const parsed = parseSpecText(text, defaultGroup.trim() || "Specifications");
  const rows = parsed.reduce((n, g) => n + g.rows.length, 0);

  return (
    <Modal
      title="Paste specifications"
      onClose={onClose}
      wide
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!rows} onClick={() => onApply(parsed, replace)}>
            Add {rows || ""} row{rows === 1 ? "" : "s"} in {parsed.length || ""} group{parsed.length === 1 ? "" : "s"}
          </Button>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-sm text-slate-600">
            Copy a spec table from a datasheet, a web page or Excel and paste it here. Recognised per line:
          </p>
          <ul className="mb-3 list-disc space-y-0.5 pl-5 text-xs text-slate-500">
            <li>
              <code>Label</code> ⇥ <code>Value</code> (table / spreadsheet copy)
            </li>
            <li>
              <code>Label: Value</code>, or label and value separated by 2+ spaces
            </li>
            <li>A short line on its own (e.g. <code>UHF RFID</code>) starts a new group</li>
            <li>Other lines continue the previous value</li>
          </ul>
          <AutoTextarea
            autoFocus
            minRows={12}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"UHF RFID\nEngine\tBased on Impinj E Series chips\nFrequency\t865-868 MHz / 920-925 MHz\nProtocol\tEPC C1 GEN2 / ISO18000-6C\n\nCamera\nFront Camera: 5MP\nRear Camera: 16MP Autofocus with flash"}
            aria-label="Specifications text"
            className="font-mono text-[13px]"
          />
          <label className="mt-3 block text-sm">
            <span className="font-semibold text-neutral-900">Group for rows before any heading</span>
            <TextInput value={defaultGroup} onChange={(e) => setDefaultGroup(e.target.value)} list="spec-groups" className="mt-1" />
          </label>
          <label className="mt-3 flex items-center gap-2 text-sm text-neutral-800">
            <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="size-4 accent-black" />
            Replace current specifications (otherwise added / merged by group name)
          </label>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-neutral-900">Preview</p>
          <div className="max-h-[55vh] space-y-3 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
            {parsed.length === 0 && <p className="text-sm text-slate-500">Paste text to see how it will be split.</p>}
            {parsed.map((g, i) => (
              <div key={i} className="overflow-hidden rounded-md border border-slate-200 bg-white">
                <p className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold">{g.group}</p>
                <dl className="divide-y divide-slate-100 text-xs">
                  {g.rows.map((r, j) => (
                    <div key={j} className="grid grid-cols-[38%_1fr] gap-2 px-3 py-1.5">
                      <dt className="font-semibold text-neutral-900">{r.label}</dt>
                      <dd className="whitespace-pre-wrap text-neutral-700">{r.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
