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

## Nasıl çalışır? (kısaca)

`proxy.ts` her istekte host'a bakar ve isteği dahili klasörlere yönlendirir:

- `{slug}.PLATFORM_DOMAIN/...` → `app/sites/[slug]/...`
- `admin.PLATFORM_DOMAIN/...` → `app/admin/...`
- Ana alan adı → `app/(platform)/...`

`/sites` ve `/admin` yollarına dışarıdan doğrudan erişim engellidir.
