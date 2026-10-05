/**
 * Müşteri sitesinin küçük ortak parçaları: randevu butonu, bölüm başlığı, logo.
 */
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { initials } from "@/lib/format";
import { CalendarIcon } from "./icons";

export const BOOKING_PATH = "/randevu-al";

/** Ana eylem butonu: "Randevu Al" */
export function BookingButton({
  className = "",
  size = "md",
}: {
  className?: string;
  size?: "md" | "lg";
}) {
  const sizeClass = size === "lg" ? "px-7 py-3.5 text-base" : "px-5 py-2.5 text-sm";
  return (
    <Link
      href={BOOKING_PATH}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-primary font-semibold text-on-primary shadow-sm transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${sizeClass} ${className}`}
    >
      <CalendarIcon className="text-[1.1em]" />
      Randevu Al
    </Link>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-8 max-w-2xl">
      <p className="text-xs font-semibold tracking-[0.2em] text-primary-text uppercase">{eyebrow}</p>
      <h2 className="mt-2 font-heading text-3xl font-semibold sm:text-4xl">{title}</h2>
      {children && <p className="mt-3 text-muted">{children}</p>}
    </div>
  );
}

/** Dükkan logosu; logo yüklenmemişse baş harflerden oluşan bir monogram gösterir. */
export function ShopLogo({
  name,
  logoUrl,
  size = 40,
  className = "",
}: {
  name: string;
  logoUrl: string | null;
  size?: number;
  className?: string;
}) {
  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={`${name} logosu`}
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-primary font-heading font-semibold text-primary-text ${className}`}
    >
      {initials(name)}
    </span>
  );
}
