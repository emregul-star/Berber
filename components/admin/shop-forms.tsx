"use client";

/**
 * Dükkan detayı formları: abonelik bilgileri ve ödeme ekleme.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addPaymentAction, deletePaymentAction, updateSubscriptionAction } from "@/app/admin/(app)/actions";
import { Button, Field, inputClass, Notice } from "@/components/panel/ui";
import { addMonthsClamped } from "@/lib/billing";

type Outcome = { ok: boolean; text: string } | null;

function useAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [outcome, setOutcome] = useState<Outcome>(null);
  const run = (fn: () => Promise<{ ok: true; message: string } | { ok: false; error: string }>) => {
    setOutcome(null);
    startTransition(async () => {
      const r = await fn().catch(() => ({ ok: false as const, error: "Bağlantı hatası." }));
      setOutcome(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error });
      if (r.ok) router.refresh();
    });
  };
  return { run, pending, notice: outcome && <Notice tone={outcome.ok ? "success" : "error"}>{outcome.text}</Notice> };
}

export function SubscriptionForm({
  shopId,
  initial,
}: {
  shopId: string;
  initial: { setup_fee: number; monthly_fee: number; billing_day: number; notes: string | null };
}) {
  const { run, pending, notice } = useAction();
  return (
    <form
      className="grid gap-4"
      action={(fd) =>
        run(() =>
          updateSubscriptionAction({
            shopId,
            setupFee: fd.get("setupFee"),
            monthlyFee: fd.get("monthlyFee"),
            billingDay: fd.get("billingDay"),
            notes: fd.get("notes"),
          }),
        )
      }
    >
      {notice}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Kurulum ücreti (₺)" htmlFor="setupFee">
          <input id="setupFee" name="setupFee" type="number" min={0} step="0.01" defaultValue={initial.setup_fee} className={inputClass} />
        </Field>
        <Field label="Aylık ücret (₺)" htmlFor="monthlyFee">
          <input id="monthlyFee" name="monthlyFee" type="number" min={0} step="0.01" defaultValue={initial.monthly_fee} className={inputClass} />
        </Field>
        <Field label="Ödeme günü" htmlFor="billingDay">
          <input id="billingDay" name="billingDay" type="number" min={1} max={28} defaultValue={initial.billing_day} className={inputClass} />
        </Field>
      </div>
      <Field label="Notlar" htmlFor="notes" hint="DİKKAT: Dükkan sahibi kendi abonelik bilgisini görebildiği için bu notu da görebilir.">
        <textarea id="notes" name="notes" rows={2} maxLength={1000} defaultValue={initial.notes ?? ""} className={inputClass} />
      </Field>
      <div>
        <Button type="submit" disabled={pending}>
          Kaydet
        </Button>
      </div>
    </form>
  );
}

export function PaymentForm({
  shopId,
  monthlyFee,
  setupFee,
  suggestedStart,
  today,
}: {
  shopId: string;
  monthlyFee: number;
  setupFee: number;
  /** Bir sonraki aylık dönemin önerilen başlangıcı (paid_until'in ertesi günü veya bugün) */
  suggestedStart: string;
  today: string;
}) {
  const { run, pending, notice } = useAction();
  const [type, setType] = useState<"monthly" | "setup">("monthly");
  const [months, setMonths] = useState(1);
  const [periodStart, setPeriodStart] = useState(suggestedStart);
  const [amount, setAmount] = useState(String(monthlyFee));
  const endFor = (start: string, m: number) => {
    const end = addMonthsClamped(start, m);
    const d = new Date(`${end}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  };
  const [periodEnd, setPeriodEnd] = useState(endFor(suggestedStart, 1));

  return (
    <form
      className="grid gap-4"
      action={(fd) =>
        run(() =>
          addPaymentAction({
            shopId,
            amount,
            type,
            method: fd.get("method"),
            paidAt: fd.get("paidAt"),
            periodStart: type === "monthly" ? periodStart : "",
            periodEnd: type === "monthly" ? periodEnd : "",
          }),
        )
      }
    >
      {notice}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Tür" htmlFor="type">
          <select
            id="type"
            value={type}
            onChange={(e) => {
              const t = e.target.value as "monthly" | "setup";
              setType(t);
              setAmount(String(t === "setup" ? setupFee : monthlyFee * months));
            }}
            className={inputClass}
          >
            <option value="monthly">Aylık ücret</option>
            <option value="setup">Kurulum ücreti</option>
          </select>
        </Field>
        <Field label="Tutar (₺)" htmlFor="amount">
          <input id="amount" type="number" min={0.01} step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Yöntem" htmlFor="method">
          <select id="method" name="method" defaultValue="iban" className={inputClass}>
            <option value="iban">Havale / EFT (IBAN)</option>
            <option value="cash">Nakit</option>
            <option value="online">Online</option>
          </select>
        </Field>
        <Field label="Ödeme tarihi" htmlFor="paidAt">
          <input id="paidAt" name="paidAt" type="date" required defaultValue={today} className={inputClass} />
        </Field>
        {type === "monthly" && (
          <>
            <Field label="Kaç aylık" htmlFor="months">
              <select
                id="months"
                value={months}
                onChange={(e) => {
                  const m = Number(e.target.value);
                  setMonths(m);
                  setPeriodEnd(endFor(periodStart, m));
                  setAmount(String(monthlyFee * m));
                }}
                className={inputClass}
              >
                {[1, 2, 3, 6, 12].map((m) => (
                  <option key={m} value={m}>
                    {m} ay
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Dönem" htmlFor="periodStart" hint={`Bitiş: ${periodEnd}`}>
              <input
                id="periodStart"
                type="date"
                required
                value={periodStart}
                onChange={(e) => {
                  setPeriodStart(e.target.value);
                  setPeriodEnd(endFor(e.target.value, months));
                }}
                className={inputClass}
              />
            </Field>
          </>
        )}
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Kaydediliyor…" : "Ödemeyi kaydet"}
        </Button>
      </div>
    </form>
  );
}

export function DeletePaymentButton({ paymentId }: { paymentId: string }) {
  const { run, pending, notice } = useAction();
  return (
    <span className="inline-grid gap-1">
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (confirm("Bu ödeme kaydı silinsin mi?")) run(() => deletePaymentAction(paymentId));
        }}
      >
        Sil
      </Button>
      {notice}
    </span>
  );
}
