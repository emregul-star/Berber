/**
 * Türkiye cep telefonu doğrulama ve normalleştirme (Bölüm 6.5).
 * Veritabanında her zaman "905xxxxxxxxx" (12 hane, + olmadan) saklanır.
 */

/**
 * Kabul edilen yazımlar: "0532 123 45 67", "532 123 4567", "+90 (532) 123-45-67", "905321234567"
 * Geçersizse null döner. Sadece cep numaraları (5xx) kabul edilir; müşteriye WhatsApp/SMS
 * ile ulaşılabilmesi için.
 */
export function normalizeTrMobile(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("0090")) digits = digits.slice(4);
  else if (digits.startsWith("90") && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);

  // Kalan: 10 hane, 5 ile başlamalı (5xx xxx xx xx)
  if (!/^5\d{9}$/.test(digits)) return null;
  return `90${digits}`;
}

/**
 * Panelden elle girilen numaralar için: cep (5xx) veya sabit hat (2xx, 3xx, 4xx) kabul eder.
 * Geçersizse null; geçerliyse "90xxxxxxxxxx".
 */
export function normalizeTrPhoneAny(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("0090")) digits = digits.slice(4);
  else if (digits.startsWith("90") && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  if (!/^[2-5]\d{9}$/.test(digits)) return null;
  return `90${digits}`;
}

/** "905321234567" -> "0532 123 45 67" (ekranda göstermek için) */
export function formatTrPhone(normalized: string): string {
  const d = normalized.replace(/^90/, "");
  if (d.length !== 10) return normalized;
  return `0${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}`;
}
