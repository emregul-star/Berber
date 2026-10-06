/**
 * Türkiye IBAN doğrulama (TR + 24 hane, ISO 13616 mod-97 kontrol hanesi).
 * Yanlış yazılmış bir IBAN dükkan sahiplerinin yanlış hesaba para göndermesine yol açabileceği için
 * sadece biçim değil kontrol hanesi de doğrulanır.
 */

/** "tr12 0006 ..." -> "TR120006..." (boşlukları atar, büyük harf) */
export function normalizeIban(input: string): string {
  return input.replace(/\s+/g, "").toUpperCase();
}

export function isValidTrIban(input: string): boolean {
  const iban = normalizeIban(input);
  if (!/^TR\d{24}$/.test(iban)) return false;
  // İlk 4 karakter sona alınır, harfler sayıya çevrilir (A=10 ... Z=35), mod 97 = 1 olmalı
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const digits = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let remainder = 0;
  for (const ch of digits) remainder = (remainder * 10 + Number(ch)) % 97;
  return remainder === 1;
}

/** Ekranda okunur biçim: "TR12 0006 1234 ..." */
export function formatIban(iban: string): string {
  return normalizeIban(iban).replace(/(.{4})/g, "$1 ").trim();
}
