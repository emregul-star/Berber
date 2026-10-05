import { formatDuration, formatPrice } from "@/lib/format";
import type { ShopSiteData } from "@/lib/site-data";
import { ClockIcon } from "./icons";
import { SectionHeading } from "./ui";

export function ServicesSection({ services }: { services: ShopSiteData["services"] }) {
  return (
    <section id="hizmetler" className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
      <SectionHeading eyebrow="Hizmetler" title="Neler yapıyoruz?">
        Fiyatlarımız ve ortalama işlem süreleri.
      </SectionHeading>

      {services.length === 0 ? (
        <p className="text-muted">Hizmet listesi yakında eklenecek.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {services.map((service) => (
            <li
              key={service.id}
              className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-surface p-5"
            >
              <div className="min-w-0">
                <h3 className="text-lg font-semibold">{service.name}</h3>
                {service.description && <p className="mt-1 text-sm text-muted">{service.description}</p>}
                <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted">
                  <ClockIcon />
                  {formatDuration(service.duration_minutes)}
                </p>
              </div>
              <p className="shrink-0 text-xl font-semibold text-primary-text">{formatPrice(service.price)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
