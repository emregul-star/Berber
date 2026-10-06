/**
 * Dükkanlar listesi (Bölüm 11.1): ad, slug, durum, abonelik durumu, ödendiği tarih,
 * site ve panel linkleri.
 */
import Link from "next/link";
import { Badge, ButtonLink, EmptyState, PageHeader } from "@/components/panel/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { listShops } from "@/lib/admin/data";
import { formatPrice } from "@/lib/format";
import { adminPath, shopBaseUrl, withPath } from "@/lib/links";

type Tone = "neutral" | "green" | "amber" | "red" | "blue";
const SHOP_STATUS: Record<string, [string, Tone]> = { active: ["Aktif", "green"], suspended: ["Askıda", "red"], demo: ["Demo", "blue"] };
const SUB_STATUS: Record<string, [string, Tone]> = {
  active: ["Ödendi", "green"],
  overdue: ["Gecikti", "amber"],
  suspended: ["Askıda", "red"],
  cancelled: ["İptal", "neutral"],
};

export default async function ShopsPage() {
  await requireAdmin();
  const shops = await listShops();

  return (
    <>
      <PageHeader title="Dükkanlar" description={`${shops.length} dükkan`} actions={<ButtonLink href={adminPath("/dukkanlar/yeni")}>+ Yeni dükkan</ButtonLink>} />
      {shops.length === 0 ? (
        <EmptyState>Henüz dükkan yok.</EmptyState>
      ) : (
        <ul className="grid gap-2">
          {shops.map((s) => {
            const [statusLabel, statusTone]: [string, Tone] = SHOP_STATUS[s.status] ?? [s.status, "neutral"];
            const sub = s.subscription;
            const [subLabel, subTone]: [string, Tone] = sub ? (SUB_STATUS[sub.status] ?? [sub.status, "neutral"]) : ["Abonelik yok", "neutral"];
            const base = shopBaseUrl(s.slug);
            return (
              <li key={s.id} className="rounded-lg border border-neutral-200 bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link prefetch={false} href={adminPath(`/dukkanlar/${s.id}`)} className="font-semibold hover:underline">
                      {s.name}
                    </Link>
                    <p className="text-sm text-neutral-600">
                      {s.slug} · aylık {formatPrice(sub?.monthly_fee ?? 0)} · ödendiği tarih: {sub?.paid_until ?? "—"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={statusTone}>{statusLabel}</Badge>
                    {!s.is_demo && <Badge tone={subTone}>{subLabel}</Badge>}
                    {s.suggestSuspend && <Badge tone="red">Askıya alınmalı</Badge>}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-sm">
                  <a href={base} target="_blank" rel="noopener noreferrer" className="text-neutral-600 underline hover:text-neutral-900">
                    Siteyi aç ↗
                  </a>
                  <a href={withPath(base, "/panel")} target="_blank" rel="noopener noreferrer" className="text-neutral-600 underline hover:text-neutral-900">
                    Paneli aç ↗
                  </a>
                  <Link prefetch={false} href={adminPath(`/dukkanlar/${s.id}`)} className="text-neutral-600 underline hover:text-neutral-900">
                    Ayrıntılar
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
