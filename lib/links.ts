/**
 * Dükkan sahibinin girdiği linkleri güvenli şekilde kullanmak için yardımcılar.
 * Sahip panelden link girebildiği için bunları körü körüne sayfaya koymuyoruz.
 */
import { PLATFORM_DOMAIN, SINGLE_DOMAIN_MODE } from "./constants";

/** "0216 555 00 00" -> "tel:02165550000" */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/** Sadece http(s) linklerine izin verir; "javascript:" gibi tehlikeli linkleri eler. */
export function safeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Google Haritalar gömme linki mi? Sayfaya iframe olarak konacağı için sadece
 * Google Haritalar adreslerine izin verilir (başka bir siteyi gömmek engellenir).
 * API anahtarı gerektirmeyen iki biçim desteklenir:
 *   https://www.google.com/maps/embed?pb=...        (Haritalar > Paylaş > Harita yerleştir)
 *   https://www.google.com/maps?q=...&output=embed
 */
export function safeGoogleMapsEmbedUrl(url: string | null | undefined): string | null {
  const safe = safeExternalUrl(url);
  if (!safe) return null;
  const parsed = new URL(safe);
  const hostOk = parsed.protocol === "https:" && ["www.google.com", "maps.google.com"].includes(parsed.hostname);
  const pathOk = parsed.pathname.startsWith("/maps");
  const isEmbed = parsed.pathname.startsWith("/maps/embed") || parsed.searchParams.get("output") === "embed";
  return hostOk && pathOk && isEmbed ? safe : null;
}

const isLocalPlatform = () => PLATFORM_DOMAIN.startsWith("localhost");

/** Platformun kök adresi, ör. https://berberplatform.com (metadataBase vb. için) */
export const platformOrigin = () => `${isLocalPlatform() ? "http" : "https"}://${PLATFORM_DOMAIN}`;

/**
 * Platformun ana sayfası (ör. https://berberplatform.com, yerelde http://localhost:3000).
 * Tek adres modunda "?shop=" eklenir: seçili dükkan çerezi silinsin, tanıtım sayfası açılsın.
 */
export function platformHomeUrl(): string {
  return SINGLE_DOMAIN_MODE ? `${platformOrigin()}/?shop=` : platformOrigin();
}

/**
 * Dükkan sitesinin tam adresi (e-postalardaki ve yönetici panelindeki linkler için).
 * Kendi alan adı varsa o kullanılır: https://kralberber.com, yoksa https://{slug}.PLATFORM_DOMAIN.
 * Tek adres modunda: https://PLATFORM_DOMAIN/?shop={slug}
 * Alt sayfa linki için shopUrl() veya withPath() kullanın (sona "/yol" eklemeyin).
 */
export function shopBaseUrl(slug: string, customDomain?: string | null): string {
  if (customDomain) return `https://${customDomain}`;
  if (SINGLE_DOMAIN_MODE) return `${platformOrigin()}/?shop=${encodeURIComponent(slug)}`;
  return `${isLocalPlatform() ? "http" : "https"}://${slug}.${PLATFORM_DOMAIN}`;
}

/**
 * Bir adresin yolunu değiştirir, sorgu kısmını korur:
 *   withPath("https://x.com", "/panel")             -> "https://x.com/panel"
 *   withPath("https://x.com/?shop=demo", "/panel")  -> "https://x.com/panel?shop=demo"
 */
export function withPath(baseUrl: string, path: string): string {
  const url = new URL(baseUrl);
  url.pathname = path;
  return url.toString();
}

/** Dükkan sitesindeki bir sayfanın tam adresi, ör. shopUrl("demo", "/randevu-al") */
export function shopUrl(slug: string, path: string, customDomain?: string | null): string {
  return withPath(shopBaseUrl(slug, customDomain), path);
}

/**
 * Süper yönetici panelindeki bir sayfanın uygulama içi yolu.
 * Alt alan adında (admin.PLATFORM_DOMAIN) "/dukkanlar", tek adres modunda "/admin/dukkanlar".
 */
export function adminPath(path: string): string {
  if (!SINGLE_DOMAIN_MODE) return path;
  return path === "/" ? "/admin" : `/admin${path}`;
}
