/**
 * E-posta bildirim sağlayıcısı: hangi olayda kime hangi e-postanın gideceğini belirler (Bölüm 10.2).
 */
import "server-only";
import { Buffer } from "node:buffer";
import { buildIcs } from "../../ics";
import type { AppointmentNotificationData, CancelledBy, NotificationProvider } from "../types";
import { isResendConfigured, sendWithResend, type EmailMessage } from "./resend";
import {
  customerCancelledEmail,
  customerConfirmedEmail,
  customerCreatedEmail,
  customerRescheduledEmail,
  shopCancelledEmail,
  shopCreatedEmail,
  shopRescheduledEmail,
  type EmailContent,
} from "./templates";

type Recipient = "customer" | "shop";

/**
 * Birden fazla e-postayı paralel gönderir; biri başarısız olsa da diğerleri gider.
 * Her hata ayrı ayrı loglanır (Promise.all ilk hatada diğerlerini gizlerdi).
 */
async function sendAll(sends: Promise<void>[], context: string): Promise<void> {
  const results = await Promise.allSettled(sends);
  const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  for (const failure of failures) console.error(`E-posta gönderilemedi (${context}):`, failure.reason);
  if (failures.length > 0) throw new Error(`${failures.length}/${results.length} e-posta gönderilemedi (${context})`);
}

export class EmailProvider implements NotificationProvider {
  readonly name = "email";

  isEnabled(): boolean {
    return isResendConfigured();
  }

  /** Tek bir e-posta gönderir. Alıcının adresi yoksa sessizce atlar. */
  private async send(
    d: AppointmentNotificationData,
    to: Recipient,
    event: string,
    content: EmailContent,
    attachments?: EmailMessage["attachments"],
  ): Promise<void> {
    const address = to === "customer" ? d.customer.email : d.shop.email;
    if (!address) return;

    const id = await sendWithResend({
      to: address,
      ...content,
      fromName: d.shop.name,
      // Müşteri "yanıtla" derse dükkana gitsin; dükkana gidenlerde müşteriye
      replyTo: to === "customer" ? d.shop.email : d.customer.email,
      attachments,
      // Aynı olay için aynı e-posta iki kez gitmesin (ör. yeniden deneme)
      idempotencyKey: `${event}:${to}:${d.appointmentId}:${d.startsAt.toISOString()}`,
    });
    console.info(`E-posta gönderildi (${event} -> ${to}): ${id}`);
  }

  async sendAppointmentCreated(d: AppointmentNotificationData): Promise<void> {
    const ics = buildIcs({
      uid: `${d.appointmentId}@berberplatform`,
      start: d.startsAt,
      end: d.endsAt,
      summary: `${d.serviceName} — ${d.shop.name}`,
      description: `Berber: ${d.barberName}${d.manageUrl ? `\nRandevunuzu yönetin: ${d.manageUrl}` : ""}`,
      location: d.shop.address ?? undefined,
      url: d.manageUrl,
    });
    await sendAll([
      this.send(d, "customer", "created", customerCreatedEmail(d), [
        { filename: "randevu.ics", content: Buffer.from(ics, "utf8").toString("base64"), contentType: "text/calendar" },
      ]),
      // Randevuyu dükkan kendisi eklediyse dükkana "yeni randevu" e-postası gerekmez
      d.source === "panel" ? Promise.resolve() : this.send(d, "shop", "created", shopCreatedEmail(d)),
    ], "created");
  }

  async sendAppointmentConfirmed(d: AppointmentNotificationData): Promise<void> {
    await this.send(d, "customer", "confirmed", customerConfirmedEmail(d));
  }

  async sendAppointmentCancelled(d: AppointmentNotificationData, cancelledBy: CancelledBy): Promise<void> {
    await sendAll([
      this.send(d, "customer", `cancelled-by-${cancelledBy}`, customerCancelledEmail(d, cancelledBy)),
      // Dükkan kendisi iptal ettiyse kendine bildirim gerekmez
      cancelledBy === "customer" ? this.send(d, "shop", "cancelled", shopCancelledEmail(d)) : Promise.resolve(),
    ], "cancelled");
  }

  async sendAppointmentRescheduled(d: AppointmentNotificationData): Promise<void> {
    await sendAll([
      this.send(d, "customer", "rescheduled", customerRescheduledEmail(d)),
      this.send(d, "shop", "rescheduled", shopRescheduledEmail(d)),
    ], "rescheduled");
  }
}
