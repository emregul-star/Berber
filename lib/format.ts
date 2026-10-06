/**
 * Ekranda gösterilen değerlerin Türkçe biçimlendirmesi (para, süre, saat).
 */

const priceFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** 350 -> "₺350", 349.5 -> "₺349,5" */
export function formatPrice(value: number | string): string {
  return priceFormatter.format(Number(value));
}

/** 30 -> "30 dk", 90 -> "1 sa 30 dk", 120 -> "2 sa" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} sa` : `${hours} sa ${rest} dk`;
}

/** Veritabanındaki "09:00:00" -> "09:00" */
export function formatTimeOfDay(time: string | null): string {
  return time ? time.slice(0, 5) : "";
}

/** 0 = Pazartesi ... 6 = Pazar (veritabanındaki weekday ile aynı sıra) */
export const WEEKDAY_NAMES = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
] as const;

/** Grafiklerde kısa gün adları (Pazartesi/Pazar ve Cuma/Cumartesi karışmasın) */
export const WEEKDAY_SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"] as const;

/** "Ahmet Yılmaz" -> "AY" (fotoğrafı olmayan berberler için avatar) */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR"))
    .join("");
}
