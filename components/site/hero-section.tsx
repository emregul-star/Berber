import Image from "next/image";
import { formatTimeOfDay } from "@/lib/format";
import type { OpeningHoursRow } from "@/lib/site-data";
import { ClockIcon } from "./icons";
import { BookingButton, ShopLogo } from "./ui";

/** Ana sayfanın en üst bölümü: kapak görseli, logo, ad, tanıtım ve "Randevu Al". */
export function HeroSection({
  name,
  description,
  logoUrl,
  coverImageUrl,
  today,
}: {
  name: string;
  description: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  /** Bugünün çalışma saati (İstanbul saatine göre) */
  today: OpeningHoursRow;
}) {
  const hasCover = Boolean(coverImageUrl);

  return (
    <section className="relative isolate overflow-hidden">
      {hasCover ? (
        <>
          <Image
            src={coverImageUrl!}
            alt=""
            fill
            preload
            sizes="100vw"
            className="-z-20 object-cover"
          />
          {/* Görselin üstündeki yazılar okunsun diye karartma */}
          <div className="absolute inset-0 -z-10 bg-black/60" />
        </>
      ) : (
        // Kapak görseli yoksa temaya uygun desenli bir arka plan
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-surface"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, color-mix(in srgb, var(--color-primary) 22%, transparent), transparent 45%)," +
              "radial-gradient(circle at 85% 80%, color-mix(in srgb, var(--color-accent) 18%, transparent), transparent 40%)," +
              "repeating-linear-gradient(135deg, color-mix(in srgb, var(--color-text) 4%, transparent) 0 2px, transparent 2px 22px)",
          }}
        />
      )}

      <div
        className={`mx-auto flex max-w-6xl flex-col items-center px-4 py-20 text-center sm:py-28 ${
          hasCover ? "text-white" : ""
        }`}
      >
        <ShopLogo name={name} logoUrl={logoUrl} size={88} className={hasCover ? "border-white text-white" : ""} />
        <h1 className="mt-6 font-heading text-4xl leading-tight font-semibold sm:text-6xl">{name}</h1>
        {description && (
          <p className={`mt-5 max-w-xl text-base sm:text-lg ${hasCover ? "text-white/85" : "text-muted"}`}>
            {description}
          </p>
        )}

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <BookingButton size="lg" />
          <a
            href="#hizmetler"
            className={`rounded-full border px-7 py-3.5 text-base font-semibold transition ${
              hasCover ? "border-white/60 hover:bg-white/10" : "border-border hover:bg-bg"
            }`}
          >
            Hizmetleri Gör
          </a>
        </div>

        <p className={`mt-6 inline-flex items-center gap-2 text-sm ${hasCover ? "text-white/80" : "text-muted"}`}>
          <ClockIcon />
          {today.isClosed
            ? "Bugün kapalıyız"
            : `Bugün ${formatTimeOfDay(today.start)} – ${formatTimeOfDay(today.end)} arası açığız`}
        </p>
      </div>
    </section>
  );
}
