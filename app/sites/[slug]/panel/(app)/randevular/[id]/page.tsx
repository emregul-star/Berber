/**
 * Randevu detayı (Bölüm 8.1): bilgiler, durum işlemleri, müşteriyi ara, WhatsApp'tan yaz.
 */
import { notFound } from "next/navigation";
import { AppointmentActions } from "@/components/panel/appointment-actions";
import { StatusBadge } from "@/components/panel/appointments";
import { ButtonLink, Card, PageHeader } from "@/components/panel/ui";
import { formatDuration, formatPrice } from "@/lib/format";
import { telHref } from "@/lib/links";
import { requirePanelUser } from "@/lib/panel/auth";
import { getAppointment } from "@/lib/panel/data";
import { formatTrPhone } from "@/lib/phone";
import { formatWhen } from "@/lib/time";
import { whatsappLink, whatsappTemplates } from "@/lib/whatsapp";

export default async function AppointmentDetailPage({ params }: PageProps<"/sites/[slug]/panel/randevular/[id]">) {
  const { slug, id } = await params;
  const user = await requirePanelUser(slug);
  // RLS: berber başkasının randevusunu okuyamaz -> null -> 404
  const a = await getAppointment(user, id);
  if (!a) notFound();

  const startsAt = new Date(a.starts_at);
  const whenLabel = formatWhen(startsAt);
  const base = { customerName: a.customer_name, shopName: user.shop.name, whenLabel };
  const waTemplates = [
    { label: "Hatırlatma", text: whatsappTemplates.reminder({ ...base, serviceName: a.services?.name ?? "" }) },
    { label: "Onay", text: whatsappTemplates.confirmation(base) },
    ...(a.status === "cancelled_by_shop"
      ? [{ label: "İptal", text: whatsappTemplates.cancellation({ ...base, reason: a.cancel_reason }) }]
      : []),
  ];

  const rows: [string, React.ReactNode][] = [
    ["Zaman", whenLabel],
    ["Hizmet", `${a.services?.name ?? "-"} (${formatDuration(a.services?.duration_minutes ?? 0)})`],
    ["Berber", a.barbers?.name ?? "-"],
    ["Ücret", formatPrice(a.price_at_booking)],
    ["Müşteri", a.customer_name],
    ["Telefon", formatTrPhone(a.customer_phone)],
    ["E-posta", a.customer_email ?? "-"],
    ["Not", a.customer_note ?? "-"],
    ["Kaynak", a.source === "panel" ? "Panelden eklendi" : "Web sitesi"],
  ];

  return (
    <>
      <PageHeader
        title={a.customer_name}
        description={whenLabel}
        actions={
          <ButtonLink href="/panel/takvim" variant="secondary" size="sm">
            ← Takvim
          </ButtonLink>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <div className="mb-3">
            <StatusBadge status={a.status} />
          </div>
          <dl className="grid gap-2 text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 border-b border-neutral-100 pb-2 last:border-0">
                <dt className="text-neutral-500">{label}</dt>
                <dd className="text-right font-medium break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <div className="grid content-start gap-4">
          <Card>
            <h2 className="mb-3 font-bold">İşlemler</h2>
            <AppointmentActions slug={slug} appointmentId={a.id} status={a.status} isPast={startsAt <= new Date()} />
          </Card>

          <Card>
            <h2 className="mb-3 font-bold">Müşteriyle iletişim</h2>
            <div className="grid gap-2">
              <a href={telHref(`+${a.customer_phone}`)} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-center text-sm font-semibold hover:bg-neutral-50">
                Ara: {formatTrPhone(a.customer_phone)}
              </a>
              {waTemplates.map((t) => (
                <a
                  key={t.label}
                  href={whatsappLink(a.customer_phone, t.text)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-[#25D366] px-4 py-2.5 text-center text-sm font-semibold text-[#0b3d1f] hover:opacity-90"
                >
                  WhatsApp: {t.label} mesajı
                </a>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
