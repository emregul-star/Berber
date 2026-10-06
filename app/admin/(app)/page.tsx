/**
 * Süper yönetici panosu (Bölüm 11.1): aktif dükkan sayısı, bu ay beklenen gelir, bu ay alınan
 * ödemeler, gecikmiş ödemeler ("askıya alınmalı" işaretiyle).
 */
import { formatInTimeZone } from "date-fns-tz";
import { tr } from "date-fns/locale";
import Link from "next/link";
import { ResetDemoButton } from "@/components/admin/admin-buttons";
import { Badge, Card, EmptyState, PageHeader } from "@/components/panel/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { listShops, paymentsThisMonth } from "@/lib/admin/data";
import { SUSPEND_SUGGEST_AFTER_DAYS, TIME_ZONE } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { adminPath } from "@/lib/links";

export default async function AdminDashboard() {
  await requireAdmin();
  const [shops, payments] = await Promise.all([listShops(), paymentsThisMonth()]);

  const real = shops.filter((s) => !s.is_demo);
  const activeCount = real.filter((s) => s.status === "active").length;
  const suspendedCount = real.filter((s) => s.status === "suspended").length;
  // Beklenen aylık gelir: askıda olmayan gerçek dükkanların aylık ücretleri
  const expected = real
    .filter((s) => s.status !== "suspended" && s.subscription?.status !== "cancelled")
    .reduce((sum, s) => sum + Number(s.subscription?.monthly_fee ?? 0), 0);
  const received = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const overdue = real.filter((s) => s.overdueDays > 0).sort((a, b) => b.overdueDays - a.overdueDays);

  return (
    <>
      <PageHeader title="Pano" description={formatInTimeZone(new Date(), TIME_ZONE, "d MMMM yyyy, EEEE", { locale: tr })} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <p className="text-xs text-neutral-500">Aktif dükkan</p>
          <p className="mt-1 text-2xl font-semibold">{activeCount}</p>
          {suspendedCount > 0 && <p className="text-xs text-neutral-500">{suspendedCount} askıda</p>}
        </Card>
        <Card>
          <p className="text-xs text-neutral-500">Bu ay beklenen gelir</p>
          <p className="mt-1 text-2xl font-semibold">{formatPrice(expected)}</p>
        </Card>
        <Card>
          <p className="text-xs text-neutral-500">Bu ay alınan ödemeler</p>
          <p className="mt-1 text-2xl font-semibold">{formatPrice(received)}</p>
          <p className="text-xs text-neutral-500">{payments.length} ödeme</p>
        </Card>
        <Card>
          <p className="text-xs text-neutral-500">Gecikmiş ödeme</p>
          <p className="mt-1 text-2xl font-semibold">{overdue.length}</p>
        </Card>
      </div>

      <section className="mt-8" aria-labelledby="overdue-title">
        <h2 id="overdue-title" className="mb-3 text-lg font-bold">
          Gecikmiş ödemeler
        </h2>
        {overdue.length === 0 ? (
          <EmptyState>Gecikmiş ödeme yok.</EmptyState>
        ) : (
          <ul className="grid gap-2">
            {overdue.map((s) => (
              <li key={s.id}>
                <Link
                  prefetch={false}
                  href={adminPath(`/dukkanlar/${s.id}`)}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white p-3 hover:border-neutral-400"
                >
                  <div>
                    <p className="font-semibold">{s.name}</p>
                    <p className="text-sm text-neutral-600">
                      {s.overdueDays} gün gecikti · aylık {formatPrice(s.subscription?.monthly_fee ?? 0)}
                    </p>
                  </div>
                  {s.suggestSuspend ? (
                    <Badge tone="red">Askıya alınmalı ({SUSPEND_SUGGEST_AFTER_DAYS}+ gün)</Badge>
                  ) : s.status === "suspended" ? (
                    <Badge>Askıda</Badge>
                  ) : (
                    <Badge tone="amber">Gecikti</Badge>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8" aria-labelledby="payments-title">
        <h2 id="payments-title" className="mb-3 text-lg font-bold">
          Bu ay alınan ödemeler
        </h2>
        {payments.length === 0 ? (
          <EmptyState>Bu ay ödeme kaydı yok.</EmptyState>
        ) : (
          <ul className="grid gap-2">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white p-3 text-sm">
                <span className="font-semibold">{p.shops?.name}</span>
                <span className="text-neutral-600">
                  {p.type === "setup" ? "Kurulum" : "Aylık"} · {formatPrice(p.amount)} ·{" "}
                  {formatInTimeZone(new Date(p.paid_at), TIME_ZONE, "d MMM", { locale: tr })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Card className="mt-8">
        <h2 className="font-bold">Demo dükkan</h2>
        <p className="mt-1 mb-3 text-sm text-neutral-600">
          Satış gösterimlerinden sonra demo verilerini baştan kurar (randevular bugüne göre yeniden dağıtılır).
        </p>
        <ResetDemoButton />
      </Card>
    </>
  );
}
