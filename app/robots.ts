/**
 * robots.txt — her host'ta (platform, dükkan alt alan adları) aynı içerik sunulur
 * (proxy /robots.txt'yi yeniden yazmaz). Paneller, kişiye özel randevu sayfaları ve cron uç
 * noktaları arama motorlarına kapalıdır; paylaşım görselleri (/api/og) açıktır.
 */
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/panel", "/admin", "/randevu/", "/api/cron/"] },
  };
}
