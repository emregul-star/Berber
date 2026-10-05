/**
 * SMS bildirim sağlayıcısı — İSKELET (Bölüm 10.1).
 *
 * İlk sürümde SMS gönderilmez. İleride bir Türk SMS servisi (ör. Netgsm, İleti Merkezi)
 * eklenecekse: SMS_PROVIDER_API_KEY ortam değişkeni tanımlanır ve aşağıdaki metotlar o
 * servisin API'siyle doldurulur. Ortam değişkeni yoksa sağlayıcı tamamen devre dışıdır.
 *
 * DİKKAT: SMS servisleri ücretlidir. Eklemeden önce maliyet konuşulmalı (Bölüm 0, kural 3).
 */
import "server-only";
import type { AppointmentNotificationData, CancelledBy, NotificationProvider } from "../types";

export class SmsProvider implements NotificationProvider {
  readonly name = "sms";

  isEnabled(): boolean {
    return Boolean(process.env.SMS_PROVIDER_API_KEY);
  }

  private async notImplemented(event: string, d: AppointmentNotificationData): Promise<void> {
    // TODO: SMS servisi seçildiğinde gönderim burada yapılacak (alıcı: d.customer.phone)
    console.warn(`SMS sağlayıcısı henüz uygulanmadı (${event}, randevu ${d.appointmentId}).`);
  }

  sendAppointmentCreated(d: AppointmentNotificationData) {
    return this.notImplemented("created", d);
  }
  sendAppointmentConfirmed(d: AppointmentNotificationData) {
    return this.notImplemented("confirmed", d);
  }
  sendAppointmentCancelled(d: AppointmentNotificationData, cancelledBy: CancelledBy) {
    return this.notImplemented(`cancelled-by-${cancelledBy}`, d);
  }
  sendAppointmentRescheduled(d: AppointmentNotificationData) {
    return this.notImplemented("rescheduled", d);
  }
}
