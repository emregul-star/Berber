/**
 * Panel ana sayfası — "Bugün" (Bölüm 8.1): bugünkü randevular, bekleyen onaylar, hızlı işlemler.
 * Berber sadece kendi randevularını görür (RLS).
 */
import { formatInTimeZone } from "date-fns-tz";
import { tr } from "date-fns/locale";
import { AppointmentList } from "@/components/panel/appointments";
import { ButtonLink, Card, PageHeader } from "@/components/panel/ui";
import { TIME_ZONE } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { requirePanelUser } from "@/lib/panel/auth";
import { listAppointments, listPendingAppointments, todayRange } from "@/lib/panel/data";

export default async function TodayPage({ params }: PageProps<"/sites/[slug]/panel">) {
  const { slug } = await params;
  const user = await requirePanelUser(slug);
  const { today, tomorrow } = todayRange();

  const [todays, pending] = await Promise.all([
    listAppointments(user, { fromDate: today, toDate: tomorrow }),
    listPendingAppointments(user),
  ]);

  const active = todays.filter((a) => !a.status.startsWith("cancelled"));
  const now = new Date();
  const upcoming = active.filter((a) => new Date(a.ends_at) > now && a.status !== "no_show");
  const expected = active
    .filter((a) => a.status !== "no_show")
    .reduce((sum, a) => sum + Number(a.price_at_booking), 0);

  return (
    <>
      <PageHeader
        title="Bugün"
        description={formatInTimeZone(now, TIME_ZONE, "d MMMM yyyy, EEEE", { locale: tr })}
        actions={
          <>
            <ButtonLink href="/panel/randevular/yeni">+ Randevu ekle</ButtonLink>
            <ButtonLink href="/panel/takvim" variant="secondary">
              Takvim
            </ButtonLink>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Card>
          <p className="text-xs text-neutral-500">Bugünkü randevu</p>
          <p className="text-2xl font-bold">{active.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-neutral-500">Kalan</p>
          <p className="text-2xl font-bold">{upcoming.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-neutral-500">Tahmini kazanç</p>
          <p className="text-2xl font-bold">{formatPrice(expected)}</p>
        </Card>
      </div>

      {pending.length > 0 && (
        <section className="mb-8" aria-labelledby="pending-title">
          <h2 id="pending-title" className="mb-3 flex items-center gap-2 text-lg font-bold">
            Onay bekleyenler
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white">{pending.length}</span>
          </h2>
          <AppointmentList appointments={pending} empty="" showDate />
        </section>
      )}

      <section aria-labelledby="today-title">
        <h2 id="today-title" className="mb-3 text-lg font-bold">
          Bugünün randevuları
        </h2>
        <AppointmentList appointments={todays} empty="Bugün için randevu yok." />
      </section>
    </>
  );
}
