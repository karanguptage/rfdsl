"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { isRemoteImage } from "@/lib/catalog";
import { adminApi, ApiError } from "./api";
import { Button, Icon, ICON, IconButton, move, TextInput } from "./ui";

// Product photos: drop files (or click to choose), reorder, remove. The first
// photo is the cover used on the list panels. Existing site images can be
// added by path (e.g. /products/C5.jpg) or full URL.
export default function ImagesEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [url, setUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (files: File[]) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) {
      setError("Please choose image files (JPG, PNG, WebP or GIF).");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await adminApi.upload(images);
      onChange([...value, ...res.map((r) => r.url)]);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const addUrl = () => {
    const u = url.trim();
    if (!u) return;
    if (!/^(\/(?!\/)|https?:\/\/)/i.test(u)) {
      setError("Use a site path starting with / or a full https:// address.");
      return;
    }
    onChange([...value, u]);
    setUrl("");
    setError("");
  };

  return (
    <div>
      {value.length > 0 && (
        <ul className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {value.map((src, i) => (
            <li key={src + i} className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="relative aspect-square">
                <Image src={src} alt="" fill sizes="200px" unoptimized={isRemoteImage(src)} className="object-contain p-3" />
              </div>
              {i === 0 ? (
                <span className="absolute top-2 left-2 rounded-full bg-black px-2 py-0.5 text-[11px] font-semibold text-white">Cover</span>
              ) : (
                <button
                  type="button"
                  onClick={() => onChange(move(value, i, 0))}
                  className="absolute top-2 left-2 cursor-pointer rounded-full border border-slate-200 bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-slate-600 opacity-0 transition group-hover:opacity-100 hover:text-black focus-visible:opacity-100"
                >
                  Make cover
                </button>
              )}
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-1.5 py-1">
                <div className="flex">
                  <IconButton label="Move left" icon={ICON.left} disabled={i === 0} onClick={() => onChange(move(value, i, i - 1))} />
                  <IconButton label="Move right" icon={ICON.right} disabled={i === value.length - 1} onClick={() => onChange(move(value, i, i + 1))} />
                </div>
                <IconButton label="Remove photo" icon={ICON.trash} tone="danger" onClick={() => onChange(value.filter((_, j) => j !== i))} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          upload(Array.from(e.dataTransfer.files));
        }}
        onClick={() => !busy && fileRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), fileRef.current?.click())}
        role="button"
        tabIndex={0}
        aria-label="Upload photos"
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
          dragOver ? "border-[#0b1f45] bg-sky-50" : "border-slate-300 bg-slate-50/60 hover:border-slate-400"
        }`}
      >
        <Icon d={ICON.upload} className={`size-7 ${busy ? "animate-bounce text-[#0b1f45]" : "text-slate-400"}`} />
        <p className="mt-2 text-sm font-semibold text-neutral-900">{busy ? "Uploading…" : "Drop photos here or click to choose"}</p>
        <p className="mt-1 text-xs text-slate-500">JPG, PNG, WebP or GIF · several at once · large photos are resized to 2000px</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          hidden
          onChange={(e) => {
            upload(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>

      <div className="mt-3 flex gap-2">
        <TextInput
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUrl())}
          placeholder="…or add an existing image: /products/C5.jpg or https://…"
          aria-label="Image path or URL"
        />
        <Button onClick={addUrl} disabled={!url.trim()}>
          Add
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
