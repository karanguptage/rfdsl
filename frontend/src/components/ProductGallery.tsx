"use client";

import Image from "next/image";
import { useState } from "react";
import { ImagePlaceholder } from "@/components/ProductPanel";
import { isRemoteImage } from "@/lib/catalog";

// Product page photos: a large image with a row of thumbnails underneath.
// Click a thumbnail (or use the arrow keys on the large image) to switch.
export default function ProductGallery({ images, name, icon }: { images: string[]; name: string; icon?: string }) {
  const [index, setIndex] = useState(0);
  const current = images[Math.min(index, images.length - 1)];
  const step = (d: number) => setIndex((i) => (i + d + images.length) % images.length);

  return (
    <div>
      <div
        tabIndex={images.length > 1 ? 0 : undefined}
        role={images.length > 1 ? "group" : undefined}
        aria-roledescription={images.length > 1 ? "image gallery" : undefined}
        aria-label={images.length > 1 ? `${name} photos, ${index + 1} of ${images.length} (use the arrow keys)` : undefined}
        onKeyDown={(e) => {
          if (images.length < 2) return;
          if (e.key === "ArrowRight") step(1);
          else if (e.key === "ArrowLeft") step(-1);
          else return;
          e.preventDefault();
        }}
        className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-white outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
      >
        {current ? (
          <Image
            key={current}
            src={current}
            alt={index === 0 ? name : `${name}, photo ${index + 1}`}
            fill
            preload
            unoptimized={isRemoteImage(current)}
            sizes="(min-width: 1536px) 620px, (min-width: 1024px) 40vw, 100vw"
            className="object-contain p-[6%] transition-opacity duration-300 starting:opacity-0"
          />
        ) : (
          <ImagePlaceholder icon={icon} />
        )}
        {images.length > 1 && (
          <>
            <GalleryArrow prev onClick={() => step(-1)} />
            <GalleryArrow onClick={() => step(1)} />
          </>
        )}
      </div>

      {images.length > 1 && (
        <ul className="mt-4 flex flex-wrap gap-2.5" aria-label="Choose a photo">
          {images.map((src, i) => (
            <li key={src + i}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index || undefined}
                className={`relative block size-16 cursor-pointer overflow-hidden rounded-md border bg-white transition outline-none focus-visible:ring-2 focus-visible:ring-sky-400 sm:size-[72px] ${
                  i === index ? "border-[#0b1f45] ring-2 ring-[#0b1f45]/15" : "border-slate-200 opacity-75 hover:border-slate-400 hover:opacity-100"
                }`}
              >
                <Image src={src} alt="" fill sizes="72px" unoptimized={isRemoteImage(src)} className="object-contain p-1" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GalleryArrow({ prev = false, onClick }: { prev?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={onClick}
      aria-label={prev ? "Previous photo" : "Next photo"}
      className={`absolute top-1/2 flex size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-[#0b1f45] opacity-0 shadow-[0_8px_24px_-8px_rgb(11_31_69/0.5)] ring-1 ring-slate-200 backdrop-blur-sm transition duration-200 group-hover:opacity-100 hover:bg-[#0b1f45] hover:text-white max-lg:opacity-100 ${
        prev ? "left-3" : "right-3"
      }`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" className="size-5">
        <path d={prev ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
      </svg>
    </button>
  );
}
