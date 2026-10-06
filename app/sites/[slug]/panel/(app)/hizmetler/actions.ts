"use server";

/**
 * Hizmet yönetimi (sadece sahip). Bölüm 8.2: hizmet silinmez, pasif yapılır;
 * hiç randevusu olmayan hizmet silinebilir.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/panel/auth";
import { createClient } from "@/lib/supabase/server";

export type Result = { ok: true; message: string } | { ok: false; error: string };

const serviceSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2, "Hizmet adını yazın.").max(80),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  durationMinutes: z.coerce.number().int().min(5, "Süre en az 5 dakika olmalı.").max(600, "Süre en fazla 600 dakika olabilir."),
  price: z.coerce.number().min(0, "Fiyat negatif olamaz.").max(100000),
  isActive: z.boolean(),
  barberIds: z.array(z.uuid()),
});

export async function saveServiceAction(slug: string, input: unknown): Promise<Result> {
  const user = await requireOwner(slug);
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  const supabase = await createClient();

  const values = {
    name: d.name,
    description: d.description || null,
    duration_minutes: d.durationMinutes,
    price: d.price,
    is_active: d.isActive,
  };

  let serviceId = d.id;
  if (serviceId) {
    const { error } = await supabase.from("services").update(values).eq("id", serviceId).eq("shop_id", user.shop.id);
    if (error) return { ok: false, error: "Hizmet kaydedilemedi." };
  } else {
    // Yeni hizmet listenin sonuna eklenir
    const { count } = await supabase.from("services").select("id", { count: "exact", head: true }).eq("shop_id", user.shop.id);
    const { data, error } = await supabase
      .from("services")
      .insert({ ...values, shop_id: user.shop.id, sort_order: (count ?? 0) + 1 })
      .select("id")
      .single();
    if (error) return { ok: false, error: "Hizmet eklenemedi." };
    serviceId = data.id;
  }

  // Bu hizmeti veren berberleri güncelle: önce sil, sonra seçilenleri ekle
  const { error: delError } = await supabase
    .from("barber_services")
    .delete()
    .eq("service_id", serviceId)
    .eq("shop_id", user.shop.id);
  if (delError) return { ok: false, error: "Berber seçimi kaydedilemedi." };
  if (d.barberIds.length) {
    const { error: insError } = await supabase
      .from("barber_services")
      .insert(d.barberIds.map((barberId) => ({ shop_id: user.shop.id, barber_id: barberId, service_id: serviceId! })));
    if (insError) return { ok: false, error: "Berber seçimi kaydedilemedi." };
  }

  revalidatePath("/sites/[slug]", "layout");
  return { ok: true, message: d.id ? "Hizmet güncellendi." : "Hizmet eklendi." };
}

export async function deleteServiceAction(slug: string, id: string): Promise<Result> {
  const user = await requireOwner(slug);
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Geçersiz istek." };
  const supabase = await createClient();

  const { count } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("service_id", id)
    .eq("shop_id", user.shop.id);
  if ((count ?? 0) > 0) {
    return { ok: false, error: "Bu hizmetin randevuları olduğu için silinemez. Bunun yerine pasif yapın." };
  }

  const { error } = await supabase.from("services").delete().eq("id", id).eq("shop_id", user.shop.id);
  if (error) return { ok: false, error: "Hizmet silinemedi." };
  revalidatePath("/sites/[slug]", "layout");
  return { ok: true, message: "Hizmet silindi." };
}
