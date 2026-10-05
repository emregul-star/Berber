import Image from "next/image";
import { initials } from "@/lib/format";
import type { ShopSiteData } from "@/lib/site-data";
import { SectionHeading } from "./ui";

export function TeamSection({ barbers }: { barbers: ShopSiteData["barbers"] }) {
  if (barbers.length === 0) return null;

  return (
    <section id="ekibimiz" className="border-y border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <SectionHeading eyebrow="Ekibimiz" title="Ustalarımızla tanışın" />

        <ul className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {barbers.map((barber) => (
            <li key={barber.id} className="flex flex-col items-center rounded-2xl bg-bg p-5 text-center">
              {barber.photo_url ? (
                <Image
                  src={barber.photo_url}
                  alt={barber.name}
                  width={112}
                  height={112}
                  className="size-24 rounded-full object-cover sm:size-28"
                />
              ) : (
                // Fotoğraf yoksa baş harfli avatar
                <span
                  aria-hidden="true"
                  className="flex size-24 items-center justify-center rounded-full bg-accent font-heading text-3xl font-semibold text-on-accent sm:size-28"
                >
                  {initials(barber.name)}
                </span>
              )}
              <h3 className="mt-4 font-semibold">{barber.name}</h3>
              {barber.title && <p className="text-sm text-primary-text">{barber.title}</p>}
              {barber.bio && <p className="mt-2 text-sm text-muted">{barber.bio}</p>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
