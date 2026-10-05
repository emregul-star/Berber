/**
 * Randevu zaman hesapları — TEK YER (Bölüm 5.10, buffer kuralı).
 * Randevu oluşturma, saat değiştirme ve panelden elle ekleme hep bu fonksiyonu kullanmalı.
 */
import { addMinutes } from "date-fns";

export type AppointmentTimes = {
  startsAt: Date;
  /** Gerçek hizmet bitişi (müşteriye gösterilen) */
  endsAt: Date;
  /** endsAt + buffer: berberin bir sonraki randevuya hazır olduğu an; çakışma kontrolü buna göre */
  blockedUntil: Date;
};

export function computeAppointmentTimes(
  startsAt: Date,
  durationMinutes: number,
  bufferMinutes: number,
): AppointmentTimes {
  const endsAt = addMinutes(startsAt, durationMinutes);
  return { startsAt, endsAt, blockedUntil: addMinutes(endsAt, bufferMinutes) };
}

/** Müşteri sitesinde "aktif" sayılan (saati dolduran) randevu durumları */
export const ACTIVE_APPOINTMENT_STATUSES = ["pending", "confirmed"] as const;
