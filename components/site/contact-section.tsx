import { formatTimeOfDay, WEEKDAY_NAMES } from "@/lib/format";
import { safeExternalUrl, safeGoogleMapsEmbedUrl, telHref } from "@/lib/links";
import type { OpeningHoursRow, ShopPublic } from "@/lib/site-data";
import { whatsappLink, whatsappTemplates } from "@/lib/whatsapp";
import { InstagramIcon, MapPinIcon, PhoneIcon, WhatsAppIcon } from "./icons";
import { SectionHeading } from "./ui";

export function ContactSection({
  shop,
  openingHours,
  todayWeekday,
}: {
  shop: ShopPublic;
  openingHours: OpeningHoursRow[];
  todayWeekday: number;
}) {
  const mapUrl = safeGoogleMapsEmbedUrl(shop.google_maps_embed_url);
  const instagramUrl = safeExternalUrl(shop.instagram_url);

  return (
    <section id="iletisim" className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
      <SectionHeading eyebrow="Konum ve iletişim" title="Bizi ziyaret edin" />

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Harita (API anahtarı gerektirmeyen Google Haritalar gömme yöntemi) */}
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {mapUrl ? (
            <iframe
              src={mapUrl}
              title={`${shop.name} haritada`}
              className="aspect-[4/3] h-full min-h-72 w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center text-muted">
              <MapPinIcon className="text-4xl" />
            </div>
          )}
        </div>

        <div className="space-y-8">
          {shop.address && (
            <div>
              <h3 className="flex items-center gap-2 font-semibold">
                <MapPinIcon className="text-primary-text" /> Adres
              </h3>
              <p className="mt-2 text-muted">{shop.address}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {shop.phone && (
              <a
                href={telHref(shop.phone)}
                className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition hover:border-primary"
              >
                <PhoneIcon /> {shop.phone}
              </a>
            )}
            {shop.whatsapp_number && (
              <a
                href={whatsappLink(shop.whatsapp_number, whatsappTemplates.generalInquiry(shop.name))}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-[#0b3d1f] transition hover:opacity-90"
              >
                <WhatsAppIcon /> WhatsApp
              </a>
            )}
            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold transition hover:border-primary"
              >
                <InstagramIcon /> Instagram
              </a>
            )}
          </div>

          <div>
            <h3 className="font-semibold">Çalışma saatleri</h3>
            <table className="mt-3 w-full text-sm">
              <caption className="sr-only">Haftalık çalışma saatleri</caption>
              <tbody>
                {openingHours.map((day) => {
                  const isToday = day.weekday === todayWeekday;
                  return (
                    <tr
                      key={day.weekday}
                      className={`border-b border-border last:border-0 ${isToday ? "font-semibold" : ""}`}
                    >
                      <th scope="row" className="py-2.5 pr-4 text-left font-[inherit]">
                        {WEEKDAY_NAMES[day.weekday]}
                        {isToday && <span className="ml-2 text-xs text-primary-text">(bugün)</span>}
                      </th>
                      <td className={`py-2.5 text-right ${day.isClosed ? "text-muted" : ""}`}>
                        {day.isClosed ? (
                          "Kapalı"
                        ) : (
                          <>
                            {formatTimeOfDay(day.start)} – {formatTimeOfDay(day.end)}
                            {day.breakStart && (
                              <span className="block text-xs font-normal text-muted">
                                Mola: {formatTimeOfDay(day.breakStart)} – {formatTimeOfDay(day.breakEnd)}
                              </span>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
