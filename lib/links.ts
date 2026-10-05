/**
 * Dükkan sahibinin girdiği linkleri güvenli şekilde kullanmak için yardımcılar.
 * Sahip panelden link girebildiği için bunları körü körüne sayfaya koymuyoruz.
 */
import { PLATFORM_DOMAIN } from "./constants";

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

/** Platformun ana sayfası (ör. https://berberplatform.com, yerelde http://localhost:3000) */
export function platformHomeUrl(): string {
  return `${isLocalPlatform() ? "http" : "https"}://${PLATFORM_DOMAIN}`;
}

/**
 * Dükkan sitesinin tam adresi (e-postalardaki linkler için).
 * Kendi alan adı varsa o kullanılır: https://kralberber.com, yoksa https://{slug}.PLATFORM_DOMAIN
 */
export function shopBaseUrl(slug: string, customDomain?: string | null): string {
  if (customDomain) return `https://${customDomain}`;
  return `${isLocalPlatform() ? "http" : "https"}://${slug}.${PLATFORM_DOMAIN}`;
}
