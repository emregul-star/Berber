"use client";

/**
 * Berberler sayfası: listele, sırala, ekle/düzenle (fotoğraf, unvan, hizmetler), pasif yap, sil,
 * giriş hesabı aç / geçici şifre ver / hesabı kaldır.
 */
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createBarberAccountAction,
  deleteBarberAction,
  removeBarberAccountAction,
  resetBarberPasswordAction,
  saveBarberAction,
  type Result,
} from "@/app/sites/[slug]/panel/(app)/berberler/actions";
import { initials } from "@/lib/format";
import { ImageUpload } from "./image-upload";
import { SortableList } from "./sortable-list";
import { Badge, Button, Card, EmptyState, Field, inputClass, Notice } from "./ui";

export type BarberItem = {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  photo_url: string | null;
  is_active: boolean;
  hasAccount: boolean;
  serviceIds: string[];
};
type Service = { id: string; name: string; is_active: boolean };

function Avatar({ name, url }: { name: string; url: string | null }) {
  return url ? (
    <Image src={url} alt="" width={48} height={48} className="size-12 rounded-full object-cover" />
  ) : (
    <span className="flex size-12 items-center justify-center rounded-full bg-neutral-200 font-bold text-neutral-700">{initials(name)}</span>
  );
}

function BarberForm({
  slug,
  shopId,
  barber,
  services,
  onDone,
}: {
  slug: string;
  shopId: string;
  barber: BarberItem | null;
  services: Service[];
  onDone: (message: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [photoUrl, setPhotoUrl] = useState(barber?.photo_url ?? "");
  const [serviceIds, setServiceIds] = useState<string[]>(barber?.serviceIds ?? services.filter((s) => s.is_active).map((s) => s.id));
  const idp = barber?.id ?? "new";

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await saveBarberAction(slug, {
        id: barber?.id,
        name: formData.get("name"),
        title: formData.get("title"),
        bio: formData.get("bio"),
        photoUrl,
        isActive: formData.get("isActive") === "on",
        serviceIds,
      }).catch(() => ({ ok: false as const, error: "Bağlantı hatası." }));
      if (res.ok) onDone(res.message);
      else setError(res.error);
    });
  }

  return (
    <form action={submit} className="grid gap-4">
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex items-center gap-4">
        <Avatar name={barber?.name ?? "?"} url={photoUrl || null} />
        <ImageUpload shopId={shopId} folder="barbers" maxSize={600} label="Fotoğraf yükle" onUploaded={setPhotoUrl} />
        {photoUrl && (
          <Button variant="ghost" size="sm" onClick={() => setPhotoUrl("")}>
            Fotoğrafı kaldır
          </Button>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ad soyad" htmlFor={`name-${idp}`}>
          <input id={`name-${idp}`} name="name" required defaultValue={barber?.name} className={inputClass} />
        </Field>
        <Field label="Unvan (isteğe bağlı)" htmlFor={`title-${idp}`} hint='Ör. "Usta", "Kalfa"'>
          <input id={`title-${idp}`} name="title" maxLength={40} defaultValue={barber?.title ?? ""} className={inputClass} />
        </Field>
      </div>
      <Field label="Kısa tanıtım (isteğe bağlı)" htmlFor={`bio-${idp}`}>
        <textarea id={`bio-${idp}`} name="bio" rows={2} maxLength={300} defaultValue={barber?.bio ?? ""} className={inputClass} />
      </Field>
      <fieldset>
        <legend className="text-sm font-semibold">Verdiği hizmetler</legend>
        <div className="mt-2 flex flex-wrap gap-3">
          {services.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4"
                checked={serviceIds.includes(s.id)}
                onChange={(e) => setServiceIds((ids) => (e.target.checked ? [...ids, s.id] : ids.filter((x) => x !== s.id)))}
              />
              {s.name}
              {!s.is_active && <span className="text-neutral-400">(pasif)</span>}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" className="size-4" defaultChecked={barber?.is_active ?? true} />
        Aktif (müşteri sitesinde görünsün ve randevu alınabilsin)
      </label>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Kaydediliyor…" : "Kaydet"}
        </Button>
      </div>
    </form>
  );
}

/** Giriş hesabı bölümü: hesap aç / geçici şifre ver / kaldır */
function AccountSection({ slug, barber, onResult }: { slug: string; barber: BarberItem; onResult: (r: Result) => void }) {
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<Result>) =>
    startTransition(async () => onResult(await fn().catch(() => ({ ok: false as const, error: "Bağlantı hatası." }))));

  if (!barber.hasAccount) {
    return (
      <form
        className="flex flex-wrap items-end gap-2"
        action={() => run(() => createBarberAccountAction(slug, barber.id, email))}
      >
        <Field label="Giriş hesabı aç (isteğe bağlı)" htmlFor={`acc-${barber.id}`} hint="Berber kendi randevularını görebilsin diye.">
          <input
            id={`acc-${barber.id}`}
            type="email"
            required
            placeholder="berber@ornek.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${inputClass} w-64`}
          />
        </Field>
        <Button type="submit" variant="secondary" disabled={pending}>
          Hesap aç
        </Button>
      </form>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone="green">Giriş hesabı var</Badge>
      <Button variant="secondary" size="sm" disabled={pending} onClick={() => run(() => resetBarberPasswordAction(slug, barber.id))}>
        Yeni geçici şifre ver
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (confirm(`${barber.name} artık panele giriş yapamayacak. Emin misiniz?`)) run(() => removeBarberAccountAction(slug, barber.id));
        }}
      >
        Hesabı kaldır
      </Button>
    </div>
  );
}

export function BarbersManager({
  slug,
  shopId,
  barbers,
  services,
}: {
  slug: string;
  shopId: string;
  barbers: BarberItem[];
  services: Service[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();

  function handle(r: Result) {
    setResult(r);
    if (r.ok) {
      setEditing(null);
      router.refresh();
    }
  }

  return (
    <div className="grid gap-4">
      {result && (
        <Notice tone={result.ok ? "success" : "error"}>
          {result.ok ? result.message : result.error}
          {result.ok && result.tempPassword && (
            <span className="mt-2 block">
              Geçici şifre: <code className="rounded bg-white px-2 py-1 font-mono text-base font-bold select-all">{result.tempPassword}</code>{" "}
              <span className="text-xs">(Bu şifre bir daha gösterilmez.)</span>
            </span>
          )}
        </Notice>
      )}

      {editing === "new" ? (
        <Card>
          <h2 className="mb-4 font-bold">Yeni berber</h2>
          <BarberForm slug={slug} shopId={shopId} barber={null} services={services} onDone={(m) => handle({ ok: true, message: m })} />
          <Button variant="ghost" className="mt-2" onClick={() => setEditing(null)}>
            Vazgeç
          </Button>
        </Card>
      ) : (
        <div>
          <Button onClick={() => setEditing("new")}>+ Yeni berber</Button>
        </div>
      )}

      {barbers.length === 0 ? (
        <EmptyState>Henüz berber yok.</EmptyState>
      ) : (
        <SortableList
          slug={slug}
          table="barbers"
          items={barbers}
          renderItem={(b) =>
            editing === b.id ? (
              <div>
                <BarberForm slug={slug} shopId={shopId} barber={b} services={services} onDone={(m) => handle({ ok: true, message: m })} />
                <Button variant="ghost" className="mt-2" onClick={() => setEditing(null)}>
                  Vazgeç
                </Button>
              </div>
            ) : (
              <div className="grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={b.name} url={b.photo_url} />
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {b.name} {!b.is_active && <Badge>Pasif</Badge>}
                      </p>
                      <p className="text-sm text-neutral-600">{b.title}</p>
                      <p className="text-xs text-neutral-500">
                        {b.serviceIds.length} hizmet veriyor
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setEditing(b.id)}>
                      Düzenle
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => {
                        if (!confirm(`"${b.name}" berberini silmek istiyor musunuz?`)) return;
                        startTransition(async () => handle(await deleteBarberAction(slug, b.id)));
                      }}
                    >
                      Sil
                    </Button>
                  </div>
                </div>
                <AccountSection slug={slug} barber={b} onResult={handle} />
              </div>
            )
          }
        />
      )}
    </div>
  );
}
