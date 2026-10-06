/**
 * Randevu istatistikleri (Bölüm 8.3) — SAF FONKSİYON.
 * Veritabanından gelen randevu listesini alır, sayıları hesaplar. Veri çekme lib/panel/data.ts'te.
 *
 * Tanımlar (panelde de açıklanır):
 *  - Toplam: dönemde başlayan tüm randevular (iptaller dahil)
 *  - Tahmini kazanç: TAMAMLANAN randevuların randevu anındaki fiyatlarının (price_at_booking) toplamı
 *  - Planlanan: henüz gerçekleşmemiş (bekleyen + onaylı) randevuların fiyat toplamı
 *  - Berber / hizmet / gün / saat dağılımları: İPTAL EDİLMEMİŞ randevular (gerçekleşen veya planlanan)
 */
import { formatInTimeZone } from "date-fns-tz";
import { TIME_ZONE } from "./constants";

export type StatAppointment = {
  status: string;
  starts_at: string;
  price_at_booking: number | string;
  barber_id: string;
  barber_name: string;
  service_id: string;
  service_name: string;
};

export type NamedCount = { id: string; name: string; count: number; earnings: number };

export type Stats = {
  total: number;
  completed: number;
  cancelled: number;
  noShow: number;
  upcoming: number;
  earnings: number;
  plannedEarnings: number;
  /** Gelme oranı: tamamlanan / (tamamlanan + gelmeyen); veri yoksa null */
  showRate: number | null;
  byBarber: NamedCount[];
  byService: NamedCount[];
  /** 0 = Pazartesi ... 6 = Pazar */
  byWeekday: number[];
  /** Saat (0-23) -> randevu sayısı */
  byHour: number[];
};

const isCancelled = (status: string) => status === "cancelled_by_customer" || status === "cancelled_by_shop";

/** Kuruş hatası olmasın diye para hesabı kuruş (tam sayı) üzerinden */
const toKurus = (value: number | string) => Math.round(Number(value) * 100);

function addTo(map: Map<string, NamedCount>, id: string, name: string, earnedKurus: number) {
  const item = map.get(id) ?? { id, name, count: 0, earnings: 0 };
  item.count += 1;
  item.earnings += earnedKurus;
  map.set(id, item);
}

function sorted(map: Map<string, NamedCount>): NamedCount[] {
  return [...map.values()]
    .map((i) => ({ ...i, earnings: i.earnings / 100 }))
    .sort((a, b) => b.count - a.count || b.earnings - a.earnings || a.name.localeCompare(b.name, "tr"));
}

export function computeStats(appointments: StatAppointment[], timeZone: string = TIME_ZONE): Stats {
  let completed = 0;
  let cancelled = 0;
  let noShow = 0;
  let upcoming = 0;
  let earnings = 0;
  let planned = 0;
  const barbers = new Map<string, NamedCount>();
  const services = new Map<string, NamedCount>();
  const byWeekday = Array<number>(7).fill(0);
  const byHour = Array<number>(24).fill(0);

  for (const a of appointments) {
    if (isCancelled(a.status)) {
      cancelled += 1;
      continue;
    }
    const kurus = toKurus(a.price_at_booking);
    const earned = a.status === "completed" ? kurus : 0;
    if (a.status === "completed") {
      completed += 1;
      earnings += kurus;
    } else if (a.status === "no_show") {
      noShow += 1;
    } else {
      upcoming += 1;
      planned += kurus;
    }

    addTo(barbers, a.barber_id, a.barber_name, earned);
    addTo(services, a.service_id, a.service_name, earned);

    const start = new Date(a.starts_at);
    // ISO haftanın günü (1 = Pazartesi) -> 0 = Pazartesi
    byWeekday[Number(formatInTimeZone(start, timeZone, "i")) - 1] += 1;
    byHour[Number(formatInTimeZone(start, timeZone, "H"))] += 1;
  }

  return {
    total: appointments.length,
    completed,
    cancelled,
    noShow,
    upcoming,
    earnings: earnings / 100,
    plannedEarnings: planned / 100,
    showRate: completed + noShow > 0 ? completed / (completed + noShow) : null,
    byBarber: sorted(barbers),
    byService: sorted(services),
    byWeekday,
    byHour,
  };
}
