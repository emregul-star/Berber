/**
 * Renk yardımcıları: okunabilirlik (kontrast) hesabı.
 * WCAG formülleri kullanılır: https://www.w3.org/TR/WCAG21/#contrast-minimum
 */

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function isHexColor(value: string | null | undefined): value is string {
  return typeof value === "string" && HEX_PATTERN.test(value);
}

/** "#c9a227" -> [201, 162, 39] */
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Rengin göreli parlaklığı (0 = siyah, 1 = beyaz). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** İki renk arasındaki kontrast oranı (1 ile 21 arası). Normal yazı için en az 4.5 önerilir. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la > lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

/** Verilen arka plan üzerinde siyah mı beyaz mı yazı daha okunaklı? */
export function readableTextOn(background: string): "#ffffff" | "#111111" {
  return contrastRatio(background, "#ffffff") >= contrastRatio(background, "#111111")
    ? "#ffffff"
    : "#111111";
}

/** Okunabilirlik eşiği (WCAG AA, normal boyutta yazı). Ayarlar sayfası bunun altında uyarı gösterir. */
export const MIN_CONTRAST_RATIO = 4.5;
