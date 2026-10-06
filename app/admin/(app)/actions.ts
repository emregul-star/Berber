"use server";

/**
 * Süper yönetici işlemleri (Bölüm 11): yeni dükkan, abonelik, ödeme, askıya alma, şifre sıfırlama,
 * platform ayarları, demo sıfırlama. Her işlem önce requireAdmin() ile yetki kontrolü yapar.
 * Abonelik/ödeme/dükkan durumu yöneticinin kendi oturumuyla (RLS: yönetici yetkisi) yazılır;
 * Auth kullanıcısı ve dükkan oluşturma gibi işlemler secret key ile sunucuda yapılır.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { findOrCreateUser } from "@/lib/auth-users";
import { localDateOf } from "@/lib/availability";
import { advancePaidUntil, subscriptionStatusFor } from "@/lib/billing";
import { RESERVED_SUBDOMAINS, SLUG_PATTERN } from "@/lib/constants";
import { resetDemoShop } from "@/lib/demo";
import { isValidTrIban, normalizeIban } from "@/lib/iban";
import { generateTempPassword } from "@/lib/panel/passwords";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { THEME_PRESETS } from "@/lib/themes";

export type Result<T = object> = ({ ok: true; message: string } & T) | { ok: false; error: string };

const refresh = () => revalidatePath("/admin", "layout");

// ------------------------------------------------------------------ Slug uygunluğu
export async function checkSlugAction(slugInput: string): Promise<{ available: boolean; message: string }> {
  await requireAdmin();
  const slug = String(slugInput).trim().toLowerCase();
  if (!SLUG_PATTERN.test(slug)) {
    return { available: false, message: "Sadece küçük harf, rakam ve tire; tireyle başlayıp bitemez." };
  }
  if ((RESERVED_SUBDOMAINS as readonly string[]).includes(slug) || slug === "demo") {
    return { available: false, message: "Bu adres sistem tarafından kullanılıyor." };
  }
  const { data } = await createAdminClient().from("shops").select("id").eq("slug", slug).maybeSingle();
  return data ? { available: false, message: "Bu adres başka bir dükkana ait." } : { available: true, message: "Adres uygun." };
}

// ------------------------------------------------------------------ Yeni dükkan sihirbazı
const shopSchema = z.object({
  name: z.string().trim().min(2, "Dükkan adını yazın.").max(80),
  slug: z.string().trim().toLowerCase(),
  ownerEmail: z.email("Sahibin e-postasını yazın."),
  ownerName: z.string().trim().max(60).optional().or(z.literal("")),
  addOwnerAsBarber: z.boolean(),
  setupFee: z.coerce.number().min(0).max(1_000_000),
  monthlyFee: z.coerce.number().min(0).max(100_000),
  billingDay: z.coerce.number().int().min(1).max(28),
  theme: z.enum(Object.keys(THEME_PRESETS) as [string, ...string[]]),
  services: z
    .array(
      z.object({
        name: z.string().trim().min(2).max(80),
        duration: z.coerce.number().int().min(5).max(600),
        price: z.coerce.number().min(0).max(100_000),
      }),
    )
    .max(30),
});

export async function createShopAction(input: unknown): Promise<Result<{ shopId: string; slug: string; ownerEmail: string; tempPassword?: string }>> {
  const admin = await requireAdmin();
  const parsed = shopSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;

  const slugCheck = await checkSlugAction(d.slug);
  if (!slugCheck.available) return { ok: false, error: `Adres: ${slugCheck.message}` };
  if (d.addOwnerAsBarber && !d.ownerName) return { ok: false, error: "Sahip berber olarak eklenecekse adını yazın." };

  let owner;
  try {
    owner = await findOrCreateUser(d.ownerEmail);
  } catch {
    return { ok: false, error: "Sahip hesabı oluşturulamadı." };
  }

  const service = createAdminClient();
  const { data: shopId, error } = await service.rpc("create_shop_with_defaults", {
    p_slug: d.slug,
    p_name: d.name,
    p_theme: d.theme,
    p_owner_user_id: owner.userId,
    p_created_by: admin.userId,
    p_setup_fee: d.setupFee,
    p_monthly_fee: d.monthlyFee,
    p_billing_day: d.billingDay,
    p_services: d.services,
    p_first_barber_name: d.addOwnerAsBarber ? d.ownerName || "" : "",
  });

  if (error || !shopId) {
    // Dükkan oluşmadıysa bu işlem için yeni açılan hesabı geri al
    if (owner.created) await service.auth.admin.deleteUser(owner.userId);
    return { ok: false, error: error?.code === "23505" ? "Bu adres az önce alındı." : "Dükkan oluşturulamadı." };
  }

  refresh();
  return {
    ok: true,
    message: `${d.name} oluşturuldu.`,
    shopId,
    slug: d.slug,
    ownerEmail: d.ownerEmail.toLowerCase(),
    tempPassword: owner.tempPassword,
  };
}

// ------------------------------------------------------------------ Abonelik
const subscriptionSchema = z.object({
  shopId: z.uuid(),
  setupFee: z.coerce.number().min(0).max(1_000_000),
  monthlyFee: z.coerce.number().min(0).max(100_000),
  billingDay: z.coerce.number().int().min(1).max(28),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function updateSubscriptionAction(input: unknown): Promise<Result> {
  await requireAdmin();
  const parsed = subscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Değerleri kontrol edin." };
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("subscriptions")
    .update({ setup_fee: d.setupFee, monthly_fee: d.monthlyFee, billing_day: d.billingDay, notes: d.notes || null })
    .eq("shop_id", d.shopId);
  if (error) return { ok: false, error: "Abonelik kaydedilemedi." };
  refresh();
  return { ok: true, message: "Abonelik kaydedildi." };
}

// ------------------------------------------------------------------ Ödeme ekle
const paymentSchema = z
  .object({
    shopId: z.uuid(),
    amount: z.coerce.number().positive("Tutar sıfırdan büyük olmalı.").max(1_000_000),
    type: z.enum(["setup", "monthly"]),
    method: z.enum(["iban", "cash", "online"]),
    paidAt: z.iso.date("Ödeme tarihini seçin."),
    periodStart: z.iso.date().optional().or(z.literal("")),
    periodEnd: z.iso.date().optional().or(z.literal("")),
  })
  .refine((v) => v.type === "setup" || (v.periodStart && v.periodEnd && v.periodStart <= v.periodEnd), {
    message: "Aylık ödeme için dönem başlangıç ve bitişini seçin.",
  });

/** Ödemeyi kaydeder; aylık ödemede paid_until dönem sonuna ilerler ve durum güncellenir. */
export async function addPaymentAction(input: unknown): Promise<Result<{ paidUntil: string | null }>> {
  const admin = await requireAdmin();
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  const supabase = await createClient();

  const [{ data: sub }, { data: shop }] = await Promise.all([
    supabase.from("subscriptions").select("paid_until, status").eq("shop_id", d.shopId).maybeSingle(),
    supabase.from("shops").select("status").eq("id", d.shopId).maybeSingle(),
  ]);
  if (!sub || !shop) return { ok: false, error: "Dükkan aboneliği bulunamadı." };

  const isMonthly = d.type === "monthly";
  const { error } = await supabase.from("payments").insert({
    shop_id: d.shopId,
    amount: d.amount,
    type: d.type,
    method: d.method,
    period_start: isMonthly ? d.periodStart : null,
    period_end: isMonthly ? d.periodEnd : null,
    // Ödeme tarihi İstanbul saatiyle öğlen kaydedilir (gün kaymasın)
    paid_at: new Date(`${d.paidAt}T12:00:00+03:00`).toISOString(),
    recorded_by: admin.userId,
  });
  if (error) return { ok: false, error: "Ödeme kaydedilemedi." };

  const paidUntil = isMonthly ? advancePaidUntil(sub.paid_until, d.periodEnd || null) : sub.paid_until;
  // Askıdaki dükkanın durumu ödemeyle otomatik değişmez; "Aktif et" yöneticinin kararıdır
  const status = shop.status === "suspended" ? "suspended" : subscriptionStatusFor(paidUntil, localDateOf(new Date()));
  const { error: subError } = await supabase.from("subscriptions").update({ paid_until: paidUntil, status }).eq("shop_id", d.shopId);
  if (subError) return { ok: false, error: "Ödeme kaydedildi ama abonelik güncellenemedi. Sayfayı yenileyip kontrol edin." };

  refresh();
  return { ok: true, message: isMonthly ? "Ödeme kaydedildi; ödenmiş süre ilerletildi." : "Kurulum ödemesi kaydedildi.", paidUntil };
}

export async function deletePaymentAction(paymentId: string): Promise<Result> {
  await requireAdmin();
  if (!z.uuid().safeParse(paymentId).success) return { ok: false, error: "Geçersiz istek." };
  const supabase = await createClient();
  const { error } = await supabase.from("payments").delete().eq("id", paymentId);
  if (error) return { ok: false, error: "Ödeme silinemedi." };
  refresh();
  return { ok: true, message: "Ödeme kaydı silindi. Ödenmiş süre otomatik geri alınmaz; gerekirse aboneliği kontrol edin." };
}

// ------------------------------------------------------------------ Askıya al / aktif et
export async function setShopStatusAction(shopId: string, next: "suspended" | "active"): Promise<Result> {
  await requireAdmin();
  if (!z.uuid().safeParse(shopId).success || !["suspended", "active"].includes(next)) return { ok: false, error: "Geçersiz istek." };
  const supabase = await createClient();
  const { data: shop } = await supabase.from("shops").select("is_demo").eq("id", shopId).maybeSingle();
  if (!shop) return { ok: false, error: "Dükkan bulunamadı." };
  if (shop.is_demo) return { ok: false, error: "Demo dükkanın durumu değiştirilemez." };

  const { error } = await supabase.from("shops").update({ status: next }).eq("id", shopId);
  if (error) return { ok: false, error: "Durum değiştirilemedi." };

  const { data: sub } = await supabase.from("subscriptions").select("paid_until").eq("shop_id", shopId).maybeSingle();
  await supabase
    .from("subscriptions")
    .update({ status: next === "suspended" ? "suspended" : subscriptionStatusFor(sub?.paid_until ?? null, localDateOf(new Date())) })
    .eq("shop_id", shopId);

  refresh();
  return { ok: true, message: next === "suspended" ? "Dükkan askıya alındı. Müşteri sitesi hizmet dışı." : "Dükkan aktif edildi." };
}

// ------------------------------------------------------------------ Üye şifresi sıfırla (şifremi unuttum, ücretsiz yol)
export async function resetMemberPasswordAction(shopId: string, userId: string): Promise<Result<{ tempPassword: string }>> {
  await requireAdmin();
  if (!z.uuid().safeParse(shopId).success || !z.uuid().safeParse(userId).success) return { ok: false, error: "Geçersiz istek." };
  const supabase = await createClient();
  const { data: member } = await supabase.from("shop_members").select("role").eq("shop_id", shopId).eq("user_id", userId).maybeSingle();
  if (!member) return { ok: false, error: "Bu kullanıcı bu dükkanın üyesi değil." };
  const tempPassword = generateTempPassword();
  const { error } = await createAdminClient().auth.admin.updateUserById(userId, { password: tempPassword });
  if (error) return { ok: false, error: "Şifre değiştirilemedi." };
  return { ok: true, message: "Yeni geçici şifre oluşturuldu. Kullanıcıya iletin; ilk girişte değiştirmesi gerekir.", tempPassword };
}

// ------------------------------------------------------------------ Platform ayarları
const settingsSchema = z.object({
  iban: z.string().trim().max(40),
  accountHolder: z.string().trim().max(100),
  bankName: z.string().trim().max(60),
  paymentNote: z.string().trim().max(300),
});

export async function savePlatformSettingsAction(input: unknown): Promise<Result> {
  await requireAdmin();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Değerleri kontrol edin." };
  const d = parsed.data;
  if (d.iban && !isValidTrIban(d.iban)) return { ok: false, error: "IBAN geçersiz. TR ile başlayan 26 karakterli IBAN'ı kontrol edin." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("platform_settings")
    .update({
      iban: d.iban ? normalizeIban(d.iban) : null,
      account_holder: d.accountHolder || null,
      bank_name: d.bankName || null,
      payment_note: d.paymentNote || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) return { ok: false, error: "Ayarlar kaydedilemedi." };
  refresh();
  return { ok: true, message: "Platform ayarları kaydedildi." };
}

// ------------------------------------------------------------------ Demo sıfırla
export async function resetDemoAction(): Promise<Result> {
  await requireAdmin();
  try {
    const { linkedAccounts } = await resetDemoShop();
    refresh();
    return {
      ok: true,
      message: `Demo dükkan sıfırlandı.${linkedAccounts.length ? ` Bağlanan demo hesapları: ${linkedAccounts.join(", ")}.` : " (Demo hesapları .env.local'de tanımlı değil.)"}`,
    };
  } catch {
    return { ok: false, error: "Demo sıfırlanamadı." };
  }
}
