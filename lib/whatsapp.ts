/**
 * WhatsApp linkleri ve hazır mesaj şablonları (Bölüm 10.3).
 * Ücretsiz, link tabanlı: https://wa.me/{numara}?text={mesaj}
 * Tüm mesaj şablonları bu dosyada toplanır.
 */

/** numara: uluslararası format, başında + olmadan (905xxxxxxxxx) */
export function whatsappLink(phone: string, message?: string): string {
  const digits = phone.replace(/\D/g, "");
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export const whatsappTemplates = {
  /** Müşteri sitesindeki genel WhatsApp butonu */
  generalInquiry: (shopName: string) =>
    `Merhaba ${shopName}, randevu hakkında bilgi almak istiyorum.`,
};
