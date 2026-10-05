"use server";

/**
 * Müşterinin randevu yönetimi Server Action'ları (iptal, saat değiştirme).
 * Yetki = yönetim linkindeki token; tüm kurallar lib/manage.ts içinde sunucuda kontrol edilir.
 */
import { z } from "zod";
import { cancelByToken, rescheduleByToken, type ManageResult } from "@/lib/manage";

export async function cancelAppointmentAction(slug: string, token: string): Promise<ManageResult> {
  return cancelByToken(String(slug), String(token));
}

const startsAtSchema = z.iso.datetime();

export async function rescheduleAppointmentAction(
  slug: string,
  token: string,
  startsAt: string,
): Promise<ManageResult> {
  const parsed = startsAtSchema.safeParse(startsAt);
  if (!parsed.success) return { ok: false, error: "Geçersiz saat." };
  return rescheduleByToken(String(slug), String(token), new Date(parsed.data));
}
