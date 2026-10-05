"use server";

/**
 * Randevu oluşturma Server Action'ı.
 *
 * DİKKAT: Server Action'lara tarayıcı arayüzü olmadan doğrudan POST isteğiyle de ulaşılabilir.
 * Bu yüzden buradaki tüm kontroller (şema, honeypot, hız sınırı, telefon) zorunludur ve
 * tarayıcıda yapılan kontrollere güvenilmez.
 */
import { createBooking, countActiveBookingsForPhone, type CreateBookingResult } from "@/lib/booking";
import { bookingRequestSchema } from "@/lib/booking-schema";
import { BOOKING_LIMITS } from "@/lib/constants";
import { normalizeTrMobile } from "@/lib/phone";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { generateManageToken, hashManageToken } from "@/lib/tokens";

export async function submitBooking(slug: string, input: unknown): Promise<CreateBookingResult> {
  const parsed = bookingRequestSchema.safeParse(input);
  if (!parsed.success) {
    // Honeypot doluysa da buraya düşer; bota ayrıntı verilmez (sessizce reddedilir).
    return { ok: false, error: "Form bilgileri geçersiz. Lütfen kontrol edip tekrar deneyin.", code: "invalid" };
  }
  const data = parsed.data;

  // Hız sınırı: aynı IP'den kısa sürede çok fazla deneme
  const ip = await getClientIp();
  const { max, windowSeconds } = BOOKING_LIMITS.perIp;
  if (!(await checkRateLimit(`booking:ip:${ip}`, max, windowSeconds))) {
    return {
      ok: false,
      error: "Çok fazla deneme yaptınız. Lütfen birkaç dakika sonra tekrar deneyin veya dükkanı arayın.",
      code: "rate_limited",
    };
  }

  // Şema telefonu doğruladı; burada veritabanı biçimine (905xxxxxxxxx) çeviriyoruz.
  const phone = normalizeTrMobile(data.customerPhone)!;
  if ((await countActiveBookingsForPhone(slug, phone)) >= BOOKING_LIMITS.maxActivePerPhone) {
    return {
      ok: false,
      error: `Bu telefon numarasıyla zaten ${BOOKING_LIMITS.maxActivePerPhone} aktif randevunuz var. Yeni randevu için lütfen dükkanı arayın.`,
      code: "rate_limited",
    };
  }

  const manageToken = generateManageToken();

  return createBooking({
    slug,
    serviceId: data.serviceId,
    barberId: data.barberId,
    startsAt: new Date(data.startsAt),
    customerName: data.customerName,
    customerPhone: phone,
    customerEmail: data.customerEmail.toLowerCase(),
    customerNote: data.customerNote || null,
    manageToken,
    manageTokenHash: hashManageToken(manageToken),
  });
}
