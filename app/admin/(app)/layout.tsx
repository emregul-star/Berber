/**
 * Süper yönetici paneli çerçevesi (Bölüm 11). Her sayfa ayrıca requireAdmin() çağırır.
 */
import type { Metadata } from "next";
import { PanelNav, type NavItem } from "@/components/panel/panel-nav";
import { buttonClass } from "@/components/panel/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { countSuspensionCandidates } from "@/lib/admin/data";
import { PLATFORM_NAME } from "@/lib/constants";
import { adminPath } from "@/lib/links";
import { adminLogoutAction } from "../auth-actions";

export const metadata: Metadata = { title: "Yönetim", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();
  const warnings = await countSuspensionCandidates();

  const items: NavItem[] = [
    { href: adminPath("/"), label: "Pano", badge: warnings },
    { href: adminPath("/dukkanlar"), label: "Dükkanlar" },
    { href: adminPath("/dukkanlar/yeni"), label: "Yeni dükkan" },
    { href: adminPath("/ayarlar"), label: "Platform ayarları" },
  ];

  const footer = (
    <form action={adminLogoutAction}>
      <button type="submit" className={`${buttonClass("ghost", "sm")} w-full justify-start`}>
        Çıkış yap
      </button>
    </form>
  );

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-neutral-50 text-neutral-900 lg:flex-row">
      <PanelNav items={items} footer={footer} shopName={`${PLATFORM_NAME} Yönetim`} userLabel={admin.email ?? "Süper yönetici"} />
      <div className="min-w-0 flex-1">
        <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
