/**
 * Bildirim sağlayıcı soyutlaması (Bölüm 10.1).
 * E-posta, SMS ve ileride eklenebilecek diğer kanallar bu arayüzü uygular;
 * randevu kodu hangi kanalın kullanıldığını bilmez.
 */

/** Bir randevu bildirimi için gereken tüm bilgi (kanal bağımsız) */
export type AppointmentNotificationData = {
  appointmentId: string;
  status: string;
  serviceName: string;
  barberName: string;
  startsAt: Date;
  endsAt: Date;
  /** "12 Ekim Pazartesi, 14:30" */
  whenLabel: string;
  price: number;
  customer: {
    name: string;
    phone: string;
    email: string | null;
    note: string | null;
  };
  shop: {
    name: string;
    slug: string;
    email: string | null;
    phone: string | null;
    whatsappNumber: string | null;
    address: string | null;
    logoUrl: string | null;
    /** Dükkan teması ana rengi ve üzerindeki yazı rengi (e-posta butonları için) */
    primaryColor: string;
    onPrimaryColor: string;
    isDemo: boolean;
    /** Dükkan sitesinin tam adresi, ör. https://demo.berberplatform.com */
    baseUrl: string;
  };
  /** Müşterinin yönetim linki (sadece token'ın bilindiği olaylarda: oluşturma, saat değiştirme) */
  manageUrl?: string;
  /** Saat değiştirmede eski zaman */
  previousWhenLabel?: string;
};

export type CancelledBy = "customer" | "shop";

export interface NotificationProvider {
  /** Loglarda görünen ad */
  readonly name: string;
  /** Gerekli ayar (API anahtarı vb.) yoksa sağlayıcı devre dışıdır */
  isEnabled(): boolean;
  sendAppointmentCreated(data: AppointmentNotificationData): Promise<void>;
  /** Onay gerektiren dükkanda sahip randevuyu onayladığında */
  sendAppointmentConfirmed(data: AppointmentNotificationData): Promise<void>;
  sendAppointmentCancelled(data: AppointmentNotificationData, cancelledBy: CancelledBy): Promise<void>;
  sendAppointmentRescheduled(data: AppointmentNotificationData): Promise<void>;
}
