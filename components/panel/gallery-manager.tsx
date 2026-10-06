"use client";

/**
 * Galeri sayfası: görsel yükle (çoklu, tarayıcıda küçültülür), açıklama, sıralama, silme.
 */
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  addGalleryImageAction,
  deleteGalleryImageAction,
  updateCaptionAction,
  type Result,
} from "@/app/sites/[slug]/panel/(app)/galeri/actions";
import { ImageUpload } from "./image-upload";
import { SortableList } from "./sortable-list";
import { Button, EmptyState, inputClass, Notice } from "./ui";

type Item = { id: string; image_url: string; caption: string | null };

function CaptionEditor({ slug, item, onResult }: { slug: string; item: Item; onResult: (r: Result) => void }) {
  const [value, setValue] = useState(item.caption ?? "");
  const [pending, startTransition] = useTransition();
  const dirty = value !== (item.caption ?? "");
  return (
    <div className="flex gap-2">
      <label className="sr-only" htmlFor={`cap-${item.id}`}>
        Açıklama
      </label>
      <input
        id={`cap-${item.id}`}
        value={value}
        maxLength={120}
        placeholder="Açıklama (isteğe bağlı)"
        onChange={(e) => setValue(e.target.value)}
        className={`${inputClass} mt-0 py-1.5 text-sm`}
      />
      {dirty && (
        <Button size="sm" disabled={pending} onClick={() => startTransition(async () => onResult(await updateCaptionAction(slug, item.id, value)))}>
          Kaydet
        </Button>
      )}
    </div>
  );
}

export function GalleryManager({ slug, shopId, items }: { slug: string; shopId: string; items: Item[] }) {
  const router = useRouter();
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

  const handle = (r: Result) => {
    setResult(r);
    if (r.ok) router.refresh();
  };

  return (
    <div className="grid gap-4">
      {result && <Notice tone={result.ok ? "success" : "error"}>{result.ok ? result.message : result.error}</Notice>}
      <ImageUpload
        shopId={shopId}
        folder="gallery"
        multiple
        label="+ Görsel yükle (birden fazla seçebilirsiniz)"
        onUploaded={async (url) => handle(await addGalleryImageAction(slug, url))}
      />
      <p className="text-xs text-neutral-500">Görseller yüklemeden önce otomatik küçültülür. Dükkandan 6-10 güzel fotoğraf yeterli.</p>

      {items.length === 0 ? (
        <EmptyState>Galeride görsel yok.</EmptyState>
      ) : (
        <SortableList
          slug={slug}
          table="gallery_images"
          items={items}
          renderItem={(item) => (
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                <Image src={item.image_url} alt={item.caption ?? ""} fill sizes="80px" className="object-cover" />
              </div>
              <div className="min-w-48 flex-1">
                <CaptionEditor slug={slug} item={item} onResult={handle} />
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => {
                  if (confirm("Bu görseli silmek istiyor musunuz?")) startTransition(async () => handle(await deleteGalleryImageAction(slug, item.id)));
                }}
              >
                Sil
              </Button>
            </div>
          )}
        />
      )}
    </div>
  );
}
