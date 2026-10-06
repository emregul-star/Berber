/**
 * Platform genelindeki sabitler.
 * Platform adı, alan adı ve ayarlanabilir limitler kodun içine dağıtılmaz; hep buradan okunur.
 */

/** Platformun görünen adı. İleride değişecek; .env ile ezilebilir. */
export const PLATFORM_NAME = process.env.NEXT_PUBLIC_PLATFORM_NAME || "BerberPlatform";

/**
 * Platformun ana alan adı (port dahil olabilir).
 * Yerelde "localhost:3000", yayında ör. "berberplatform.com".
 */
export const PLATFORM_DOMAIN = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || "localhost:3000";

/** Tüm tarih/saat hesaplarında kullanılan saat dilimi. */
export const TIME_ZONE = "Europe/Istanbul";

/** Süper yönetici panelinin alt alan adı: admin.PLATFORM_DOMAIN */
export const ADMIN_SUBDOMAIN = "admin";

/**
 * Dükkan slug'ı olarak kullanılamayacak alt alan adları.
 * Yeni dükkan sihirbazındaki uygunluk kontrolü de bu listeyi kullanır.
 */
export const RESERVED_SUBDOMAINS = [
  ADMIN_SUBDOMAIN,
  "www",
  "api",
  "app",
  "panel",
  "mail",
  "smtp",
  "ftp",
  "static",
  "assets",
  "cdn",
  "blog",
  "destek",
  "yardim",
] as const;

/**
 * Geçerli slug: küçük harf, rakam ve tire; tireyle başlayıp bitemez; en fazla 63 karakter
 * (bir alt alan adı etiketinin DNS sınırı).
 */
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * KVKK: Tamamlanmış/iptal randevulardaki müşteri iletişim bilgileri kaç ay sonra
 * anonimleştirilir (Bölüm 7.5). KVKK aydınlatma metninde de bu süre yazar.
 */
export const DATA_RETENTION_MONTHS = 24;

/**
 * Randevu formu spam koruması (Bölüm 6.5). Değerler buradan ayarlanabilir.
 */
export const BOOKING_LIMITS = {
  /** Aynı IP adresinden bu süre içinde en fazla bu kadar randevu denemesi */
  perIp: { max: 5, windowSeconds: 10 * 60 },
  /** Aynı telefon numarasının aynı dükkanda aynı anda en fazla bu kadar aktif (gelecek) randevusu olabilir */
  maxActivePerPhone: 3,
} as const;

/**
 * Supabase Auth e-postaları (şifre sıfırlama) açık mı?
 * Supabase'in yerleşik e-posta servisi sadece proje ekibine ve saatte 2 e-posta gönderir.
 * Alan adı alınıp Supabase'e özel SMTP (ör. Resend) tanımlanınca "true" yapılır.
 * Kapalıyken "Şifremi unuttum" sayfası kullanıcıyı yöneticiye yönlendirir.
 */
export const AUTH_EMAILS_ENABLED = process.env.AUTH_EMAILS_ENABLED === "true";

/** Panelde "yardım" için gösterilen platform destek WhatsApp numarası (905xxxxxxxxx, isteğe bağlı) */
export const PLATFORM_SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_PLATFORM_SUPPORT_WHATSAPP || "";

/** Panel girişinde IP başına deneme sınırı (kaba kuvvet saldırılarına karşı) */
export const LOGIN_LIMITS = { perIp: { max: 10, windowSeconds: 10 * 60 } } as const;

/**
 * Ödemesi bu kadar günden fazla geciken dükkan, süper yönetici panosunda "askıya alınmalı"
 * olarak işaretlenir (Bölüm 11.2). Otomatik askıya alma YOKTUR; karar yöneticinindir.
 */
export const SUSPEND_SUGGEST_AFTER_DAYS = 7;

/** Yeni dükkan sihirbazındaki varsayılan hizmetler (sihirbazda düzenlenebilir) — Bölüm 11.1 */
export const DEFAULT_SERVICES = [
  { name: "Saç Kesimi", duration: 30, price: 350 },
  { name: "Sakal Tıraşı", duration: 20, price: 200 },
  { name: "Saç + Sakal", duration: 45, price: 500 },
  { name: "Çocuk Tıraşı", duration: 20, price: 250 },
] as const;

/** Geliştirme modunda ?shop=slug ile seçilen dükkanın hatırlandığı çerez. */
export const DEV_SHOP_COOKIE = "dev_shop";
