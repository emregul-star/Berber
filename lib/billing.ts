/**
 * Abonelik / ödeme dönemi hesapları (Bölüm 11.1) — SAF FONKSİYONLAR.
 * Tarihler "YYYY-MM-DD" (İstanbul takvimi).
 */
import { addDaysToDate } from "./availability";

/** "2026-01-31" + 1 ay = "2026-02-28" (ay sonu taşmaz) */
export function addMonthsClamped(date: string, months: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const lastDay = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, "0")}-${String(Math.min(d, lastDay)).padStart(2, "0")}`;
}

/**
 * Bir sonraki aylık ödemenin kapsayacağı dönem:
 *  - Daha önce ödeme varsa: paid_until'in ertesi günü başlar (kesintisiz devam)
 *  - Hiç ödeme yoksa veya çok gerideyse: bugünden başlar
 * Bitiş: başlangıçtan `months` ay sonrasının bir gün öncesi (ör. 1 Eki – 31 Eki).
 */
export function nextPeriod(paidUntil: string | null, today: string, months = 1): { start: string; end: string } {
  const start = paidUntil && paidUntil >= addDaysToDate(today, -31) ? addDaysToDate(paidUntil, 1) : today;
  return { start, end: addDaysToDate(addMonthsClamped(start, months), -1) };
}

/** Ödeme kaydedilince yeni paid_until: eskisi ile dönem sonundan büyük olanı (asla geri gitmez) */
export function advancePaidUntil(current: string | null, periodEnd: string | null): string | null {
  if (!periodEnd) return current;
  if (!current) return periodEnd;
  return periodEnd > current ? periodEnd : current;
}

/** Ödeme durumuna göre abonelik durumu (askıya alma kararı ayrı; burada sadece aktif/gecikti) */
export function subscriptionStatusFor(paidUntil: string | null, today: string): "active" | "overdue" {
  return paidUntil !== null && paidUntil < today ? "overdue" : "active";
}

/** paid_until'den bu yana geçen gün sayısı (gecikme); gecikme yoksa 0 */
export function daysOverdue(paidUntil: string | null, today: string): number {
  if (!paidUntil || paidUntil >= today) return 0;
  return Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${paidUntil}T12:00:00Z`)) / 86_400_000);
}
