/**
 * Müşteri randevusunu iptal edebilir / saatini değiştirebilir mi? (Bölüm 7.4)
 * Saf fonksiyon: hem sunucu (asıl kontrol) hem sayfa (butonları göster/gizle) kullanır.
 */
import { subMinutes } from "date-fns";

export type ModifyBlockReason =
  /** İptal edilmiş, tamamlanmış veya gelinmemiş randevu */
  | "not_active"
  /** Randevu saati geçmiş */
  | "past"
  /** cancel_deadline_minutes süresi içine girildi */
  | "deadline";

export function getModifyBlockReason(params: {
  status: string;
  startsAt: Date;
  now: Date;
  cancelDeadlineMinutes: number;
}): ModifyBlockReason | null {
  if (params.status !== "pending" && params.status !== "confirmed") return "not_active";
  if (params.startsAt <= params.now) return "past";
  if (params.now > modifyDeadline(params.startsAt, params.cancelDeadlineMinutes)) return "deadline";
  return null;
}

/** Müşterinin en geç ne zamana kadar değişiklik yapabileceği */
export function modifyDeadline(startsAt: Date, cancelDeadlineMinutes: number): Date {
  return subMinutes(startsAt, cancelDeadlineMinutes);
}

/** Randevu durumlarının müşteriye gösterilen Türkçe adları */
export const STATUS_LABELS: Record<string, string> = {
  pending: "Onay bekliyor",
  confirmed: "Onaylandı",
  cancelled_by_customer: "İptal edildi",
  cancelled_by_shop: "Dükkan tarafından iptal edildi",
  completed: "Tamamlandı",
  no_show: "Gelinmedi",
};
