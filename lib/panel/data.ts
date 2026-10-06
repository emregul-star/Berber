/**
 * Panel veri okuma yardımcıları.
 * Hepsi giriş yapmış kullanıcının oturumuyla (RLS'e tabi) çalışır: berber sadece kendi
 * randevularını görür, sahip kendi dükkanını görür. Secret key KULLANILMAZ.
 */
import "server-only";
import { differenceInCalendarDays } from "date-fns";
import { addDaysToDate, localDateOf, zonedDateTime } from "../availability";
import { createClient } from "../supabase/server";
import type { PanelUser } from "./auth";

export type PanelAppointment = {
  id: string;
  status: string;
  starts_at: string;
  ends_at: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_note: string | null;
  price_at_booking: number;
  source: string;
  created_at: string;
  cancelled_at: string | null;
  cancel_reason: string | null;
  barber_id: string;
  service_id: string;
  barbers: { name: string } | null;
  services: { name: string; duration_minutes: number } | null;
};

const APPOINTMENT_COLUMNS =
  "id, status, starts_at, ends_at, customer_name, customer_phone, customer_email, customer_note, price_at_booking, source, created_at, cancelled_at, cancel_reason, barber_id, service_id, barbers(name), services(name, duration_minutes)";

/** Onay bekleyen (gelecekteki) randevu sayısı — menüdeki rozet */
export async function countPendingAppointments(user: PanelUser): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("shop_id", user.shop.id)
    .eq("status", "pending")
    .gte("starts_at", new Date().toISOString());
  return count ?? 0;
}

/** Tarih aralığındaki randevular ([from, to) yerel günler, "YYYY-MM-DD") */
export async function listAppointments(
  user: PanelUser,
  opts: { fromDate: string; toDate: string; barberId?: string | null; statuses?: string[] },
): Promise<PanelAppointment[]> {
  const supabase = await createClient();
  let query = supabase
    .from("appointments")
    .select(APPOINTMENT_COLUMNS)
    .eq("shop_id", user.shop.id)
    .gte("starts_at", zonedDateTime(opts.fromDate, "00:00").toISOString())
    .lt("starts_at", zonedDateTime(opts.toDate, "00:00").toISOString())
    .order("starts_at");
  if (opts.barberId) query = query.eq("barber_id", opts.barberId);
  if (opts.statuses?.length) query = query.in("status", opts.statuses);
  const { data, error } = await query.overrideTypes<PanelAppointment[], { merge: false }>();
  if (error) throw new Error(`Randevular okunamadı: ${error.message}`);
  return data ?? [];
}

/** Onay bekleyen gelecek randevular */
export async function listPendingAppointments(user: PanelUser): Promise<PanelAppointment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(APPOINTMENT_COLUMNS)
    .eq("shop_id", user.shop.id)
    .eq("status", "pending")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at")
    .overrideTypes<PanelAppointment[], { merge: false }>();
  if (error) throw new Error(`Randevular okunamadı: ${error.message}`);
  return data ?? [];
}

export async function getAppointment(user: PanelUser, id: string): Promise<PanelAppointment | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(APPOINTMENT_COLUMNS)
    .eq("shop_id", user.shop.id)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<PanelAppointment, { merge: false }>();
  if (error) return null;
  return data;
}

/** Dükkanın berberleri (pasifler dahil, sıralı) */
export async function listBarbers(user: PanelUser) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("barbers")
    .select("id, name, title, photo_url, bio, is_active, sort_order, user_id")
    .eq("shop_id", user.shop.id)
    .order("sort_order")
    .order("name");
  return data ?? [];
}

/** Dükkanın hizmetleri (pasifler dahil, sıralı) */
export async function listServices(user: PanelUser) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("services")
    .select("id, name, description, duration_minutes, price, is_active, sort_order")
    .eq("shop_id", user.shop.id)
    .order("sort_order")
    .order("name");
  return data ?? [];
}

/**
 * Ödeme günü yaklaşan / geçen dükkan sahibine bilgi bandı (Bölüm 11.2).
 * paid_until'e 7 günden az kaldıysa veya geçtiyse mesaj döner.
 */
export async function getSubscriptionNotice(user: PanelUser): Promise<string | null> {
  if (user.shop.isDemo) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("paid_until, status")
    .eq("shop_id", user.shop.id)
    .maybeSingle();
  if (!data?.paid_until) return null;
  const today = localDateOf(new Date());
  const daysLeft = differenceInCalendarDays(new Date(`${data.paid_until}T12:00:00Z`), new Date(`${today}T12:00:00Z`));
  if (daysLeft < 0) return `Aylık ödemenizin süresi ${-daysLeft} gün önce doldu.`;
  if (daysLeft <= 7) return `Aylık ödemenizin son günü yaklaşıyor (${daysLeft === 0 ? "bugün" : `${daysLeft} gün kaldı`}).`;
  return null;
}

/** Bugünün yerel tarihi ve yarın (sorgu aralıkları için) */
export function todayRange(): { today: string; tomorrow: string } {
  const today = localDateOf(new Date());
  return { today, tomorrow: addDaysToDate(today, 1) };
}
