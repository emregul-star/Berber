/**
 * Randevu alma sihirbazı ({slug}.PLATFORM_DOMAIN/randevu-al).
 * AŞAMA 3 YER TUTUCUSU: Asıl sihirbaz Aşama 4'te yapılacak. Şimdilik sitedeki
 * "Randevu Al" butonları boş sayfaya düşmesin diye telefon/WhatsApp yönlendirmesi var.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PhoneIcon, WhatsAppIcon } from "@/components/site/icons";
import { telHref } from "@/lib/links";
import { getShopSiteData } from "@/lib/site-data";
import { whatsappLink, whatsappTemplates } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Randevu Al" };

export default async function BookingPage({ params }: PageProps<"/sites/[slug]/randevu-al">) {
  const { slug } = await params;
  const data = await getShopSiteData(slug);
  if (!data) notFound();
  const { shop } = data;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="font-heading text-3xl font-semibold">Online randevu çok yakında</h1>
      <p className="mt-3 text-muted">Şimdilik randevu için bize telefon veya WhatsApp ile ulaşabilirsiniz.</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {shop.phone && (
          <a
            href={telHref(shop.phone)}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-on-primary"
          >
            <PhoneIcon /> Ara
          </a>
        )}
        {shop.whatsapp_number && (
          <a
            href={whatsappLink(shop.whatsapp_number, whatsappTemplates.generalInquiry(shop.name))}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3 font-semibold text-[#0b3d1f]"
          >
            <WhatsAppIcon /> WhatsApp
          </a>
        )}
      </div>
      <Link href="/" className="mt-8 text-sm text-muted underline">
        Ana sayfaya dön
      </Link>
    </main>
  );
}
