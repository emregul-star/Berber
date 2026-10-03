/**
 * Gelen isteğin host bilgisinden hangi "kiracıya" (platform, süper yönetici veya dükkan)
 * ait olduğunu bulan saf fonksiyonlar. Proxy (proxy.ts) bunları kullanır.
 * Saf oldukları için (veritabanı/ağ yok) birim testleriyle kolayca denenebilirler.
 */
import { ADMIN_SUBDOMAIN, SLUG_PATTERN } from "./constants";

export type TenantRoute =
  /** Platformun tanıtım sayfası (ana alan adı veya www) */
  | { kind: "platform" }
  /** Süper yönetici paneli (admin.PLATFORM_DOMAIN) */
  | { kind: "admin" }
  /** Bir dükkanın sitesi ({slug}.PLATFORM_DOMAIN) */
  | { kind: "shop"; slug: string }
  /** Platform alan adına ait olmayan bir host: dükkanın kendi alan adı olabilir */
  | { kind: "custom-domain"; hostname: string };

/** "Demo.LocalHost:3000" -> "demo.localhost" (port ve sondaki nokta atılır, küçük harfe çevrilir) */
export function normalizeHostname(host: string): string {
  return host.trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
}

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}

/**
 * Host'u kiracıya çevirir.
 * @param host İsteğin Host başlığı (ör. "demo.localhost:3000")
 * @param platformDomain NEXT_PUBLIC_PLATFORM_DOMAIN (ör. "localhost:3000" veya "berberplatform.com")
 */
export function resolveTenant(host: string, platformDomain: string): TenantRoute {
  const hostname = normalizeHostname(host);
  const root = normalizeHostname(platformDomain);

  if (hostname === root || hostname === `www.${root}`) {
    return { kind: "platform" };
  }

  // Vercel'in önizleme adresleri (proje-xxx.vercel.app) platform sayfası gibi davranır.
  if (hostname.endsWith(".vercel.app")) {
    return { kind: "platform" };
  }

  if (hostname.endsWith(`.${root}`)) {
    const subdomain = hostname.slice(0, -(root.length + 1));
    if (subdomain === ADMIN_SUBDOMAIN) return { kind: "admin" };
    // Geçersiz slug'lar (ör. "a.b") da "shop" olarak döner; dükkan sorgusu bunları
    // bulamayacağı için "Dükkan bulunamadı" sayfası gösterilir.
    return { kind: "shop", slug: subdomain };
  }

  return { kind: "custom-domain", hostname };
}
