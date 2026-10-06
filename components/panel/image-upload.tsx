"use client";

/**
 * Görsel yükleme: dosya seç -> tarayıcıda küçült (WebP) -> Supabase Storage'a yükle -> adres döndür.
 * Yükleme kullanıcının kendi oturumuyla yapılır; storage kuralları sadece dükkan sahibinin kendi
 * dükkan klasörüne ({shopId}/...) yazmasına izin verir.
 */
import { useId, useState } from "react";
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_BYTES, resizeImage } from "@/lib/image-resize";
import { createClient } from "@/lib/supabase/client";

export const SHOP_ASSETS_BUCKET = "shop-assets";

export function ImageUpload({
  shopId,
  folder,
  maxSize = 1600,
  label = "Görsel seç",
  multiple = false,
  onUploaded,
}: {
  shopId: string;
  /** Dükkan klasörü altındaki alt klasör: "gallery", "barbers", "logo", "cover" */
  folder: string;
  /** Küçültme sonrası en uzun kenar (piksel) */
  maxSize?: number;
  label?: string;
  multiple?: boolean;
  onUploaded: (publicUrl: string) => void | Promise<void>;
}) {
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setBusy(true);
    const supabase = createClient();
    try {
      for (const file of Array.from(files)) {
        if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) throw new Error(`"${file.name}" desteklenmeyen bir dosya türü.`);
        if (file.size > MAX_UPLOAD_BYTES * 3) throw new Error(`"${file.name}" çok büyük (en fazla 15 MB seçilebilir).`);
        const blob = await resizeImage(file, maxSize);
        if (blob.size > MAX_UPLOAD_BYTES) throw new Error(`"${file.name}" küçültüldükten sonra bile 5 MB'tan büyük.`);

        const path = `${shopId}/${folder}/${crypto.randomUUID()}.webp`;
        const { error: uploadError } = await supabase.storage
          .from(SHOP_ASSETS_BUCKET)
          .upload(path, blob, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
        if (uploadError) throw new Error("Yükleme başarısız. Bu işlem için yetkiniz olmayabilir.");

        const { data } = supabase.storage.from(SHOP_ASSETS_BUCKET).getPublicUrl(path);
        await onUploaded(data.publicUrl);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yükleme başarısız.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label
        htmlFor={inputId}
        className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-neutral-400 bg-white px-4 py-2.5 text-sm font-semibold hover:border-neutral-900 ${
          busy ? "pointer-events-none opacity-60" : ""
        }`}
      >
        {busy ? "Yükleniyor…" : label}
      </label>
      <input
        id={inputId}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        multiple={multiple}
        className="sr-only"
        disabled={busy}
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
