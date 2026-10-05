"use client";

/**
 * Adım 4: müşteri bilgileri formu (react-hook-form + zod).
 * Tarayıcıdaki doğrulama sadece kullanıcıya anında geri bildirim içindir;
 * asıl kontrol sunucuda aynı şemayla tekrar yapılır.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { customerInfoSchema, type CustomerInfo } from "@/lib/booking-schema";

const inputClass =
  "mt-1.5 block w-full rounded-xl border border-border bg-bg px-4 py-3 text-base text-text placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary aria-invalid:border-red-500";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-sm text-red-600" role="alert">
      {message}
    </p>
  );
}

export function DetailsStep({
  defaultValues,
  submitting,
  serverError,
  onSubmit,
}: {
  defaultValues?: Partial<CustomerInfo>;
  submitting: boolean;
  serverError: string | null;
  onSubmit: (values: CustomerInfo) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerInfo>({
    resolver: zodResolver(customerInfoSchema),
    defaultValues: { customerNote: "", website: "", ...defaultValues },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">
      <div>
        <label htmlFor="customerName" className="text-sm font-semibold">
          Ad soyad
        </label>
        <input
          id="customerName"
          autoComplete="name"
          className={inputClass}
          aria-invalid={Boolean(errors.customerName)}
          aria-describedby="customerName-error"
          {...register("customerName")}
        />
        <FieldError id="customerName-error" message={errors.customerName?.message} />
      </div>

      <div>
        <label htmlFor="customerPhone" className="text-sm font-semibold">
          Cep telefonu
        </label>
        <input
          id="customerPhone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0532 123 45 67"
          className={inputClass}
          aria-invalid={Boolean(errors.customerPhone)}
          aria-describedby="customerPhone-error"
          {...register("customerPhone")}
        />
        <FieldError id="customerPhone-error" message={errors.customerPhone?.message} />
      </div>

      <div>
        <label htmlFor="customerEmail" className="text-sm font-semibold">
          E-posta
        </label>
        <input
          id="customerEmail"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="ornek@mail.com"
          className={inputClass}
          aria-invalid={Boolean(errors.customerEmail)}
          aria-describedby="customerEmail-error customerEmail-hint"
          {...register("customerEmail")}
        />
        <p id="customerEmail-hint" className="mt-1.5 text-xs text-muted">
          Randevu özeti ve randevunuzu yönetme linki bu adrese gönderilir.
        </p>
        <FieldError id="customerEmail-error" message={errors.customerEmail?.message} />
      </div>

      <div>
        <label htmlFor="customerNote" className="text-sm font-semibold">
          Not <span className="font-normal text-muted">(isteğe bağlı)</span>
        </label>
        <textarea
          id="customerNote"
          rows={3}
          className={inputClass}
          aria-invalid={Boolean(errors.customerNote)}
          aria-describedby="customerNote-error"
          {...register("customerNote")}
        />
        <FieldError id="customerNote-error" message={errors.customerNote?.message} />
      </div>

      {/* Honeypot: gerçek kullanıcılar görmez. Botlar doldurursa sunucu isteği reddeder. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">Web siteniz (boş bırakın)</label>
        <input id="website" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>

      <div>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-5 shrink-0 accent-[var(--color-primary)]"
            aria-invalid={Boolean(errors.kvkkConsent)}
            aria-describedby="kvkkConsent-error"
            {...register("kvkkConsent")}
          />
          <span>
            <a href="/kvkk" target="_blank" rel="noopener noreferrer" className="font-semibold underline">
              KVKK Aydınlatma Metni
            </a>
            &apos;ni okudum, kişisel verilerimin randevumun oluşturulması ve yönetilmesi amacıyla
            işlenmesini kabul ediyorum.
          </span>
        </label>
        <FieldError id="kvkkConsent-error" message={errors.kvkkConsent?.message} />
      </div>

      {serverError && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-primary px-6 py-3.5 font-semibold text-on-primary transition hover:opacity-90 disabled:opacity-60"
      >
        {submitting ? "Randevunuz oluşturuluyor…" : "Randevuyu onayla"}
      </button>
    </form>
  );
}
