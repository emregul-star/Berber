"use client";

/**
 * Panel menüsü: masaüstünde solda sabit, mobilde üstteki "Menü" butonuyla açılır.
 * Hangi öğelerin görüneceğine sunucu karar verir (role göre); burası sadece gösterir.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export type NavItem = { href: string; label: string; badge?: number };

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  // Proxy adresi yeniden yazdığı için pathname "/sites/{slug}/panel/..." veya "/admin/..." olabilir
  const current = pathname.replace(/^\/sites\/[^/]+/, "").replace(/^\/admin(?=\/|$)/, "") || "/";
  // Aktif öğe: adresle eşleşen EN UZUN link (ör. /dukkanlar/yeni'de "Yeni dükkan", "Dükkanlar" değil).
  // Ana sayfa linkleri ("/" ve "/panel") sadece tam eşleşmede aktif olur.
  const isRoot = (href: string) => href === "/" || href === "/panel";
  const activeHref = items
    .map((i) => i.href)
    .filter((href) => current === href || (!isRoot(href) && current.startsWith(`${href}/`)))
    .sort((a, b) => b.length - a.length)[0];
  return (
    <ul className="grid gap-0.5">
      {items.map((item) => {
        const active = item.href === activeHref;
        return (
          <li key={item.href}>
            <Link prefetch={false}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                active ? "bg-neutral-900 text-white" : "text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              {item.label}
              {item.badge ? (
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${
                    active ? "bg-white text-neutral-900" : "bg-amber-500 text-white"
                  }`}
                  aria-label={`${item.badge} onay bekleyen`}
                >
                  {item.badge}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function PanelNav({
  items,
  footer,
  shopName,
  userLabel,
}: {
  items: NavItem[];
  footer: React.ReactNode;
  shopName: string;
  userLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const pendingTotal = items.reduce((sum, i) => sum + (i.badge ?? 0), 0);

  return (
    <>
      {/* Mobil üst çubuk */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 lg:hidden">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-neutral-900">{shopName}</p>
          <p className="truncate text-xs text-neutral-500">{userLabel}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="panel-mobile-nav"
          className="relative rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-semibold"
        >
          {open ? "Kapat" : "Menü"}
          {!open && pendingTotal > 0 && (
            <span className="absolute -top-1.5 -right-1.5 rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white">
              {pendingTotal}
            </span>
          )}
        </button>
      </div>
      {open && (
        <nav id="panel-mobile-nav" aria-label="Panel menüsü" className="border-b border-neutral-200 bg-white p-3 lg:hidden">
          <NavLinks items={items} onNavigate={() => setOpen(false)} />
          <div className="mt-3 border-t border-neutral-200 pt-3">{footer}</div>
        </nav>
      )}

      {/* Masaüstü yan menü */}
      <aside className="hidden w-60 shrink-0 border-r border-neutral-200 bg-white lg:block">
        <div className="sticky top-0 flex h-dvh flex-col p-4">
          <p className="truncate px-3 font-bold text-neutral-900">{shopName}</p>
          <p className="mb-4 truncate px-3 text-xs text-neutral-500">{userLabel}</p>
          <nav aria-label="Panel menüsü" className="flex-1 overflow-y-auto">
            <NavLinks items={items} />
          </nav>
          <div className="border-t border-neutral-200 pt-3">{footer}</div>
        </div>
      </aside>
    </>
  );
}
