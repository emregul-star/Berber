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

/** Geliştirme modunda ?shop=slug ile seçilen dükkanın hatırlandığı çerez. */
export const DEV_SHOP_COOKIE = "dev_shop";
