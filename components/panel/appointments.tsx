/**
 * Panelde randevu listeleme parçaları (sunucu bileşenleri).
 */
import { formatInTimeZone } from "date-fns-tz";
import { tr } from "date-fns/locale";
import Link from "next/link";
import { TIME_ZONE } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/manage-rules";
import type { PanelAppointment } from "@/lib/panel/data";
import { Badge, EmptyState } from "./ui";

const STATUS_TONES: Record<string, "amber" | "green" | "red" | "blue" | "neutral"> = {
  pending: "amber",
  confirmed: "green",
  cancelled_by_customer: "red",
  cancelled_by_shop: "red",
  completed: "blue",
  no_show: "neutral",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONES[status] ?? "neutral"}>{STATUS_LABELS[status] ?? status}</Badge>;
}

export function timeLabel(iso: string): string {
  return formatInTimeZone(new Date(iso), TIME_ZONE, "HH:mm");
}

export function AppointmentRow({ appointment, showDate = false }: { appointment: PanelAppointment; showDate?: boolean }) {
  const a = appointment;
  const cancelled = a.status.startsWith("cancelled");
  return (
    <li>
      <Link prefetch={false}
        href={`/panel/randevular/${a.id}`}
        className={`flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 transition hover:border-neutral-400 ${
          cancelled ? "opacity-60" : ""
        }`}
      >
        <div className="w-14 shrink-0 text-center">
          {showDate && (
            <p className="text-xs text-neutral-500">{formatInTimeZone(new Date(a.starts_at), TIME_ZONE, "d MMM", { locale: tr })}</p>
          )}
          <p className={`text-lg font-bold ${cancelled ? "line-through" : ""}`}>{timeLabel(a.starts_at)}</p>
          <p className="text-xs text-neutral-500">{timeLabel(a.ends_at)}</p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{a.customer_name}</p>
          <p className="truncate text-sm text-neutral-600">
            {a.services?.name} · {a.barbers?.name}
          </p>
          {a.customer_note && <p className="truncate text-xs text-neutral-500">Not: {a.customer_note}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StatusBadge status={a.status} />
          <span className="text-xs text-neutral-500">{formatPrice(a.price_at_booking)}</span>
        </div>
      </Link>
    </li>
  );
}

export function AppointmentList({
  appointments,
  empty,
  showDate,
}: {
  appointments: PanelAppointment[];
  empty: string;
  showDate?: boolean;
}) {
  if (appointments.length === 0) return <EmptyState>{empty}</EmptyState>;
  return (
    <ul className="grid gap-2">
      {appointments.map((a) => (
        <AppointmentRow key={a.id} appointment={a} showDate={showDate} />
      ))}
    </ul>
  );
}
