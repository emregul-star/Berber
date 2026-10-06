/**
 * İstatistikler (Bölüm 8.3). Hesaplar sunucuda yapılır (lib/stats.ts).
 * Berber sadece kendi randevularının istatistiğini görür (veritabanı kuralı, RLS).
 * Dönem adres çubuğunda tutulur: ?donem=bugun|hafta|ay|gecen-ay|ozel&baslangic=..&bitis=..
 */
import { formatInTimeZone } from "date-fns-tz";
import { tr } from "date-fns/locale";
import Link from "next/link";
import { BarList, ColumnChart, DataTable } from "@/components/panel/charts";
import { buttonClass, Card, inlineInputClass, PageHeader } from "@/components/panel/ui";
import { addDaysToDate, zonedDateTime } from "@/lib/availability";
import { TIME_ZONE } from "@/lib/constants";
import { formatPrice, WEEKDAY_NAMES, WEEKDAY_SHORT } from "@/lib/format";
import { requirePanelUser } from "@/lib/panel/auth";
import { listAppointments, todayRange } from "@/lib/panel/data";
import { PERIOD_LABELS, resolvePeriod, type PeriodKey } from "@/lib/periods";
import { computeStats } from "@/lib/stats";

const dayLabel = (date: string, pattern: string) =>
  formatInTimeZone(zonedDateTime(date, "12:00"), TIME_ZONE, pattern, { locale: tr });

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-neutral-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-neutral-500">{hint}</p>}
    </Card>
  );
}

export default async function StatsPage({ params, searchParams }: PageProps<"/sites/[slug]/panel/istatistikler">) {
  const { slug } = await params;
  const user = await requirePanelUser(slug);
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

  const period = resolvePeriod(str(sp.donem), todayRange().today, str(sp.baslangic), str(sp.bitis));
  const lastDay = addDaysToDate(period.toExclusive, -1);
  const periodText =
    period.from === lastDay ? dayLabel(period.from, "d MMMM yyyy") : `${dayLabel(period.from, "d MMMM")} – ${dayLabel(lastDay, "d MMMM yyyy")}`;

  const appointments = await listAppointments(user, { fromDate: period.from, toDate: period.toExclusive });
  const s = computeStats(
    appointments.map((a) => ({
      status: a.status,
      starts_at: a.starts_at,
      price_at_booking: a.price_at_booking,
      barber_id: a.barber_id,
      barber_name: a.barbers?.name ?? "Berber",
      service_id: a.service_id,
      service_name: a.services?.name ?? "Hizmet",
    })),
  );

  // En yoğun saatler: verisi olan saat aralığı (ör. 09–19)
  const activeHours = s.byHour.map((count, hour) => ({ hour, count })).filter((h) => h.count > 0);
  const firstHour = activeHours[0]?.hour ?? 9;
  const lastHour = activeHours.at(-1)?.hour ?? 19;
  const hourData = Array.from({ length: lastHour - firstHour + 1 }, (_, i) => {
    const hour = firstHour + i;
    const label = `${String(hour).padStart(2, "0")}:00`;
    return { key: String(hour), label: String(hour).padStart(2, "0"), value: s.byHour[hour], tooltip: `${label}: ${s.byHour[hour]} randevu` };
  });
  const busiestDay = s.byWeekday.indexOf(Math.max(...s.byWeekday));
  const busiestHour = s.byHour.indexOf(Math.max(...s.byHour));
  const hasData = s.total > 0;
  const isOwner = user.role === "owner";

  return (
    <>
      <PageHeader
        title="İstatistikler"
        description={`${PERIOD_LABELS[period.key]} · ${periodText}${isOwner ? "" : " · sadece sizin randevularınız"}`}
      />

      {/* Dönem seçimi: grafiklerin üstünde tek satır */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label="Dönem" className="flex flex-wrap gap-1">
            {(["bugun", "hafta", "ay", "gecen-ay"] as PeriodKey[]).map((key) => (
              <Link
                prefetch={false}
                key={key}
                href={`/panel/istatistikler?donem=${key}`}
                aria-current={period.key === key ? "page" : undefined}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold ${period.key === key ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"}`}
              >
                {PERIOD_LABELS[key]}
              </Link>
            ))}
          </nav>
          <form method="get" action="/panel/istatistikler" className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <input type="hidden" name="donem" value="ozel" />
            <label className="sr-only" htmlFor="baslangic">
              Başlangıç
            </label>
            <input id="baslangic" name="baslangic" type="date" required defaultValue={period.from} className={inlineInputClass} />
            <span className="text-neutral-400">–</span>
            <label className="sr-only" htmlFor="bitis">
              Bitiş
            </label>
            <input id="bitis" name="bitis" type="date" required defaultValue={lastDay} className={inlineInputClass} />
            <button type="submit" className={buttonClass(period.key === "ozel" ? "primary" : "secondary", "sm")}>
              Özel aralık
            </button>
          </form>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Toplam randevu" value={String(s.total)} hint={`${s.upcoming} bekleyen/onaylı`} />
        <Stat label="Tamamlanan" value={String(s.completed)} hint={s.showRate === null ? undefined : `Gelme oranı %${Math.round(s.showRate * 100)}`} />
        <Stat label="İptal edilen" value={String(s.cancelled)} />
        <Stat label="Gelmeyen" value={String(s.noShow)} />
      </div>

      <Card className="mt-3">
        <p className="text-xs text-neutral-500">Tahmini kazanç (tamamlanan randevular)</p>
        <p className="mt-1 text-4xl font-semibold text-neutral-900">{formatPrice(s.earnings)}</p>
        {s.plannedEarnings > 0 && (
          <p className="mt-1 text-sm text-neutral-600">Ayrıca {formatPrice(s.plannedEarnings)} tutarında henüz gerçekleşmemiş randevu var.</p>
        )}
      </Card>

      {!hasData ? (
        <p className="mt-6 rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
          Bu dönemde randevu yok.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {isOwner && (
            <>
              <Card>
                <h2 className="font-bold">Berbere göre randevu</h2>
                <p className="mb-4 text-xs text-neutral-500">İptal edilenler hariç</p>
                <BarList data={s.byBarber.map((b) => ({ key: b.id, label: b.name, value: b.count, display: String(b.count) }))} />
                <DataTable
                  headers={["Berber", "Randevu", "Kazanç"]}
                  rows={s.byBarber.map((b) => [b.name, b.count, formatPrice(b.earnings)])}
                />
              </Card>
              <Card>
                <h2 className="font-bold">Berbere göre kazanç</h2>
                <p className="mb-4 text-xs text-neutral-500">Tamamlanan randevular</p>
                <BarList
                  data={s.byBarber.map((b) => ({ key: b.id, label: b.name, value: b.earnings, display: formatPrice(b.earnings) }))}
                  emptyText="Bu dönemde tamamlanan randevu yok."
                />
              </Card>
            </>
          )}

          <Card>
            <h2 className="font-bold">En çok tercih edilen hizmetler</h2>
            <p className="mb-4 text-xs text-neutral-500">Randevu sayısı, iptaller hariç</p>
            <BarList data={s.byService.slice(0, 8).map((x) => ({ key: x.id, label: x.name, value: x.count, display: String(x.count) }))} />
            <DataTable headers={["Hizmet", "Randevu", "Kazanç"]} rows={s.byService.map((x) => [x.name, x.count, formatPrice(x.earnings)])} />
          </Card>

          <Card>
            <h2 className="font-bold">En yoğun günler</h2>
            <p className="mb-4 text-xs text-neutral-500">
              En yoğun: <strong className="text-neutral-800">{WEEKDAY_NAMES[busiestDay]}</strong>
            </p>
            <ColumnChart
              ariaLabel="Haftanın günlerine göre randevu sayısı"
              data={s.byWeekday.map((count, i) => ({
                key: String(i),
                label: WEEKDAY_SHORT[i],
                value: count,
                tooltip: `${WEEKDAY_NAMES[i]}: ${count} randevu`,
              }))}
            />
            <DataTable headers={["Gün", "Randevu"]} rows={s.byWeekday.map((count, i) => [WEEKDAY_NAMES[i], count])} />
          </Card>

          <Card className="lg:col-span-2">
            <h2 className="font-bold">En yoğun saatler</h2>
            <p className="mb-4 text-xs text-neutral-500">
              Randevunun başladığı saate göre · En yoğun: <strong className="text-neutral-800">{String(busiestHour).padStart(2, "0")}:00</strong>
            </p>
            <ColumnChart ariaLabel="Saatlere göre randevu sayısı" data={hourData} />
            <DataTable headers={["Saat", "Randevu"]} rows={hourData.map((h) => [`${h.label}:00`, h.value])} />
          </Card>
        </div>
      )}
    </>
  );
}
