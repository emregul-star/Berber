/**
 * Dükkan yönetim paneli çerçevesi (Bölüm 8): menü, bilgi bantları.
 * Not: Yetki kontrolü burada yapılsa da her sayfa ve her işlem kendi kontrolünü ayrıca yapar.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { PanelNav, type NavItem } from "@/components/panel/panel-nav";
import { buttonClass } from "@/components/panel/ui";
import { countPendingAppointments, getSubscriptionNotice } from "@/lib/panel/data";
import { requirePanelUser } from "@/lib/panel/auth";
import { logoutAction } from "../auth-actions";

export const metadata: Metadata = { title: "Yönetim Paneli", robots: { index: false, follow: false } };

export default async function PanelLayout({ children, params }: LayoutProps<"/sites/[slug]/panel">) {
  const { slug } = await params;
  const user = await requirePanelUser(slug);
  const isOwner = user.role === "owner";
  const [pending, subscriptionNotice] = await Promise.all([
    countPendingAppointments(user),
    isOwner ? getSubscriptionNotice(user) : Promise.resolve(null),
  ]);

  const items: NavItem[] = [
    { href: "/panel", label: "Bugün", badge: pending },
    { href: "/panel/takvim", label: "Takvim" },
    { href: "/panel/randevular/yeni", label: "Randevu ekle" },
    ...(isOwner
      ? [
          { href: "/panel/hizmetler", label: "Hizmetler" },
          { href: "/panel/berberler", label: "Berberler" },
        ]
      : []),
    { href: "/panel/calisma-saatleri", label: "Çalışma saatleri" },
    { href: "/panel/izinler", label: "İzinler" },
    ...(isOwner
      ? [
          { href: "/panel/galeri", label: "Galeri" },
          { href: "/panel/yorumlar", label: "Yorumlar" },
        ]
      : []),
    { href: "/panel/istatistikler", label: "İstatistikler" },
    ...(isOwner
      ? [
          { href: "/panel/ayarlar", label: "Ayarlar" },
          { href: "/panel/abonelik", label: "Abonelik" },
        ]
      : []),
  ];

  const roleLabel = user.isPlatformAdmin && !user.barberId ? "Süper yönetici" : isOwner ? "Dükkan sahibi" : "Berber";
  const userLabel = `${user.barberName ?? user.email ?? ""} · ${roleLabel}`;

  const footer = (
    <div className="grid gap-1">
      <Link prefetch={false} href="/" className="rounded-lg px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100">
        Siteyi görüntüle ↗
      </Link>
      <Link prefetch={false} href="/panel/sifre" className="rounded-lg px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100">
        Şifre değiştir
      </Link>
      <form action={logoutAction}>
        <button type="submit" className={`${buttonClass("ghost", "sm")} w-full justify-start`}>
          Çıkış yap
        </button>
      </form>
    </div>
  );

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-neutral-50 text-neutral-900 lg:flex-row">
      <PanelNav items={items} footer={footer} shopName={user.shop.name} userLabel={userLabel} />
      <div className="min-w-0 flex-1">
        {user.shop.status === "suspended" && (
          <p className="bg-red-600 px-4 py-2 text-center text-sm font-semibold text-white">
            Sitenizin müşteri sayfaları ödeme yapılmadığı için askıya alındı. Lütfen aylık ödemenizi yapın.
          </p>
        )}
        {subscriptionNotice && (
          <p className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
            {subscriptionNotice}{" "}
            <Link prefetch={false} href="/panel/abonelik" className="font-semibold underline">
              Abonelik
            </Link>
          </p>
        )}
        {user.shop.isDemo && (
          <p className="bg-neutral-900 px-4 py-1.5 text-center text-xs text-white">Demo panel — veriler gerçek değildir.</p>
        )}
        <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
