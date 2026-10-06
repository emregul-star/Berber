"use client";

/**
 * Yeni dükkan sihirbazı (Bölüm 11.1): 1) ad + adres  2) sahip  3) ücretler  4) tema  5) hizmetler + oluştur.
 * Hedef: yeni bir dükkanı 5 dakikadan kısa sürede açmak.
 */
import { useState, useTransition } from "react";
import { checkSlugAction, createShopAction } from "@/app/admin/(app)/actions";
import { Button, Card, Field, inputClass, Notice } from "@/components/panel/ui";
import { DEFAULT_SERVICES } from "@/lib/constants";
import { adminPath, shopBaseUrl, withPath } from "@/lib/links";
import { slugify } from "@/lib/slug";
import { THEME_PRESETS, type ThemePresetName } from "@/lib/themes";

type ServiceRow = { name: string; duration: number; price: number };
type Created = { shopId: string; slug: string; ownerEmail: string; tempPassword?: string; message: string };

const STEPS = ["Dükkan", "Sahip", "Ücretler", "Tema", "Hizmetler"];

export function NewShopWizard() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugStatus, setSlugStatus] = useState<{ available: boolean; message: string } | null>(null);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [addOwnerAsBarber, setAddOwnerAsBarber] = useState(true);
  const [setupFee, setSetupFee] = useState("0");
  const [monthlyFee, setMonthlyFee] = useState("0");
  const [billingDay, setBillingDay] = useState(String(Math.min(new Date().getDate(), 28)));
  const [theme, setTheme] = useState<ThemePresetName>("modern");
  const [services, setServices] = useState<ServiceRow[]>(DEFAULT_SERVICES.map((s) => ({ ...s })));
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [pending, startTransition] = useTransition();

  const hostFor = (s: string) => shopBaseUrl(s || "adres").replace(/^https?:\/\//, "");

  function checkSlug(value = slug) {
    startTransition(async () => setSlugStatus(await checkSlugAction(value)));
  }

  function next() {
    setError(null);
    if (step === 0) {
      if (name.trim().length < 2) return setError("Dükkan adını yazın.");
      if (!slugStatus?.available) return setError("Önce uygun bir adres seçin (Kontrol et).");
    }
    if (step === 1) {
      if (!/^\S+@\S+\.\S+$/.test(ownerEmail)) return setError("Sahibin e-postasını yazın.");
      if (addOwnerAsBarber && ownerName.trim().length < 2) return setError("Sahibin adını yazın (berber olarak eklenecek).");
    }
    setStep((s) => s + 1);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const r = await createShopAction({
        name,
        slug,
        ownerEmail,
        ownerName,
        addOwnerAsBarber,
        setupFee,
        monthlyFee,
        billingDay,
        theme,
        services: services.filter((s) => s.name.trim()),
      }).catch(() => ({ ok: false as const, error: "Bağlantı hatası." }));
      if (r.ok) setCreated(r);
      else setError(r.error);
    });
  }

  if (created) {
    const base = shopBaseUrl(created.slug);
    const panel = withPath(base, "/panel");
    return (
      <Card>
        <Notice tone="success">{created.message}</Notice>
        <dl className="mt-4 grid gap-2 text-sm">
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-neutral-500">Site</dt>
            <dd><a href={base} target="_blank" rel="noopener noreferrer" className="underline">{base}</a></dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-neutral-500">Panel</dt>
            <dd><a href={panel} target="_blank" rel="noopener noreferrer" className="underline">{panel}</a></dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-neutral-500">Sahip e-postası</dt>
            <dd>{created.ownerEmail}</dd>
          </div>
        </dl>
        {created.tempPassword ? (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            Geçici şifre: <code className="rounded bg-white px-2 py-1 font-mono text-base font-bold select-all">{created.tempPassword}</code>
            <span className="mt-1 block text-xs">Bu şifre bir daha gösterilmez. Sahibe iletin; ilk girişte panelden değiştirmesi gerekir.</span>
          </p>
        ) : (
          <p className="mt-4 text-sm text-neutral-600">Bu e-postayla zaten bir hesap vardı; sahip mevcut şifresiyle giriş yapar.</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={adminPath(`/dukkanlar/${created.shopId}`)} className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white">
            Dükkan ayrıntılarına git
          </a>
        </div>
        <p className="mt-4 text-xs text-neutral-500">
          Sıradaki adımlar (Bölüm 18): logo/kapak, adres, harita ve Instagram linkleri, galeri ve yorumlar panelden eklenir.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      <ol className="flex flex-wrap gap-2" aria-label="Sihirbaz adımları">
        {STEPS.map((label, i) => (
          <li
            key={label}
            aria-current={i === step ? "step" : undefined}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${i === step ? "bg-neutral-900 text-white" : i < step ? "bg-neutral-300 text-neutral-800" : "bg-neutral-100 text-neutral-500"}`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      <Card>
        {error && (
          <div className="mb-4">
            <Notice tone="error">{error}</Notice>
          </div>
        )}

        {step === 0 && (
          <div className="grid gap-4">
            <Field label="Dükkan adı" htmlFor="w-name">
              <input
                id="w-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slugTouched) {
                    setSlug(slugify(e.target.value));
                    setSlugStatus(null);
                  }
                }}
                className={inputClass}
              />
            </Field>
            <Field label="Web adresi (alt alan adı)" htmlFor="w-slug" hint={hostFor(slug)}>
              <div className="flex gap-2">
                <input
                  id="w-slug"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value.toLowerCase());
                    setSlugStatus(null);
                  }}
                  onBlur={() => slug && checkSlug()}
                  className={inputClass}
                />
                <Button variant="secondary" className="mt-1 shrink-0" disabled={pending || !slug} onClick={() => checkSlug()}>
                  Kontrol et
                </Button>
              </div>
            </Field>
            {slugStatus && <Notice tone={slugStatus.available ? "success" : "error"}>{slugStatus.message}</Notice>}
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4">
            <Field label="Sahibin e-postası" htmlFor="w-email" hint="Panel girişi bu e-postayla yapılır. E-posta gönderilmez; geçici şifre ekranda gösterilir.">
              <input id="w-email" type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Sahibin adı soyadı" htmlFor="w-owner">
              <input id="w-owner" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className={inputClass} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4" checked={addOwnerAsBarber} onChange={(e) => setAddOwnerAsBarber(e.target.checked)} />
              Sahip aynı zamanda berber (ilk berber olarak eklensin, tüm hizmetleri versin)
            </label>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Kurulum ücreti (₺)" htmlFor="w-setup">
              <input id="w-setup" type="number" min={0} value={setupFee} onChange={(e) => setSetupFee(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Aylık ücret (₺)" htmlFor="w-monthly">
              <input id="w-monthly" type="number" min={0} value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Ödeme günü (ayın)" htmlFor="w-day" hint="1–28">
              <input id="w-day" type="number" min={1} max={28} value={billingDay} onChange={(e) => setBillingDay(e.target.value)} className={inputClass} />
            </Field>
          </div>
        )}

        {step === 3 && (
          <div role="radiogroup" aria-label="Tema" className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(THEME_PRESETS) as ThemePresetName[]).map((t) => {
              const p = THEME_PRESETS[t];
              return (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={theme === t}
                  onClick={() => setTheme(t)}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left text-sm ${theme === t ? "border-neutral-900 ring-1 ring-neutral-900" : "border-neutral-300"}`}
                >
                  <span className="flex overflow-hidden rounded border border-neutral-200" aria-hidden="true">
                    <span className="size-6" style={{ background: p.bg }} />
                    <span className="size-6" style={{ background: p.primary }} />
                    <span className="size-6" style={{ background: p.accent }} />
                  </span>
                  {p.label}
                </button>
              );
            })}
          </div>
        )}

        {step === 4 && (
          <div className="grid gap-3">
            <p className="text-sm text-neutral-600">
              Varsayılan hizmetler (süre ve fiyatları düzenleyebilirsiniz). Çalışma saatleri Pzt–Cmt 09:00–20:00, Pazar kapalı olarak ayarlanır.
            </p>
            {services.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_5rem_6rem_auto] items-end gap-2">
                <label className="text-xs font-semibold text-neutral-600">
                  Hizmet
                  <input value={s.name} onChange={(e) => setServices((all) => all.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className={inputClass} />
                </label>
                <label className="text-xs font-semibold text-neutral-600">
                  Dk
                  <input type="number" min={5} value={s.duration} onChange={(e) => setServices((all) => all.map((x, j) => (j === i ? { ...x, duration: Number(e.target.value) } : x)))} className={inputClass} />
                </label>
                <label className="text-xs font-semibold text-neutral-600">
                  ₺
                  <input type="number" min={0} value={s.price} onChange={(e) => setServices((all) => all.map((x, j) => (j === i ? { ...x, price: Number(e.target.value) } : x)))} className={inputClass} />
                </label>
                <Button variant="ghost" size="sm" aria-label={`${s.name || "Hizmeti"} kaldır`} onClick={() => setServices((all) => all.filter((_, j) => j !== i))}>
                  ✕
                </Button>
              </div>
            ))}
            <div>
              <Button variant="secondary" size="sm" onClick={() => setServices((all) => [...all, { name: "", duration: 30, price: 0 }])}>
                + Hizmet ekle
              </Button>
            </div>
            <dl className="mt-2 grid gap-1 rounded-lg bg-neutral-50 p-3 text-sm">
              <div><dt className="inline text-neutral-500">Dükkan: </dt><dd className="inline font-semibold">{name} ({hostFor(slug)})</dd></div>
              <div><dt className="inline text-neutral-500">Sahip: </dt><dd className="inline font-semibold">{ownerEmail}</dd></div>
              <div><dt className="inline text-neutral-500">Ücretler: </dt><dd className="inline font-semibold">Kurulum ₺{setupFee}, aylık ₺{monthlyFee}, her ayın {billingDay}. günü</dd></div>
              <div><dt className="inline text-neutral-500">Tema: </dt><dd className="inline font-semibold">{THEME_PRESETS[theme].label}</dd></div>
            </dl>
          </div>
        )}

        <div className="mt-6 flex justify-between gap-2">
          <Button variant="ghost" disabled={step === 0 || pending} onClick={() => setStep((s) => s - 1)}>
            Geri
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next} disabled={pending}>
              İleri
            </Button>
          ) : (
            <Button onClick={submit} disabled={pending}>
              {pending ? "Oluşturuluyor…" : "Dükkanı oluştur"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
