# BerberPlatform

Erkek berberleri için çok kiracılı (multi-tenant) online randevu platformu.
Projenin tüm gereksinimleri [berber-randevu-platformu.md](berber-randevu-platformu.md) dosyasındadır.

> Bu README her aşamada güncellenecek; tam kurulum ve yayına alma rehberi Aşama 10'da tamamlanacak.

## Teknolojiler

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase · Vitest

## Yerel kurulum

1. Node.js 22 veya üstü gerekir.
2. Bağımlılıkları kurun:
   ```bash
   npm install
   ```
3. `.env.example` dosyasını `.env.local` adıyla kopyalayıp değerleri doldurun.
   `SUPABASE_SECRET_KEY` gizlidir; sadece `.env.local` içinde durur, git'e girmez.
4. Geliştirme sunucusunu başlatın:
   ```bash
   npm run dev
   ```

## Adresler (yerel)

| Adres | Ne açılır |
|---|---|
| http://localhost:3000 | Platform tanıtım sayfası |
| http://demo.localhost:3000 | Demo dükkanın müşteri sitesi |
| http://demo.localhost:3000/panel | Demo dükkanın yönetim paneli |
| http://admin.localhost:3000 | Süper yönetici paneli |
| http://localhost:3000/?shop=demo | Demo dükkan (sadece geliştirme modunda; seçim çerezde hatırlanır, `?shop=` ile çıkılır) |

Modern tarayıcılar `*.localhost` adreslerini ek ayar gerektirmeden bilgisayarınıza yönlendirir.

## Komutlar

| Komut | Açıklama |
|---|---|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Yayın derlemesi |
| `npm run start` | Derlenmiş uygulamayı çalıştırır |
| `npm run lint` | Kod kontrolü (ESLint) |
| `npm test` | Birim testleri (Vitest) |
| `npm run db:push` | Yeni migration'ları Supabase'e uygular |
| `npm run db:seed` | Demo dükkanı sıfırlayıp yeniden oluşturur |
| `npm run db:test` | Güvenlik (RLS) kontrollerini çalıştırır; tüm satırlarda `passed: true` olmalı |
| `npm run db:test:maintenance` | Günlük bakım işlerinin (gecikme, KVKK anonimleştirme) kontrolü |
| `npm run admin:create -- --email X` | Süper yönetici hesabı oluşturur |
| `npm run panel:user -- ...` | Dükkan paneline sahip/berber hesabı açar |
| `npm run demo:reset` | Demo dükkanı ve demo hesaplarını sıfırlar |
| `npm run db:advisors` | Supabase güvenlik/performans denetimi |
| `npm run db:types` | Veritabanından TypeScript tiplerini yeniden üretir |

## Veritabanı (Supabase CLI)

İlk kurulumda bir kez (proje klasöründeki terminalde):

```bash
npx supabase login
npx supabase link --project-ref <PROJE_REF>
npm run db:push
npm run db:seed
```

- Şema, güvenlik kuralları ve storage ayarları `supabase/migrations/` altındadır. Veritabanı
  değişiklikleri her zaman yeni bir migration dosyasıyla yapılır: `npx supabase migration new <ad>`.
- Yeni tablo eklerken `anon` / `authenticated` yetkileri (GRANT) ve RLS politikaları aynı
  migration'da açıkça yazılmalıdır; Supabase yeni tabloları otomatik olarak dışarı açmaz.
- Süper yönetici eklemek için: `npm run admin:create -- --email siz@ornek.com` (aşağıya bakın).

## ⚠️ KVKK aydınlatma metni hakkında

Dükkan sitelerindeki `/kvkk` sayfası (`app/sites/[slug]/(site)/kvkk/page.tsx`) bir **taslaktır**
ve hukuki danışmanlık yerine geçmez. Gerçek bir dükkan için yayına almadan önce mutlaka bir
hukukçuya (KVKK alanında uzman bir avukata) kontrol ettirin. Özellikle yurt dışına veri aktarımı
(barındırma ve e-posta servisleri) ve hukuki sebepler bölümleri gözden geçirilmelidir.

## Temalar

Dükkan temaları `lib/themes.ts` içindedir: `luxury`, `modern`, `classic`, `fresh`. Her dükkan bir
tema seçer ve isterse ana/vurgu rengini değiştirir. Renkler sayfaya CSS değişkeni olarak basılır,
Tailwind sınıfları (`bg-bg`, `text-text`, `bg-primary`, `text-on-primary` ...) bunları kullanır.
Hazır temaların okunabilirliği (kontrast) birim testleriyle kontrol edilir.

## Randevu alma (kısaca)

- Müsaitlik algoritması `lib/availability.ts` içinde saf fonksiyondur; testleri `lib/availability.test.ts`.
- Boş saatler `GET /randevu-al/saatler` uç noktasından gelir; randevu `randevu-al/actions.ts`
  Server Action'ıyla sunucuda oluşturulur (honeypot, IP hız sınırı, telefon kontrolü, saat yeniden doğrulama).
- Aynı saate iki randevu veritabanı kuralıyla engellenir; müşteri "Bu saat az önce doldu" mesajı görür.
- Spam limitleri `lib/constants.ts` içindeki `BOOKING_LIMITS` ile ayarlanır.
- Müşteri randevusunu `/randevu/{token}` sayfasından iptal eder veya saatini değiştirir
  (`lib/manage.ts`). İzin kuralı (`cancel_deadline_minutes`) `lib/manage-rules.ts` içinde saf
  fonksiyondur; hem sayfa hem sunucu aynı kuralı kullanır. Sayfa arama motorlarına kapalıdır.

## E-posta bildirimleri

- Sağlayıcı: [Resend](https://resend.com) (ücretsiz plan: ayda 3.000, günde 100 e-posta).
  Kod `lib/notifications/` altındadır; e-posta ve (şimdilik boş) SMS sağlayıcısı aynı arayüzü uygular.
- `.env.local` içinde `EMAIL_PROVIDER_API_KEY` tanımlı değilse e-posta gönderimi kapalıdır.
  `EMAIL_FROM` boşsa gönderen `onboarding@resend.dev` olur.
- **Alan adı doğrulanmadan** Resend sadece hesap sahibinin adresine ve test adreslerine
  (`delivered@resend.dev`) gönderir. Gerçek müşterilere gönderim için Resend'de alan adı
  doğrulanmalı ve `EMAIL_FROM` o alan adından bir adres olmalıdır (bkz. Bölüm 16, madde 6).
- E-postalar yanıt gönderildikten sonra (`after()`) gider; başarısız olursa randevu etkilenmez,
  hata sunucu loglarına yazılır. **Demo dükkanda hiçbir e-posta gönderilmez.**

## Dükkan paneli (`{slug}.PLATFORM_DOMAIN/panel`)

- Giriş: e-posta + şifre (Supabase Auth). Roller: **sahip** (her şey) ve **berber** (sadece kendi
  randevuları, kendi izinleri, kendi adına randevu ekleme). Yetki her sayfada ve her işlemde
  `lib/panel/auth.ts` ile kontrol edilir; son savunma hattı veritabanı RLS kurallarıdır.
- **Ücretsiz kurulumda hesaplar e-posta gönderilmeden açılır** (Supabase'in yerleşik e-postası saatte
  2 e-posta ve sadece proje ekibine gönderir):
  - Sahip hesabı: `npm run panel:user -- --slug demo --email sahip@ornek.com --role owner`
  - Berber hesabı: panelde **Berberler > Giriş hesabı aç** (geçici şifre ekranda bir kez gösterilir)
    veya `npm run panel:user -- --slug demo --email berber@ornek.com --role barber --barber "Berber Adı"`
  - Şifresini unutan berbere sahip **Yeni geçici şifre ver** ile yeni şifre verir; sahibe ise
    yukarıdaki komut (aynı e-postayla tekrar çalıştırmak şifreyi yeniler). Kullanıcılar şifrelerini
    panelde **Şifre değiştir** sayfasından değiştirir.
  - Alan adı alınıp Supabase'e özel SMTP tanımlanınca `.env.local`'de `AUTH_EMAILS_ENABLED=true`
    yapılır; "Şifremi unuttum" e-postayla çalışmaya başlar.
- `npm run db:seed` demo dükkanı yeniden oluşturduğu için panel üyelikleri de silinir; sonrasında
  `npm run demo:reset` kullanın; demo hesaplarını otomatik bağlar.

## Süper yönetici paneli (`admin.PLATFORM_DOMAIN`, yerelde http://admin.localhost:3000)

- İlk yönetici hesabınızı oluşturun (e-posta gönderilmez; şifre verilmezse geçici şifre ekrana yazılır):
  `npm run admin:create -- --email siz@ornek.com`
- Sayfalar: **Pano** (aktif dükkan, bu ay beklenen gelir, alınan ödemeler, gecikmiş ödemeler —
  7 günden fazla gecikene "Askıya alınmalı" işareti), **Dükkanlar**, **Yeni dükkan** sihirbazı
  (dükkan + sahip hesabı + abonelik + varsayılan saatler/hizmetler tek seferde), **Dükkan detayı**
  (abonelik, ödeme ekle → `paid_until` otomatik ilerler, askıya al / aktif et, üyelere geçici şifre),
  **Platform ayarları** (IBAN — kontrol hanesi doğrulanır; dükkan sahibinin Abonelik sayfasında görünür).
- Otomatik askıya alma yoktur; karar yöneticinindir (`SUSPEND_SUGGEST_AFTER_DAYS`, `lib/constants.ts`).

## Günlük otomatik işler (Supabase pg_cron, ücretsiz)

Her gün 03:00 (İstanbul) veritabanında `private.daily_maintenance()` çalışır:
- Ödenmiş süresi geçen abonelikleri "gecikti" yapar
- 24 aydan eski tamamlanmış/iptal randevulardaki müşteri iletişim bilgilerini anonimleştirir (KVKK)
- Eski hız sınırı kayıtlarını siler

Kontrol testi: `npm run db:test:maintenance` (geri alınan işlem içinde çalışır).
Not: Supabase ücretsiz projeleri bir hafta hiç kullanılmazsa duraklatılır; duraklayınca bu işler de durur.

## Demo dükkan

- `npm run demo:reset`: demo verisini bugüne göre baştan kurar, eski demo görsellerini siler ve
  `.env.local`'deki `DEMO_OWNER_EMAIL` / `DEMO_BARBER_EMAIL` hesaplarını bağlar (şifreler değişmez;
  hesap yoksa oluşturulup şifre ekrana yazılır). Aynı işlem yönetici panosundaki **Demo'yu sıfırla** butonundadır.

## İstatistikler

- Panel > İstatistikler: bugün / bu hafta / bu ay / geçen ay / özel aralık. Hesaplar sunucuda, saf
  fonksiyon olarak `lib/stats.ts` içinde; elle kontrol edilebilir test senaryosu `lib/stats.test.ts`.
- Berber sadece kendi randevularının istatistiğini görür (veritabanı kuralı).

## Nasıl çalışır? (kısaca)

`proxy.ts` her istekte host'a bakar ve isteği dahili klasörlere yönlendirir:

- `{slug}.PLATFORM_DOMAIN/...` → `app/sites/[slug]/...`
- `admin.PLATFORM_DOMAIN/...` → `app/admin/...`
- Ana alan adı → `app/(platform)/...`

`/sites` ve `/admin` yollarına dışarıdan doğrudan erişim engellidir.
