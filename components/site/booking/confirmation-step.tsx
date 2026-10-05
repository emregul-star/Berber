"use client";

/**
 * Adım 5: Onay ekranı — özet, yönetim linki, takvime ekle (.ics), WhatsApp'tan dükkana bildir.
 */
import Link from "next/link";
import { useState } from "react";
import type { BookingConfirmation } from "@/lib/booking";
import { formatPrice } from "@/lib/format";
import { buildIcs } from "@/lib/ics";
import { whatsappLink, whatsappTemplates } from "@/lib/whatsapp";
import { CalendarIcon, WhatsAppIcon } from "../icons";

export function ConfirmationStep({
  confirmation,
  customerName,
}: {
  confirmation: BookingConfirmation;
  customerName: string;
}) {
  const [copied, setCopied] = useState(false);
  const manageUrl = `${window.location.origin}/randevu/${confirmation.manageToken}`;
  const isPending = confirmation.status === "pending";

  function downloadIcs() {
    const ics = buildIcs({
      uid: `${confirmation.manageToken.slice(0, 16)}@berberplatform`,
      start: new Date(confirmation.startsAt),
      end: new Date(confirmation.endsAt),
      summary: `${confirmation.serviceName} — ${confirmation.shopName}`,
      description: `Berber: ${confirmation.barberName}\nRandevunuzu yönetin: ${manageUrl}`,
      location: confirmation.shopAddress ?? undefined,
      url: manageUrl,
    });
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "randevu.ics";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyManageUrl() {
    try {
      await navigator.clipboard.writeText(manageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Panoya erişim yoksa kullanıcı linki elle kopyalayabilir
    }
  }

  return (
    <div className="text-center">
      <div
        aria-hidden="true"
        className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary text-3xl text-on-primary"
      >
        ✓
      </div>
      <h2 className="mt-5 font-heading text-3xl font-semibold">
        {isPending ? "Randevu talebiniz alındı" : "Randevunuz oluşturuldu"}
      </h2>
      <p className="mt-2 text-muted">
        {isPending
          ? "Dükkan onayladığında size haber verilecek."
          : confirmation.isDemo
            ? "Sizi bekliyoruz!"
            : "Sizi bekliyoruz! Randevu bilgileri e-posta adresinize de gönderilecek."}
      </p>
      {confirmation.isDemo && (
        <p className="mt-3 text-sm font-semibold text-primary-text">Bu bir demodur; randevu gerçek değildir.</p>
      )}

      <dl className="mx-auto mt-8 grid max-w-md gap-3 rounded-2xl border border-border bg-surface p-5 text-left">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Zaman</dt>
          <dd className="text-right font-semibold">{confirmation.whenLabel}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Hizmet</dt>
          <dd className="text-right font-semibold">{confirmation.serviceName}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Berber</dt>
          <dd className="text-right font-semibold">{confirmation.barberName}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Ücret</dt>
          <dd className="text-right font-semibold">{formatPrice(confirmation.price)}</dd>
        </div>
        {confirmation.shopAddress && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Adres</dt>
            <dd className="text-right">{confirmation.shopAddress}</dd>
          </div>
        )}
      </dl>

      <div className="mx-auto mt-6 max-w-md rounded-2xl border border-border p-5 text-left">
        <p className="font-semibold">Randevunuzu yönetin</p>
        <p className="mt-1 text-sm text-muted">
          İptal etmek veya saati değiştirmek için bu linki kullanın. Linki kimseyle paylaşmayın.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            readOnly
            value={manageUrl}
            aria-label="Randevu yönetim linki"
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 rounded-xl border border-border bg-bg px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={copyManageUrl}
            className="shrink-0 rounded-xl border border-border px-4 text-sm font-semibold hover:border-primary"
          >
            {copied ? "Kopyalandı" : "Kopyala"}
          </button>
        </div>
      </div>

      <div className="mx-auto mt-6 flex max-w-md flex-col gap-3">
        <button
          type="button"
          onClick={downloadIcs}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 font-semibold text-on-primary hover:opacity-90"
        >
          <CalendarIcon /> Takvime ekle
        </button>
        {confirmation.shopWhatsapp && (
          <a
            href={whatsappLink(
              confirmation.shopWhatsapp,
              whatsappTemplates.bookingNotice({
                customerName,
                serviceName: confirmation.serviceName,
                barberName: confirmation.barberName,
                whenLabel: confirmation.whenLabel,
              }),
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 py-3.5 font-semibold text-[#0b3d1f] hover:opacity-90"
          >
            <WhatsAppIcon /> WhatsApp&apos;tan dükkana bildir
          </a>
        )}
        <Link href="/" className="mt-2 text-sm text-muted underline">
          Ana sayfaya dön
        </Link>
      </div>
    </div>
  );
}
