/**
 * Müşteri randevu işlemleri — SUNUCU TARAFI (Bölüm 6.3, 7.2, 7.3).
 *
 * Müşteri hesapsız olduğu için bu işlemler RLS'i atlayan secret key istemcisiyle yapılır.
 * Bu yüzden buradaki her fonksiyon girdiyi kendisi doğrular ve sadece gereken veriyi döndürür:
 * müşteriye başkalarının randevu bilgisi ASLA gönderilmez, sadece boş saat listesi gider.
 */
import "server-only";
import { formatInTimeZone } from "date-fns-tz";
import { tr } from "date-fns/locale";
import { ACTIVE_APPOINTMENT_STATUSES, computeAppointmentTimes } from "./appointments";
import {
  addDaysToDate,
  computeAvailableSlots,
  localDateOf,
  weekdayOfDate,
  zonedDateTime,
  type BusyRange,
  type DayHours,
} from "./availability";
import { ANY_BARBER } from "./booking-schema";
import { TIME_ZONE } from "./constants";
import { createAdminClient } from "./supabase/admin";
import { notifyAppointmentEvent } from "./notifications";
import { formatWhen } from "./time";

type AdminClient = ReturnType<typeof createAdminClient>;

/** Randevu sihirbazının ihtiyaç duyduğu dükkan bilgisi */
export type BookingContext = Awaited<ReturnType<typeof loadBookingContext>>;

/**
 * Dükkanın randevu alınabilir hizmet ve berberlerini getirir.
 * Askıdaki veya olmayan dükkan için null döner.
 */
export async function loadBookingContext(slug: string, supabase: AdminClient = createAdminClient()) {
  const { data: shop, error } = await supabase
    .from("shops")
    .select("id, slug, name, phone, whatsapp_number, address, status, is_demo")
    .eq("slug", slug)
    .in("status", ["active", "demo"])
    .maybeSingle();
  if (error) throw new Error(`Dükkan okunamadı: ${error.message}`);
  if (!shop) return null;

  const [settings, services, barbers, barberServices] = await Promise.all([
    supabase
      .from("shop_settings")
      .select(
        "slot_interval_minutes, min_notice_minutes, max_advance_days, cancel_deadline_minutes, requires_approval, buffer_minutes, allow_any_barber",
      )
      .eq("shop_id", shop.id)
      .single(),
    supabase
      .from("services")
      .select("id, name, description, duration_minutes, price")
      .eq("shop_id", shop.id)
      .eq("is_active", true)
      .order("sort_order")
      .order("name"),
    supabase
      .from("barbers")
      .select("id, name, title, photo_url, sort_order")
      .eq("shop_id", shop.id)
      .eq("is_active", true)
      .order("sort_order")
      .order("name"),
    supabase.from("barber_services").select("barber_id, service_id").eq("shop_id", shop.id),
  ]);
  for (const result of [settings, services, barbers, barberServices]) {
    if (result.error) throw new Error(`Randevu bilgisi okunamadı: ${result.error.message}`);
  }

  // Her berberin verdiği (aktif) hizmetler
  const activeServiceIds = new Set(services.data!.map((s) => s.id));
  const barbersWithServices = barbers.data!.map((barber) => ({
    ...barber,
    serviceIds: barberServices
      .data!.filter((bs) => bs.barber_id === barber.id && activeServiceIds.has(bs.service_id))
      .map((bs) => bs.service_id),
  }));

  return {
    shop,
    settings: settings.data!,
    services: services.data!,
    barbers: barbersWithServices,
  };
}

/** Bir hizmeti veren berberler; berberId "any" değilse sadece o berber (veriyorsa). */
function candidateBarbers(ctx: NonNullable<BookingContext>, serviceId: string, barberId: string) {
  const offering = ctx.barbers.filter((b) => b.serviceIds.includes(serviceId));
  if (barberId === ANY_BARBER) return ctx.settings.allow_any_barber ? offering : [];
  return offering.filter((b) => b.id === barberId);
}

export type SlotOptions = {
  /** Saat değiştirirken: randevunun kendisi kendi saatini engellemesin */
  excludeAppointmentId?: string;
  /** Saat değiştirirken: hizmetin güncel süresi yerine randevunun kendi süresi */
  durationMinutes?: number;
};

/**
 * Bir gün için berber(ler)in boş saatlerini hesaplar.
 * Dönen harita: başlangıç anı (ISO) -> o saatte müsait berberlerin id'leri
 */
export async function computeSlotsForDay(
  supabase: AdminClient,
  ctx: NonNullable<BookingContext>,
  serviceId: string,
  barberIds: string[],
  date: string,
  now: Date,
  options: SlotOptions = {},
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  const service = ctx.services.find((s) => s.id === serviceId);
  if (!service || barberIds.length === 0) return result;

  const dayStart = zonedDateTime(date, "00:00");
  const dayEnd = zonedDateTime(addDaysToDate(date, 1), "00:00");
  const weekday = weekdayOfDate(date);

  const [hours, timeOff, appointments] = await Promise.all([
    supabase
      .from("working_hours")
      .select("barber_id, start_time, end_time, break_start, break_end, is_closed")
      .eq("shop_id", ctx.shop.id)
      .eq("weekday", weekday),
    // O güne değen izinler: tüm dükkan (barber_id boş) + seçilen berberler
    supabase
      .from("time_off")
      .select("barber_id, starts_at, ends_at")
      .eq("shop_id", ctx.shop.id)
      .lt("starts_at", dayEnd.toISOString())
      .gt("ends_at", dayStart.toISOString()),
    // O güne değen aktif randevular (sadece zaman bilgisi; müşteri bilgisi okunmaz)
    supabase
      .from("appointments")
      .select("id, barber_id, starts_at, blocked_until")
      .in("barber_id", barberIds)
      .in("status", [...ACTIVE_APPOINTMENT_STATUSES])
      .lt("starts_at", dayEnd.toISOString())
      .gt("blocked_until", dayStart.toISOString()),
  ]);
  for (const r of [hours, timeOff, appointments]) {
    if (r.error) throw new Error(`Müsaitlik okunamadı: ${r.error.message}`);
  }

  const toHours = (row: NonNullable<typeof hours.data>[number] | undefined): DayHours =>
    !row || row.is_closed || !row.start_time || !row.end_time
      ? null
      : { start: row.start_time, end: row.end_time, breakStart: row.break_start, breakEnd: row.break_end };

  const generalRow = hours.data!.find((h) => h.barber_id === null);

  for (const barberId of barberIds) {
    // Berbere özel kayıt varsa o, yoksa dükkanın genel saati (Bölüm 5.8)
    const ownRow = hours.data!.find((h) => h.barber_id === barberId);
    const dayHours = toHours(ownRow ?? generalRow);

    const busy: BusyRange[] = [
      ...timeOff
        .data!.filter((t) => t.barber_id === null || t.barber_id === barberId)
        .map((t) => ({ start: new Date(t.starts_at), end: new Date(t.ends_at) })),
      ...appointments
        .data!.filter((a) => a.barber_id === barberId && a.id !== options.excludeAppointmentId)
        .map((a) => ({ start: new Date(a.starts_at), end: new Date(a.blocked_until) })),
    ];

    const slots = computeAvailableSlots({
      date,
      now,
      hours: dayHours,
      serviceDurationMinutes: options.durationMinutes ?? service.duration_minutes,
      slotIntervalMinutes: ctx.settings.slot_interval_minutes,
      minNoticeMinutes: ctx.settings.min_notice_minutes,
      maxAdvanceDays: ctx.settings.max_advance_days,
      bufferMinutes: ctx.settings.buffer_minutes,
      busy,
    });

    for (const slot of slots) {
      const key = slot.toISOString();
      result.set(key, [...(result.get(key) ?? []), barberId]);
    }
  }

  return new Map([...result.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

/** Müşteriye gösterilecek boş saatler: sadece başlangıç anları (ISO) */
export async function getAvailableSlots(
  slug: string,
  serviceId: string,
  barberId: string,
  date: string,
  now: Date = new Date(),
): Promise<string[] | null> {
  const supabase = createAdminClient();
  const ctx = await loadBookingContext(slug, supabase);
  if (!ctx) return null;
  const barbers = candidateBarbers(ctx, serviceId, barberId);
  const slots = await computeSlotsForDay(supabase, ctx, serviceId, barbers.map((b) => b.id), date, now);
  return [...slots.keys()];
}

export type BookingConfirmation = {
  serviceName: string;
  barberName: string;
  startsAt: string;
  endsAt: string;
  /** Ör. "12 Ekim Pazartesi, 14:30" */
  whenLabel: string;
  price: number;
  status: "pending" | "confirmed";
  manageToken: string;
  shopName: string;
  shopAddress: string | null;
  shopPhone: string | null;
  shopWhatsapp: string | null;
  isDemo: boolean;
};

export type CreateBookingResult =
  | { ok: true; confirmation: BookingConfirmation }
  | { ok: false; error: string; code?: "slot_taken" | "invalid" | "rate_limited" };

const SLOT_TAKEN_MESSAGE = "Bu saat az önce doldu, lütfen başka bir saat seçin.";

/**
 * Randevuyu oluşturur. Çağıran (Server Action) önceden şemayla doğrulamış, honeypot,
 * hız sınırı ve telefon kontrollerini yapmış olmalı.
 */
export async function createBooking(params: {
  slug: string;
  serviceId: string;
  barberId: string;
  startsAt: Date;
  customerName: string;
  customerPhone: string; // normalize edilmiş: 905xxxxxxxxx
  customerEmail: string;
  customerNote: string | null;
  manageTokenHash: string;
  manageToken: string;
  now?: Date;
}): Promise<CreateBookingResult> {
  const now = params.now ?? new Date();
  const supabase = createAdminClient();
  const ctx = await loadBookingContext(params.slug, supabase);
  if (!ctx) return { ok: false, error: "Bu dükkan şu anda randevu almıyor.", code: "invalid" };

  const service = ctx.services.find((s) => s.id === params.serviceId);
  const candidates = candidateBarbers(ctx, params.serviceId, params.barberId);
  if (!service || candidates.length === 0) {
    return { ok: false, error: "Seçilen hizmet veya berber artık geçerli değil. Lütfen baştan seçin.", code: "invalid" };
  }

  // Seçilen saat GERÇEKTEN boş mu? Tarayıcının gönderdiğine güvenmeyip sunucuda yeniden hesapla.
  const date = localDateOf(params.startsAt);
  const slots = await computeSlotsForDay(supabase, ctx, service.id, candidates.map((b) => b.id), date, now);
  const freeBarberIds = slots.get(params.startsAt.toISOString()) ?? [];
  if (freeBarberIds.length === 0) return { ok: false, error: SLOT_TAKEN_MESSAGE, code: "slot_taken" };

  // "Fark etmez": o gün en az randevusu olan berber önce (eşitse sıralamada önce gelen)
  let ordered = candidates.filter((b) => freeBarberIds.includes(b.id));
  if (ordered.length > 1) {
    const { data: dayAppointments } = await supabase
      .from("appointments")
      .select("barber_id")
      .in("barber_id", ordered.map((b) => b.id))
      .in("status", [...ACTIVE_APPOINTMENT_STATUSES])
      .gte("starts_at", zonedDateTime(date, "00:00").toISOString())
      .lt("starts_at", zonedDateTime(addDaysToDate(date, 1), "00:00").toISOString());
    const load = (id: string) => dayAppointments?.filter((a) => a.barber_id === id).length ?? 0;
    ordered = [...ordered].sort((a, b) => load(a.id) - load(b.id) || a.sort_order - b.sort_order);
  }

  const times = computeAppointmentTimes(params.startsAt, service.duration_minutes, ctx.settings.buffer_minutes);
  const status = ctx.settings.requires_approval ? "pending" : "confirmed";

  // Sırayla dene: iki müşteri aynı anda aynı saate yazarsa veritabanının çakışma kuralı
  // (exclusion constraint) birini reddeder; "Fark etmez" ise sıradaki berber denenir.
  for (const barber of ordered) {
    const { data: inserted, error } = await supabase
      .from("appointments")
      .insert({
      shop_id: ctx.shop.id,
      barber_id: barber.id,
      service_id: service.id,
      starts_at: times.startsAt.toISOString(),
      ends_at: times.endsAt.toISOString(),
      blocked_until: times.blockedUntil.toISOString(),
      status,
      customer_name: params.customerName,
      customer_phone: params.customerPhone,
      customer_email: params.customerEmail,
      customer_note: params.customerNote,
      price_at_booking: service.price,
      manage_token_hash: params.manageTokenHash,
      kvkk_consent_at: now.toISOString(),
      source: "web",
      })
      .select("id")
      .single();

    if (!error) {
      // E-posta bildirimleri yanıt gönderildikten sonra (demo dükkanda gönderilmez)
      notifyAppointmentEvent({ type: "created", appointmentId: inserted.id, manageToken: params.manageToken });
      return {
        ok: true,
        confirmation: {
          serviceName: service.name,
          barberName: barber.name,
          startsAt: times.startsAt.toISOString(),
          endsAt: times.endsAt.toISOString(),
          whenLabel: formatWhen(times.startsAt),
          price: Number(service.price),
          status,
          manageToken: params.manageToken,
          shopName: ctx.shop.name,
          shopAddress: ctx.shop.address,
          shopPhone: ctx.shop.phone,
          shopWhatsapp: ctx.shop.whatsapp_number,
          isDemo: ctx.shop.is_demo,
        },
      };
    }

    // 23P01 = exclusion_violation: bu berberin bu saati az önce doldu
    if (error.code !== "23P01") {
      console.error("Randevu kaydedilemedi:", error.code, error.message);
      return { ok: false, error: "Randevu kaydedilemedi. Lütfen biraz sonra tekrar deneyin." };
    }
  }

  return { ok: false, error: SLOT_TAKEN_MESSAGE, code: "slot_taken" };
}

/** Aynı telefonun bu dükkandaki aktif (gelecek) randevu sayısı */
export async function countActiveBookingsForPhone(slug: string, phone: string): Promise<number> {
  const supabase = createAdminClient();
  const { data: shop } = await supabase.from("shops").select("id").eq("slug", slug).maybeSingle();
  if (!shop) return 0;
  const { count, error } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", shop.id)
    .eq("customer_phone", phone)
    .in("status", [...ACTIVE_APPOINTMENT_STATUSES])
    .gt("starts_at", new Date().toISOString());
  if (error) {
    console.error("Telefon limiti kontrol edilemedi:", error.message);
    return 0;
  }
  return count ?? 0;
}

/** Randevu sihirbazında gösterilecek günler (bugünden max_advance_days sonrasına kadar) */
export function bookableDays(maxAdvanceDays: number, now: Date = new Date()) {
  const today = localDateOf(now);
  return Array.from({ length: maxAdvanceDays + 1 }, (_, i) => {
    const date = addDaysToDate(today, i);
    const noon = zonedDateTime(date, "12:00");
    return {
      date,
      weekdayLabel: i === 0 ? "Bugün" : i === 1 ? "Yarın" : formatInTimeZone(noon, TIME_ZONE, "EEE", { locale: tr }),
      dayLabel: formatInTimeZone(noon, TIME_ZONE, "d MMM", { locale: tr }),
      fullLabel: formatInTimeZone(noon, TIME_ZONE, "d MMMM EEEE", { locale: tr }),
    };
  });
}

