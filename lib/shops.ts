/**
 * Dükkan bilgisini okuma yardımcıları.
 */
import "server-only";
import { cache } from "react";
import { createAdminClient } from "./supabase/admin";
import { isValidSlug } from "./tenant";

export type ShopStatus = "active" | "suspended" | "demo";

export type Shop = {
  id: string;
  slug: string;
  name: string;
  status: ShopStatus;
  isDemo: boolean;
};

/**
 * Slug'a göre dükkanı getirir; yoksa null.
 *
 * Neden secret key (admin) istemcisi? RLS, askıdaki dükkanları ziyaretçiden gizler.
 * Biz ise askıdaki dükkan için "Dükkan bulunamadı" değil "geçici olarak hizmet dışı"
 * göstermek istiyoruz. Bu yüzden durumu sunucuda RLS'siz okuyoruz ve sadece
 * zararsız alanları (ad, slug, durum) döndürüyoruz.
 *
 * cache(): aynı istek içinde layout ve sayfa ayrı ayrı çağırsa bile sorgu bir kez çalışır.
 */
export const getShopBySlug = cache(async (slug: string): Promise<Shop | null> => {
  if (!isValidSlug(slug)) return null;

  const { data, error } = await createAdminClient()
    .from("shops")
    .select("id, slug, name, status, is_demo")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    // Veritabanı hatası kullanıcıya "bulunamadı" gibi görünmesin; hata sayfasına düşsün.
    throw new Error(`Dükkan okunamadı (${slug}): ${error.message}`);
  }
  if (!data) return null;

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    status: data.status as ShopStatus,
    isDemo: data.is_demo,
  };
});
