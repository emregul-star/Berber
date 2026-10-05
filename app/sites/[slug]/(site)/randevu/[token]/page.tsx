/**
 * Müşterinin randevu yönetim sayfası ({slug}.PLATFORM_DOMAIN/randevu/{token}) — Bölüm 7.4
 * Özet ve durum, iptal, saat değiştirme. Süre sınırı geçtiyse butonlar kapalı.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ManageAppointment } from "@/components/site/manage/manage-appointment";
import { bookableDays, loadBookingContext } from "@/lib/booking";
import { getManagedAppointment } from "@/lib/manage";

export const metadata: Metadata = {
  title: "Randevunuz",
  // Kişiye özel sayfa: arama motorlarına girmesin, dış linklere tıklanınca adres (token) sızmasın
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function ManageAppointmentPage({ params }: PageProps<"/sites/[slug]/randevu/[token]">) {
  const { slug, token } = await params;
  const appointment = await getManagedAppointment(slug, token);
  if (!appointment) notFound();

  // Saat değiştirme için seçilebilecek günler (dükkanın max_advance_days ayarına göre)
  const ctx = appointment.blockReason ? null : await loadBookingContext(slug);
  const days = ctx ? bookableDays(ctx.settings.max_advance_days) : [];

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <ManageAppointment appointment={appointment} token={token} days={days} />
    </main>
  );
}
