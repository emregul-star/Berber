"use client";

/**
 * Elle randevu ekleme formu (telefonla gelen randevular). Boş saatler öneri olarak gösterilir;
 * saat elle de yazılabilir. Çakışma olursa sunucu (veritabanı kuralı) reddeder.
 */
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createManualAppointmentAction } from "@/app/sites/[slug]/panel/(app)/randevular/actions";
import { Button, Field, inputClass, Notice } from "./ui";

type Option = { id: string; name: string };
type ServiceOption = Option & { durationMinutes: number };

export function ManualAppointmentForm({
  slug,
  barbers,
  services,
  barberServices,
  defaultDate,
  slotIntervalMinutes,
}: {
  slug: string;
  barbers: Option[];
  services: ServiceOption[];
  /** berberId -> verdiği hizmet id'leri */
  barberServices: Record<string, string[]>;
  defaultDate: string;
  slotIntervalMinutes: number;
}) {
  const router = useRouter();
  const [barberId, setBarberId] = useState(barbers.length === 1 ? barbers[0].id : "");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const latest = useRef(0);

  const availableServices = barberId ? services.filter((s) => barberServices[barberId]?.includes(s.id)) : services;

  // Berber, hizmet ve gün seçilince boş saat önerilerini getir (dış sistemle senkronizasyon)
  useEffect(() => {
    if (!barberId || !serviceId || !date) return;
    const requestId = ++latest.current;
    const params = new URLSearchParams({ barberId, serviceId, date });
    fetch(`/panel/randevular/saatler?${params}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { slots: [] }))
      .then((body: { slots: string[] }) => {
        if (requestId === latest.current) setSlots(body.slots);
      })
      .catch(() => {
        if (requestId === latest.current) setSlots([]);
      });
  }, [barberId, serviceId, date]);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createManualAppointmentAction(slug, {
        barberId,
        serviceId,
        date,
        time,
        customerName: formData.get("customerName"),
        customerPhone: formData.get("customerPhone"),
        customerEmail: formData.get("customerEmail") || "",
        customerNote: formData.get("customerNote") || "",
      }).catch(() => ({ ok: false as const, error: "Bağlantı hatası." }));
      if (result.ok) router.push(`/panel/randevular/${result.id}`);
      else setError(result.error);
    });
  }

  const showSlots = Boolean(barberId && serviceId && date);

  return (
    <form action={submit} className="grid gap-5">
      {error && <Notice tone="error">{error}</Notice>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Berber" htmlFor="barberId">
          <select
            id="barberId"
            required
            value={barberId}
            onChange={(e) => {
              setBarberId(e.target.value);
              setServiceId("");
              setSlots(null);
            }}
            className={inputClass}
          >
            <option value="">Seçin</option>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Hizmet" htmlFor="serviceId">
          <select
            id="serviceId"
            required
            value={serviceId}
            onChange={(e) => {
              setServiceId(e.target.value);
              setSlots(null);
            }}
            className={inputClass}
          >
            <option value="">Seçin</option>
            {availableServices.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.durationMinutes} dk)
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tarih" htmlFor="date">
          <input
            id="date"
            type="date"
            required
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setSlots(null);
            }}
            className={inputClass}
          />
        </Field>
        <Field label="Saat" htmlFor="time" hint="Aşağıdaki boş saatlerden seçin veya elle yazın.">
          <input
            id="time"
            type="time"
            required
            step={slotIntervalMinutes * 60}
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      {showSlots && (
        <div aria-live="polite">
          <p className="mb-2 text-sm font-semibold">Boş saatler</p>
          {slots === null ? (
            <p className="text-sm text-neutral-500">Yükleniyor…</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-neutral-500">Bu gün için boş saat yok (kapalı gün, izin veya dolu).</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTime(s)}
                  aria-pressed={time === s}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
                    time === s ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 bg-white hover:border-neutral-900"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Müşteri adı" htmlFor="customerName">
          <input id="customerName" name="customerName" required minLength={2} className={inputClass} />
        </Field>
        <Field label="Telefon" htmlFor="customerPhone">
          <input id="customerPhone" name="customerPhone" type="tel" required placeholder="0532 123 45 67" className={inputClass} />
        </Field>
        <Field label="E-posta (isteğe bağlı)" htmlFor="customerEmail" hint="Yazılırsa müşteriye randevu özeti ve yönetim linki gider.">
          <input id="customerEmail" name="customerEmail" type="email" className={inputClass} />
        </Field>
        <Field label="Not (isteğe bağlı)" htmlFor="customerNote">
          <input id="customerNote" name="customerNote" maxLength={500} className={inputClass} />
        </Field>
      </div>

      <div>
        <Button type="submit" disabled={pending || !barberId || !serviceId || !time}>
          {pending ? "Kaydediliyor…" : "Randevuyu kaydet"}
        </Button>
      </div>
    </form>
  );
}
