/**
 * Demo dükkanı sıfırlar (Bölüm 12): npm run demo:reset
 *
 * 1) Eski demo dükkanın Storage dosyalarını siler
 * 2) Demo verisini baştan kurar (veritabanı fonksiyonu public.reset_demo_shop)
 * 3) Demo panel hesaplarını bağlar; hesap yoksa oluşturur
 *
 * Demo hesapları .env.local'den:
 *   DEMO_OWNER_EMAIL, DEMO_BARBER_EMAIL, DEMO_BARBER_NAME (varsayılan "Can Kaya")
 *   DEMO_OWNER_PASSWORD, DEMO_BARBER_PASSWORD (isteğe bağlı; verilirse şifre her sıfırlamada buna ayarlanır)
 * Yönetici panelindeki "Demo'yu sıfırla" butonu aynı adımları lib/demo.ts ile yapar.
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const fail = (m) => {
  console.error(`HATA: ${m}`);
  process.exit(1);
};
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) fail(".env.local içinde NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SECRET_KEY olmalı.");
const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
const tempPassword = () => Array.from(randomBytes(12), (b) => alphabet[b % alphabet.length]).join("").match(/.{4}/g).join("-");

async function findUserId(email) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) fail(error.message);
    const found = data.users.find((u) => u.email === email);
    if (found) return found.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

/** Hesabı bulur/oluşturur; şifre değiştiyse veya yeni oluşturulduysa ekrana yazar */
async function ensureUser(email, password) {
  let userId = await findUserId(email);
  if (!userId) {
    const pw = password || tempPassword();
    const { data, error } = await supabase.auth.admin.createUser({ email, password: pw, email_confirm: true });
    if (error) fail(`${email} oluşturulamadı: ${error.message}`);
    console.log(`  hesap oluşturuldu: ${email}  şifre: ${pw}`);
    return data.user.id;
  }
  if (password) {
    await supabase.auth.admin.updateUserById(userId, { password });
    console.log(`  şifre .env.local'deki değere ayarlandı: ${email}`);
  }
  return userId;
}

// 1) Eski dosyalar
const { data: old } = await supabase.from("shops").select("id").eq("slug", "demo").maybeSingle();
if (old) {
  let removed = 0;
  for (const folder of ["gallery", "barbers", "logo", "cover"]) {
    const { data: files } = await supabase.storage.from("shop-assets").list(`${old.id}/${folder}`, { limit: 1000 });
    const paths = (files ?? []).map((f) => `${old.id}/${folder}/${f.name}`);
    if (paths.length) {
      await supabase.storage.from("shop-assets").remove(paths);
      removed += paths.length;
    }
  }
  if (removed) console.log(`Eski demo dosyaları silindi: ${removed}`);
}

// 2) Veritabanı
const { data: shopId, error } = await supabase.rpc("reset_demo_shop");
if (error || !shopId) fail(`Demo sıfırlanamadı: ${error?.message}`);
console.log("Demo verisi baştan kuruldu.");

// 3) Hesaplar
const ownerEmail = process.env.DEMO_OWNER_EMAIL;
const barberEmail = process.env.DEMO_BARBER_EMAIL;
const barberName = process.env.DEMO_BARBER_NAME || "Can Kaya";
if (ownerEmail) {
  const id = await ensureUser(ownerEmail, process.env.DEMO_OWNER_PASSWORD);
  await supabase.from("shop_members").insert({ shop_id: shopId, user_id: id, role: "owner" });
  console.log(`Demo sahibi bağlandı: ${ownerEmail}`);
}
if (barberEmail) {
  const id = await ensureUser(barberEmail, process.env.DEMO_BARBER_PASSWORD);
  await supabase.from("shop_members").insert({ shop_id: shopId, user_id: id, role: "barber" });
  await supabase.from("barbers").update({ user_id: id }).eq("shop_id", shopId).eq("name", barberName);
  console.log(`Demo berberi bağlandı: ${barberEmail} (${barberName})`);
}
if (!ownerEmail && !barberEmail) console.log("Not: .env.local'de DEMO_OWNER_EMAIL / DEMO_BARBER_EMAIL tanımlı değil; panel hesabı bağlanmadı.");
