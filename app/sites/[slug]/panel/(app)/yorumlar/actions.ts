"use server";

/**
 * Seçili yorumlar (sadece sahip): Google'dan beğenilen yorumlar elle eklenir (Bölüm 7.1, 8.1).
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/panel/auth";
import { createClient } from "@/lib/supabase/server";

export type Result = { ok: true; message: string } | { ok: false; error: string };

const schema = z.object({
  id: z.uuid().optional(),
  authorName: z.string().trim().min(2, "Yorum sahibinin adını yazın.").max(60),
  rating: z.coerce.number().int().min(1).max(5),
  content: z.string().trim().min(3, "Yorum metnini yazın.").max(600),
  source: z.string().trim().max(30).optional().or(z.literal("")),
  isVisible: z.boolean(),
});

export async function saveTestimonialAction(slug: string, input: unknown): Promise<Result> {
  const user = await requireOwner(slug);
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  const supabase = await createClient();
  const values = {
    author_name: d.authorName,
    rating: d.rating,
    content: d.content,
    source: d.source || null,
    is_visible: d.isVisible,
  };

  if (d.id) {
    const { error } = await supabase.from("testimonials").update(values).eq("id", d.id).eq("shop_id", user.shop.id);
    if (error) return { ok: false, error: "Yorum kaydedilemedi." };
  } else {
    const { count } = await supabase.from("testimonials").select("id", { count: "exact", head: true }).eq("shop_id", user.shop.id);
    const { error } = await supabase.from("testimonials").insert({ ...values, shop_id: user.shop.id, sort_order: (count ?? 0) + 1 });
    if (error) return { ok: false, error: "Yorum eklenemedi." };
  }
  revalidatePath("/sites/[slug]", "layout");
  return { ok: true, message: d.id ? "Yorum güncellendi." : "Yorum eklendi." };
}

export async function deleteTestimonialAction(slug: string, id: string): Promise<Result> {
  const user = await requireOwner(slug);
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Geçersiz istek." };
  const supabase = await createClient();
  const { error } = await supabase.from("testimonials").delete().eq("id", id).eq("shop_id", user.shop.id);
  if (error) return { ok: false, error: "Yorum silinemedi." };
  revalidatePath("/sites/[slug]", "layout");
  return { ok: true, message: "Yorum silindi." };
}
