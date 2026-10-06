"use client";

/**
 * İzinler sayfası: yaklaşan izinleri listeler, yeni izin ekler, siler.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addTimeOffAction, deleteTimeOffAction, type Result } from "@/app/sites/[slug]/panel/(app)/izinler/actions";
import { Button, Card, EmptyState, Field, inputClass, Notice } from "./ui";

export type TimeOffItem = { id: string; label: string; who: string; reason: string | null; canDelete: boolean };

export function TimeOffManager({
  slug,
  items,
  barbers,
  isOwner,
  ownBarberId,
  today,
}: {
  slug: string;
  items: TimeOffItem[];
  barbers: { id: string; name: string }[];
  isOwner: boolean;
  ownBarberId: string | null;
  today: string;
}) {
  const router = useRouter();
  const [allDay, setAllDay] = useState(true);
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const res = await addTimeOffAction(slug, {
        barberId: isOwner ? formData.get("barberId") : ownBarberId,
        startDate: formData.get("startDate"),
        endDate: formData.get("endDate"),
        allDay,
        startTime: formData.get("startTime") ?? "",
        endTime: formData.get("endTime") ?? "",
        reason: formData.get("reason"),
      }).catch(() => ({ ok: false as const, error: "Bağlantı hatası." }));
      setResult(res);
      if (res.ok) router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Bu izni silmek istiyor musunuz?")) return;
    startTransition(async () => {
      const res = await deleteTimeOffAction(slug, id);
      setResult(res);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="grid gap-6">
      <Card>
        <h2 className="mb-4 font-bold">İzin / kapalı zaman ekle</h2>
        {result && (
          <div className="mb-4 grid gap-2">
            <Notice tone={result.ok ? "success" : "error"}>{result.ok ? result.message : result.error}</Notice>
            {result.ok && result.warning && <Notice tone="warning">{result.warning}</Notice>}
          </div>
        )}
        <form action={submit} className="grid gap-4">
          {isOwner && (
            <Field label="Kim için?" htmlFor="barberId">
              <select id="barberId" name="barberId" className={inputClass} defaultValue="">
                <option value="">Tüm dükkan (ör. bayram, tadilat)</option>
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
            Tüm gün
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Başlangıç tarihi" htmlFor="startDate">
              <input id="startDate" name="startDate" type="date" required min={today} defaultValue={today} className={inputClass} />
            </Field>
            <Field label="Bitiş tarihi" htmlFor="endDate">
              <input id="endDate" name="endDate" type="date" required min={today} defaultValue={today} className={inputClass} />
            </Field>
            {!allDay && (
              <>
                <Field label="Başlangıç saati" htmlFor="startTime">
                  <input id="startTime" name="startTime" type="time" required className={inputClass} />
                </Field>
                <Field label="Bitiş saati" htmlFor="endTime">
                  <input id="endTime" name="endTime" type="time" required className={inputClass} />
                </Field>
              </>
            )}
          </div>
          <Field label="Sebep (isteğe bağlı, müşteriye gösterilmez)" htmlFor="reason">
            <input id="reason" name="reason" maxLength={200} className={inputClass} />
          </Field>
          <div>
            <Button type="submit" disabled={pending}>
              {pending ? "Kaydediliyor…" : "İzni ekle"}
            </Button>
          </div>
        </form>
      </Card>

      <section aria-labelledby="timeoff-list">
        <h2 id="timeoff-list" className="mb-3 text-lg font-bold">
          Yaklaşan ve devam eden izinler
        </h2>
        {items.length === 0 ? (
          <EmptyState>Yaklaşan izin yok.</EmptyState>
        ) : (
          <ul className="grid gap-2">
            {items.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-3">
                <div>
                  <p className="font-semibold">{t.who}</p>
                  <p className="text-sm text-neutral-600">{t.label}</p>
                  {t.reason && <p className="text-xs text-neutral-500">{t.reason}</p>}
                </div>
                {t.canDelete && (
                  <Button variant="ghost" size="sm" disabled={pending} onClick={() => remove(t.id)}>
                    Sil
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
