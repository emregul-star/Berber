"use client";

/**
 * Randevu sihirbazının görsel parçaları: ilerleme göstergesi, hizmet ve berber seçimi,
 * özet kartı. Durum (state) booking-wizard.tsx'te tutulur; bunlar sadece gösterir.
 */
import Image from "next/image";
import { formatDuration, formatPrice, initials } from "@/lib/format";
import { ClockIcon, ScissorsIcon } from "../icons";
import type { WizardBarber, WizardService } from "./types";

export const STEP_LABELS = ["Hizmet", "Berber", "Tarih ve saat", "Bilgiler"] as const;

export function StepProgress({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Randevu adımları">
      {STEP_LABELS.map((label, index) => {
        const step = index + 1;
        const done = step < current;
        const active = step === current;
        return (
          <li key={label} className="flex flex-1 flex-col gap-1.5" aria-current={active ? "step" : undefined}>
            <span
              className={`h-1.5 rounded-full transition ${done || active ? "bg-primary" : "bg-border"}`}
              aria-hidden="true"
            />
            <span className={`text-xs ${active ? "font-semibold text-text" : "text-muted"}`}>
              <span className="sr-only">Adım {step}: </span>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Seçilebilir kart (radyo düğmesi gibi davranır) */
export function ChoiceCard({
  selected,
  onSelect,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        selected ? "border-primary bg-surface ring-1 ring-primary" : "border-border bg-surface hover:border-primary"
      }`}
    >
      {children}
    </button>
  );
}

export function ServiceStep({
  services,
  selectedId,
  onSelect,
}: {
  services: WizardService[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (services.length === 0) {
    return <p className="text-muted">Şu anda online randevu alınabilecek hizmet yok.</p>;
  }
  return (
    <div role="radiogroup" aria-label="Hizmet seçin" className="grid gap-3">
      {services.map((service) => (
        <ChoiceCard key={service.id} selected={selectedId === service.id} onSelect={() => onSelect(service.id)}>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{service.name}</p>
            {service.description && <p className="mt-0.5 text-sm text-muted">{service.description}</p>}
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-muted">
              <ClockIcon /> {formatDuration(service.duration_minutes)}
            </p>
          </div>
          <span className="shrink-0 text-lg font-semibold text-primary-text">{formatPrice(service.price)}</span>
        </ChoiceCard>
      ))}
    </div>
  );
}

function BarberAvatar({ barber }: { barber: WizardBarber }) {
  return barber.photo_url ? (
    <Image src={barber.photo_url} alt="" width={48} height={48} className="size-12 rounded-full object-cover" />
  ) : (
    <span
      aria-hidden="true"
      className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent font-heading font-semibold text-on-accent"
    >
      {initials(barber.name)}
    </span>
  );
}

export function BarberStep({
  barbers,
  allowAny,
  selectedId,
  onSelect,
}: {
  barbers: WizardBarber[];
  allowAny: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Berber seçin" className="grid gap-3">
      {allowAny && barbers.length > 1 && (
        <ChoiceCard selected={selectedId === "any"} onSelect={() => onSelect("any")}>
          <span
            aria-hidden="true"
            className="flex size-12 shrink-0 items-center justify-center rounded-full border border-primary text-xl text-primary-text"
          >
            <ScissorsIcon />
          </span>
          <div>
            <p className="font-semibold">Fark etmez</p>
            <p className="text-sm text-muted">Seçtiğiniz saatte müsait olan bir berberimiz atanır.</p>
          </div>
        </ChoiceCard>
      )}
      {barbers.map((barber) => (
        <ChoiceCard key={barber.id} selected={selectedId === barber.id} onSelect={() => onSelect(barber.id)}>
          <BarberAvatar barber={barber} />
          <div>
            <p className="font-semibold">{barber.name}</p>
            {barber.title && <p className="text-sm text-primary-text">{barber.title}</p>}
          </div>
        </ChoiceCard>
      ))}
    </div>
  );
}

/** Seçimlerin kısa özeti (adım 3 ve 4'te üstte görünür) */
export function SelectionSummary({
  service,
  barberName,
  whenLabel,
}: {
  service: WizardService | undefined;
  barberName: string | null;
  whenLabel: string | null;
}) {
  if (!service) return null;
  return (
    <dl className="grid gap-1 rounded-2xl border border-border bg-surface p-4 text-sm sm:grid-cols-3">
      <div>
        <dt className="text-muted">Hizmet</dt>
        <dd className="font-semibold">
          {service.name} · {formatPrice(service.price)}
        </dd>
      </div>
      {barberName && (
        <div>
          <dt className="text-muted">Berber</dt>
          <dd className="font-semibold">{barberName}</dd>
        </div>
      )}
      {whenLabel && (
        <div>
          <dt className="text-muted">Zaman</dt>
          <dd className="font-semibold">{whenLabel}</dd>
        </div>
      )}
    </dl>
  );
}
