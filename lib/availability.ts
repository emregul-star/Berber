/**
 * Müsaitlik (boş saat) hesaplama — Bölüm 7.3
 *
 * SAF FONKSİYON: Veritabanına veya saate erişmez; her şeyi parametre olarak alır.
 * Böylece her durum (mola, izin, dolu randevu, yaz/kış saati...) birim testiyle denenebilir.
 * Veriyi toplayıp bu fonksiyonu çağıran kod: lib/booking.ts
 *
 * Kurallar:
 *  - Randevu [başlangıç, başlangıç + hizmet süresi) çalışma saati içinde olmalı ve molaya taşmamalı.
 *  - Randevunun "meşgul aralığı" [başlangıç, başlangıç + süre + buffer) başka bir randevunun
 *    meşgul aralığıyla veya izinle çakışmamalı. (Veritabanındaki çakışma kuralıyla aynı mantık:
 *    blocked_until = ends_at + buffer_minutes.)
 *  - Kapanış saatinde buffer'ın sığması gerekmez; temizlik payı bir sonraki randevu içindir.
 *  - Başlangıç saatleri çalışma saati başından itibaren slot_interval_minutes adımlarla üretilir.
 *  - Şu andan min_notice_minutes sonrasından önceki saatler elenir.
 *  - Geçmiş günler ve bugünden max_advance_days sonrası için boş liste döner.
 */
import { addDays, addMinutes, format } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { TIME_ZONE } from "./constants";

/** Bir günün çalışma saati ("HH:mm" veya "HH:mm:ss"). null = o gün kapalı. */
export type DayHours = {
  start: string;
  end: string;
  breakStart?: string | null;
  breakEnd?: string | null;
} | null;

/** Dolu zaman aralığı (randevunun meşgul aralığı veya izin). [start, end) */
export type BusyRange = { start: Date; end: Date };

export type AvailabilityInput = {
  /** Hesaplanacak gün, dükkanın yerel takvimine göre: "YYYY-MM-DD" */
  date: string;
  /** Şu an (testlerde sabitlenir) */
  now: Date;
  /** O gün için geçerli çalışma saati (berbere özel varsa o, yoksa dükkanın genel saati) */
  hours: DayHours;
  serviceDurationMinutes: number;
  slotIntervalMinutes: number;
  minNoticeMinutes: number;
  maxAdvanceDays: number;
  bufferMinutes: number;
  /** Berberin mevcut randevuları (starts_at–blocked_until) ve izinler */
  busy: BusyRange[];
  /** Saat dilimi (varsayılan Europe/Istanbul; testlerde yaz/kış saati denemek için değiştirilebilir) */
  timeZone?: string;
};

/** "YYYY-MM-DD" + "HH:mm" (dükkanın yerel saati) -> gerçek an (UTC Date) */
export function zonedDateTime(date: string, time: string, timeZone: string = TIME_ZONE): Date {
  return fromZonedTime(`${date}T${time.slice(0, 5)}:00`, timeZone);
}

/** Verilen anın yerel takvimdeki günü: "YYYY-MM-DD" */
export function localDateOf(instant: Date, timeZone: string = TIME_ZONE): string {
  return formatInTimeZone(instant, timeZone, "yyyy-MM-dd");
}

/** "YYYY-MM-DD" günü haftanın kaçıncı günü: 0 = Pazartesi ... 6 = Pazar (veritabanıyla aynı) */
export function weekdayOfDate(date: string): number {
  // Takvim günü hesabı saat diliminden bağımsızdır; öğlen UTC kullanmak kaymayı önler.
  const day = new Date(`${date}T12:00:00Z`).getUTCDay(); // 0 = Pazar
  return (day + 6) % 7;
}

/** Bugünden itibaren n gün sonrası (yerel takvim): "YYYY-MM-DD" */
export function addDaysToDate(date: string, days: number): string {
  return format(addDays(new Date(`${date}T12:00:00Z`), days), "yyyy-MM-dd");
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** O gün için alınabilecek randevu başlangıç anlarını (sıralı) döndürür. */
export function computeAvailableSlots(input: AvailabilityInput): Date[] {
  const tz = input.timeZone ?? TIME_ZONE;
  const { date, now, hours } = input;

  // 1) Kapalı gün
  if (!hours) return [];

  // Tarih aralığı: geçmiş gün veya max_advance_days sonrası seçilemez
  const today = localDateOf(now, tz);
  const lastBookableDay = addDaysToDate(today, input.maxAdvanceDays);
  if (date < today || date > lastBookableDay) return [];

  const open = zonedDateTime(date, hours.start, tz);
  const close = zonedDateTime(date, hours.end, tz);
  if (!(open < close)) return [];

  // 2) Mola, kendi başına bir "dolu aralık" gibi davranır (ama buffer'dan bağımsız)
  const breakRange =
    hours.breakStart && hours.breakEnd
      ? { start: zonedDateTime(date, hours.breakStart, tz), end: zonedDateTime(date, hours.breakEnd, tz) }
      : null;

  // 6) En erken alınabilecek an
  const earliest = addMinutes(now, input.minNoticeMinutes);

  const slots: Date[] = [];
  const step = input.slotIntervalMinutes;
  const duration = input.serviceDurationMinutes;

  // 5) Çalışma saati başından itibaren adım adım başlangıç saatleri üret
  for (let start = open; start < close; start = addMinutes(start, step)) {
    const serviceEnd = addMinutes(start, duration);
    const blockedEnd = addMinutes(serviceEnd, input.bufferMinutes);

    if (serviceEnd > close) break; // sonraki saatler de sığmaz
    if (start < earliest) continue;
    if (breakRange && overlaps(start, serviceEnd, breakRange.start, breakRange.end)) continue;
    // 3) İzinler ve 4) mevcut randevular (buffer dahil)
    if (input.busy.some((b) => overlaps(start, blockedEnd, b.start, b.end))) continue;

    slots.push(start);
  }

  return slots;
}
