"use client";

/**
 * Panel giriş ve şifre formları. useActionState: form gönderilirken "bekleniyor" durumu ve
 * sunucudan dönen hata/başarı mesajı için. JavaScript kapalıyken de çalışır.
 */
import { useActionState, useEffect } from "react";
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
