/**
 * Çalışma saatleri (Bölüm 8.1): sahip dükkanın haftalık saatlerini ve berbere özel saatleri
 * düzenler; berber kendi geçerli saatlerini görür (sadece okuma).
 */
import Link from "next/link";
import { HoursEditor, type DayState } from "@/components/panel/hours-editor";
import { Card, PageHeader, inputClass, buttonClass } from "@/components/panel/ui";
import { formatTimeOfDay, WEEKDAY_NAMES } from "@/lib/format";
import { requirePanelUser } from "@/lib/panel/auth";
import { listBarbers } from "@/lib/panel/data";
import { createClient } from "@/lib/supabase/server";

type Row = {
  barber_id: string | null;
  weekday: number;
  is_closed: boolean;
  start_time: string | null;
  end_time: string | null;
  break_start: string | null;
  break_end: string | null;
};

function toDayState(row: Row | undefined, weekday: number, fallback: "closed" | "shop"): DayState {
  if (!row) return { weekday, mode: fallback, start: "", end: "", breakStart: "", breakEnd: "" };
  return {
    weekday,
    mode: row.is_closed ? "closed" : "open",
    start: formatTimeOfDay(row.start_time),
    end: formatTimeOfDay(row.end_time),
    breakStart: formatTimeOfDay(row.break_start),
    breakEnd: formatTimeOfDay(row.break_end),
  };
}

export default async function WorkingHoursPage({ params, searchParams }: PageProps<"/sites/[slug]/panel/calisma-saatleri">) {
  const { slug } = await params;
  const user = await requirePanelUser(slug);
  const sp = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("working_hours")
    .select("barber_id, weekday, is_closed, start_time, end_time, break_start, break_end")
    .eq("shop_id", user.shop.id);
  const rows = (data ?? []) as Row[];
  const general = (w: number) => rows.find((r) => r.barber_id === null && r.weekday === w);

  // Berber: kendi geçerli saatleri (özel kayıt varsa o, yoksa dükkan saati) — sadece okuma
  if (user.role !== "owner") {
    return (
      <>
        <PageHeader title="Çalışma saatlerim" description="Saatlerinizi sadece dükkan sahibi değiştirebilir." />
        <Card>
          <table className="w-full text-sm">
            <tbody>
              {WEEKDAY_NAMES.map((name, w) => {
                const row = rows.find((r) => r.barber_id === user.barberId && r.weekday === w) ?? general(w);
                return (
                  <tr key={w} className="border-b border-neutral-100 last:border-0">
                    <th scope="row" className="py-2 text-left font-medium">{name}</th>
                    <td className="py-2 text-right">
                      {!row || row.is_closed
                        ? "Kapalı"
                        : `${formatTimeOfDay(row.start_time)} – ${formatTimeOfDay(row.end_time)}${
                            row.break_start ? ` (mola ${formatTimeOfDay(row.break_start)}–${formatTimeOfDay(row.break_end)})` : ""
                          }`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </>
    );
  }

  const barbers = (await listBarbers(user)).filter((b) => b.is_active);
  const selected = typeof sp.berber === "string" ? barbers.find((b) => b.id === sp.berber) : undefined;

  const initial = Array.from({ length: 7 }, (_, w) =>
    selected
      ? toDayState(rows.find((r) => r.barber_id === selected.id && r.weekday === w), w, "shop")
      : toDayState(general(w), w, "closed"),
  );

  return (
    <>
      <PageHeader title="Çalışma saatleri" description="Berbere özel saat girilmeyen günlerde dükkanın genel saati geçerlidir." />
      <Card className="mb-4">
        <form method="get" action="/panel/calisma-saatleri" className="flex flex-wrap items-end gap-2">
          <label className="text-sm font-semibold" htmlFor="berber">
            Düzenlenen
            <select id="berber" name="berber" defaultValue={selected?.id ?? ""} className={`${inputClass} w-64`}>
              <option value="">Dükkanın genel saatleri</option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} (özel saatler)
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={buttonClass("secondary")}>
            Seç
          </button>
          {selected && (
            <Link prefetch={false} href="/panel/calisma-saatleri" className="text-sm underline">
              Genel saatlere dön
            </Link>
          )}
        </form>
      </Card>
      <h2 className="mb-3 text-lg font-bold">{selected ? `${selected.name} — özel saatler` : "Dükkanın genel saatleri"}</h2>
      {/* key: berber değişince düzenleyici sıfırdan başlasın */}
      <HoursEditor key={selected?.id ?? "shop"} slug={slug} barberId={selected?.id ?? null} initial={initial} />
    </>
  );
}
