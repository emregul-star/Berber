"use client";

/**
 * Hizmetler sayfası: listele, sırala, ekle/düzenle, pasif yap, sil (randevusu yoksa).
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteServiceAction, saveServiceAction } from "@/app/sites/[slug]/panel/(app)/hizmetler/actions";
import { formatDuration, formatPrice } from "@/lib/format";
import { SortableList } from "./sortable-list";
import { Badge, Button, Card, EmptyState, Field, inputClass, Notice } from "./ui";

export type ServiceItem = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  barberIds: string[];
};

type Barber = { id: string; name: string; is_active: boolean };

function ServiceForm({
  slug,
  service,
  barbers,
  onDone,
}: {
  slug: string;
  service: ServiceItem | null;
  barbers: Barber[];
  onDone: (message: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [barberIds, setBarberIds] = useState<string[]>(service?.barberIds ?? barbers.filter((b) => b.is_active).map((b) => b.id));

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await saveServiceAction(slug, {
        id: service?.id,
        name: formData.get("name"),
        description: formData.get("description"),
        durationMinutes: formData.get("durationMinutes"),
        price: formData.get("price"),
        isActive: formData.get("isActive") === "on",
        barberIds,
      }).catch(() => ({ ok: false as const, error: "Bağlantı hatası." }));
      if (res.ok) onDone(res.message);
      else setError(res.error);
    });
  }

  const idp = service?.id ?? "new";
  return (
    <form action={submit} className="grid gap-4">
      {error && <Notice tone="error">{error}</Notice>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Hizmet adı" htmlFor={`name-${idp}`}>
          <input id={`name-${idp}`} name="name" required defaultValue={service?.name} className={inputClass} />
        </Field>
        <Field label="Açıklama (isteğe bağlı)" htmlFor={`desc-${idp}`}>
          <input id={`desc-${idp}`} name="description" maxLength={300} defaultValue={service?.description ?? ""} className={inputClass} />
        </Field>
        <Field label="Süre (dakika)" htmlFor={`dur-${idp}`}>
          <input id={`dur-${idp}`} name="durationMinutes" type="number" min={5} max={600} step={5} required defaultValue={service?.duration_minutes ?? 30} className={inputClass} />
        </Field>
        <Field label="Fiyat (₺)" htmlFor={`price-${idp}`}>
          <input id={`price-${idp}`} name="price" type="number" min={0} step="0.01" required defaultValue={service?.price ?? ""} className={inputClass} />
        </Field>
      </div>
      <fieldset>
        <legend className="text-sm font-semibold">Bu hizmeti veren berberler</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {barbers.map((b) => (
            <label key={b.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4"
                checked={barberIds.includes(b.id)}
                onChange={(e) => setBarberIds((ids) => (e.target.checked ? [...ids, b.id] : ids.filter((x) => x !== b.id)))}
              />
              {b.name}
              {!b.is_active && <span className="text-neutral-400">(pasif)</span>}
            </label>
          ))}
          {barbers.length === 0 && <p className="text-sm text-neutral-500">Önce berber ekleyin.</p>}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" className="size-4" defaultChecked={service?.is_active ?? true} />
        Aktif (müşteri sitesinde görünsün ve randevu alınabilsin)
      </label>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Kaydediliyor…" : "Kaydet"}
        </Button>
      </div>
    </form>
  );
}

export function ServicesManager({ slug, services, barbers }: { slug: string; services: ServiceItem[]; barbers: Barber[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const barberName = (id: string) => barbers.find((b) => b.id === id)?.name ?? "";

  function done(text: string) {
    setEditing(null);
    setMessage({ ok: true, text });
    router.refresh();
  }

  function remove(service: ServiceItem) {
    if (!confirm(`"${service.name}" hizmetini silmek istiyor musunuz?`)) return;
    setMessage(null);
    startTransition(async () => {
      const res = await deleteServiceAction(slug, service.id);
      setMessage(res.ok ? { ok: true, text: res.message } : { ok: false, text: res.error });
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="grid gap-4">
      {message && <Notice tone={message.ok ? "success" : "error"}>{message.text}</Notice>}

      {editing === "new" ? (
        <Card>
          <h2 className="mb-4 font-bold">Yeni hizmet</h2>
          <ServiceForm slug={slug} service={null} barbers={barbers} onDone={done} />
          <Button variant="ghost" className="mt-2" onClick={() => setEditing(null)}>
            Vazgeç
          </Button>
        </Card>
      ) : (
        <div>
          <Button onClick={() => setEditing("new")}>+ Yeni hizmet</Button>
        </div>
      )}

      {services.length === 0 ? (
        <EmptyState>Henüz hizmet yok.</EmptyState>
      ) : (
        <SortableList
          slug={slug}
          table="services"
          items={services}
          renderItem={(s) =>
            editing === s.id ? (
              <div>
                <ServiceForm slug={slug} service={s} barbers={barbers} onDone={done} />
                <Button variant="ghost" className="mt-2" onClick={() => setEditing(null)}>
                  Vazgeç
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {s.name} {!s.is_active && <Badge>Pasif</Badge>}
                  </p>
                  <p className="text-sm text-neutral-600">
                    {formatDuration(s.duration_minutes)} · {formatPrice(s.price)}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {s.barberIds.length ? s.barberIds.map(barberName).join(", ") : "Hiçbir berber vermiyor — müşteri sitesinde randevu alınamaz"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setEditing(s.id)}>
                    Düzenle
                  </Button>
                  <Button variant="ghost" size="sm" disabled={pending} onClick={() => remove(s)}>
                    Sil
                  </Button>
                </div>
              </div>
            )
          }
        />
      )}
    </div>
  );
}
