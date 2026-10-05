/**
 * Müşterinin kendi randevusunu yönetmesi — SUNUCU TARAFI (Bölüm 6.4, 7.4).
 *
 * Müşterinin hesabı yok; kimliğini yönetim linkindeki token kanıtlar. Token veritabanında
 * sadece hash olarak durur: gelen token hash'lenip aranır. Her işlem (iptal, saat değiştirme)
 * kurallar (süre sınırı, durum) sunucuda yeniden kontrol edilerek yapılır.
 */
import "server-only";
import { formatInTimeZone } from "date-fns-tz";
import { tr } from "date-fns/locale";
import { ACTIVE_APPOINTMENT_STATUSES, computeAppointmentTimes } from "./appointments";
import { localDateOf } from "./availability";
import { computeSlotsForDay, loadBookingContext } from "./booking";
import { TIME_ZONE } from "./constants";
import { getModifyBlockReason, modifyDeadline, type ModifyBlockReason } from "./manage-rules";
import { notifyAppointmentEvent } from "./notifications";
import { createAdminClient } from "./supabase/admin";
import { formatWhen } from "./time";
import { hashManageToken, isWellFormedToken } from "./tokens";

export type ManagedAppointment = {
  id: string;
  status: string;
  startsAt: string;
  endsAt: string;
  whenLabel: string;
  serviceId: string;
  serviceName: string;
  barberId: string;
  barberName: string;
  price: number;
  customerName: string;
  durationMinutes: number;
  blockReason: ModifyBlockReason | null;
  /** "12 Ekim Pazartesi, 12:30" — bu andan sonra değişiklik yapılamaz */
  deadlineLabel: string;
  shop: {
    slug: string;
    name: string;
    phone: string | null;
    whatsappNumber: string | null;
    address: string | null;
    isDemo: boolean;
  };
};

/** Token'a ait randevuyu bulur; token geçersizse veya başka dükkanınsa null. */
export async function getManagedAppointment(
  slug: string,
  token: string,
  now: Date = new Date(),
): Promise<ManagedAppointment | null> {
  if (!isWellFormedToken(token)) return null;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, status, starts_at, ends_at, service_id, barber_id, customer_name, price_at_booking, " +
        "shops!inner(slug, name, phone, whatsapp_number, address, is_demo, status, shop_settings(cancel_deadline_minutes)), " +
        "services(name), barbers(name)",
    )
    .eq("manage_token_hash", hashManageToken(token))
    .maybeSingle()
    .overrideTypes<
      {
        id: string;
        status: string;
        starts_at: string;
        ends_at: string;
        service_id: string;
        barber_id: string;
        customer_name: string;
        price_at_booking: number;
        shops: {
          slug: string;
          name: string;
          phone: string | null;
          whatsapp_number: string | null;
          address: string | null;
          is_demo: boolean;
          status: string;
          shop_settings: { cancel_deadline_minutes: number } | null;
        };
        services: { name: string } | null;
        barbers: { name: string } | null;
      },
      { merge: false }
    >();

  if (error) throw new Error(`Randevu okunamadı: ${error.message}`);
  // Token başka bir dükkana aitse bu adreste gösterme
  if (!data || data.shops.slug !== slug) return null;

  const startsAt = new Date(data.starts_at);
  const endsAt = new Date(data.ends_at);
  const cancelDeadlineMinutes = data.shops.shop_settings?.cancel_deadline_minutes ?? 120;

  return {
    id: data.id,
    status: data.status,
    startsAt: data.starts_at,
    endsAt: data.ends_at,
    whenLabel: formatWhen(startsAt),
    serviceId: data.service_id,
    serviceName: data.services?.name ?? "Hizmet",
    barberId: data.barber_id,
    barberName: data.barbers?.name ?? "Berber",
    price: Number(data.price_at_booking),
    customerName: data.customer_name,
    durationMinutes: Math.round((endsAt.getTime() - startsAt.getTime()) / 60000),
    blockReason: getModifyBlockReason({ status: data.status, startsAt, now, cancelDeadlineMinutes }),
    deadlineLabel: formatInTimeZone(modifyDeadline(startsAt, cancelDeadlineMinutes), TIME_ZONE, "d MMMM EEEE, HH:mm", {
      locale: tr,
    }),
    shop: {
      slug: data.shops.slug,
      name: data.shops.name,
      phone: data.shops.phone,
      whatsappNumber: data.shops.whatsapp_number,
      address: data.shops.address,
      isDemo: data.shops.is_demo,
    },
  };
}

export type ManageResult = { ok: true; whenLabel?: string } | { ok: false; error: string; code?: "slot_taken" };

const DEADLINE_MESSAGE = "Değişiklik süresi geçti. Değişiklik için lütfen dükkanı arayın.";
const NOT_FOUND_MESSAGE = "Randevu bulunamadı.";

function blockMessage(reason: ModifyBlockReason): string {
  if (reason === "not_active") return "Bu randevu artık aktif değil.";
  if (reason === "past") return "Randevu saati geçtiği için değişiklik yapılamaz.";
  return DEADLINE_MESSAGE;
}

/** Müşterinin randevuyu iptal etmesi */
export async function cancelByToken(slug: string, token: string, now: Date = new Date()): Promise<ManageResult> {
  const appointment = await getManagedAppointment(slug, token, now);
  if (!appointment) return { ok: false, error: NOT_FOUND_MESSAGE };
  if (appointment.blockReason) return { ok: false, error: blockMessage(appointment.blockReason) };

  // Durum koşulu, aynı anda dükkanın da iptal/onay yapması ihtimaline karşı güncellemeyi korur.
  const { data, error } = await createAdminClient()
    .from("appointments")
    .update({ status: "cancelled_by_customer", cancelled_at: now.toISOString() })
    .eq("id", appointment.id)
    .in("status", [...ACTIVE_APPOINTMENT_STATUSES])
    .select("id");
  if (error) {
    console.error("Randevu iptal edilemedi:", error.message);
    return { ok: false, error: "Randevu iptal edilemedi. Lütfen tekrar deneyin." };
  }
  if (!data?.length) return { ok: false, error: "Bu randevu artık aktif değil." };

  notifyAppointmentEvent({ type: "cancelled", appointmentId: appointment.id, cancelledBy: "customer" });
  return { ok: true };
}

/** Saat değiştirme için seçilen gündeki boş saatler (aynı hizmet ve berber) */
export async function slotsForReschedule(
  slug: string,
  token: string,
  date: string,
  now: Date = new Date(),
): Promise<string[] | null> {
  const appointment = await getManagedAppointment(slug, token, now);
  if (!appointment || appointment.blockReason) return null;
  const supabase = createAdminClient();
  const ctx = await loadBookingContext(slug, supabase);
  if (!ctx) return null;
  const slots = await computeSlotsForDay(supabase, ctx, appointment.serviceId, [appointment.barberId], date, now, {
    excludeAppointmentId: appointment.id,
    durationMinutes: appointment.durationMinutes,
  });
  return [...slots.keys()];
}

/** Müşterinin randevu saatini değiştirmesi (aynı hizmet, aynı berber) */
export async function rescheduleByToken(
  slug: string,
  token: string,
  newStartsAt: Date,
  now: Date = new Date(),
): Promise<ManageResult> {
  const appointment = await getManagedAppointment(slug, token, now);
  if (!appointment) return { ok: false, error: NOT_FOUND_MESSAGE };
  if (appointment.blockReason) return { ok: false, error: blockMessage(appointment.blockReason) };

  const supabase = createAdminClient();
  const ctx = await loadBookingContext(slug, supabase);
  if (!ctx) return { ok: false, error: "Bu dükkan şu anda randevu almıyor." };

  // Yeni saat gerçekten boş mu? (Sunucuda yeniden hesapla, tarayıcıya güvenme)
  const slots = await computeSlotsForDay(
    supabase,
    ctx,
    appointment.serviceId,
    [appointment.barberId],
    localDateOf(newStartsAt),
    now,
    { excludeAppointmentId: appointment.id, durationMinutes: appointment.durationMinutes },
  );
  if (!slots.has(newStartsAt.toISOString())) {
    return { ok: false, error: "Bu saat artık boş değil, lütfen başka bir saat seçin.", code: "slot_taken" };
  }

  const times = computeAppointmentTimes(newStartsAt, appointment.durationMinutes, ctx.settings.buffer_minutes);
  // Onay gerektiren dükkanda yeni saat de onaya düşer
  const status = ctx.settings.requires_approval ? "pending" : appointment.status;

  const { data, error } = await supabase
    .from("appointments")
    .update({
      starts_at: times.startsAt.toISOString(),
      ends_at: times.endsAt.toISOString(),
      blocked_until: times.blockedUntil.toISOString(),
      status,
    })
    .eq("id", appointment.id)
    .in("status", [...ACTIVE_APPOINTMENT_STATUSES])
    .select("id");

  if (error) {
    // 23P01: aynı anda başka biri bu saati aldı
    if (error.code === "23P01") {
      return { ok: false, error: "Bu saat az önce doldu, lütfen başka bir saat seçin.", code: "slot_taken" };
    }
    console.error("Randevu saati değiştirilemedi:", error.message);
    return { ok: false, error: "Saat değiştirilemedi. Lütfen tekrar deneyin." };
  }
  if (!data?.length) return { ok: false, error: "Bu randevu artık aktif değil." };

  notifyAppointmentEvent({
    type: "rescheduled",
    appointmentId: appointment.id,
    manageToken: token,
    previousStartsAt: appointment.startsAt,
  });
  return { ok: true, whenLabel: formatWhen(times.startsAt) };
}
