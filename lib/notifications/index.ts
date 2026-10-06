/**
 * Randevu bildirimleri — tek giriş noktası.
 *
 * Kurallar (Bölüm 10.1, 12):
 *  - Bildirimler yanıt kullanıcıya gittikten SONRA gönderilir (Next.js after()); müşteri beklemez.
 *  - Bildirim başarısız olsa bile randevu işlemi iptal olmaz; hata sadece loglanır.
 *  - Demo dükkanda hiçbir gerçek bildirim gönderilmez.
 */
import "server-only";
import { after } from "next/server";
import { formatWhen } from "../time";
import { shopBaseUrl } from "../links";
import { createAdminClient } from "../supabase/admin";
import { resolveTheme } from "../themes";
import { EmailProvider } from "./email/provider";
import { SmsProvider } from "./sms/provider";
import type { AppointmentNotificationData, CancelledBy, NotificationProvider } from "./types";

export type AppointmentEvent =
  | { type: "created"; appointmentId: string; manageToken: string }
  | { type: "confirmed"; appointmentId: string }
  | { type: "cancelled"; appointmentId: string; cancelledBy: CancelledBy }
  | { type: "rescheduled"; appointmentId: string; manageToken: string; previousStartsAt: string };

function activeProviders(): NotificationProvider[] {
  return [new EmailProvider(), new SmsProvider()].filter((p) => p.isEnabled());
}

/** Bildirim için gereken veriyi veritabanından toplar */
async function loadNotificationData(event: AppointmentEvent): Promise<AppointmentNotificationData | null> {
  const { data, error } = await createAdminClient()
    .from("appointments")
    .select(
      "id, status, starts_at, ends_at, price_at_booking, customer_name, customer_phone, customer_email, customer_note, cancel_reason, source, " +
        "shops!inner(name, slug, email, phone, whatsapp_number, address, logo_url, theme_preset, primary_color, accent_color, is_demo, custom_domain), " +
        "services(name), barbers(name)",
    )
    .eq("id", event.appointmentId)
    .maybeSingle()
    .overrideTypes<
      {
        id: string;
        status: string;
        starts_at: string;
        ends_at: string;
        price_at_booking: number;
        customer_name: string;
        customer_phone: string;
        customer_email: string | null;
        customer_note: string | null;
        cancel_reason: string | null;
        source: string;
        shops: {
          name: string;
          slug: string;
          email: string | null;
          phone: string | null;
          whatsapp_number: string | null;
          address: string | null;
          logo_url: string | null;
          theme_preset: string;
          primary_color: string | null;
          accent_color: string | null;
          is_demo: boolean;
          custom_domain: string | null;
        };
        services: { name: string } | null;
        barbers: { name: string } | null;
      },
      { merge: false }
    >();

  if (error) throw new Error(`Bildirim verisi okunamadı: ${error.message}`);
  if (!data) return null;

  const theme = resolveTheme(data.shops.theme_preset, data.shops.primary_color, data.shops.accent_color);
  const baseUrl = shopBaseUrl(data.shops.slug, data.shops.custom_domain);
  const startsAt = new Date(data.starts_at);
  const token = "manageToken" in event ? event.manageToken : undefined;

  return {
    appointmentId: data.id,
    status: data.status,
    source: data.source,
    serviceName: data.services?.name ?? "Hizmet",
    barberName: data.barbers?.name ?? "Berber",
    startsAt,
    endsAt: new Date(data.ends_at),
    whenLabel: formatWhen(startsAt),
    price: Number(data.price_at_booking),
    customer: {
      name: data.customer_name,
      phone: data.customer_phone,
      email: data.customer_email,
      note: data.customer_note,
    },
    shop: {
      name: data.shops.name,
      slug: data.shops.slug,
      email: data.shops.email,
      phone: data.shops.phone,
      whatsappNumber: data.shops.whatsapp_number,
      address: data.shops.address,
      logoUrl: data.shops.logo_url,
      primaryColor: theme.primary,
      onPrimaryColor: theme.onPrimary,
      isDemo: data.shops.is_demo,
      baseUrl,
    },
    manageUrl: token ? `${baseUrl}/randevu/${token}` : undefined,
    previousWhenLabel: event.type === "rescheduled" ? formatWhen(new Date(event.previousStartsAt)) : undefined,
    cancelReason: data.cancel_reason,
  };
}

/**
 * Olayı tüm etkin sağlayıcılara iletir. Hiçbir zaman hata fırlatmaz.
 * (Testlerde doğrudan çağrılabilir; uygulamada notifyAppointmentEvent kullanılır.)
 */
export async function dispatchAppointmentEvent(
  event: AppointmentEvent,
  providers: NotificationProvider[] = activeProviders(),
): Promise<void> {
  try {
    if (providers.length === 0) return;
    const data = await loadNotificationData(event);
    if (!data) return;
    if (data.shop.isDemo) {
      console.info(`Demo dükkan: "${event.type}" bildirimi gönderilmedi (randevu ${event.appointmentId}).`);
      return;
    }

    await Promise.all(
      providers.map(async (provider) => {
        try {
          if (event.type === "created") await provider.sendAppointmentCreated(data);
          else if (event.type === "confirmed") await provider.sendAppointmentConfirmed(data);
          else if (event.type === "cancelled") await provider.sendAppointmentCancelled(data, event.cancelledBy);
          else await provider.sendAppointmentRescheduled(data);
        } catch (error) {
          console.error(`Bildirim gönderilemedi (${provider.name}, ${event.type}, randevu ${event.appointmentId}):`, error);
        }
      }),
    );
  } catch (error) {
    console.error(`Bildirim hazırlanamadı (${event.type}, randevu ${event.appointmentId}):`, error);
  }
}

/** Bildirimi yanıt gönderildikten sonra çalışacak şekilde sıraya koyar. */
export function notifyAppointmentEvent(event: AppointmentEvent): void {
  after(() => dispatchAppointmentEvent(event));
}
