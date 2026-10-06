/**
 * Panel kullanıcısı oluşturur veya şifresini sıfırlar — E-POSTA GÖNDERMEZ (ücretsiz yol).
 *
 * Kullanım:
 *   npm run panel:user -- --slug demo --email sahip@ornek.com --role owner
 *   npm run panel:user -- --slug demo --email can@ornek.com --role barber --barber "Can Kaya"
 *   npm run panel:user -- --slug demo --email sahip@ornek.com --role owner --password "OzelSifre123"
 *
 * Şifre verilmezse güçlü bir geçici şifre üretilip ekrana yazılır. Kullanıcı ilk girişte
 * panelden şifresini değiştirmelidir. Kullanıcı zaten varsa şifresi bu değerle güncellenir.
 * Secret key kullanır; sadece geliştiricinin bilgisayarında çalıştırılmalıdır.
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    slug: { type: "string" },
    email: { type: "string" },
    role: { type: "string", default: "owner" },
    barber: { type: "string" },
    password: { type: "string" },
  },
});

function fail(message) {
  console.error(`HATA: ${message}`);
  process.exit(1);
}

if (!values.slug || !values.email) fail("--slug ve --email zorunlu.");
if (!["owner", "barber"].includes(values.role)) fail("--role owner veya barber olmalı.");
if (values.role === "barber" && !values.barber) fail('Berber için --barber "Berber Adı" gerekli.');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) fail(".env.local içinde NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SECRET_KEY olmalı.");

const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const email = values.email.trim().toLowerCase();
// Karışmayan karakterlerle okunaklı geçici şifre (ör. Kx7m-Pq2r-Tz9w)
const password =
  values.password ??
  randomBytes(9)
    .toString("base64url")
    .replace(/[-_0OIl]/g, "x")
    .match(/.{1,4}/g)
    .join("-");

const { data: shop } = await supabase.from("shops").select("id, name").eq("slug", values.slug).maybeSingle();
if (!shop) fail(`"${values.slug}" dükkanı bulunamadı.`);

// Kullanıcı var mı? (e-postaya göre)
let userId;
for (let page = 1; !userId; page++) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
  if (error) fail(error.message);
  userId = data.users.find((u) => u.email === email)?.id;
  if (data.users.length < 200) break;
}

if (userId) {
  const { error } = await supabase.auth.admin.updateUserById(userId, { password });
  if (error) fail(`Şifre güncellenemedi: ${error.message}`);
  console.log(`Mevcut kullanıcının şifresi güncellendi: ${email}`);
} else {
  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) fail(`Kullanıcı oluşturulamadı: ${error.message}`);
  userId = data.user.id;
  console.log(`Kullanıcı oluşturuldu: ${email}`);
}

const { error: memberError } = await supabase
  .from("shop_members")
  .upsert({ shop_id: shop.id, user_id: userId, role: values.role }, { onConflict: "shop_id,user_id" });
if (memberError) fail(`Dükkan üyeliği eklenemedi: ${memberError.message}`);

if (values.role === "barber") {
  const { data: barber, error } = await supabase
    .from("barbers")
    .update({ user_id: userId })
    .eq("shop_id", shop.id)
    .eq("name", values.barber)
    .select("id")
    .maybeSingle();
  if (error || !barber) fail(`"${values.barber}" adlı berber bulunamadı veya bağlanamadı.`);
}

console.log(`\nDükkan : ${shop.name} (${values.slug})`);
console.log(`Rol    : ${values.role === "owner" ? "Dükkan sahibi" : `Berber (${values.barber})`}`);
console.log(`E-posta: ${email}`);
console.log(`Şifre  : ${password}`);
