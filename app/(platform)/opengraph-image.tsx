/**
 * Platform tanıtım sayfasının paylaşım görseli (Open Graph, 1200x630). Derleme sırasında bir kez üretilir.
 */
import { ImageResponse } from "next/og";
import { PLATFORM_NAME } from "@/lib/constants";

export const alt = `${PLATFORM_NAME} — Berberler için online randevu sitesi`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background: "#0a0a0a",
          color: "#f5f5f5",
        }}
      >
        <div style={{ fontSize: 34, fontWeight: 700 }}>{PLATFORM_NAME}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 30, color: "#f59e0b", letterSpacing: 3 }}>BERBERLER İÇİN</div>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.1 }}>Uygulama gerektirmeyen online randevu sitesi</div>
        </div>
        <div style={{ fontSize: 30, color: "#a3a3a3" }}>Müşteri linkten 7/24 randevu alır · Siz panelden yönetirsiniz</div>
      </div>
    ),
    size,
  );
}
