"use client";

/**
 * Haftalık çalışma saatleri düzenleyici. Dükkan geneli için her gün "Açık" veya "Kapalı";
 * berbere özel düzenlemede ek olarak "Dükkan saati" (genel saati kullan) seçeneği vardır.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveWorkingHoursAction } from "@/app/sites/[slug]/panel/(app)/calisma-saatleri/actions";
import { WEEKDAY_NAMES } from "@/lib/format";
import { Button, inputClass, Notice } from "./ui";

export type DayMode = "open" | "closed" | "shop";
export type DayState = { weekday: number; mode: DayMode; start: string; end: string; breakStart: string; breakEnd: string };

export function HoursEditor({ slug, barberId, initial }: { slug: string; barberId: string | null; initial: DayState[] }) {
  const router = useRouter();
  const [days, setDays] = useState(initial);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const update = (weekday: number, patch: Partial<DayState>) =>
    setDays((ds) => ds.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)));

  function save() {
    setResult(null);
    startTransition(async () => {
      const res = await saveWorkingHoursAction(slug, { barberId, days }).catch(() => ({ ok: false, message: "Bağlantı hatası." }));
      setResult(res);
      if (res.ok) router.refresh();
    });
  }

  const modes: { value: DayMode; label: string }[] = [
    ...(barberId ? [{ value: "shop" as const, label: "Dükkan saati" }] : []),
    { value: "open", label: "Açık" },
    { value: "closed", label: "Kapalı" },
  ];

  return (
    <div className="grid gap-3">
      {result && <Notice tone={result.ok ? "success" : "error"}>{result.message}</Notice>}
      {days.map((d) => (
        <fieldset key={d.weekday} className="rounded-lg border border-neutral-200 bg-white p-3">
          <legend className="sr-only">{WEEKDAY_NAMES[d.weekday]}</legend>
          <div className="flex flex-wrap items-center gap-3">
            <span className="w-24 font-semibold">{WEEKDAY_NAMES[d.weekday]}</span>
            <div className="flex rounded-lg border border-neutral-300 p-0.5" role="radiogroup" aria-label={`${WEEKDAY_NAMES[d.weekday]} durumu`}>
              {modes.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={d.mode === m.value}
                  onClick={() => update(d.weekday, { mode: m.value, ...(m.value === "open" && !d.start ? { start: "09:00", end: "20:00" } : {}) })}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold ${d.mode === m.value ? "bg-neutral-900 text-white" : "text-neutral-700"}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          {d.mode === "open" && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <label className="text-xs font-semibold text-neutral-600">
                Açılış
                <input type="time" value={d.start} onChange={(e) => update(d.weekday, { start: e.target.value })} className={inputClass} />
              </label>
              <label className="text-xs font-semibold text-neutral-600">
                Kapanış
                <input type="time" value={d.end} onChange={(e) => update(d.weekday, { end: e.target.value })} className={inputClass} />
              </label>
              <label className="text-xs font-semibold text-neutral-600">
                Mola başlangıç
                <input type="time" value={d.breakStart} onChange={(e) => update(d.weekday, { breakStart: e.target.value })} className={inputClass} />
              </label>
              <label className="text-xs font-semibold text-neutral-600">
                Mola bitiş
                <input type="time" value={d.breakEnd} onChange={(e) => update(d.weekday, { breakEnd: e.target.value })} className={inputClass} />
              </label>
            </div>
          )}
        </fieldset>
      ))}
      <div>
        <Button onClick={save} disabled={pending}>
          {pending ? "Kaydediliyor…" : "Kaydet"}
        </Button>
      </div>
    </div>
  );
}
