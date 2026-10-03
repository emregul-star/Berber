/**
 * Dükkan bilgisini okuma yardımcıları.
 *
 * AŞAMA 1 GEÇİCİ: Veritabanı tabloları Aşama 2'de oluşturulacak. O zamana kadar
 * yönlendirmeyi test edebilmek için sadece "demo" dükkanını içeren sabit bir liste
 * kullanılıyor. Aşama 2'de bu fonksiyonların içi Supabase sorgusuyla değiştirilecek;
 * fonksiyon imzaları aynı kalacağı için onları kullanan sayfalar değişmeyecek.
 */
import "server-only";
import { cache } from "react";
import { isValidSlug } from "./tenant";

export type ShopStatus = "active" | "suspended" | "demo";

export type Shop = {
  slug: string;
  name: string;
  status: ShopStatus;
};

// TODO(Aşama 2): Supabase'deki shops tablosuyla değiştirilecek.
const TEMP_SHOPS: Shop[] = [{ slug: "demo", name: "Demo Berber", status: "demo" }];

/**
 * Slug'a göre dükkanı getirir; yoksa null.
 * cache(): aynı istek içinde layout ve sayfa ayrı ayrı çağırsa bile sorgu bir kez çalışır.
 */
export const getShopBySlug = cache(async (slug: string): Promise<Shop | null> => {
  if (!isValidSlug(slug)) return null;
  return TEMP_SHOPS.find((shop) => shop.slug === slug) ?? null;
});
