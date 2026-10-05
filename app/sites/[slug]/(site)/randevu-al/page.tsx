/**
 * Randevu alma sihirbazı ({slug}.PLATFORM_DOMAIN/randevu-al) — Bölüm 7.2
 * Sunucu, sihirbazın ihtiyaç duyduğu (müşteriye gösterilebilir) verileri hazırlar;
 * etkileşim BookingWizard (tarayıcı) bileşenindedir.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingWizard } from "@/components/site/booking/booking-wizard";
import { bookableDays, loadBookingContext } from "@/lib/booking";

export const metadata: Metadata = { title: "Randevu Al" };

export default async function BookingPage({ params }: PageProps<"/sites/[slug]/randevu-al">) {
  const { slug } = await params;
  const ctx = await loadBookingContext(slug);
  if (!ctx) notFound();

  // Hiç berberin vermediği hizmetler listelenmez
  const bookableServices = ctx.services.filter((s) => ctx.barbers.some((b) => b.serviceIds.includes(s.id)));

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <BookingWizard
        shop={{
          slug: ctx.shop.slug,
          name: ctx.shop.name,
          phone: ctx.shop.phone,
          whatsappNumber: ctx.shop.whatsapp_number,
          address: ctx.shop.address,
          isDemo: ctx.shop.is_demo,
          allowAnyBarber: ctx.settings.allow_any_barber,
        }}
        services={bookableServices.map((s) => ({ ...s, price: Number(s.price) }))}
        barbers={ctx.barbers.map(({ id, name, title, photo_url, serviceIds }) => ({
          id,
          name,
          title,
          photo_url,
          serviceIds,
        }))}
        days={bookableDays(ctx.settings.max_advance_days)}
      />
    </main>
  );
}
