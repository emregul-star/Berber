/**
 * Takvim (Bölüm 8.1): günlük ve haftalık görünüm, berbere göre filtre.
 * Filtreler adres çubuğunda tutulur (?gorunum=hafta&tarih=2026-10-12&berber=...).
 */
import { formatInTimeZone } from "date-fns-tz";
import { tr } from "date-fns/locale";
import Link from "next/link";
import { AppointmentList } from "@/components/panel/appointments";
import { buttonClass, Card, inlineInputClass, PageHeader } from "@/components/panel/ui";
import { addDaysToDate, localDateOf, weekdayOfDate, zonedDateTime } from "@/lib/availability";
import { TIME_ZONE } from "@/lib/constants";
import { requirePanelUser } from "@/lib/panel/auth";
import { listAppointments, listBarbers } from "@/lib/panel/data";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function dayTitle(date: string, pattern = "d MMMM EEEE") {
  return formatInTimeZone(zonedDateTime(date, "12:00"), TIME_ZONE, pattern, { locale: tr });
}

export default async function CalendarPage({ params, searchParams }: PageProps<"/sites/[slug]/panel/takvim">) {
  const { slug } = await params;
  const user = await requirePanelUser(slug);
  const sp = await searchParams;

  const view = sp.gorunum === "hafta" ? "week" : "day";
  const today = localDateOf(new Date());
  const date = typeof sp.tarih === "string" && DATE_RE.test(sp.tarih) ? sp.tarih : today;
  // Berber filtresi sadece sahip için; berber zaten sadece kendisini görür (RLS)
  const barberFilter = user.role === "owner" && typeof sp.berber === "string" ? sp.berber : "";

  // Haftalık görünüm Pazartesi'den başlar
  const from = view === "week" ? addDaysToDate(date, -weekdayOfDate(date)) : date;
  const days = view === "week" ? 7 : 1;
  const to = addDaysToDate(from, days);

  const [appointments, barbers] = await Promise.all([
    listAppointments(user, { fromDate: from, toDate: to, barberId: barberFilter || null }),
    user.role === "owner" ? listBarbers(user) : Promise.resolve([]),
  ]);

  const link = (overrides: Record<string, string>) => {
    const q = new URLSearchParams({
      gorunum: view === "week" ? "hafta" : "gun",
      tarih: date,
      ...(barberFilter ? { berber: barberFilter } : {}),
      ...overrides,
    });
    return `/panel/takvim?${q}`;
  };
  const step = view === "week" ? 7 : 1;

  const title =
    view === "week"
      ? `${dayTitle(from, "d MMM")} – ${dayTitle(addDaysToDate(from, 6), "d MMM yyyy")}`
      : dayTitle(date, "d MMMM yyyy, EEEE");

  return (
    <>
      <PageHeader title="Takvim" description={title} />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-neutral-300 p-0.5" role="group" aria-label="Görünüm">
            <Link prefetch={false}
              href={link({ gorunum: "gun" })}
              aria-current={view === "day" ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold ${view === "day" ? "bg-neutral-900 text-white" : ""}`}
            >
              Gün
            </Link>
            <Link prefetch={false}
              href={link({ gorunum: "hafta" })}
              aria-current={view === "week" ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold ${view === "week" ? "bg-neutral-900 text-white" : ""}`}
            >
              Hafta
            </Link>
          </div>
          <Link prefetch={false} href={link({ tarih: addDaysToDate(date, -step) })} className={buttonClass("secondary", "sm")} aria-label="Önceki">
            ←
          </Link>
          <Link prefetch={false} href={link({ tarih: today })} className={buttonClass("secondary", "sm")}>
            Bugün
          </Link>
          <Link prefetch={false} href={link({ tarih: addDaysToDate(date, step) })} className={buttonClass("secondary", "sm")} aria-label="Sonraki">
            →
          </Link>

          {/* JavaScript gerektirmeyen filtre formu (GET) */}
          <form method="get" action="/panel/takvim" className="ml-auto flex flex-wrap items-center gap-2">
            <input type="hidden" name="gorunum" value={view === "week" ? "hafta" : "gun"} />
            <label className="sr-only" htmlFor="tarih">
              Tarih
            </label>
            <input id="tarih" type="date" name="tarih" defaultValue={date} className={inlineInputClass} />
            {user.role === "owner" && (
              <>
                <label className="sr-only" htmlFor="berber">
                  Berber
                </label>
                <select id="berber" name="berber" defaultValue={barberFilter} className={inlineInputClass}>
                  <option value="">Tüm berberler</option>
                  {barbers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                      {b.is_active ? "" : " (pasif)"}
                    </option>
                  ))}
                </select>
              </>
            )}
            <button type="submit" className={buttonClass("primary", "sm")}>
              Göster
            </button>
          </form>
        </div>
      </Card>

      {view === "day" ? (
        <AppointmentList appointments={appointments} empty="Bu gün için randevu yok." />
      ) : (
        <div className="grid gap-5">
          {Array.from({ length: days }, (_, i) => addDaysToDate(from, i)).map((d) => {
            const dayAppointments = appointments.filter((a) => localDateOf(new Date(a.starts_at)) === d);
            return (
              <section key={d} aria-labelledby={`day-${d}`}>
                <h2 id={`day-${d}`} className={`mb-2 text-sm font-bold ${d === today ? "text-neutral-900" : "text-neutral-600"}`}>
                  <Link prefetch={false} href={link({ gorunum: "gun", tarih: d })} className="hover:underline">
                    {dayTitle(d)}
                  </Link>
                  {d === today && <span className="ml-2 rounded bg-neutral-900 px-1.5 py-0.5 text-xs text-white">Bugün</span>}
                  <span className="ml-2 font-normal text-neutral-400">
                    {dayAppointments.filter((a) => !a.status.startsWith("cancelled")).length} randevu
                  </span>
                </h2>
                <AppointmentList appointments={dayAppointments} empty="Randevu yok." />
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
