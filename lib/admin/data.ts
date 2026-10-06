/**
 * Süper yönetici veri okuma. Giriş yapmış yöneticinin oturumuyla (RLS: yönetici her şeyi görür).
 */
import "server-only";
import { localDateOf } from "../availability";
import { daysOverdue } from "../billing";
import { SUSPEND_SUGGEST_AFTER_DAYS } from "../constants";
import { createAdminClient } from "../supabase/admin";
import { createClient } from "../supabase/server";

export type ShopRow = {
  id: string;
  slug: string;
  name: string;
  status: string;
  is_demo: boolean;
  created_at: string;
  subscription: { monthly_fee: number; setup_fee: number; billing_day: number; paid_until: string | null; status: string; notes: string | null } | null;
  overdueDays: number;
  /** Ödemesi SUSPEND_SUGGEST_AFTER_DAYS günden fazla gecikmiş ve henüz askıda değil */
  suggestSuspend: boolean;
};

export const today = () => localDateOf(new Date());

export async function listShops(): Promise<ShopRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shops")
    .select("id, slug, name, status, is_demo, created_at, subscriptions(monthly_fee, setup_fee, billing_day, paid_until, status, notes)")
    .order("created_at", { ascending: false })
    .overrideTypes<
      Array<Omit<ShopRow, "subscription" | "overdueDays" | "suggestSuspend"> & { subscriptions: ShopRow["subscription"] }>,
      { merge: false }
    >();
  if (error) throw new Error(`Dükkanlar okunamadı: ${error.message}`);
  const t = today();
  return (data ?? []).map(({ subscriptions, ...shop }) => {
    const overdueDays = shop.is_demo ? 0 : daysOverdue(subscriptions?.paid_until ?? null, t);
    return {
      ...shop,
      subscription: subscriptions,
      overdueDays,
      suggestSuspend: shop.status !== "suspended" && overdueDays > SUSPEND_SUGGEST_AFTER_DAYS,
    };
  });
}

export async function countSuspensionCandidates(): Promise<number> {
  return (await listShops()).filter((s) => s.suggestSuspend).length;
}

/** Bu ay (İstanbul takvimi) alınan ödemeler */
export async function paymentsThisMonth() {
  const t = today();
  const monthStart = `${t.slice(0, 7)}-01`;
  const supabase = await createClient();
  const { data } = await supabase
    .from("payments")
    .select("id, amount, type, method, paid_at, shop_id, shops(name, slug)")
    .gte("paid_at", new Date(`${monthStart}T00:00:00+03:00`).toISOString())
    .order("paid_at", { ascending: false })
    .overrideTypes<
      Array<{ id: string; amount: number; type: string; method: string; paid_at: string; shop_id: string; shops: { name: string; slug: string } | null }>,
      { merge: false }
    >();
  return data ?? [];
}

export async function getShopDetail(id: string) {
  const supabase = await createClient();
  const [{ data: shop }, { data: subscription }, { data: payments }, { data: members }] = await Promise.all([
    supabase.from("shops").select("id, slug, name, status, is_demo, email, phone, created_at, custom_domain").eq("id", id).maybeSingle(),
    supabase.from("subscriptions").select("id, setup_fee, monthly_fee, billing_day, paid_until, status, notes").eq("shop_id", id).maybeSingle(),
    supabase
      .from("payments")
      .select("id, amount, type, period_start, period_end, method, paid_at")
      .eq("shop_id", id)
      .order("paid_at", { ascending: false }),
    supabase.from("shop_members").select("user_id, role").eq("shop_id", id),
  ]);
  if (!shop) return null;

  // Üyelerin e-postaları Auth'ta durur (secret key gerekir)
  const admin = createAdminClient();
  const memberEmails = await Promise.all(
    (members ?? []).map(async (m) => {
      const { data } = await admin.auth.admin.getUserById(m.user_id);
      return { userId: m.user_id, role: m.role, email: data.user?.email ?? "?" };
    }),
  );
  return { shop, subscription, payments: payments ?? [], members: memberEmails };
}
