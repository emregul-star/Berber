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

  // ---- Panelden müşteriye (Bölüm 10.3) ----
  /** Randevu hatırlatma */
  reminder: (b: { customerName: string; shopName: string; whenLabel: string; serviceName: string }) =>
    `Merhaba ${b.customerName}, ${b.shopName} olarak ${b.whenLabel} tarihli ${b.serviceName} randevunuzu hatırlatmak isteriz. Görüşmek üzere!`,

  /** Randevu onayı */
  confirmation: (b: { customerName: string; shopName: string; whenLabel: string }) =>
    `Merhaba ${b.customerName}, ${b.whenLabel} tarihli randevunuz ${b.shopName} tarafından onaylandı. Sizi bekliyoruz!`,

  /** Dükkan iptali */
  cancellation: (b: { customerName: string; shopName: string; whenLabel: string; reason?: string | null }) =>
    `Merhaba ${b.customerName}, üzgünüz, ${b.whenLabel} tarihli randevunuzu iptal etmek zorunda kaldık.` +
    (b.reason ? ` Sebep: ${b.reason}.` : "") +
    ` Yeni bir randevu için bize yazabilirsiniz. — ${b.shopName}`,

  /** Randevu onay ekranı: "WhatsApp'tan dükkana bildir" */
  bookingNotice: (b: { customerName: string; serviceName: string; barberName: string; whenLabel: string }) =>
    `Merhaba, online randevu aldım.\n` +
    `Ad Soyad: ${b.customerName}\n` +
    `Hizmet: ${b.serviceName}\n` +
    `Berber: ${b.barberName}\n` +
    `Tarih: ${b.whenLabel}`,
};
