/**
 * İstatistik dönemleri (Bölüm 8.3): bugün, bu hafta, bu ay, geçen ay, özel aralık.
 * Tarihler dükkanın yerel takvimine (İstanbul) göre "YYYY-MM-DD"; bitiş HARİÇ.
 * Saf fonksiyon: "bugün" parametre olarak verilir (testlenebilir).
 */
import { addDaysToDate, weekdayOfDate } from "./availability";

export type PeriodKey = "bugun" | "hafta" | "ay" | "gecen-ay" | "ozel";

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  bugun: "Bugün",
  hafta: "Bu hafta",
  ay: "Bu ay",
  "gecen-ay": "Geçen ay",
  ozel: "Özel aralık",
};

export type Period = {
  key: PeriodKey;
  /** İlk gün (dahil) */
  from: string;
  /** Son günün ertesi (hariç) */
  toExclusive: string;
};

/** Özel aralık en fazla bu kadar gün olabilir (sorgu boyutu sınırı) */
export const MAX_CUSTOM_DAYS = 366;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function firstOfMonth(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

function addMonths(firstDay: string, months: number): string {
  const [y, m] = firstDay.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}-01`;
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

/**
 * Dönem anahtarını tarih aralığına çevirir. Geçersiz özel aralıkta "bu ay"a düşer.
 * @param customFrom özel aralık başlangıcı (dahil)
 * @param customTo özel aralık bitişi (DAHİL — kullanıcı "1-15 Ekim" der)
 */
export function resolvePeriod(key: string | undefined, today: string, customFrom?: string, customTo?: string): Period {
  switch (key) {
    case "bugun":
      return { key: "bugun", from: today, toExclusive: addDaysToDate(today, 1) };
    case "hafta": {
      const monday = addDaysToDate(today, -weekdayOfDate(today));
      return { key: "hafta", from: monday, toExclusive: addDaysToDate(monday, 7) };
    }
    case "gecen-ay": {
      const thisMonth = firstOfMonth(today);
      return { key: "gecen-ay", from: addMonths(thisMonth, -1), toExclusive: thisMonth };
    }
    case "ozel": {
      if (customFrom && customTo && DATE_RE.test(customFrom) && DATE_RE.test(customTo) && customFrom <= customTo) {
        const toExclusive = addDaysToDate(customTo, 1);
        if (daysBetween(customFrom, toExclusive) <= MAX_CUSTOM_DAYS) return { key: "ozel", from: customFrom, toExclusive };
      }
      break;
    }
  }
  const thisMonth = firstOfMonth(today);
  return { key: "ay", from: thisMonth, toExclusive: addMonths(thisMonth, 1) };
}
