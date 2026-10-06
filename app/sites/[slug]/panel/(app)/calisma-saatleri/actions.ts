"use server";

/**
 * Çalışma saatleri kaydetme (sadece sahip). barberId boşsa dükkanın genel saatleri,
 * doluysa o berbere özel saatler. Berbere özel bir günde "dükkan saatini kullan" seçilirse
 * o güne ait özel kayıt silinir (Bölüm 5.8: özel kayıt yoksa genel saat geçerli).
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/panel/auth";
import { createClient } from "@/lib/supabase/server";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const daySchema = z.object({
  weekday: z.number().int().min(0).max(6),
  mode: z.enum(["open", "closed", "shop"]),
  start: time.optional().or(z.literal("")),
  end: time.optional().or(z.literal("")),
  breakStart: time.optional().or(z.literal("")),
  breakEnd: time.optional().or(z.literal("")),
});
const schema = z.object({ barberId: z.uuid().nullable(), days: z.array(daySchema).length(7) });

const DAY_NAMES = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

export async function saveWorkingHoursAction(slug: string, input: unknown): Promise<{ ok: boolean; message: string }> {
  const user = await requireOwner(slug);
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Saatleri kontrol edin (SS:DD biçiminde olmalı)." };
  const { barberId, days } = parsed.data;
  if (barberId === null && days.some((d) => d.mode === "shop")) return { ok: false, message: "Geçersiz istek." };

  // Veritabanı kurallarıyla aynı kontroller; kullanıcıya anlaşılır mesaj için önce burada
  for (const d of days) {
    if (d.mode !== "open") continue;
    const name = DAY_NAMES[d.weekday];
    if (!d.start || !d.end || d.start >= d.end) return { ok: false, message: `${name}: açılış saati kapanıştan önce olmalı.` };
    if (Boolean(d.breakStart) !== Boolean(d.breakEnd)) return { ok: false, message: `${name}: mola başlangıç ve bitişini birlikte girin.` };
    if (d.breakStart && d.breakEnd && (d.breakStart >= d.breakEnd || d.breakStart < d.start || d.breakEnd > d.end)) {
      return { ok: false, message: `${name}: mola, çalışma saatinin içinde olmalı ve başlangıcı bitişinden önce olmalı.` };
    }
  }

  const supabase = await createClient();
  if (barberId) {
    const { data: barber } = await supabase.from("barbers").select("id").eq("id", barberId).eq("shop_id", user.shop.id).maybeSingle();
    if (!barber) return { ok: false, message: "Berber bulunamadı." };
  }

  const rows = days
    .filter((d) => d.mode !== "shop")
    .map((d) => ({
      shop_id: user.shop.id,
      barber_id: barberId,
      weekday: d.weekday,
      is_closed: d.mode === "closed",
      start_time: d.mode === "open" ? d.start! : null,
      end_time: d.mode === "open" ? d.end! : null,
      break_start: d.mode === "open" && d.breakStart ? d.breakStart : null,
      break_end: d.mode === "open" && d.breakEnd ? d.breakEnd : null,
    }));

  // (shop_id, barber_id, weekday) benzersiz olduğu için güncelle-veya-ekle (upsert)
  if (rows.length) {
    const { error } = await supabase.from("working_hours").upsert(rows, { onConflict: "shop_id,barber_id,weekday" });
    if (error) return { ok: false, message: "Saatler kaydedilemedi." };
  }

  // Berbere özel: "dükkan saatini kullan" seçilen günlerin özel kayıtlarını sil
  const shopDays = days.filter((d) => d.mode === "shop").map((d) => d.weekday);
  if (barberId && shopDays.length) {
    const { error } = await supabase
      .from("working_hours")
      .delete()
      .eq("shop_id", user.shop.id)
      .eq("barber_id", barberId)
      .in("weekday", shopDays);
    if (error) return { ok: false, message: "Saatler kaydedilemedi." };
  }

  revalidatePath("/sites/[slug]", "layout");
  return { ok: true, message: "Çalışma saatleri kaydedildi." };
}
