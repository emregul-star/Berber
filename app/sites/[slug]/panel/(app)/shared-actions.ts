"use server";

/**
 * Birden fazla panel sayfasının kullandığı ortak işlemler (sıralama).
 * Kullanıcının kendi oturumuyla (RLS) çalışır: sahip sadece kendi dükkanının satırlarını değiştirebilir.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/panel/auth";
import { createClient } from "@/lib/supabase/server";

/** Sadece bu tablolarda sıralama yapılabilir (dışarıdan gelen tablo adına güvenmiyoruz) */
const SORTABLE = ["services", "barbers", "gallery_images", "testimonials"] as const;

const reorderSchema = z.object({
  table: z.enum(SORTABLE),
  ids: z.array(z.uuid()).min(1).max(200),
});

/** Verilen sırayla sort_order değerlerini 1, 2, 3... olarak yazar */
export async function reorderAction(slug: string, input: unknown): Promise<{ ok: boolean; error?: string }> {
  const user = await requireOwner(slug);
  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Geçersiz istek." };

  const supabase = await createClient();
  const results = await Promise.all(
    parsed.data.ids.map((id, index) =>
      supabase.from(parsed.data.table).update({ sort_order: index + 1 }).eq("id", id).eq("shop_id", user.shop.id),
    ),
  );
  if (results.some((r) => r.error)) return { ok: false, error: "Sıralama kaydedilemedi." };

  revalidatePath("/sites/[slug]", "layout");
  return { ok: true };
}
