"use client";

/**
 * Randevu alma sihirbazı (Bölüm 7.2): Hizmet -> Berber -> Tarih ve saat -> Bilgiler -> Onay
 *
 * Tüm seçim durumu burada tutulur. Boş saatler sunucudan (GET /randevu-al/saatler) alınır,
 * randevu Server Action ile (submitBooking) sunucuda oluşturulur.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { submitBooking } from "@/app/sites/[slug]/(site)/randevu-al/actions";
import type { BookingConfirmation } from "@/lib/booking";
import { ANY_BARBER, type CustomerInfo } from "@/lib/booking-schema";
import { ConfirmationStep } from "./confirmation-step";
import { DateTimeStep } from "./datetime-step";
import { DetailsStep } from "./details-step";
import { BarberStep, SelectionSummary, ServiceStep, StepProgress } from "./steps";
import type { WizardBarber, WizardDay, WizardService, WizardShop, WizardSlot } from "./types";

type Step = 1 | 2 | 3 | 4 | 5;

const STEP_TITLES: Record<Step, string> = {
  1: "Hangi hizmeti almak istersiniz?",
  2: "Berberinizi seçin",
  3: "Gün ve saat seçin",
  4: "Bilgileriniz",
  5: "",
};

export function BookingWizard({
  shop,
  services,
  barbers,
  days,
}: {
  shop: WizardShop;
  services: WizardService[];
  barbers: WizardBarber[];
  days: WizardDay[];
}) {
  const [step, setStep] = useState<Step>(1);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<WizardSlot | null>(null);

  const [slots, setSlots] = useState<WizardSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);

  const headingRef = useRef<HTMLHeadingElement>(null);

  const service = services.find((s) => s.id === serviceId);
  const offeringBarbers = barbers.filter((b) => serviceId && b.serviceIds.includes(serviceId));
  // Bu hizmeti tek berber veriyorsa berber adımını atla
  const skipBarberStep = offeringBarbers.length === 1;
  const barberName =
    barberId === ANY_BARBER ? "Fark etmez" : (barbers.find((b) => b.id === barberId)?.name ?? null);
  const whenLabel = slot && date ? `${days.find((d) => d.date === date)?.fullLabel}, ${slot.label}` : null;

  // Adım değişince başlığa odaklan (ekran okuyucu ve mobilde sayfanın üstüne kaydırma)
  useEffect(() => {
    headingRef.current?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  // Her saat isteğine artan bir numara verilir. Müşteri hızlıca gün değiştirirse eski isteğin
  // geç gelen yanıtı yeni günün saatlerinin üzerine yazılmasın diye sadece en sonuncusu kabul edilir.
  const latestRequest = useRef(0);

  // Seçimler parametre olarak verilir; state güncellemesi henüz yansımamış olsa da doğru değerle çalışır.
  const loadSlots = useCallback(
    async (forDate: string, forService: string | null = serviceId, forBarber: string | null = barberId) => {
      if (!forService || !forBarber) return;
      const requestId = ++latestRequest.current;
      setSlotsLoading(true);
      setSlotsError(null);
      setSlots([]);
      try {
        const params = new URLSearchParams({ serviceId: forService, barberId: forBarber, date: forDate });
        const response = await fetch(`/randevu-al/saatler?${params}`, { cache: "no-store" });
        if (!response.ok) throw new Error();
        const body = (await response.json()) as { slots: WizardSlot[] };
        if (requestId === latestRequest.current) setSlots(body.slots);
      } catch {
        if (requestId === latestRequest.current) setSlotsError("Boş saatler yüklenemedi. Lütfen tekrar deneyin.");
      } finally {
        if (requestId === latestRequest.current) setSlotsLoading(false);
      }
    },
    [serviceId, barberId],
  );

  /** Tarih adımına geç: seçili gün yoksa ilk günü (bugün) seç ve saatlerini getir */
  function enterDateStep(forService: string, forBarber: string) {
    const initial = date ?? days[0]?.date;
    setStep(3);
    if (!initial) return;
    setDate(initial);
    void loadSlots(initial, forService, forBarber);
  }

  function chooseService(id: string) {
    setServiceId(id);
    setSlot(null);
    const offering = barbers.filter((b) => b.serviceIds.includes(id));
    if (offering.length === 1) {
      setBarberId(offering[0].id);
      enterDateStep(id, offering[0].id);
    } else {
      setBarberId(null);
      setStep(2);
    }
  }

  function chooseBarber(id: string) {
    setBarberId(id);
    setSlot(null);
    if (serviceId) enterDateStep(serviceId, id);
  }

  function chooseDate(newDate: string) {
    setDate(newDate);
    setSlot(null);
    void loadSlots(newDate);
  }

  function goBack() {
    setServerError(null);
    if (step === 3 && skipBarberStep) setStep(1);
    else if (step > 1 && step < 5) setStep((step - 1) as Step);
  }

  async function submit(values: CustomerInfo) {
    if (!serviceId || !barberId || !slot) return;
    setSubmitting(true);
    setServerError(null);
    setCustomer(values);
    try {
      const result = await submitBooking(shop.slug, {
        ...values,
        serviceId,
        barberId,
        startsAt: slot.startsAt,
      });
      if (result.ok) {
        setConfirmation(result.confirmation);
        setStep(5);
      } else if (result.code === "slot_taken") {
        // Saat az önce doldu: saat seçimine dön ve güncel saatleri göster
        setSlot(null);
        setStep(3);
        setSlotsError(null);
        setServerError(result.error);
        if (date) void loadSlots(date);
      } else {
        setServerError(result.error);
      }
    } catch {
      setServerError("Bağlantı hatası. Lütfen internetinizi kontrol edip tekrar deneyin.");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 5 && confirmation) {
    return <ConfirmationStep confirmation={confirmation} customerName={customer?.customerName ?? ""} shopSlug={shop.slug} />;
  }

  return (
    <div>
      {shop.isDemo && (
        <p className="mb-6 rounded-xl border border-primary p-3 text-center text-sm">
          Bu bir demodur. Randevu alabilirsiniz ama randevu gerçek değildir ve e-posta gönderilmez.
        </p>
      )}

      <StepProgress current={step} />

      <div className="mt-8 flex items-center justify-between gap-4">
        <h1 ref={headingRef} tabIndex={-1} className="font-heading text-2xl font-semibold outline-none sm:text-3xl">
          {STEP_TITLES[step]}
        </h1>
        {step > 1 && (
          <button type="button" onClick={goBack} className="shrink-0 text-sm text-muted underline hover:text-text">
            Geri
          </button>
        )}
      </div>

      {step >= 3 && (
        <div className="mt-5">
          <SelectionSummary service={service} barberName={barberName} whenLabel={step === 4 ? whenLabel : null} />
        </div>
      )}

      <div className="mt-6">
        {step === 1 && <ServiceStep services={services} selectedId={serviceId} onSelect={chooseService} />}

        {step === 2 && (
          <BarberStep
            barbers={offeringBarbers}
            allowAny={shop.allowAnyBarber}
            selectedId={barberId}
            onSelect={chooseBarber}
          />
        )}

        {step === 3 && (
          <>
            {serverError && (
              <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
                {serverError}
              </p>
            )}
            <DateTimeStep
              days={days}
              selectedDate={date}
              onSelectDate={chooseDate}
              slots={slots}
              loading={slotsLoading}
              error={slotsError}
              selectedSlot={slot?.startsAt ?? null}
              onSelectSlot={(s) => {
                setSlot(s);
                setServerError(null);
                setStep(4);
              }}
            />
          </>
        )}

        {step === 4 && (
          <DetailsStep
            defaultValues={customer ?? undefined}
            submitting={submitting}
            serverError={serverError}
            onSubmit={submit}
          />
        )}
      </div>
    </div>
  );
}
