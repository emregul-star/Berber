/**
 * E-posta şablonları (Bölüm 10.2): Türkçe, sade HTML, dükkanın logosu ve rengiyle.
 *
 * GÜVENLİK: Müşterinin girdiği her metin (ad, not...) esc() ile kaçırılır. Böylece biri
 * adının yerine HTML/link yazarak dükkanın e-postasına zararlı içerik sokamaz.
 * E-posta istemcileri CSS sınıflarını desteklemediği için stiller satır içidir.
 */
import { formatPrice } from "../../format";
import { formatTrPhone } from "../../phone";
import type { AppointmentNotificationData, CancelledBy } from "../types";

export type EmailContent = { subject: string; html: string; text: string };

/** HTML özel karakterlerini kaçırır */
export function esc(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Sadece http(s) linklerine izin verir */
function safeUrl(url: string | undefined): string | null {
  return url && /^https?:\/\//.test(url) ? url : null;
}

type Row = [label: string, value: string];

function detailRows(d: AppointmentNotificationData, extra: Row[] = []): Row[] {
  return [
    ["Zaman", d.whenLabel],
    ["Hizmet", d.serviceName],
    ["Berber", d.barberName],
    ["Ücret", formatPrice(d.price)],
    ...(d.shop.address ? ([["Adres", d.shop.address]] as Row[]) : []),
    ...extra,
  ];
}

function layout(params: {
  d: AppointmentNotificationData;
  title: string;
  intro: string;
  rows: Row[];
  /** private: kişiye özel link (yönetim linki) — altına "kimseyle paylaşmayın" uyarısı eklenir */
  button?: { label: string; url: string; private?: boolean };
  footerNote?: string;
}): string {
  const { d, title, intro, rows, button, footerNote } = params;
  const color = d.shop.primaryColor;
  const onColor = d.shop.onPrimaryColor;
  const logoUrl = safeUrl(d.shop.logoUrl ?? undefined);
  const buttonUrl = button ? safeUrl(button.url) : null;

  const rowsHtml = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:8px 0;color:#6b7280;font-size:14px;vertical-align:top;width:90px">${esc(label)}</td>
          <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;white-space:pre-line">${esc(value)}</td>
        </tr>`,
    )
    .join("");

  const contactParts = [
    d.shop.phone ? `Telefon: ${esc(d.shop.phone)}` : "",
    d.shop.address ? esc(d.shop.address) : "",
  ].filter(Boolean);

  return `<!doctype html>
<html lang="tr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
        <tr><td style="background:${color};padding:20px 24px;color:${onColor};font-size:18px;font-weight:700">
          ${logoUrl ? `<img src="${esc(logoUrl)}" alt="" width="36" height="36" style="vertical-align:middle;border-radius:50%;margin-right:10px">` : ""}${esc(d.shop.name)}
        </td></tr>
        <tr><td style="padding:24px">
          <h1 style="margin:0 0 8px;font-size:22px;color:#111827">${esc(title)}</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#374151">${esc(intro)}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb">${rowsHtml}</table>
          ${
            buttonUrl
              ? `<p style="margin:24px 0 8px;text-align:center"><a href="${esc(buttonUrl)}" style="display:inline-block;background:${color};color:${onColor};text-decoration:none;font-weight:700;padding:12px 24px;border-radius:999px">${esc(button!.label)}</a></p>
${button!.private ? `<p style="margin:0;text-align:center;font-size:12px;color:#6b7280">Bu link size özeldir, kimseyle paylaşmayın.</p>` : ""}`
              : ""
          }
          ${footerNote ? `<p style="margin:20px 0 0;font-size:13px;line-height:1.5;color:#6b7280">${esc(footerNote)}</p>` : ""}
        </td></tr>
        <tr><td style="padding:16px 24px;background:#fafafa;color:#6b7280;font-size:12px;line-height:1.5">
          ${esc(d.shop.name)}${contactParts.length ? `<br>${contactParts.join(" · ")}` : ""}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function plainText(title: string, intro: string, rows: Row[], extra: string[] = []): string {
  return [title, "", intro, "", ...rows.map(([l, v]) => `${l}: ${v}`), "", ...extra].join("\n").trim() + "\n";
}

function customerRows(d: AppointmentNotificationData): Row[] {
  return [
    ["Müşteri", d.customer.name],
    ["Telefon", formatTrPhone(d.customer.phone)],
    ...(d.customer.email ? ([["E-posta", d.customer.email]] as Row[]) : []),
    ...(d.customer.note ? ([["Not", d.customer.note]] as Row[]) : []),
  ];
}

// ---------------------------------------------------------------- Müşteriye

export function customerCreatedEmail(d: AppointmentNotificationData): EmailContent {
  const pending = d.status === "pending";
  const title = pending ? "Randevu talebiniz alındı" : "Randevunuz oluşturuldu";
  const intro = pending
    ? `Merhaba ${d.customer.name}, randevu talebiniz ${d.shop.name} tarafından onaylandığında size haber vereceğiz.`
    : `Merhaba ${d.customer.name}, randevunuz oluşturuldu. Sizi bekliyoruz!`;
  const rows = detailRows(d);
  const footer = "Randevunuzu takviminize eklemek için ekteki dosyayı açabilirsiniz.";
  return {
    subject: `${title} — ${d.whenLabel}`,
    html: layout({ d, title, intro, rows, button: d.manageUrl ? { label: "Randevumu yönet", url: d.manageUrl, private: true } : undefined, footerNote: footer }),
    text: plainText(title, intro, rows, d.manageUrl ? [`Randevunuzu yönetin (iptal / saat değiştirme): ${d.manageUrl}`] : []),
  };
}

export function customerConfirmedEmail(d: AppointmentNotificationData): EmailContent {
  const title = "Randevunuz onaylandı";
  const intro = `Merhaba ${d.customer.name}, ${d.shop.name} randevunuzu onayladı. Sizi bekliyoruz!`;
  const rows = detailRows(d);
  return { subject: `${title} — ${d.whenLabel}`, html: layout({ d, title, intro, rows }), text: plainText(title, intro, rows) };
}

export function customerCancelledEmail(d: AppointmentNotificationData, by: CancelledBy): EmailContent {
  const title = "Randevunuz iptal edildi";
  const intro =
    by === "customer"
      ? `Merhaba ${d.customer.name}, randevunuz isteğiniz üzerine iptal edildi.`
      : `Merhaba ${d.customer.name}, üzgünüz, ${d.shop.name} aşağıdaki randevunuzu iptal etmek zorunda kaldı.`;
  const rows = detailRows(d, by === "shop" && d.cancelReason ? [["Sebep", d.cancelReason]] : []);
  const contact = [d.shop.phone ? `telefon: ${d.shop.phone}` : "", d.shop.whatsappNumber ? `WhatsApp: +${d.shop.whatsappNumber}` : ""]
    .filter(Boolean)
    .join(", ");
  const footer =
    by === "shop"
      ? `Yeni bir randevu için bizimle iletişime geçebilirsiniz${contact ? ` (${contact})` : ""} veya sitemizden yeniden randevu alabilirsiniz.`
      : "Yeni bir randevu için sitemizi ziyaret edebilirsiniz.";
  return {
    subject: `${title} — ${d.whenLabel}`,
    html: layout({ d, title, intro, rows, button: { label: "Yeni randevu al", url: `${d.shop.baseUrl}/randevu-al` }, footerNote: footer }),
    text: plainText(title, intro, rows, [footer, `${d.shop.baseUrl}/randevu-al`]),
  };
}

export function customerRescheduledEmail(d: AppointmentNotificationData): EmailContent {
  const title = "Randevu saatiniz değiştirildi";
  const intro = `Merhaba ${d.customer.name}, randevunuzun yeni saati aşağıdadır.`;
  const rows = detailRows(d, d.previousWhenLabel ? [["Eski zaman", d.previousWhenLabel]] : []);
  return {
    subject: `${title} — ${d.whenLabel}`,
    html: layout({ d, title, intro, rows, button: d.manageUrl ? { label: "Randevumu yönet", url: d.manageUrl, private: true } : undefined }),
    text: plainText(title, intro, rows, d.manageUrl ? [`Randevunuzu yönetin: ${d.manageUrl}`] : []),
  };
}

// ---------------------------------------------------------------- Dükkana

export function shopCreatedEmail(d: AppointmentNotificationData): EmailContent {
  const pending = d.status === "pending";
  const title = pending ? "Yeni randevu talebi (onay bekliyor)" : "Yeni randevu";
  const intro = pending
    ? "Sitenizden yeni bir randevu talebi geldi. Onaylamak için panelinize girin."
    : "Sitenizden yeni bir randevu alındı.";
  const rows = [...detailRows(d), ...customerRows(d)];
  const panelUrl = `${d.shop.baseUrl}/panel`;
  return {
    subject: `${title}: ${d.customer.name} — ${d.whenLabel}`,
    html: layout({ d, title, intro, rows, button: { label: "Panele git", url: panelUrl } }),
    text: plainText(title, intro, rows, [`Panel: ${panelUrl}`]),
  };
}

export function shopCancelledEmail(d: AppointmentNotificationData): EmailContent {
  const title = "Randevu iptal edildi";
  const intro = "Müşteri aşağıdaki randevusunu iptal etti. Bu saat tekrar boşa çıktı.";
  const rows = [...detailRows(d), ...customerRows(d)];
  return { subject: `${title}: ${d.customer.name} — ${d.whenLabel}`, html: layout({ d, title, intro, rows }), text: plainText(title, intro, rows) };
}

export function shopRescheduledEmail(d: AppointmentNotificationData): EmailContent {
  const title = "Randevu saati değişti";
  const intro = "Müşteri randevusunun saatini değiştirdi.";
  const rows = [...detailRows(d, d.previousWhenLabel ? [["Eski zaman", d.previousWhenLabel]] : []), ...customerRows(d)];
  return { subject: `${title}: ${d.customer.name} — ${d.whenLabel}`, html: layout({ d, title, intro, rows }), text: plainText(title, intro, rows) };
}
