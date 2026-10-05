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
- Süper yönetici eklemek için (kullanıcı Supabase Auth'ta oluşturulduktan sonra):
  `npx supabase db query --linked "insert into platform_admins (user_id) select id from auth.users where email = 'siz@ornek.com'"`

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

## Nasıl çalışır? (kısaca)

`proxy.ts` her istekte host'a bakar ve isteği dahili klasörlere yönlendirir:

- `{slug}.PLATFORM_DOMAIN/...` → `app/sites/[slug]/...`
- `admin.PLATFORM_DOMAIN/...` → `app/admin/...`
- Ana alan adı → `app/(platform)/...`

`/sites` ve `/admin` yollarına dışarıdan doğrudan erişim engellidir.
