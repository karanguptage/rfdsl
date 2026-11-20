"use client";

import { useState } from "react";
import { LINK_KINDS } from "@/lib/catalog";
import { adminApi, ApiError } from "./api";
import { newLink, type DraftLink } from "./draft";
import { Button, Icon, ICON, IconButton, inputClass, move, TextInput } from "./ui";

// Downloads & links: datasheets / manuals / brochures (upload a PDF) or any
// link (video, online demo, vendor page). A "Datasheet" also gets its own
// button next to "Enquire" on the product page.
export default function LinksEditor({ value, onChange }: { value: DraftLink[]; onChange: (v: DraftLink[]) => void }) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const setLink = (i: number, l: DraftLink) => onChange(value.map((x, j) => (j === i ? l : x)));

  const upload = async (i: number, file: File) => {
    setBusyKey(value[i].k);
    setError("");
    try {
      const [res] = await adminApi.upload([file]);
      setLink(i, { ...value[i], url: res.url, label: value[i].label || file.name.replace(/\.[^.]+$/, "") });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Upload failed");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div>
      {value.length > 0 && (
        <ul className="mb-3 space-y-2">
          {value.map((link, i) => (
            <li key={link.k} className="grid gap-2 rounded-lg border border-slate-200 bg-white p-2.5 md:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1.4fr)_auto]">
              <select
                value={link.kind}
                onChange={(e) => setLink(i, { ...link, kind: e.target.value })}
                aria-label="Type"
                className={`h-10 cursor-pointer ${inputClass}`}
              >
                {LINK_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
              <TextInput value={link.label} onChange={(e) => setLink(i, { ...link, label: e.target.value })} placeholder="Label, e.g. MC51 Datasheet" aria-label="Label" />
              <div className="flex gap-2">
                <TextInput value={link.url} onChange={(e) => setLink(i, { ...link, url: e.target.value })} placeholder="https://… or upload a PDF" aria-label="Address" />
                <label
                  className={`inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-neutral-900 transition-colors hover:border-slate-400 hover:bg-slate-50 ${
                    busyKey === link.k ? "pointer-events-none opacity-60" : ""
                  }`}
                >
                  <Icon d={ICON.upload} className="size-4" />
                  {busyKey === link.k ? "Uploading…" : "PDF"}
                  <input
                    type="file"
                    accept="application/pdf"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) upload(i, f);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              <div className="flex items-center justify-end">
                <IconButton label="Move up" icon={ICON.up} disabled={i === 0} onClick={() => onChange(move(value, i, i - 1))} />
                <IconButton label="Move down" icon={ICON.down} disabled={i === value.length - 1} onClick={() => onChange(move(value, i, i + 1))} />
                <IconButton label="Remove" icon={ICON.trash} tone="danger" onClick={() => onChange(value.filter((_, j) => j !== i))} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onChange([...value, newLink("datasheet")])}>
          <Icon d={ICON.plus} className="size-3.5" />
          Datasheet
        </Button>
        <Button size="sm" onClick={() => onChange([...value, newLink("manual")])}>
          <Icon d={ICON.plus} className="size-3.5" />
          Manual
        </Button>
        <Button size="sm" onClick={() => onChange([...value, newLink("video")])}>
          <Icon d={ICON.plus} className="size-3.5" />
          Video
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onChange([...value, newLink("link")])}>
          <Icon d={ICON.plus} className="size-3.5" />
          Other link
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
