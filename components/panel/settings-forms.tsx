"use client";

/**
 * Ayarlar sayfası formları. Her bölüm kendi Server Action'ıyla ayrı kaydedilir.
 */
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import {
  saveBookingRulesAction,
  saveLinksAction,
  saveShopImageAction,
  saveShopInfoAction,
  saveThemeAction,
  type Result,
} from "@/app/sites/[slug]/panel/(app)/ayarlar/actions";
import { contrastRatio, MIN_CONTRAST_RATIO } from "@/lib/color";
import { resolveTheme, THEME_PRESETS, themeToCssVars, type ThemePresetName } from "@/lib/themes";
import { ImageUpload } from "./image-upload";
import { Button, Card, Field, inputClass, Notice } from "./ui";

/** Ortak: işlemi çalıştır, sonucu göster, başarılıysa sayfayı yenile */
function useSave() {
  const router = useRouter();
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<Result>) => {
    setResult(null);
    startTransition(async () => {
      const r = await fn().catch(() => ({ ok: false as const, error: "Bağlantı hatası." }));
      setResult(r);
      if (r.ok) router.refresh();
    });
  };
  const message = result && <Notice tone={result.ok ? "success" : "error"}>{result.ok ? result.message : result.error}</Notice>;
  return { run, pending, message };
}

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <Card>
      <h2 id={id} className="text-lg font-bold">
        {title}
      </h2>
      {description && <p className="mt-1 mb-4 text-sm text-neutral-600">{description}</p>}
      <div className={description ? "" : "mt-4"}>{children}</div>
    </Card>
  );
}

// ------------------------------------------------------------------ Dükkan bilgileri
export function InfoForm({
  slug,
  shop,
}: {
  slug: string;
  shop: { name: string; description: string | null; phone: string | null; whatsapp_number: string | null; email: string | null; address: string | null };
}) {
  const { run, pending, message } = useSave();
  return (
    <Section id="bilgiler" title="Dükkan bilgileri">
      <form
        className="grid gap-4"
        action={(fd) =>
          run(() =>
            saveShopInfoAction(slug, {
              name: fd.get("name"),
              description: fd.get("description"),
              phone: fd.get("phone"),
              whatsapp: fd.get("whatsapp"),
              email: fd.get("email"),
              address: fd.get("address"),
            }),
          )
        }
      >
        {message}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Dükkan adı" htmlFor="name">
            <input id="name" name="name" required defaultValue={shop.name} className={inputClass} />
          </Field>
          <Field label="Telefon" htmlFor="phone" hint="Sitede 'Ara' butonunda görünür.">
            <input id="phone" name="phone" type="tel" defaultValue={shop.phone ?? ""} className={inputClass} />
          </Field>
          <Field label="WhatsApp numarası" htmlFor="whatsapp" hint="Ör. 0532 123 45 67">
            <input
              id="whatsapp"
              name="whatsapp"
              type="tel"
              defaultValue={shop.whatsapp_number ? `0${shop.whatsapp_number.slice(2)}` : ""}
              className={inputClass}
            />
          </Field>
          <Field label="Bildirim e-postası" htmlFor="email" hint="Yeni randevu bildirimleri bu adrese gelir. Sitede gösterilmez.">
            <input id="email" name="email" type="email" defaultValue={shop.email ?? ""} className={inputClass} />
          </Field>
        </div>
        <Field label="Kısa tanıtım" htmlFor="description" hint="Ana sayfanın üst bölümünde görünür (en fazla 300 karakter).">
          <textarea id="description" name="description" rows={2} maxLength={300} defaultValue={shop.description ?? ""} className={inputClass} />
        </Field>
        <Field label="Açık adres" htmlFor="address">
          <input id="address" name="address" maxLength={200} defaultValue={shop.address ?? ""} className={inputClass} />
        </Field>
        <div>
          <Button type="submit" disabled={pending}>
            Kaydet
          </Button>
        </div>
      </form>
    </Section>
  );
}

// ------------------------------------------------------------------ Logo ve kapak
export function ImagesForm({ slug, shopId, logoUrl, coverUrl }: { slug: string; shopId: string; logoUrl: string | null; coverUrl: string | null }) {
  const { run, pending, message } = useSave();
  const item = (kind: "logo" | "cover", label: string, url: string | null, maxSize: number) => (
    <div className="grid gap-2">
      <p className="text-sm font-semibold">{label}</p>
      <div className={`relative overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100 ${kind === "logo" ? "size-24 rounded-full" : "aspect-[3/1] w-full max-w-md"}`}>
        {url ? (
          <Image src={url} alt="" fill sizes="400px" className="object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-xs text-neutral-500">Yok</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <ImageUpload shopId={shopId} folder={kind} maxSize={maxSize} label={url ? "Değiştir" : "Yükle"} onUploaded={(u) => run(() => saveShopImageAction(slug, kind, u))} />
        {url && (
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => saveShopImageAction(slug, kind, null))}>
            Kaldır
          </Button>
        )}
      </div>
    </div>
  );
  return (
    <Section id="gorseller" title="Logo ve kapak görseli" description="Kapak görseli yoksa temaya uygun desenli bir arka plan kullanılır.">
      <div className="grid gap-6 sm:grid-cols-2">
        {message && <div className="sm:col-span-2">{message}</div>}
        {item("logo", "Logo", logoUrl, 400)}
        {item("cover", "Kapak görseli", coverUrl, 1920)}
      </div>
    </Section>
  );
}

// ------------------------------------------------------------------ Tema
export function ThemeForm({
  slug,
  shopName,
  initial,
}: {
  slug: string;
  shopName: string;
  initial: { preset: string; primary: string | null; accent: string | null };
}) {
  const { run, pending, message } = useSave();
  const [preset, setPreset] = useState<ThemePresetName>(
    initial.preset in THEME_PRESETS ? (initial.preset as ThemePresetName) : "modern",
  );
  const [primary, setPrimary] = useState<string | null>(initial.primary);
  const [accent, setAccent] = useState<string | null>(initial.accent);
  const theme = resolveTheme(preset, primary, accent);

  // Okunabilirlik (kontrast) uyarıları — Bölüm 9
  const warnings: string[] = [];
  if (contrastRatio(theme.onPrimary, theme.primary) < MIN_CONTRAST_RATIO)
    warnings.push("Ana renk üzerindeki buton yazısı zor okunuyor. Daha koyu veya daha açık bir ana renk seçin.");
  if (contrastRatio(theme.primary, theme.bg) < 3)
    warnings.push("Ana renk arka planda zor seçiliyor; fiyat ve başlıklarda bunun yerine normal yazı rengi kullanılacak.");
  if (contrastRatio(theme.onAccent, theme.accent) < MIN_CONTRAST_RATIO)
    warnings.push("Vurgu rengi üzerindeki yazı zor okunuyor.");

  const colorInput = (label: string, value: string | null, presetValue: string, set: (v: string | null) => void, id: string) => (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input id={id} type="color" value={value ?? presetValue} onChange={(e) => set(e.target.value)} className="h-10 w-14 cursor-pointer rounded border border-neutral-300" />
        <span className="font-mono text-sm">{value ?? presetValue}</span>
        {value && (
          <Button variant="ghost" size="sm" onClick={() => set(null)}>
            Temanın rengine dön
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Section id="tema" title="Tema ve renkler" description="Değişiklikler önizlemede hemen görünür; müşteri sitesine 'Kaydet' deyince yansır.">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="grid content-start gap-4">
          {message}
          <div role="radiogroup" aria-label="Hazır tema" className="grid grid-cols-2 gap-2">
            {(Object.keys(THEME_PRESETS) as ThemePresetName[]).map((name) => {
              const p = THEME_PRESETS[name];
              return (
                <button
                  key={name}
                  type="button"
                  role="radio"
                  aria-checked={preset === name}
                  onClick={() => setPreset(name)}
                  className={`flex items-center gap-2 rounded-lg border p-2 text-left text-sm ${preset === name ? "border-neutral-900 ring-1 ring-neutral-900" : "border-neutral-300"}`}
                >
                  <span className="flex shrink-0 overflow-hidden rounded border border-neutral-200" aria-hidden="true">
                    <span className="size-5" style={{ background: p.bg }} />
                    <span className="size-5" style={{ background: p.primary }} />
                    <span className="size-5" style={{ background: p.accent }} />
                  </span>
                  {p.label}
                </button>
              );
            })}
          </div>
          {colorInput("Ana renk", primary, THEME_PRESETS[preset].primary, setPrimary, "primary-color")}
          {colorInput("Vurgu rengi", accent, THEME_PRESETS[preset].accent, setAccent, "accent-color")}
          {warnings.map((w) => (
            <Notice key={w} tone="warning">
              {w}
            </Notice>
          ))}
          <div>
            <Button disabled={pending} onClick={() => run(() => saveThemeAction(slug, { preset, primary, accent }))}>
              Kaydet
            </Button>
          </div>
        </div>

        {/* Canlı önizleme: müşteri sitesinin küçük bir taklidi */}
        <div aria-label="Önizleme" style={themeToCssVars(theme)} className="overflow-hidden rounded-xl border border-neutral-300 bg-bg text-text">
          <div className="border-b border-border px-4 py-3 font-heading font-semibold">{shopName}</div>
          <div className="bg-surface px-4 py-8 text-center">
            <p className="font-heading text-2xl font-semibold">{shopName}</p>
            <p className="mt-1 text-sm text-muted">Mahallenin berberi</p>
            <span className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-on-primary">Randevu Al</span>
          </div>
          <div className="p-4">
            <p className="text-xs font-semibold tracking-widest text-primary-text uppercase">Hizmetler</p>
            <div className="mt-2 flex items-center justify-between rounded-lg border border-border bg-surface p-3">
              <span className="font-semibold">Saç Kesimi</span>
              <span className="font-semibold text-primary-text">₺350</span>
            </div>
            <span className="mt-3 inline-flex size-10 items-center justify-center rounded-full bg-accent font-heading font-semibold text-on-accent">AY</span>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ------------------------------------------------------------------ Linkler
export function LinksForm({ slug, links }: { slug: string; links: { maps: string | null; reviews: string | null; instagram: string | null } }) {
  const { run, pending, message } = useSave();
  return (
    <Section id="linkler" title="Harita ve sosyal medya">
      <form
        className="grid gap-4"
        action={(fd) =>
          run(() =>
            saveLinksAction(slug, {
              mapsEmbed: String(fd.get("mapsEmbed") ?? ""),
              googleReviews: String(fd.get("googleReviews") ?? ""),
              instagram: String(fd.get("instagram") ?? ""),
            }),
          )
        }
      >
        {message}
        <Field
          label="Google Haritalar (harita yerleştirme kodu)"
          htmlFor="mapsEmbed"
          hint="Google Haritalar'da dükkanınızı açın > Paylaş > Harita yerleştir > HTML'yi kopyala. Kodun tamamını buraya yapıştırın."
        >
          <textarea id="mapsEmbed" name="mapsEmbed" rows={3} defaultValue={links.maps ?? ""} className={`${inputClass} font-mono text-xs`} />
        </Field>
        <Field label="Google yorumları linki" htmlFor="googleReviews" hint="Sitedeki 'Google'daki tüm yorumlarımız' butonu bu adrese gider.">
          <input id="googleReviews" name="googleReviews" type="url" defaultValue={links.reviews ?? ""} placeholder="https://" className={inputClass} />
        </Field>
        <Field label="Instagram" htmlFor="instagram">
          <input id="instagram" name="instagram" type="url" defaultValue={links.instagram ?? ""} placeholder="https://www.instagram.com/..." className={inputClass} />
        </Field>
        <div>
          <Button type="submit" disabled={pending}>
            Kaydet
          </Button>
        </div>
      </form>
    </Section>
  );
}

// ------------------------------------------------------------------ Randevu kuralları
export function RulesForm({
  slug,
  rules,
}: {
  slug: string;
  rules: {
    slot_interval_minutes: number;
    min_notice_minutes: number;
    max_advance_days: number;
    cancel_deadline_minutes: number;
    buffer_minutes: number;
    requires_approval: boolean;
    allow_any_barber: boolean;
  };
}) {
  const { run, pending, message } = useSave();
  const num = (id: string, label: string, value: number, min: number, max: number, hint: string) => (
    <Field label={label} htmlFor={id} hint={hint}>
      <input id={id} name={id} type="number" required min={min} max={max} defaultValue={value} className={inputClass} />
    </Field>
  );
  return (
    <Section id="kurallar" title="Randevu kuralları">
      <form
        className="grid gap-4"
        action={(fd) =>
          run(() =>
            saveBookingRulesAction(slug, {
              slotIntervalMinutes: fd.get("slotIntervalMinutes"),
              minNoticeMinutes: fd.get("minNoticeMinutes"),
              maxAdvanceDays: fd.get("maxAdvanceDays"),
              cancelDeadlineMinutes: fd.get("cancelDeadlineMinutes"),
              bufferMinutes: fd.get("bufferMinutes"),
              requiresApproval: fd.get("requiresApproval") === "on",
              allowAnyBarber: fd.get("allowAnyBarber") === "on",
            }),
          )
        }
      >
        {message}
        <div className="grid gap-4 sm:grid-cols-2">
          {num("slotIntervalMinutes", "Saat aralığı (dakika)", rules.slot_interval_minutes, 5, 120, "Randevu başlangıç saatleri kaç dakikada bir (ör. 15: 09:00, 09:15...).")}
          {num("minNoticeMinutes", "En erken randevu (dakika sonra)", rules.min_notice_minutes, 0, 10080, "Şu andan en az kaç dakika sonrasına randevu alınabilir.")}
          {num("maxAdvanceDays", "En ileri tarih (gün)", rules.max_advance_days, 1, 365, "En fazla kaç gün ilerisine randevu alınabilir.")}
          {num("cancelDeadlineMinutes", "İptal/değişiklik süresi (dakika)", rules.cancel_deadline_minutes, 0, 10080, "Müşteri randevudan en geç kaç dakika önce iptal edebilir.")}
          {num("bufferMinutes", "Randevular arası pay (dakika)", rules.buffer_minutes, 0, 120, "Temizlik/hazırlık için her randevudan sonra boş bırakılan süre.")}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="requiresApproval" className="size-4" defaultChecked={rules.requires_approval} />
          Randevular benim onayımı beklesin (kapalıysa otomatik onaylanır)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="allowAnyBarber" className="size-4" defaultChecked={rules.allow_any_barber} />
          Müşteri berber seçerken &quot;Fark etmez&quot; seçeneğini görsün
        </label>
        <div>
          <Button type="submit" disabled={pending}>
            Kaydet
          </Button>
        </div>
      </form>
    </Section>
  );
}
