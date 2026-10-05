import Link from "next/link";
import { BookingButton, ShopLogo } from "./ui";

export type NavItem = { href: string; label: string };

/** Sayfanın üstünde sabit duran menü. Mobilde sadece logo ve randevu butonu görünür. */
export function SiteHeader({
  name,
  logoUrl,
  navItems,
}: {
  name: string;
  logoUrl: string | null;
  navItems: NavItem[];
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <ShopLogo name={name} logoUrl={logoUrl} size={36} />
          <span className="truncate font-heading text-lg font-semibold">{name}</span>
        </Link>

        <nav aria-label="Sayfa bölümleri" className="hidden md:block">
          <ul className="flex items-center gap-6 text-sm text-muted">
            {navItems.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="transition hover:text-text">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Mobilde altta sabit randevu butonu olduğu için üstteki sadece masaüstünde */}
        <div className="hidden md:block">
          <BookingButton />
        </div>
      </div>
    </header>
  );
}
