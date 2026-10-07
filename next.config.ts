import type { NextConfig } from "next";

// Supabase Storage'daki herkese açık görseller (logo, kapak, galeri) next/image ile
// optimize edilebilsin diye sadece bu projenin public storage yoluna izin veriyoruz.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * Tüm sayfalara eklenen güvenlik başlıkları:
 * - Sayfalar başka sitelerin içine (iframe) gömülemez: tıklama tuzağı (clickjacking) koruması
 * - Tarayıcı dosya türünü tahmin etmez (nosniff)
 * - Başka sitelere giden linklerde sadece alan adı paylaşılır (tam adres/token sızmaz)
 * - Kamera, mikrofon ve konum izinleri kapalı (sitenin bunlara ihtiyacı yok)
 * HTTPS zorunluluğu (HSTS) Vercel tarafından zaten ekleniyor.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    remotePatterns: supabaseUrl
      ? [new URL(`${supabaseUrl}/storage/v1/object/public/**`)]
      : [],
  },
};

export default nextConfig;
