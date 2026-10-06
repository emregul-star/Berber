"use client";

/**
 * Yönetici panelindeki tek tıklık işlem butonları (onay sorar, sonucu gösterir, sayfayı yeniler).
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { resetDemoAction, resetMemberPasswordAction, setShopStatusAction } from "@/app/admin/(app)/actions";
import { Button, Notice } from "@/components/panel/ui";

type Outcome = { ok: boolean; text: string; tempPassword?: string } | null;

function useRun() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [outcome, setOutcome] = useState<Outcome>(null);
  const run = (confirmText: string, fn: () => Promise<{ ok: true; message: string; tempPassword?: string } | { ok: false; error: string }>) => {
    if (!confirm(confirmText)) return;
    setOutcome(null);
    startTransition(async () => {
      const r = await fn().catch(() => ({ ok: false as const, error: "Bağlantı hatası." }));
      setOutcome(r.ok ? { ok: true, text: r.message, tempPassword: r.tempPassword } : { ok: false, text: r.error });
      if (r.ok) router.refresh();
    });
  };
  const notice = outcome && (
    <Notice tone={outcome.ok ? "success" : "error"}>
      {outcome.text}
      {outcome.tempPassword && (
        <span className="mt-2 block">
          Geçici şifre: <code className="rounded bg-white px-2 py-1 font-mono text-base font-bold select-all">{outcome.tempPassword}</code>{" "}
          <span className="text-xs">(Bir daha gösterilmez.)</span>
        </span>
      )}
    </Notice>
  );
  return { run, pending, notice };
}

export function ResetDemoButton() {
  const { run, pending, notice } = useRun();
  return (
    <div className="grid gap-2">
      <Button variant="secondary" disabled={pending} onClick={() => run("Demo dükkanın tüm verileri baştan oluşturulacak. Emin misiniz?", resetDemoAction)}>
        {pending ? "Sıfırlanıyor…" : "Demo'yu sıfırla"}
      </Button>
      {notice}
    </div>
  );
}

export function ShopStatusButton({ shopId, status, shopName }: { shopId: string; status: string; shopName: string }) {
  const { run, pending, notice } = useRun();
  const suspended = status === "suspended";
  return (
    <div className="grid gap-2">
      <Button
        variant={suspended ? "primary" : "danger"}
        disabled={pending}
        onClick={() =>
          run(
            suspended ? `${shopName} tekrar aktif edilsin mi?` : `${shopName} askıya alınsın mı? Müşteri sitesi "hizmet dışı" görünecek.`,
            () => setShopStatusAction(shopId, suspended ? "active" : "suspended"),
          )
        }
      >
        {suspended ? "Aktif et" : "Askıya al"}
      </Button>
      {notice}
    </div>
  );
}

export function ResetPasswordButton({ shopId, userId, email }: { shopId: string; userId: string; email: string }) {
  const { run, pending, notice } = useRun();
  return (
    <div className="grid gap-2">
      <Button variant="secondary" size="sm" disabled={pending} onClick={() => run(`${email} için yeni geçici şifre oluşturulsun mu?`, () => resetMemberPasswordAction(shopId, userId))}>
        Geçici şifre ver
      </Button>
      {notice}
    </div>
  );
}
