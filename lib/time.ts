/**
 * Saat dilimi yardımcıları. Tüm hesaplar Europe/Istanbul'a göre yapılır (Bölüm 0, kural 7).
 * Sunucu UTC'de çalışsa bile "bugün" İstanbul'daki bugündür.
 */
import { formatInTimeZone } from "date-fns-tz";
import { tr } from "date-fns/locale";
import { TIME_ZONE } from "./constants";

/** Verilen anın İstanbul'daki haftanın günü: 0 = Pazartesi ... 6 = Pazar */
export function istanbulWeekday(date: Date = new Date()): number {
  // "i" = ISO haftanın günü (1 = Pazartesi ... 7 = Pazar)
  return Number(formatInTimeZone(date, TIME_ZONE, "i")) - 1;
}

/** Verilen anın İstanbul'daki saati "HH:mm" biçiminde */
export function istanbulTimeOfDay(date: Date = new Date()): string {
  return formatInTimeZone(date, TIME_ZONE, "HH:mm");
}

/** Türkçe tarih-saat: "12 Ekim Pazartesi, 14:30" */
export function formatWhen(date: Date): string {
  return formatInTimeZone(date, TIME_ZONE, "d MMMM EEEE, HH:mm", { locale: tr });
}
