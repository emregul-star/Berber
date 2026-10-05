"use client";

import type { WizardDay, WizardSlot } from "./types";

/**
 * Adım 3: yatay kaydırılabilir gün listesi + seçilen günün boş saatleri.
 */
export function DateTimeStep({
  days,
  selectedDate,
  onSelectDate,
  slots,
  loading,
  error,
  selectedSlot,
  onSelectSlot,
}: {
  days: WizardDay[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  slots: WizardSlot[];
  loading: boolean;
  error: string | null;
  selectedSlot: string | null;
  onSelectSlot: (slot: WizardSlot) => void;
}) {
  const selectedDay = days.find((d) => d.date === selectedDate);

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Gün seçin"
        className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:thin]"
      >
        {days.map((day) => {
          const selected = day.date === selectedDate;
          return (
            <button
              key={day.date}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={day.fullLabel}
              onClick={() => onSelectDate(day.date)}
              className={`flex w-18 shrink-0 snap-start flex-col items-center rounded-2xl border px-2 py-3 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                selected ? "border-primary bg-primary text-on-primary" : "border-border bg-surface hover:border-primary"
              }`}
            >
              <span className={`text-xs ${selected ? "" : "text-muted"}`}>{day.weekdayLabel}</span>
              <span className="mt-1 text-sm font-semibold whitespace-nowrap">{day.dayLabel}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6" aria-live="polite">
        {selectedDay && <h3 className="mb-3 font-semibold">{selectedDay.fullLabel}</h3>}

        {loading ? (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6" aria-label="Boş saatler yükleniyor">
            {Array.from({ length: 8 }, (_, i) => (
              <span key={i} className="h-11 animate-pulse rounded-xl bg-surface" />
            ))}
          </div>
        ) : error ? (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>
        ) : slots.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-muted">
            Bu gün için boş saat yok. Lütfen başka bir gün seçin.
          </p>
        ) : (
          <div role="radiogroup" aria-label="Saat seçin" className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {slots.map((slot) => {
              const selected = slot.startsAt === selectedSlot;
              return (
                <button
                  key={slot.startsAt}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onSelectSlot(slot)}
                  className={`h-11 rounded-xl border text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    selected ? "border-primary bg-primary text-on-primary" : "border-border bg-surface hover:border-primary"
                  }`}
                >
                  {slot.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
