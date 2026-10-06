/**
 * Abonelik (Bölüm 8.1) — sadece dükkan sahibi, SADECE OKUMA.
 * Aylık ücret, son ödeme, sonraki ödeme tarihi, ödeme geçmişi. Değişiklikleri sadece süper yönetici yapar
 * (veritabanı da sahibin yazmasına izin vermez).
 */
import { formatInTimeZone } from "date-fns-tz";
import { tr } from "date-fns/locale";
import { Badge, Card, EmptyState, PageHeader } from "@/components/panel/ui";
import { PLATFORM_SUPPORT_WHATSAPP, TIME_ZONE } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { formatIban } from "@/lib/iban";
import { requireOwner } from "@/lib/panel/auth";
import { createClient } from "@/lib/supabase/server";
import { whatsappLink } from "@/lib/whatsapp";

const STATUS: Record<string, { label: string; tone: "green" | "amber" | "red" | "neutral" }> = {
  active: { label: "Aktif", tone: "green" },
  overdue: { label: "Ödeme gecikti", tone: "amber" },
  suspended: { label: "Askıda", tone: "red" },
  cancelled: { label: "İptal", tone: "neutral" },
};

const dateLabel = (date: string) => formatInTimeZone(new Date(`${date}T12:00:00Z`), TIME_ZONE, "d MMMM yyyy", { locale: tr });

export default async function SubscriptionPage({ params }: PageProps<"/sites/[slug]/panel/abonelik">) {
  const { slug } = await params;
  const user = await requireOwner(slug);
  const supabase = await createClient();
  const [{ data: sub }, { data: payments }, { data: settings }] = await Promise.all([
    supabase.from("subscriptions").select("monthly_fee, billing_day, paid_until, status").eq("shop_id", user.shop.id).maybeSingle(),
    supabase
      .from("payments")
      .select("id, amount, type, period_start, period_end, method, paid_at")
      .eq("shop_id", user.shop.id)
      .order("paid_at", { ascending: false })
      .limit(24),
    supabase.from("platform_settings").select("iban, account_holder, bank_name, payment_note").eq("id", 1).maybeSingle(),
  ]);

  if (!sub) {
    return (
      <>
        <PageHeader title="Abonelik" />
        <EmptyState>Abonelik bilgisi bulunamadı. Platform yöneticisiyle iletişime geçin.</EmptyState>
      </>
    );
  }

  const status = STATUS[sub.status] ?? STATUS.active;

  return (
    <>
      <PageHeader title="Abonelik" description="Bu bilgileri sadece platform yöneticisi değiştirebilir." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs text-neutral-500">Aylık ücret</p>
          <p className="text-2xl font-bold">{formatPrice(sub.monthly_fee)}</p>
          <p className="text-xs text-neutral-500">Her ayın {sub.billing_day}. günü</p>
        </Card>
        <Card>
          <p className="text-xs text-neutral-500">Ödendiği tarih</p>
          <p className="text-xl font-bold">{sub.paid_until ? dateLabel(sub.paid_until) : "-"}</p>
          <p className="text-xs text-neutral-500">Bu tarihe kadar ödenmiş</p>
        </Card>
        <Card>
          <p className="text-xs text-neutral-500">Durum</p>
          <p className="mt-1">
            <Badge tone={status.tone}>{status.label}</Badge>
          </p>
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="font-bold">Ödeme bilgileri</h2>
        {settings?.iban ? (
          <dl className="mt-3 grid gap-2 text-sm">
            <div>
              <dt className="text-neutral-500">IBAN</dt>
              <dd className="font-mono text-base font-semibold select-all">{formatIban(settings.iban)}</dd>
            </div>
            {settings.account_holder && (
              <div>
                <dt className="text-neutral-500">Alıcı</dt>
                <dd className="font-semibold">{settings.account_holder}</dd>
              </div>
            )}
            {settings.bank_name && (
              <div>
                <dt className="text-neutral-500">Banka</dt>
                <dd>{settings.bank_name}</dd>
              </div>
            )}
            {settings.payment_note && <p className="text-neutral-600">{settings.payment_note}</p>}
          </dl>
        ) : (
          <p className="mt-2 text-sm text-neutral-600">IBAN bilgisi ve ödeme için platform yöneticisiyle iletişime geçin.</p>
        )}
        {PLATFORM_SUPPORT_WHATSAPP && (
          <a
            href={whatsappLink(PLATFORM_SUPPORT_WHATSAPP, `Merhaba, ${user.shop.name} aylık ödemesi hakkında yazıyorum.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex rounded-lg bg-[#25D366] px-4 py-2 text-sm font-semibold text-[#0b3d1f]"
          >
            WhatsApp&apos;tan yaz
          </a>
        )}
      </Card>

      <h2 className="mt-8 mb-3 text-lg font-bold">Ödeme geçmişi</h2>
      {!payments?.length ? (
        <EmptyState>Kayıtlı ödeme yok.</EmptyState>
      ) : (
        <ul className="grid gap-2">
          {payments.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white p-3 text-sm">
              <div>
                <p className="font-semibold">
                  {p.type === "setup" ? "Kurulum ücreti" : "Aylık ücret"} · {formatPrice(p.amount)}
                </p>
                <p className="text-xs text-neutral-500">
                  {p.period_start && p.period_end ? `${dateLabel(p.period_start)} – ${dateLabel(p.period_end)}` : ""}
                </p>
              </div>
              <span className="text-xs text-neutral-500">
                {formatInTimeZone(new Date(p.paid_at), TIME_ZONE, "d MMM yyyy", { locale: tr })} ·{" "}
                {p.method === "iban" ? "Havale/EFT" : p.method === "cash" ? "Nakit" : "Online"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
