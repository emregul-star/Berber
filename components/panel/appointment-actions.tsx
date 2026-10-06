"use client";

/**
 * Randevu detayındaki işlem butonları: onayla, iptal et (sebep isteğe bağlı), geldi, gelmedi.
 * İşlemler Server Action ile yapılır; sunucu durum geçişini ve yetkiyi tekrar kontrol eder.
 */
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { setAppointmentStatusAction } from "@/app/sites/[slug]/panel/(app)/randevular/actions";
import { Button, inputClass, Notice } from "./ui";

type Status = "confirmed" | "cancelled_by_shop" | "completed" | "no_show";

export function AppointmentActions({
  slug,
  appointmentId,
  status,
  isPast,
}: {
  slug: string;
  appointmentId: string;
  status: string;
  /** Randevu saati geldi mi (geldi/gelmedi sadece bundan sonra) */
  isPast: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [reason, setReason] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);

  function run(next: Status) {
    setResult(null);
    startTransition(async () => {
      const res = await setAppointmentStatusAction(slug, {
        id: appointmentId,
        status: next,
        reason: next === "cancelled_by_shop" ? reason : undefined,
      }).catch(() => ({ ok: false as const, error: "Bağlantı hatası." }));
      dialog.current?.close();
      setResult(res.ok ? { ok: true, text: res.message ?? "Kaydedildi." } : { ok: false, text: res.error });
      if (res.ok) router.refresh();
    });
  }

  const canConfirm = status === "pending";
  const canCancel = status === "pending" || status === "confirmed";
  const canMark = status === "confirmed" && isPast;
  const canCorrect = status === "completed" || status === "no_show";

  return (
    <div className="grid gap-3">
      {result && <Notice tone={result.ok ? "success" : "error"}>{result.text}</Notice>}
      <div className="flex flex-wrap gap-2">
        {canConfirm && (
          <Button disabled={pending} onClick={() => run("confirmed")}>
            Onayla
          </Button>
        )}
        {canMark && (
          <>
            <Button disabled={pending} onClick={() => run("completed")}>
              Geldi / tamamlandı
            </Button>
            <Button variant="secondary" disabled={pending} onClick={() => run("no_show")}>
              Gelmedi
            </Button>
          </>
        )}
        {canCorrect && (
          <Button variant="secondary" disabled={pending} onClick={() => run(status === "completed" ? "no_show" : "completed")}>
            {status === "completed" ? "Düzelt: gelmedi" : "Düzelt: geldi"}
          </Button>
        )}
        {canCancel && (
          <Button variant="danger" disabled={pending} onClick={() => dialog.current?.showModal()}>
            İptal et
          </Button>
        )}
      </div>
      {status === "confirmed" && !isPast && (
        <p className="text-xs text-neutral-500">&quot;Geldi&quot; ve &quot;Gelmedi&quot; randevu saati gelince işaretlenebilir.</p>
      )}

      <dialog
        ref={dialog}
        aria-labelledby="cancel-dialog-title"
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl p-5 backdrop:bg-black/50"
      >
        <h2 id="cancel-dialog-title" className="text-lg font-bold">
          Randevuyu iptal et
        </h2>
        <p className="mt-1 text-sm text-neutral-600">Müşteriye e-posta adresi varsa iptal bildirimi gönderilir.</p>
        <label htmlFor="cancel-reason" className="mt-4 block text-sm font-semibold">
          Sebep <span className="font-normal text-neutral-500">(isteğe bağlı, müşteriye iletilir)</span>
        </label>
        <textarea
          id="cancel-reason"
          rows={3}
          maxLength={300}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className={inputClass}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => dialog.current?.close()}>
            Vazgeç
          </Button>
          <Button variant="danger" disabled={pending} onClick={() => run("cancelled_by_shop")}>
            {pending ? "İptal ediliyor…" : "İptal et"}
          </Button>
        </div>
      </dialog>
    </div>
  );
}
