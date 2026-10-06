"use client";

/**
 * Panel giriş ve şifre formları. useActionState: form gönderilirken "bekleniyor" durumu ve
 * sunucudan dönen hata/başarı mesajı için. JavaScript kapalıyken de çalışır.
 */
import { useActionState, useEffect, useState, useTransition } from "react";
import type { FormState } from "@/app/sites/[slug]/panel/auth-actions";
import { Field, inputClass, Notice } from "./ui";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

export function LoginForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  // Sunucu "şuraya git" dediyse sayfayı tamamen yeniden yükle (istek proxy'den geçsin diye)
  useEffect(() => {
    if (state?.redirectTo) window.location.assign(state.redirectTo);
  }, [state]);
  return (
    <form action={formAction} className="grid gap-4">
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      <Field label="E-posta" htmlFor="email">
        <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} />
      </Field>
      <Field label="Şifre" htmlFor="password">
        <input id="password" name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </Field>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-neutral-900 px-4 py-3 font-semibold text-white hover:bg-neutral-700 disabled:opacity-60"
      >
        {pending ? "Giriş yapılıyor…" : "Giriş yap"}
      </button>
    </form>
  );
}

/** Demo dükkan giriş sayfasında: "Sahip olarak dene" / "Berber olarak dene" */
export function DemoLoginButtons({ owner, barber }: { owner?: () => Promise<FormState>; barber?: () => Promise<FormState> }) {
  const [state, setState] = useState<FormState>(undefined);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (state?.redirectTo) window.location.assign(state.redirectTo);
  }, [state]);
  const run = (action: () => Promise<FormState>) =>
    startTransition(async () => setState(await action().catch(() => ({ error: "Bağlantı hatası." }))));
  const buttonClass =
    "rounded-lg border-2 border-neutral-900 px-4 py-2.5 text-sm font-semibold text-neutral-900 hover:bg-neutral-100 disabled:opacity-60";
  return (
    <div className="mb-6 rounded-lg bg-amber-50 p-4">
      <p className="mb-3 text-sm text-amber-950">
        <strong>Demo panel:</strong> şifre gerekmeden deneyebilirsiniz. Yaptığınız değişiklikler her gece sıfırlanır.
      </p>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      <div className="grid gap-2 sm:grid-cols-2">
        {owner && (
          <button type="button" disabled={pending} onClick={() => run(owner)} className={buttonClass}>
            Dükkan sahibi olarak dene
          </button>
        )}
        {barber && (
          <button type="button" disabled={pending} onClick={() => run(barber)} className={buttonClass}>
            Berber olarak dene
          </button>
        )}
      </div>
      {pending && <p className="mt-2 text-xs text-amber-900" role="status">Giriş yapılıyor…</p>}
    </div>
  );
}

export function ChangePasswordForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="grid max-w-md gap-4">
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.success && <Notice tone="success">{state.success}</Notice>}
      <Field label="Yeni şifre" htmlFor="password" hint="En az 8 karakter.">
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className={inputClass} />
      </Field>
      <Field label="Yeni şifre (tekrar)" htmlFor="confirm">
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className={inputClass} />
      </Field>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-neutral-900 px-4 py-3 font-semibold text-white hover:bg-neutral-700 disabled:opacity-60"
      >
        {pending ? "Kaydediliyor…" : "Şifreyi değiştir"}
      </button>
    </form>
  );
}

export function ResetRequestForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="grid gap-4">
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.success && <Notice tone="success">{state.success}</Notice>}
      <Field label="E-posta" htmlFor="email">
        <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} />
      </Field>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-neutral-900 px-4 py-3 font-semibold text-white hover:bg-neutral-700 disabled:opacity-60"
      >
        {pending ? "Gönderiliyor…" : "Sıfırlama linki gönder"}
      </button>
    </form>
  );
}
