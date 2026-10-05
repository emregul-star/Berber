"use client";

/**
 * Galeri ızgarası + tıklayınca büyüyen görsel penceresi (lightbox).
 * Tarayıcının yerleşik <dialog> elemanı kullanılır: Esc ile kapanır, odak pencerede kalır.
 * Ok tuşlarıyla görseller arasında gezilebilir.
 */
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "./icons";

export type GalleryImage = { id: string; image_url: string; caption: string | null };

export function GalleryGrid({ images }: { images: GalleryImage[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Pencereyi state'e göre aç/kapat
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (openIndex !== null && !dialog.open) dialog.showModal();
    if (openIndex === null && dialog.open) dialog.close();
  }, [openIndex]);

  const show = useCallback(
    (step: number) => {
      setOpenIndex((current) =>
        current === null ? null : (current + step + images.length) % images.length,
      );
    },
    [images.length],
  );

  const altText = (image: GalleryImage, index: number) =>
    image.caption || `Galeri görseli ${index + 1}`;

  const current = openIndex !== null ? images[openIndex] : null;

  return (
    <>
      <ul className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
        {images.map((image, index) => (
          <li key={image.id}>
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              className="group relative block aspect-square w-full overflow-hidden rounded-xl bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              aria-label={`${altText(image, index)} — büyüt`}
            >
              <Image
                src={image.image_url}
                alt={altText(image, index)}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                className="object-cover transition duration-300 group-hover:scale-105"
              />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        aria-label="Galeri"
        onClose={() => setOpenIndex(null)}
        // Görselin dışına (karartılmış alana) tıklanınca kapan
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpenIndex(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") show(1);
          if (event.key === "ArrowLeft") show(-1);
        }}
        className="m-auto h-dvh max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-black/95"
      >
        {current && openIndex !== null && (
          <div className="flex h-full flex-col text-white">
            <div className="flex items-center justify-between p-3">
              <span className="text-sm text-white/70">
                {openIndex + 1} / {images.length}
              </span>
              <button
                type="button"
                onClick={() => setOpenIndex(null)}
                className="rounded-full p-2 text-2xl hover:bg-white/10"
                aria-label="Kapat"
              >
                <CloseIcon />
              </button>
            </div>

            <div
              className="relative min-h-0 flex-1"
              onClick={(event) => {
                if (event.target === event.currentTarget) setOpenIndex(null);
              }}
            >
              <Image
                key={current.id}
                src={current.image_url}
                alt={altText(current, openIndex)}
                fill
                sizes="100vw"
                className="object-contain"
              />
            </div>

            <div className="flex items-center justify-between gap-3 p-3">
              <button
                type="button"
                onClick={() => show(-1)}
                className="rounded-full p-3 text-2xl hover:bg-white/10"
                aria-label="Önceki görsel"
              >
                <ChevronLeftIcon />
              </button>
              <p className="min-w-0 flex-1 text-center text-sm text-white/85">{current.caption}</p>
              <button
                type="button"
                onClick={() => show(1)}
                className="rounded-full p-3 text-2xl hover:bg-white/10"
                aria-label="Sonraki görsel"
              >
                <ChevronRightIcon />
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
