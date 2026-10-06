"use server";

/**
 * Panel randevu işlemleri: onayla, iptal et, geldi/tamamlandı, gelmedi, elle randevu ekle.
 * Kullanıcının kendi oturumuyla (RLS) yazılır: berber sadece kendi randevusunu değiştirebilir,
 * ve veritabanı trigger'ı berberin durum dışındaki alanları değiştirmesini engeller.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { computeAppointmentTimes } from "@/lib/appointments";
import { zonedDateTime } from "@/lib/availability";
import { normalizeTrPhoneAny } from "@/lib/phone";
import { notifyAppointmentEvent } from "@/lib/notifications";
import { canManageBarber, requirePanelUser } from "@/lib/panel/auth";
import { createClient } from "@/lib/supabase/server";
import { generateManageToken, hashManageToken } from "@/lib/tokens";

export type ActionResult = { ok: true; message?: string; id?: string } | { ok: false; error: string };

/** Hangi durumdan hangisine geçilebilir */
const TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled_by_shop"],
  confirmed: ["completed", "no_show", "cancelled_by_shop"],
  completed: ["no_show"], // yanlış işaretlemeyi düzeltmek için
  no_show: ["completed"],
};

const statusSchema = z.object({
  id: z.uuid(),
  status: z.enum(["confirmed", "cancelled_by_shop", "completed", "no_show"]),
  reason: z.string().trim().max(300).optional(),
});

export async function setAppointmentStatusAction(slug: string, input: unknown): Promise<ActionResult> {
  const user = await requirePanelUser(slug);
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Geçersiz istek." };
  const { id, status, reason } = parsed.data;

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("appointments")
    .select("status, barber_id, starts_at")
    .eq("id", id)
    .eq("shop_id", user.shop.id)
    .maybeSingle();
  if (!current || !canManageBarber(user, current.barber_id)) return { ok: false, error: "Randevu bulunamadı." };
  if (!TRANSITIONS[current.status]?.includes(status)) {
    return { ok: false, error: "Bu randevunun durumu artık değiştirilemez. Sayfayı yenileyin." };
  }
  if ((status === "completed" || status === "no_show") && new Date(current.starts_at) > new Date()) {
    return { ok: false, error: "Henüz zamanı gelmemiş bir randevu 'geldi' veya 'gelmedi' olarak işaretlenemez." };
  }

  const { data: updated, error } = await supabase
    .from("appointments")
    .update({
      status,
      ...(status === "cancelled_by_shop" ? { cancelled_at: new Date().toISOString(), cancel_reason: reason || null } : {}),
    })
    .eq("id", id)
    .eq("status", current.status) // aynı anda başka biri değiştirdiyse üzerine yazma
    .select("id");
  if (error) return { ok: false, error: "Kaydedilemedi. Lütfen tekrar deneyin." };
  if (!updated?.length) return { ok: false, error: "Randevu bu sırada değişmiş. Sayfayı yenileyin." };

  if (status === "confirmed") notifyAppointmentEvent({ type: "confirmed", appointmentId: id });
  if (status === "cancelled_by_shop") notifyAppointmentEvent({ type: "cancelled", appointmentId: id, cancelledBy: "shop" });

  revalidatePath("/sites/[slug]/panel", "layout");
  const messages: Record<string, string> = {
    confirmed: "Randevu onaylandı.",
    cancelled_by_shop: "Randevu iptal edildi.",
    completed: "Randevu tamamlandı olarak işaretlendi.",
    no_show: "Müşteri gelmedi olarak işaretlendi.",
  };
  return { ok: true, message: messages[status] };
}

const manualSchema = z.object({
  barberId: z.uuid("Berber seçin."),
  serviceId: z.uuid("Hizmet seçin."),
  date: z.iso.date("Tarih seçin."),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Saat seçin."),
  customerName: z.string().trim().min(2, "Müşteri adını yazın.").max(80),
  customerPhone: z.string().trim().refine((v) => normalizeTrPhoneAny(v) !== null, "Geçerli bir telefon numarası yazın."),
  customerEmail: z.union([z.literal(""), z.email("Geçerli bir e-posta yazın.")]).optional(),
  customerNote: z.string().trim().max(500).optional(),
});

/** Telefonla gelen randevuyu panelden eklemek (source = panel) */
export async function createManualAppointmentAction(slug: string, input: unknown): Promise<ActionResult> {
  const user = await requirePanelUser(slug);
  const parsed = manualSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const data = parsed.data;
  if (!canManageBarber(user, data.barberId)) return { ok: false, error: "Sadece kendi adınıza randevu ekleyebilirsiniz." };

  const supabase = await createClient();
  const [{ data: service }, { data: settings }] = await Promise.all([
    supabase.from("services").select("id, duration_minutes, price").eq("id", data.serviceId).eq("shop_id", user.shop.id).maybeSingle(),
    supabase.from("shop_settings").select("buffer_minutes").eq("shop_id", user.shop.id).maybeSingle(),
  ]);
  if (!service) return { ok: false, error: "Hizmet bulunamadı." };

  const startsAt = zonedDateTime(data.date, data.time);
  const times = computeAppointmentTimes(startsAt, service.duration_minutes, settings?.buffer_minutes ?? 0);
  const token = generateManageToken();

  const { data: inserted, error } = await supabase
    .from("appointments")
    .insert({
      shop_id: user.shop.id,
      barber_id: data.barberId,
      service_id: service.id,
      starts_at: times.startsAt.toISOString(),
      ends_at: times.endsAt.toISOString(),
      blocked_until: times.blockedUntil.toISOString(),
      status: "confirmed",
      customer_name: data.customerName,
      customer_phone: normalizeTrPhoneAny(data.customerPhone)!,
      customer_email: data.customerEmail ? data.customerEmail.toLowerCase() : null,
      customer_note: data.customerNote || null,
      price_at_booking: service.price,
      manage_token_hash: hashManageToken(token),
      source: "panel",
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23P01") return { ok: false, error: "Bu berberin bu saatte başka bir randevusu var." };
    if (error.code === "23503") return { ok: false, error: "Seçilen berber veya hizmet bu dükkana ait değil." };
    return { ok: false, error: "Randevu kaydedilemedi. Lütfen tekrar deneyin." };
  }

  // Müşterinin e-postası varsa ona da randevu özeti ve yönetim linki gider
  if (data.customerEmail) notifyAppointmentEvent({ type: "created", appointmentId: inserted.id, manageToken: token });

  revalidatePath("/sites/[slug]/panel", "layout");
  return { ok: true, id: inserted.id, message: "Randevu eklendi." };
}
