"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { savePlatformSettingsAction } from "@/app/admin/(app)/actions";
import { Button, Field, inputClass, Notice } from "@/components/panel/ui";
import { formatIban } from "@/lib/iban";

export function PlatformSettingsForm({
  initial,
}: {
  initial: { iban: string | null; account_holder: string | null; bank_name: string | null; payment_note: string | null };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [outcome, setOutcome] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <form
      className="grid gap-4"
      action={(fd) =>
        startTransition(async () => {
          const r = await savePlatformSettingsAction({
            iban: String(fd.get("iban") ?? ""),
            accountHolder: String(fd.get("accountHolder") ?? ""),
            bankName: String(fd.get("bankName") ?? ""),
            paymentNote: String(fd.get("paymentNote") ?? ""),
          }).catch(() => ({ ok: false as const, error: "Bağlantı hatası." }));
          setOutcome(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error });
          if (r.ok) router.refresh();
        })
      }
    >
      {outcome && <Notice tone={outcome.ok ? "success" : "error"}>{outcome.text}</Notice>}
      <Field label="IBAN" htmlFor="iban" hint="Kontrol hanesi doğrulanır; yanlış yazılmış IBAN kaydedilmez.">
        <input id="iban" name="iban" defaultValue={initial.iban ? formatIban(initial.iban) : ""} placeholder="TR00 0000 0000 0000 0000 0000 00" className={`${inputClass} font-mono`} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Alıcı adı" htmlFor="accountHolder">
          <input id="accountHolder" name="accountHolder" maxLength={100} defaultValue={initial.account_holder ?? ""} className={inputClass} />
        </Field>
        <Field label="Banka (isteğe bağlı)" htmlFor="bankName">
          <input id="bankName" name="bankName" maxLength={60} defaultValue={initial.bank_name ?? ""} className={inputClass} />
        </Field>
      </div>
      <Field label="Ödeme notu (isteğe bağlı)" htmlFor="paymentNote" hint='Ör. "Açıklamaya dükkan adınızı yazın."'>
        <input id="paymentNote" name="paymentNote" maxLength={300} defaultValue={initial.payment_note ?? ""} className={inputClass} />
      </Field>
      <div>
        <Button type="submit" disabled={pending}>
          Kaydet
        </Button>
      </div>
    </form>
  );
}
