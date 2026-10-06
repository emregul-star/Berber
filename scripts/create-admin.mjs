/**
 * Süper yönetici hesabı oluşturur (Bölüm 16, madde 8) — E-POSTA GÖNDERMEZ.
 *
 * Kullanım:
 *   npm run admin:create -- --email siz@ornek.com
 *   npm run admin:create -- --email siz@ornek.com --password "GucluBirSifre123"
 *
 * Kullanıcı yoksa oluşturulur (şifre verilmezse geçici şifre üretilip ekrana yazılır);
 * varsa şifresine dokunulmaz (--password verilirse güncellenir). Sonra platform_admins'e eklenir.
 * Yönetici paneli: http://admin.localhost:3000 (yayında https://admin.PLATFORM_DOMAIN)
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";

const { values } = parseArgs({ options: { email: { type: "string" }, password: { type: "string" } } });
const fail = (m) => {
  console.error(`HATA: ${m}`);
  process.exit(1);
};
if (!values.email) fail("--email zorunlu.");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) fail(".env.local içinde NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SECRET_KEY olmalı.");

const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const email = values.email.trim().toLowerCase();
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
const generated = Array.from(randomBytes(16), (b) => alphabet[b % alphabet.length]).join("").match(/.{4}/g).join("-");

let userId;
for (let page = 1; !userId && page < 50; page++) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
  if (error) fail(error.message);
  userId = data.users.find((u) => u.email === email)?.id;
  if (data.users.length < 200) break;
}

let shownPassword = null;
if (userId) {
  if (values.password) {
    const { error } = await supabase.auth.admin.updateUserById(userId, { password: values.password });
    if (error) fail(`Şifre güncellenemedi: ${error.message}`);
  }
  console.log(`Mevcut kullanıcı: ${email}`);
} else {
  const password = values.password ?? generated;
  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) fail(`Kullanıcı oluşturulamadı: ${error.message}`);
  userId = data.user.id;
  if (!values.password) shownPassword = password;
  console.log(`Kullanıcı oluşturuldu: ${email}`);
}

const { error: adminError } = await supabase.from("platform_admins").upsert({ user_id: userId }, { onConflict: "user_id" });
if (adminError) fail(`Yönetici yetkisi verilemedi: ${adminError.message}`);

console.log("Süper yönetici yetkisi verildi.");
if (shownPassword) console.log(`Geçici şifre: ${shownPassword}  (girişten sonra değiştirmeniz önerilir)`);
