"use server";

/**
 * Galeri yönetimi (sadece sahip): görsel ekle, açıklama düzenle, sil. Sıralama ortak reorderAction ile.
 * Görsel dosyası tarayıcıdan doğrudan Storage'a yüklenir; burada sadece adresi kaydedilir.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isOwnAssetUrl, ownStoragePath } from "@/lib/panel/assets";
import { requireOwner } from "@/lib/panel/auth";
import { createClient } from "@/lib/supabase/server";

export type Result = { ok: true; message: string } | { ok: false; error: string };

export async function addGalleryImageAction(slug: string, url: string): Promise<Result> {
  const user = await requireOwner(slug);
  if (!isOwnAssetUrl(user, String(url))) return { ok: false, error: "Geçersiz görsel adresi." };
  const supabase = await createClient();
  const { count } = await supabase.from("gallery_images").select("id", { count: "exact", head: true }).eq("shop_id", user.shop.id);
  const { error } = await supabase
    .from("gallery_images")
    .insert({ shop_id: user.shop.id, image_url: url, sort_order: (count ?? 0) + 1 });
  if (error) return { ok: false, error: "Görsel kaydedilemedi." };
  revalidatePath("/sites/[slug]", "layout");
  return { ok: true, message: "Görsel eklendi." };
}

export async function updateCaptionAction(slug: string, id: string, caption: string): Promise<Result> {
  const user = await requireOwner(slug);
  const parsed = z.object({ id: z.uuid(), caption: z.string().trim().max(120) }).safeParse({ id, caption });
  if (!parsed.success) return { ok: false, error: "Açıklama en fazla 120 karakter olabilir." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("gallery_images")
    .update({ caption: parsed.data.caption || null })
    .eq("id", parsed.data.id)
    .eq("shop_id", user.shop.id);
  if (error) return { ok: false, error: "Açıklama kaydedilemedi." };
  revalidatePath("/sites/[slug]", "layout");
  return { ok: true, message: "Açıklama kaydedildi." };
}

export async function deleteGalleryImageAction(slug: string, id: string): Promise<Result> {
  const user = await requireOwner(slug);
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Geçersiz istek." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gallery_images")
    .delete()
    .eq("id", id)
    .eq("shop_id", user.shop.id)
    .select("image_url")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Görsel silinemedi." };

  // Dosyayı da Storage'dan sil (sadece dükkanın kendi klasöründeyse; demo yer tutucuları dokunulmaz)
  const path = ownStoragePath(user, data.image_url);
  if (path) await supabase.storage.from("shop-assets").remove([path]);

  revalidatePath("/sites/[slug]", "layout");
  return { ok: true, message: "Görsel silindi." };
}
