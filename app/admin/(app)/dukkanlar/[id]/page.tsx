/**
 * Dükkan detayı (Bölüm 11.1): bilgiler, abonelik, ödeme geçmişi, ödeme ekle, askıya al / aktif et,
 * üyeler (geçici şifre ver).
 */
import { formatInTimeZone } from "date-fns-tz";
import { tr } from "date-fns/locale";
import { notFound } from "next/navigation";
import { ResetPasswordButton, ShopStatusButton } from "@/components/admin/admin-buttons";
import { DeletePaymentButton, PaymentForm, SubscriptionForm } from "@/components/admin/shop-forms";
import { Badge, ButtonLink, Card, EmptyState, PageHeader } from "@/components/panel/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { getShopDetail, today } from "@/lib/admin/data";
import { daysOverdue, nextPeriod } from "@/lib/billing";
import { TIME_ZONE } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { adminPath, shopBaseUrl, withPath } from "@/lib/links";

export default async function ShopDetailPage({ params }: PageProps<"/admin/dukkanlar/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const detail = /^[0-9a-f-]{36}$/.test(id) ? await getShopDetail(id) : null;
  if (!detail) notFound();
  const { shop, subscription, payments, members } = detail;
  const t = today();
  const base = shopBaseUrl(shop.slug, shop.custom_domain);
  const overdue = daysOverdue(subscription?.paid_until ?? null, t);

  return (
    <>
      <PageHeader
        title={shop.name}
        description={`${shop.slug} · ${formatInTimeZone(new Date(shop.created_at), TIME_ZONE, "d MMMM yyyy", { locale: tr })} tarihinde açıldı`}
        actions={
          <ButtonLink href={adminPath("/dukkanlar")} variant="secondary" size="sm">
            ← Dükkanlar
          </ButtonLink>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="grid content-start gap-4">
          <Card>
            <h2 className="mb-3 font-bold">Abonelik</h2>
            {subscription ? (
              <>
                <p className="mb-4 text-sm text-neutral-700">
                  Ödendiği tarih: <strong>{subscription.paid_until ?? "henüz ödeme yok"}</strong>{" "}
                  {overdue > 0 && <Badge tone="amber">{overdue} gün gecikti</Badge>}
                </p>
                <SubscriptionForm shopId={shop.id} initial={{ ...subscription, setup_fee: Number(subscription.setup_fee), monthly_fee: Number(subscription.monthly_fee) }} />
              </>
            ) : (
              <EmptyState>Abonelik kaydı yok.</EmptyState>
            )}
          </Card>

          {subscription && !shop.is_demo && (
            <Card>
              <h2 className="mb-3 font-bold">Ödeme ekle</h2>
              <PaymentForm
                shopId={shop.id}
                monthlyFee={Number(subscription.monthly_fee)}
                setupFee={Number(subscription.setup_fee)}
                suggestedStart={nextPeriod(subscription.paid_until, t).start}
                today={t}
              />
            </Card>
          )}

          <Card>
            <h2 className="mb-3 font-bold">Ödeme geçmişi</h2>
            {payments.length === 0 ? (
              <EmptyState>Ödeme kaydı yok.</EmptyState>
            ) : (
              <ul className="grid gap-2">
                {payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-2 text-sm last:border-0">
                    <span>
                      <strong>{formatPrice(p.amount)}</strong> · {p.type === "setup" ? "Kurulum" : "Aylık"}
                      {p.period_start && ` (${p.period_start} – ${p.period_end})`}
                    </span>
                    <span className="flex items-center gap-2 text-neutral-500">
                      {formatInTimeZone(new Date(p.paid_at), TIME_ZONE, "d MMM yyyy", { locale: tr })} ·{" "}
                      {p.method === "iban" ? "Havale" : p.method === "cash" ? "Nakit" : "Online"}
                      <DeletePaymentButton paymentId={p.id} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="grid content-start gap-4">
          <Card>
            <h2 className="mb-2 font-bold">Durum</h2>
            <p className="mb-3">
              <Badge tone={shop.status === "active" ? "green" : shop.status === "suspended" ? "red" : "blue"}>
                {shop.status === "active" ? "Aktif" : shop.status === "suspended" ? "Askıda" : "Demo"}
              </Badge>
            </p>
            {!shop.is_demo && <ShopStatusButton shopId={shop.id} status={shop.status} shopName={shop.name} />}
            <div className="mt-4 grid gap-1 text-sm">
              <a href={base} target="_blank" rel="noopener noreferrer" className="underline">
                Siteyi aç ↗
              </a>
              <a href={withPath(base, "/panel")} target="_blank" rel="noopener noreferrer" className="underline">
                Paneli aç ↗
              </a>
            </div>
          </Card>

          <Card>
            <h2 className="mb-2 font-bold">Panel kullanıcıları</h2>
            {members.length === 0 ? (
              <EmptyState>Üye yok.</EmptyState>
            ) : (
              <ul className="grid gap-3 text-sm">
                {members.map((m) => (
                  <li key={m.userId} className="grid gap-1">
                    <span>
                      {m.email} <Badge>{m.role === "owner" ? "Sahip" : "Berber"}</Badge>
                    </span>
                    <ResetPasswordButton shopId={shop.id} userId={m.userId} email={m.email} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="mb-2 font-bold">İletişim</h2>
            <p className="text-sm text-neutral-700">{shop.phone ?? "Telefon yok"}</p>
            <p className="text-sm text-neutral-700">{shop.email ?? "E-posta yok"}</p>
          </Card>
        </div>
      </div>
    </>
  );
}
