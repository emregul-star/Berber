"use server";

/**
 * İzin / kapalı zaman ekleme ve silme (Bölüm 8.1, 5.9).
 * Sahip: tüm dükkan veya herhangi bir berber; berber: sadece kendisi (RLS de bunu zorunlu kılar).
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ACTIVE_APPOINTMENT_STATUSES } from "@/lib/appointments";
import { addDaysToDate, zonedDateTime } from "@/lib/availability";
import { canManageBarber, requirePanelUser } from "@/lib/panel/auth";
import { createClient } from "@/lib/supabase/server";

export type Result = { ok: true; message: string; warning?: string } | { ok: false; error: string };

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const schema = z.object({
  barberId: z.union([z.uuid(), z.literal("")]),
  startDate: z.iso.date("Başlangıç tarihi seçin."),
  endDate: z.iso.date("Bitiş tarihi seçin."),
  allDay: z.boolean(),
  startTime: time.optional().or(z.literal("")),
  endTime: time.optional().or(z.literal("")),
  reason: z.string().trim().max(200).optional().or(z.literal("")),
});

export async function addTimeOffAction(slug: string, input: unknown): Promise<Result> {
  const user = await requirePanelUser(slug);
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  const barberId = d.barberId || null;

  if (barberId === null && user.role !== "owner") return { ok: false, error: "Tüm dükkanı sadece sahip kapatabilir." };
  if (!canManageBarber(user, barberId)) return { ok: false, error: "Sadece kendiniz için izin ekleyebilirsiniz." };

  // Tüm gün: başlangıç gününün 00:00'ından bitiş gününün ertesi 00:00'ına kadar
  const startsAt = zonedDateTime(d.startDate, d.allDay ? "00:00" : d.startTime || "00:00");
  const endsAt = d.allDay ? zonedDateTime(addDaysToDate(d.endDate, 1), "00:00") : zonedDateTime(d.endDate, d.endTime || "00:00");
  if (endsAt <= startsAt) return { ok: false, error: "Bitiş, başlangıçtan sonra olmalı." };

  const supabase = await createClient();
  const { error } = await supabase.from("time_off").insert({
    shop_id: user.shop.id,
    barber_id: barberId,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    reason: d.reason || null,
  });
  if (error) return { ok: false, error: "İzin kaydedilemedi." };

  // Bu aralıkta zaten alınmış randevular var mı? (izin onları otomatik iptal etmez)
  let overlap = supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", user.shop.id)
    .in("status", [...ACTIVE_APPOINTMENT_STATUSES])
    .lt("starts_at", endsAt.toISOString())
    .gt("ends_at", startsAt.toISOString());
  if (barberId) overlap = overlap.eq("barber_id", barberId);
  const { count } = await overlap;

  revalidatePath("/sites/[slug]", "layout");
  return {
    ok: true,
    message: "İzin eklendi. Bu aralıkta artık randevu alınamaz.",
    warning: count ? `Dikkat: bu aralıkta daha önce alınmış ${count} randevu var. Takvimden kontrol edip gerekirse iptal edin.` : undefined,
  };
}

export async function deleteTimeOffAction(slug: string, id: string): Promise<Result> {
  const user = await requirePanelUser(slug);
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Geçersiz istek." };
  const supabase = await createClient();
  // RLS: berber sadece kendi iznini silebilir; silinen satır yoksa yetki yok demektir
  const { data, error } = await supabase.from("time_off").delete().eq("id", id).eq("shop_id", user.shop.id).select("id");
  if (error || !data?.length) return { ok: false, error: "İzin silinemedi." };
  revalidatePath("/sites/[slug]", "layout");
  return { ok: true, message: "İzin silindi." };
}
