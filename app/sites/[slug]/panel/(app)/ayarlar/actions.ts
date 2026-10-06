"use server";

/**
 * Ayarlar (sadece sahip): dükkan bilgileri, görseller, tema, linkler, randevu kuralları.
 * Not: slug, durum (askı) ve özel alan adı sahip tarafından değiştirilemez (veritabanı trigger'ı da engeller).
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isHexColor } from "@/lib/color";
import { safeExternalUrl, safeGoogleMapsEmbedUrl } from "@/lib/links";
import { isOwnAssetUrl, ownStoragePath } from "@/lib/panel/assets";
import { requireOwner } from "@/lib/panel/auth";
import { normalizeTrPhoneAny } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";
import { isThemePresetName } from "@/lib/themes";

export type Result = { ok: true; message: string } | { ok: false; error: string };

const done = (message: string): Result => {
  revalidatePath("/sites/[slug]", "layout");
  return { ok: true, message };
};

const infoSchema = z.object({
  name: z.string().trim().min(2, "Dükkan adını yazın.").max(80),
  description: z.string().trim().max(300, "Tanıtım en fazla 300 karakter olabilir.").optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  whatsapp: z.string().trim().optional().or(z.literal("")),
  email: z.union([z.literal(""), z.email("Geçerli bir e-posta yazın.")]).optional(),
  address: z.string().trim().max(200).optional().or(z.literal("")),
});

export async function saveShopInfoAction(slug: string, input: unknown): Promise<Result> {
  const user = await requireOwner(slug);
  const parsed = infoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  const whatsapp = d.whatsapp ? normalizeTrPhoneAny(d.whatsapp) : null;
  if (d.whatsapp && !whatsapp) return { ok: false, error: "WhatsApp numarası geçersiz (ör. 0532 123 45 67)." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("shops")
    .update({
      name: d.name,
      description: d.description || null,
      phone: d.phone || null,
      whatsapp_number: whatsapp,
      email: d.email ? d.email.toLowerCase() : null,
      address: d.address || null,
    })
    .eq("id", user.shop.id);
  if (error) return { ok: false, error: "Bilgiler kaydedilemedi." };
  return done("Dükkan bilgileri kaydedildi.");
}

/** Logo veya kapak görseli: yeni adres (veya kaldırmak için null). Eski dosya Storage'dan silinir. */
export async function saveShopImageAction(slug: string, kind: "logo" | "cover", url: string | null): Promise<Result> {
  const user = await requireOwner(slug);
  if (kind !== "logo" && kind !== "cover") return { ok: false, error: "Geçersiz istek." };
  if (url !== null && !isOwnAssetUrl(user, String(url))) return { ok: false, error: "Geçersiz görsel adresi." };
  const column = kind === "logo" ? "logo_url" : "cover_image_url";

  const supabase = await createClient();
  const { data: current } = await supabase.from("shops").select("logo_url, cover_image_url").eq("id", user.shop.id).single();
  const { error } = await supabase
    .from("shops")
    .update(kind === "logo" ? { logo_url: url } : { cover_image_url: url })
    .eq("id", user.shop.id);
  if (error) return { ok: false, error: "Görsel kaydedilemedi." };

  const old = current?.[column];
  const oldPath = old ? ownStoragePath(user, old) : null;
  if (oldPath && old !== url) await supabase.storage.from("shop-assets").remove([oldPath]);
  return done(url ? "Görsel kaydedildi." : "Görsel kaldırıldı.");
}

export async function saveThemeAction(slug: string, input: unknown): Promise<Result> {
  const user = await requireOwner(slug);
  const parsed = z
    .object({ preset: z.string(), primary: z.string().nullable(), accent: z.string().nullable() })
    .safeParse(input);
  if (!parsed.success || !isThemePresetName(parsed.data.preset)) return { ok: false, error: "Geçersiz tema." };
  const { preset, primary, accent } = parsed.data;
  if ((primary && !isHexColor(primary)) || (accent && !isHexColor(accent))) return { ok: false, error: "Geçersiz renk." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("shops")
    .update({ theme_preset: preset, primary_color: primary, accent_color: accent })
    .eq("id", user.shop.id);
  if (error) return { ok: false, error: "Tema kaydedilemedi." };
  return done("Tema kaydedildi. Müşteri sitesinde hemen görünür.");
}

/** Google Haritalar'dan kopyalanan iframe kodunun tamamı yapıştırılırsa içinden adresi çıkarır */
function extractIframeSrc(value: string): string {
  const match = value.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  return (match ? match[1] : value).trim().replace(/&amp;/g, "&");
}

export async function saveLinksAction(slug: string, input: unknown): Promise<Result> {
  const user = await requireOwner(slug);
  const parsed = z
    .object({ mapsEmbed: z.string().max(4000), googleReviews: z.string().max(500), instagram: z.string().max(300) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Geçersiz istek." };
  const d = parsed.data;

  const maps = d.mapsEmbed.trim() ? safeGoogleMapsEmbedUrl(extractIframeSrc(d.mapsEmbed)) : null;
  if (d.mapsEmbed.trim() && !maps) {
    return { ok: false, error: "Harita linki geçersiz. Google Haritalar > Paylaş > Harita yerleştir'den kopyalanan kodu yapıştırın." };
  }
  const reviews = d.googleReviews.trim() ? safeExternalUrl(d.googleReviews.trim()) : null;
  if (d.googleReviews.trim() && !reviews) return { ok: false, error: "Google yorumları linki geçersiz (https:// ile başlamalı)." };
  const instagram = d.instagram.trim() ? safeExternalUrl(d.instagram.trim()) : null;
  if (d.instagram.trim() && !instagram) return { ok: false, error: "Instagram linki geçersiz (https:// ile başlamalı)." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("shops")
    .update({ google_maps_embed_url: maps, google_reviews_url: reviews, instagram_url: instagram })
    .eq("id", user.shop.id);
  if (error) return { ok: false, error: "Linkler kaydedilemedi." };
  return done("Linkler kaydedildi.");
}

const rulesSchema = z.object({
  slotIntervalMinutes: z.coerce.number().int().min(5).max(120),
  minNoticeMinutes: z.coerce.number().int().min(0).max(10080),
  maxAdvanceDays: z.coerce.number().int().min(1).max(365),
  cancelDeadlineMinutes: z.coerce.number().int().min(0).max(10080),
  bufferMinutes: z.coerce.number().int().min(0).max(120),
  requiresApproval: z.boolean(),
  allowAnyBarber: z.boolean(),
});

export async function saveBookingRulesAction(slug: string, input: unknown): Promise<Result> {
  const user = await requireOwner(slug);
  const parsed = rulesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Değerleri kontrol edin (izin verilen aralıkların dışında)." };
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("shop_settings")
    .update({
      slot_interval_minutes: d.slotIntervalMinutes,
      min_notice_minutes: d.minNoticeMinutes,
      max_advance_days: d.maxAdvanceDays,
      cancel_deadline_minutes: d.cancelDeadlineMinutes,
      buffer_minutes: d.bufferMinutes,
      requires_approval: d.requiresApproval,
      allow_any_barber: d.allowAnyBarber,
    })
    .eq("shop_id", user.shop.id);
  if (error) return { ok: false, error: "Randevu kuralları kaydedilemedi." };
  return done("Randevu kuralları kaydedildi. Yeni kurallar sonraki randevularda geçerli olur.");
}
