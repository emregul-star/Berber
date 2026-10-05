/**
 * Dükkanın müşteri sitesinde gösterilen tüm veriyi okur.
 * Ziyaretçi (anon) rolüyle okunur; RLS sadece aktif/demo dükkanların, aktif hizmet ve
 * berberlerin, görünür yorumların gelmesini garanti eder.
 */
import "server-only";
import { cache } from "react";
import { createPublicClient } from "./supabase/public";

// anon rolü shops tablosunda sadece bu kolonları okuyabilir ("select *" çalışmaz).
// Tek parça metin olmalı ki Supabase dönen verinin tipini otomatik çıkarabilsin.
const SHOP_PUBLIC_COLUMNS =
  "id, slug, name, description, phone, whatsapp_number, address, google_maps_embed_url, google_reviews_url, instagram_url, logo_url, cover_image_url, theme_preset, primary_color, accent_color, status, is_demo";

export type OpeningHoursRow = {
  weekday: number;
  isClosed: boolean;
  start: string | null;
  end: string | null;
  breakStart: string | null;
  breakEnd: string | null;
};

export const getShopSiteData = cache(async (slug: string) => {
  const supabase = createPublicClient();

  const { data: shop, error: shopError } = await supabase
    .from("shops")
    .select(SHOP_PUBLIC_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (shopError) throw new Error(`Dükkan okunamadı: ${shopError.message}`);
  if (!shop) return null;

  // Geri kalan sorgular birbirinden bağımsız; aynı anda çalıştırılır.
  const [services, barbers, gallery, testimonials, hours] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, description, duration_minutes, price")
      .eq("shop_id", shop.id)
      .order("sort_order")
      .order("name"),
    supabase
      .from("barbers")
      .select("id, name, title, photo_url, bio")
      .eq("shop_id", shop.id)
      .order("sort_order")
      .order("name"),
    supabase
      .from("gallery_images")
      .select("id, image_url, caption")
      .eq("shop_id", shop.id)
      .order("sort_order"),
    supabase
      .from("testimonials")
      .select("id, author_name, rating, content, source")
      .eq("shop_id", shop.id)
      .order("sort_order"),
    supabase
      .from("working_hours")
      .select("weekday, start_time, end_time, break_start, break_end, is_closed")
      .eq("shop_id", shop.id)
      .is("barber_id", null)
      .order("weekday"),
  ]);

  for (const result of [services, barbers, gallery, testimonials, hours]) {
    if (result.error) throw new Error(`Dükkan verisi okunamadı: ${result.error.message}`);
  }

  // Haftanın 7 günü için satır üret; kaydı olmayan gün "Kapalı" sayılır.
  const openingHours: OpeningHoursRow[] = Array.from({ length: 7 }, (_, weekday) => {
    const row = hours.data?.find((h) => h.weekday === weekday);
    return {
      weekday,
      isClosed: !row || row.is_closed,
      start: row?.start_time ?? null,
      end: row?.end_time ?? null,
      breakStart: row?.break_start ?? null,
      breakEnd: row?.break_end ?? null,
    };
  });

  return {
    shop,
    services: services.data ?? [],
    barbers: barbers.data ?? [],
    gallery: gallery.data ?? [],
    testimonials: testimonials.data ?? [],
    openingHours,
  };
});

export type ShopSiteData = NonNullable<Awaited<ReturnType<typeof getShopSiteData>>>;
export type ShopPublic = ShopSiteData["shop"];
