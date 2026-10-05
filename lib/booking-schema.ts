/**
 * Randevu formu doğrulama şeması — hem tarayıcıda (anında hata mesajı) hem sunucuda
 * (asıl güvenlik kontrolü) aynı kurallar kullanılır. Sunucu, tarayıcıdan geleni asla
 * doğrudan kabul etmez; bu şemayla yeniden doğrular.
 */
import { z } from "zod";
import { normalizeTrMobile } from "./phone";

/** "Fark etmez" seçeneği için berber değeri */
export const ANY_BARBER = "any";

export const customerInfoSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(3, "Lütfen adınızı ve soyadınızı yazın.")
    .max(80, "Ad soyad en fazla 80 karakter olabilir."),
  customerPhone: z
    .string()
    .trim()
    .refine((value) => normalizeTrMobile(value) !== null, "Geçerli bir cep telefonu numarası yazın (ör. 0532 123 45 67)."),
  customerEmail: z
    .string()
    .trim()
    .max(120, "E-posta adresi çok uzun.")
    .pipe(z.email("Geçerli bir e-posta adresi yazın.")),
  customerNote: z.string().trim().max(500, "Not en fazla 500 karakter olabilir.").optional().or(z.literal("")),
  kvkkConsent: z.literal(true, "Devam etmek için KVKK aydınlatma metnini onaylamalısınız."),
  /** Honeypot: gerçek kullanıcılar bu alanı görmez ve boş bırakır. Doluysa bottur. */
  website: z.string().max(0).optional().or(z.literal("")),
});

export type CustomerInfo = z.infer<typeof customerInfoSchema>;

export const bookingRequestSchema = customerInfoSchema.extend({
  serviceId: z.uuid(),
  /** Berber id'si veya "any" (Fark etmez) */
  barberId: z.union([z.uuid(), z.literal(ANY_BARBER)]),
  /** Seçilen başlangıç anı (ISO, UTC) */
  startsAt: z.iso.datetime(),
});

export type BookingRequest = z.infer<typeof bookingRequestSchema>;

export const slotsQuerySchema = z.object({
  serviceId: z.uuid(),
  barberId: z.union([z.uuid(), z.literal(ANY_BARBER)]),
  date: z.iso.date(),
});
