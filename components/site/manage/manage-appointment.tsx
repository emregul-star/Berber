"use client";

/**
 * Randevu yönetim sayfasının etkileşimli kısmı: özet, iptal (onay penceresiyle), saat değiştirme.
 * Kurallar sunucuda tekrar kontrol edilir; buradaki gizle/göster sadece kullanıcı kolaylığıdır.
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  cancelAppointmentAction,
  rescheduleAppointmentAction,
} from "@/app/sites/[slug]/(site)/randevu/[token]/actions";
import type { ManagedAppointment } from "@/lib/manage";
import { STATUS_LABELS } from "@/lib/manage-rules";
import { formatPrice } from "@/lib/format";
import { telHref } from "@/lib/links";
import { whatsappLink } from "@/lib/whatsapp";
import { DateTimeStep } from "../booking/datetime-step";
import type { WizardDay, WizardSlot } from "../booking/types";
import { BOOKING_PATH } from "../ui";
import { PhoneIcon, WhatsAppIcon } from "../icons";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900",
  confirmed: "bg-green-100 text-green-900",
  completed: "bg-surface text-text",
};

export function ManageAppointment({
  appointment,
  token,
  days,
}: {
  appointment: ManagedAppointment;
  token: string;
  days: WizardDay[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "reschedule">("view");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Saat değiştirme durumu
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<WizardSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<WizardSlot | null>(null);
  const latestRequest = useRef(0);
  const cancelDialog = useRef<HTMLDialogElement>(null);

  const { shop } = appointment;
  const canModify = appointment.blockReason === null;

  async function loadSlots(forDate: string) {
    const requestId = ++latestRequest.current;
    setSlotsLoading(true);
    setSlotsError(null);
    setSlots([]);
    try {
      const response = await fetch(`/randevu/${token}/saatler?date=${forDate}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const body = (await response.json()) as { slots: WizardSlot[] };
      if (requestId === latestRequest.current) setSlots(body.slots);
    } catch {
      if (requestId === latestRequest.current) setSlotsError("Boş saatler yüklenemedi. Lütfen tekrar deneyin.");
    } finally {
      if (requestId === latestRequest.current) setSlotsLoading(false);
    }
  }

  function startReschedule() {
    setMessage(null);
    setMode("reschedule");
    setSelectedSlot(null);
    const first = date ?? days[0]?.date;
    if (first) {
      setDate(first);
      void loadSlots(first);
    }
  }

  async function confirmReschedule() {
    if (!selectedSlot) return;
    setBusy(true);
    setMessage(null);
    const result = await rescheduleAppointmentAction(shop.slug, token, selectedSlot.startsAt).catch(() => null);
    setBusy(false);
    if (result?.ok) {
      setMode("view");
      setMessage({ type: "success", text: `Randevunuzun saati değiştirildi: ${result.whenLabel}` });
      router.refresh();
    } else {
      setMessage({ type: "error", text: result?.error ?? "Bağlantı hatası. Lütfen tekrar deneyin." });
      if (result?.code === "slot_taken" && date) {
        setSelectedSlot(null);
        void loadSlots(date);
      }
    }
  }

  async function confirmCancel() {
    setBusy(true);
    setMessage(null);
    const result = await cancelAppointmentAction(shop.slug, token).catch(() => null);
    setBusy(false);
    cancelDialog.current?.close();
    if (result?.ok) {
      setMessage({ type: "success", text: "Randevunuz iptal edildi." });
      router.refresh();
    } else {
      setMessage({ type: "error", text: result?.error ?? "Bağlantı hatası. Lütfen tekrar deneyin." });
    }
  }

  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.2em] text-primary-text uppercase">{shop.name}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-3xl font-semibold">Randevunuz</h1>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            STATUS_STYLES[appointment.status] ?? "bg-red-100 text-red-900"
          }`}
        >
          {STATUS_LABELS[appointment.status] ?? appointment.status}
        </span>
      </div>

      {shop.isDemo && <p className="mt-3 text-sm font-semibold text-primary-text">Bu bir demodur; randevu gerçek değildir.</p>}

      {message && (
        <p
          role={message.type === "error" ? "alert" : "status"}
          className={`mt-6 rounded-xl p-3 text-sm ${
            message.type === "success" ? "bg-green-50 text-green-900" : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </p>
      )}

      <dl className="mt-6 grid gap-3 rounded-2xl border border-border bg-surface p-5">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Zaman</dt>
          <dd className="text-right font-semibold">{appointment.whenLabel}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Hizmet</dt>
          <dd className="text-right font-semibold">{appointment.serviceName}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Berber</dt>
          <dd className="text-right font-semibold">{appointment.barberName}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Ücret</dt>
          <dd className="text-right font-semibold">{formatPrice(appointment.price)}</dd>
        </div>
        {shop.address && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Adres</dt>
            <dd className="text-right">{shop.address}</dd>
          </div>
        )}
      </dl>

      {canModify && mode === "view" && (
        <>
          <p className="mt-4 text-sm text-muted">
            En geç <strong className="text-text">{appointment.deadlineLabel}</strong> tarihine kadar iptal edebilir veya
            saatini değiştirebilirsiniz.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={startReschedule}
              className="flex-1 rounded-full bg-primary px-6 py-3.5 font-semibold text-on-primary hover:opacity-90"
            >
              Saati değiştir
            </button>
            <button
              type="button"
              onClick={() => {
                setMessage(null);
                cancelDialog.current?.showModal();
              }}
              className="flex-1 rounded-full border border-border px-6 py-3.5 font-semibold hover:border-red-500 hover:text-red-600"
            >
              Randevuyu iptal et
            </button>
          </div>
        </>
      )}

      {canModify && mode === "reschedule" && (
        <section className="mt-8" aria-labelledby="reschedule-title">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="reschedule-title" className="font-heading text-2xl font-semibold">
              Yeni gün ve saat
            </h2>
            <button type="button" onClick={() => setMode("view")} className="text-sm text-muted underline">
              Vazgeç
            </button>
          </div>
          <p className="mb-4 text-sm text-muted">
            Aynı hizmet ve berber için yeni bir zaman seçin ({appointment.barberName}).
          </p>
          <DateTimeStep
            days={days}
            selectedDate={date}
            onSelectDate={(d) => {
              setDate(d);
              setSelectedSlot(null);
              void loadSlots(d);
            }}
            slots={slots}
            loading={slotsLoading}
            error={slotsError}
            selectedSlot={selectedSlot?.startsAt ?? null}
            onSelectSlot={setSelectedSlot}
          />
          <button
            type="button"
            disabled={!selectedSlot || busy}
            onClick={confirmReschedule}
            className="mt-6 w-full rounded-full bg-primary px-6 py-3.5 font-semibold text-on-primary hover:opacity-90 disabled:opacity-50"
          >
            {busy
              ? "Değiştiriliyor…"
              : selectedSlot
                ? `Yeni saati onayla (${days.find((d) => d.date === date)?.fullLabel}, ${selectedSlot.label})`
                : "Yeni saat seçin"}
          </button>
        </section>
      )}

      {/* Süre sınırı geçti: butonlar kapalı, dükkanı aramaya yönlendir */}
      {appointment.blockReason === "deadline" && (
        <div className="mt-6 rounded-2xl border border-border p-5">
          <p className="font-semibold">Değişiklik için lütfen dükkanı arayın</p>
          <p className="mt-1 text-sm text-muted">
            Online iptal ve saat değiştirme süresi ({appointment.deadlineLabel}) geçti.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            {shop.phone && (
              <a
                href={telHref(shop.phone)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-on-primary"
              >
                <PhoneIcon /> {shop.phone}
              </a>
            )}
            {shop.whatsappNumber && (
              <a
                href={whatsappLink(
                  shop.whatsappNumber,
                  `Merhaba, ${appointment.whenLabel} tarihli randevum hakkında yazıyorum.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3 font-semibold text-[#0b3d1f]"
              >
                <WhatsAppIcon /> WhatsApp
              </a>
            )}
          </div>
        </div>
      )}

      {(appointment.blockReason === "not_active" || appointment.blockReason === "past") && (
        <Link
          href={BOOKING_PATH}
          className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 font-semibold text-on-primary hover:opacity-90"
        >
          Yeni randevu al
        </Link>
      )}

      <dialog
        ref={cancelDialog}
        aria-labelledby="cancel-title"
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-bg p-6 text-text backdrop:bg-black/60"
      >
        <h2 id="cancel-title" className="text-lg font-semibold">
          Randevuyu iptal etmek istiyor musunuz?
        </h2>
        <p className="mt-2 text-sm text-muted">
          {appointment.whenLabel} tarihli randevunuz iptal edilecek. Bu işlem geri alınamaz.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => cancelDialog.current?.close()}
            className="rounded-full border border-border px-5 py-2.5 font-semibold"
          >
            Vazgeç
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={confirmCancel}
            className="rounded-full bg-red-600 px-5 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {busy ? "İptal ediliyor…" : "Evet, iptal et"}
          </button>
        </div>
      </dialog>
    </div>
  );
}
