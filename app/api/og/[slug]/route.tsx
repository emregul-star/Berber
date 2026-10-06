/**
 * Dükkan sitesinin paylaşım görseli (Open Graph, 1200x630): GET /api/og/{slug}
 * WhatsApp, Instagram, Facebook vb. linki paylaşınca çıkan önizleme kartında kullanılır.
 * Dükkanın tema renkleriyle, adı ve kısa açıklamasıyla sunucuda çizilir (next/og, ücretsiz).
 *
 * Dosya-tabanlı opengraph-image yerine /api altında: dükkan adresleri proxy'de yeniden
 * yazıldığı için /api yolu her host'ta aynı kalır.
 */
import { ImageResponse } from "next/og";
import { PLATFORM_NAME } from "@/lib/constants";
import { getShopSiteData } from "@/lib/site-data";
import { resolveTheme } from "@/lib/themes";
import { isValidSlug } from "@/lib/tenant";

const truncate = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

export async function GET(_request: Request, { params }: RouteContext<"/api/og/[slug]">) {
  const { slug } = await params;
  const data = isValidSlug(slug) ? await getShopSiteData(slug) : null;
  if (!data || data.shop.status === "suspended") return new Response("Bulunamadı", { status: 404 });

  const { shop } = data;
  const theme = resolveTheme(shop.theme_preset, shop.primary_color, shop.accent_color);
  const description = truncate(shop.description ?? "Online randevu alın, sıra beklemeyin.", 110);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: theme.bg,
          color: theme.text,
          borderLeft: `24px solid ${theme.primary}`,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 30, color: theme.muted, letterSpacing: 2 }}>BERBER · ONLINE RANDEVU</div>
          <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.05 }}>{truncate(shop.name, 40)}</div>
          <div style={{ fontSize: 36, color: theme.muted, lineHeight: 1.3 }}>{description}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              display: "flex",
              padding: "18px 36px",
              borderRadius: 16,
              background: theme.primary,
              color: theme.onPrimary,
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            Randevu al
          </div>
          <div style={{ fontSize: 26, color: theme.muted }}>{PLATFORM_NAME}</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      // Dükkan adı/renkleri değişebilir: bir gün önbellekte kalsın
      headers: { "cache-control": "public, max-age=3600, s-maxage=86400" },
    },
  );
}
