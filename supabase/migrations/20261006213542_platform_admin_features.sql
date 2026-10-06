-- =============================================================================
-- Süper yönetici özellikleri (Bölüm 11, 12, 7.5)
--
--  1. platform_settings: IBAN / alıcı adı (dükkan sahibinin abonelik sayfasında gösterilir)
--  2. create_shop_with_defaults(): yeni dükkanı varsayılan verilerle TEK İŞLEMDE oluşturur
--  3. reset_demo_shop(): demo dükkanı sıfırlar (seed.sql ve demo:reset bunu çağırır)
--  4. Günlük bakım (pg_cron, ücretsiz): gecikmiş abonelikleri işaretle, eski müşteri
--     bilgilerini anonimleştir (KVKK), eski hız sınırı kayıtlarını sil
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Platform ayarları (tek satırlık tablo)
-- -----------------------------------------------------------------------------
create table public.platform_settings (
  id int primary key default 1 check (id = 1),
  updated_at timestamptz not null default now(),
  iban text check (iban is null or iban ~ '^TR[0-9]{24}$'),
  account_holder text check (char_length(account_holder) <= 100),
  bank_name text check (char_length(bank_name) <= 60),
  payment_note text check (char_length(payment_note) <= 300)
);
insert into public.platform_settings (id) values (1);

alter table public.platform_settings enable row level security;
revoke all on public.platform_settings from anon, authenticated;
grant all on public.platform_settings to service_role;
grant select, update on public.platform_settings to authenticated;

-- Giriş yapmış her panel kullanıcısı okuyabilir (IBAN sahiplerle paylaşılmak için var);
-- sadece süper yönetici değiştirebilir.
create policy "platform_settings: authenticated can read"
  on public.platform_settings for select to authenticated
  using (true);
create policy "platform_settings: admins can update"
  on public.platform_settings for update to authenticated
  using ((select private.is_platform_admin()))
  with check ((select private.is_platform_admin()));

-- -----------------------------------------------------------------------------
-- 2. Yeni dükkan + varsayılan veriler (Bölüm 11.1, sihirbazın 5. adımı)
-- Tek işlem: bir adım hata verirse hiçbiri kaydedilmez.
-- Sadece sunucu (service_role) çağırır; çağırmadan önce süper yönetici kontrolü yapılır.
-- -----------------------------------------------------------------------------
create or replace function public.create_shop_with_defaults(
  p_slug text,
  p_name text,
  p_theme text,
  p_owner_user_id uuid,
  p_created_by uuid,
  p_setup_fee numeric,
  p_monthly_fee numeric,
  p_billing_day int,
  p_services jsonb,           -- [{ "name": "...", "duration": 30, "price": 350 }, ...]
  p_first_barber_name text    -- boş değilse sahibi ilk berber olarak ekler
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop uuid;
  v_barber uuid;
  v_service jsonb;
  v_service_id uuid;
  v_index int := 0;
begin
  insert into public.shops (slug, name, theme_preset, status, created_by)
  values (p_slug, p_name, p_theme, 'active', p_created_by)
  returning id into v_shop;
  -- shop_settings, shops üzerindeki trigger ile varsayılan değerlerle oluşur

  insert into public.subscriptions (shop_id, setup_fee, monthly_fee, billing_day, status)
  values (v_shop, p_setup_fee, p_monthly_fee, p_billing_day, 'active');

  insert into public.shop_members (shop_id, user_id, role) values (v_shop, p_owner_user_id, 'owner');

  -- Varsayılan çalışma saatleri: Pzt-Cmt 09:00-20:00, Pazar kapalı
  insert into public.working_hours (shop_id, weekday, start_time, end_time, is_closed)
  select v_shop, d, '09:00', '20:00', false from generate_series(0, 5) d;
  insert into public.working_hours (shop_id, weekday, is_closed) values (v_shop, 6, true);

  if coalesce(trim(p_first_barber_name), '') <> '' then
    insert into public.barbers (shop_id, name, title, user_id, sort_order)
    values (v_shop, trim(p_first_barber_name), 'Usta', p_owner_user_id, 1)
    returning id into v_barber;
  end if;

  for v_service in select * from jsonb_array_elements(coalesce(p_services, '[]'::jsonb)) loop
    v_index := v_index + 1;
    insert into public.services (shop_id, name, duration_minutes, price, sort_order)
    values (v_shop, v_service->>'name', (v_service->>'duration')::int, (v_service->>'price')::numeric, v_index)
    returning id into v_service_id;
    if v_barber is not null then
      insert into public.barber_services (shop_id, barber_id, service_id) values (v_shop, v_barber, v_service_id);
    end if;
  end loop;

  return v_shop;
end;
$$;

revoke execute on function public.create_shop_with_defaults(text, text, text, uuid, uuid, numeric, numeric, int, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.create_shop_with_defaults(text, text, text, uuid, uuid, numeric, numeric, int, jsonb, text)
  to service_role;

-- -----------------------------------------------------------------------------
-- 3. Demo dükkanı sıfırlama (Bölüm 12). Tekrar tekrar çalıştırılabilir.
-- Not: Panel hesapları (auth) burada oluşturulmaz; demo:reset script'i bağlar.
-- -----------------------------------------------------------------------------
create or replace function public.reset_demo_shop()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop uuid;
  v_ahmet uuid;
  v_mehmet uuid;
  v_can uuid;
  v_kesim uuid;
  v_sakal uuid;
  v_sacsakal uuid;
  v_cocuk uuid;
  v_cilt uuid;
  v_damat uuid;
  -- Bugünün İstanbul'daki tarihi (sunucu UTC'de çalışır)
  v_today date := (now() at time zone 'Europe/Istanbul')::date;
begin
  -- Eski demo verisini temizle (bağlı tüm kayıtlar cascade ile silinir)
  delete from public.shops where slug = 'demo';

  -- ---------------------------------------------------------------- Dükkan
  insert into public.shops (
    slug, name, description, phone, whatsapp_number, address,
    google_maps_embed_url, google_reviews_url, instagram_url,
    theme_preset, status, is_demo
  ) values (
    'demo',
    'Demo Berber',
    'Klasik usta işçiliği ile modern kesimleri buluşturan mahallenin berberi. 1998''den beri hizmetinizdeyiz.',
    '0216 555 00 00',
    '905550000000',
    'Bağdat Caddesi No: 1, Kadıköy / İstanbul',
    'https://www.google.com/maps?q=Kad%C4%B1k%C3%B6y%2C%20%C4%B0stanbul&output=embed',
    'https://www.google.com/maps/search/?api=1&query=Kad%C4%B1k%C3%B6y%20berber',
    'https://www.instagram.com/',
    'luxury',
    'demo',
    true
  )
  returning id into v_shop;

  -- shop_settings trigger ile varsayılan değerlerle oluştu; demo için ayarla
  update public.shop_settings
  set slot_interval_minutes = 15,
      min_notice_minutes = 60,
      max_advance_days = 14,
      cancel_deadline_minutes = 120,
      requires_approval = false,
      buffer_minutes = 0,
      allow_any_barber = true
  where shop_id = v_shop;

  insert into public.subscriptions (shop_id, setup_fee, monthly_fee, billing_day, paid_until, status, notes)
  values (v_shop, 0, 0, 1, v_today + 365, 'active', 'Demo dükkan — ücretsiz.');

  -- ---------------------------------------------------------------- Berberler
  insert into public.barbers (shop_id, name, title, bio, sort_order)
  values (v_shop, 'Ahmet Yılmaz', 'Usta', '25 yıllık tecrübe. Klasik kesim ve damat tıraşı uzmanı.', 1)
  returning id into v_ahmet;

  insert into public.barbers (shop_id, name, title, bio, sort_order)
  values (v_shop, 'Mehmet Demir', 'Kalfa', 'Modern kesimler ve cilt bakımı.', 2)
  returning id into v_mehmet;

  insert into public.barbers (shop_id, name, title, bio, sort_order)
  values (v_shop, 'Can Kaya', 'Berber', 'Fade ve çocuk tıraşında çok sabırlı.', 3)
  returning id into v_can;

  -- ---------------------------------------------------------------- Hizmetler
  insert into public.services (shop_id, name, description, duration_minutes, price, sort_order)
  values (v_shop, 'Saç Kesimi', 'Yıkama ve şekillendirme dahil.', 30, 350, 1)
  returning id into v_kesim;

  insert into public.services (shop_id, name, description, duration_minutes, price, sort_order)
  values (v_shop, 'Sakal Tıraşı', 'Sıcak havlu ile ustura tıraşı.', 20, 200, 2)
  returning id into v_sakal;

  insert into public.services (shop_id, name, description, duration_minutes, price, sort_order)
  values (v_shop, 'Saç + Sakal', 'Saç kesimi ve sakal tıraşı birlikte.', 45, 500, 3)
  returning id into v_sacsakal;

  insert into public.services (shop_id, name, description, duration_minutes, price, sort_order)
  values (v_shop, 'Çocuk Tıraşı', '12 yaş altı.', 20, 250, 4)
  returning id into v_cocuk;

  insert into public.services (shop_id, name, description, duration_minutes, price, sort_order)
  values (v_shop, 'Cilt Bakımı', 'Temizlik, maske ve nemlendirme.', 30, 400, 5)
  returning id into v_cilt;

  insert into public.services (shop_id, name, description, duration_minutes, price, sort_order)
  values (v_shop, 'Damat Tıraşı', 'Saç, sakal, cilt bakımı ve fön. Özel gününüz için.', 90, 1500, 6)
  returning id into v_damat;

  -- Kim hangi hizmeti veriyor
  insert into public.barber_services (shop_id, barber_id, service_id)
  select v_shop, b, s
  from (values
    (v_ahmet, v_kesim), (v_ahmet, v_sakal), (v_ahmet, v_sacsakal), (v_ahmet, v_cocuk), (v_ahmet, v_cilt), (v_ahmet, v_damat),
    (v_mehmet, v_kesim), (v_mehmet, v_sakal), (v_mehmet, v_sacsakal), (v_mehmet, v_cocuk), (v_mehmet, v_cilt),
    (v_can, v_kesim), (v_can, v_sakal), (v_can, v_sacsakal), (v_can, v_cocuk)
  ) as t(b, s);

  -- ---------------------------------------------------------------- Çalışma saatleri
  -- Dükkan geneli: Pzt-Cmt 09:00-20:00, öğle arası 13:00-14:00; Pazar kapalı
  insert into public.working_hours (shop_id, barber_id, weekday, start_time, end_time, break_start, break_end, is_closed)
  select v_shop, null, d, '09:00', '20:00', '13:00', '14:00', false
  from generate_series(0, 5) as d;

  insert into public.working_hours (shop_id, barber_id, weekday, is_closed)
  values (v_shop, null, 6, true);

  -- Berbere özel: Can öğleden sonra çalışıyor (12:00-20:00, molasız)
  insert into public.working_hours (shop_id, barber_id, weekday, start_time, end_time, is_closed)
  select v_shop, v_can, d, '12:00', '20:00', false
  from generate_series(0, 5) as d;

  -- ---------------------------------------------------------------- Galeri
  -- Yer tutucu görseller (public/demo/ altında, Aşama 3'te eklenecek)
  insert into public.gallery_images (shop_id, image_url, caption, sort_order)
  select v_shop, format('/demo/gallery-%s.svg', lpad(n::text, 2, '0')), c, n
  from (values
    (1, 'Klasik kesim'), (2, 'Skin fade'), (3, 'Sakal şekillendirme'), (4, 'Ustura tıraşı'),
    (5, 'Damat tıraşı'), (6, 'Çocuk tıraşı'), (7, 'Dükkanımızdan'), (8, 'Cilt bakımı'),
    (9, 'Modern kesim'), (10, 'Bekleme alanımız')
  ) as t(n, c);

  -- ---------------------------------------------------------------- Yorumlar
  insert into public.testimonials (shop_id, author_name, rating, content, source, sort_order)
  values
    (v_shop, 'Emre K.', 5, 'Yıllardır başka berbere gitmedim. Ahmet Usta işinin ehli.', 'Google', 1),
    (v_shop, 'Burak T.', 5, 'Online randevu çok pratik, hiç beklemeden tıraş oldum.', 'Google', 2),
    (v_shop, 'Serkan A.', 4, 'Temiz ve güler yüzlü bir dükkan. Fiyatlar makul.', 'Google', 3),
    (v_shop, 'Oğuz D.', 5, 'Oğlumun ilk tıraşını Can Bey yaptı, çok sabırlıydı.', 'Google', 4),
    (v_shop, 'Kerem Y.', 5, 'Damat tıraşım için geldim, harika bir deneyimdi.', 'Google', 5);

  -- ---------------------------------------------------------------- İzin
  -- Mehmet, Pazar hariç 5. iş gününde izinli (randevuları da o güne konmadı)
  insert into public.time_off (shop_id, barber_id, starts_at, ends_at, reason)
  select v_shop, v_mehmet,
         (d.day::timestamp) at time zone 'Europe/Istanbul',
         ((d.day + 1)::timestamp) at time zone 'Europe/Istanbul',
         'Yıllık izin'
  from (
    select g::date as day, row_number() over (order by g) as n
    from generate_series(v_today + 1, v_today + 14, interval '1 day') g
    where extract(isodow from g) <> 7
  ) d
  where d.n = 5;

  -- ---------------------------------------------------------------- Randevular
  -- n = bugünden itibaren kaçıncı iş günü (Pazar atlanır). Gelecek randevular.
  insert into public.appointments (
    shop_id, barber_id, service_id, starts_at, ends_at, blocked_until, status,
    customer_name, customer_phone, customer_email, price_at_booking,
    manage_token_hash, kvkk_consent_at, source
  )
  select
    v_shop, a.barber_id, s.id,
    st.starts_at,
    st.starts_at + make_interval(mins => s.duration_minutes),
    st.starts_at + make_interval(mins => s.duration_minutes),  -- buffer_minutes = 0
    a.status, a.customer_name, a.customer_phone, a.customer_email, s.price,
    -- Demo: rastgele hash (bu randevuların yönetim linki yok)
    encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex'),
    case when a.source = 'web' then now() end,
    a.source
  from (values
    (1, v_ahmet,  v_kesim,    '10:00'::time, 'confirmed', 'Ali Şahin',      '905321110001', 'ali@example.com',    'web'),
    (1, v_ahmet,  v_sacsakal, '11:00',       'confirmed', 'Hakan Öz',       '905321110002', null,                 'panel'),
    (1, v_mehmet, v_sakal,    '10:30',       'confirmed', 'Murat Çelik',    '905321110003', 'murat@example.com',  'web'),
    (1, v_can,    v_kesim,    '14:30',       'pending',   'Deniz Arslan',   '905321110004', 'deniz@example.com',  'web'),
    (2, v_ahmet,  v_damat,    '15:00',       'confirmed', 'Kerem Yıldız',   '905321110005', 'kerem@example.com',  'web'),
    (2, v_mehmet, v_kesim,    '09:30',       'confirmed', 'Tolga Aydın',    '905321110006', null,                 'panel'),
    (2, v_can,    v_sacsakal, '16:00',       'confirmed', 'Volkan Koç',     '905321110007', 'volkan@example.com', 'web'),
    (3, v_ahmet,  v_kesim,    '09:00',       'confirmed', 'Selim Kurt',     '905321110008', 'selim@example.com',  'web'),
    (3, v_mehmet, v_cilt,     '17:00',       'pending',   'Barış Polat',    '905321110009', 'baris@example.com',  'web'),
    (3, v_can,    v_cocuk,    '12:30',       'confirmed', 'Efe Doğan',      '905321110010', 'efe@example.com',    'web'),
    (4, v_ahmet,  v_sakal,    '18:00',       'confirmed', 'Onur Güneş',     '905321110011', null,                 'panel'),
    (4, v_mehmet, v_sacsakal, '11:00',       'confirmed', 'Cem Aksoy',      '905321110012', 'cem@example.com',    'web'),
    (4, v_can,    v_kesim,    '19:00',       'confirmed', 'Yusuf Erdem',    '905321110013', 'yusuf@example.com',  'web'),
    (5, v_ahmet,  v_kesim,    '10:00',       'confirmed', 'Kaan Bulut',     '905321110014', 'kaan@example.com',   'web'),
    (5, v_can,    v_sakal,    '13:00',       'pending',   'Arda Tekin',     '905321110015', 'arda@example.com',   'web'),
    (6, v_ahmet,  v_sacsakal, '14:00',       'confirmed', 'Sinan Avcı',     '905321110016', 'sinan@example.com',  'web'),
    (6, v_mehmet, v_kesim,    '15:30',       'confirmed', 'Gökhan Ateş',    '905321110017', null,                 'panel'),
    (7, v_can,    v_kesim,    '12:00',       'confirmed', 'Umut Şen',       '905321110018', 'umut@example.com',   'web'),
    (7, v_mehmet, v_cocuk,    '10:00',       'confirmed', 'Mert Yalçın',    '905321110019', 'mert@example.com',   'web')
  ) as a(n, barber_id, service_id, at_time, status, customer_name, customer_phone, customer_email, source)
  join public.services s on s.id = a.service_id
  join (
    select g::date as day, row_number() over (order by g) as n
    from generate_series(v_today + 1, v_today + 14, interval '1 day') g
    where extract(isodow from g) <> 7
  ) d on d.n = a.n
  cross join lateral (
    select ((d.day + a.at_time) at time zone 'Europe/Istanbul') as starts_at
  ) st;

  -- Geçmiş randevular (istatistikler dolu görünsün). n = 1 en yakın geçmiş iş günü.
  insert into public.appointments (
    shop_id, barber_id, service_id, starts_at, ends_at, blocked_until, status,
    customer_name, customer_phone, customer_email, price_at_booking,
    manage_token_hash, kvkk_consent_at, cancelled_at, source
  )
  select
    v_shop, a.barber_id, s.id,
    st.starts_at,
    st.starts_at + make_interval(mins => s.duration_minutes),
    st.starts_at + make_interval(mins => s.duration_minutes),
    a.status, a.customer_name, a.customer_phone, null, s.price,
    encode(sha256(convert_to(gen_random_uuid()::text, 'UTF8')), 'hex'),
    st.starts_at - interval '2 days',
    case when a.status like 'cancelled%' then st.starts_at - interval '3 hours' end,
    'web'
  from (values
    (1, v_ahmet,  v_kesim,    '10:00'::time, 'completed',             'Levent Uçar',   '905331110001'),
    (1, v_mehmet, v_sacsakal, '11:00',       'completed',             'Tarık Sarı',    '905331110002'),
    (1, v_can,    v_kesim,    '15:00',       'no_show',               'Erkan Bal',     '905331110003'),
    (2, v_ahmet,  v_sacsakal, '09:30',       'completed',             'Ozan Kılıç',    '905331110004'),
    (2, v_mehmet, v_kesim,    '16:00',       'completed',             'Batuhan Er',    '905331110005'),
    (2, v_can,    v_sakal,    '12:30',       'cancelled_by_customer', 'Furkan Taş',    '905331110006'),
    (3, v_ahmet,  v_damat,    '14:00',       'completed',             'Eren Yavuz',    '905331110007'),
    (3, v_mehmet, v_cocuk,    '10:00',       'completed',             'Alp Karaca',    '905331110008'),
    (4, v_ahmet,  v_kesim,    '17:00',       'completed',             'Berk Özkan',    '905331110009'),
    (4, v_can,    v_sacsakal, '18:00',       'completed',             'Taylan Acar',   '905331110010'),
    (5, v_mehmet, v_kesim,    '09:00',       'cancelled_by_shop',     'Rıza Bozkurt',  '905331110011'),
    (6, v_ahmet,  v_sakal,    '11:30',       'completed',             'Okan Ekinci',   '905331110012'),
    (6, v_can,    v_kesim,    '13:30',       'completed',             'İlker Duman',   '905331110013'),
    (7, v_mehmet, v_cilt,     '15:00',       'completed',             'Caner Işık',    '905331110014')
  ) as a(n, barber_id, service_id, at_time, status, customer_name, customer_phone)
  join public.services s on s.id = a.service_id
  join (
    select g::date as day, row_number() over (order by g desc) as n
    from generate_series(v_today - 14, v_today - 1, interval '1 day') g
    where extract(isodow from g) <> 7
  ) d on d.n = a.n
  cross join lateral (
    select ((d.day + a.at_time) at time zone 'Europe/Istanbul') as starts_at
  ) st;
  return v_shop;
end;
$$;

revoke execute on function public.reset_demo_shop() from public, anon, authenticated;
grant execute on function public.reset_demo_shop() to service_role;

-- -----------------------------------------------------------------------------
-- 4. Günlük bakım
-- -----------------------------------------------------------------------------

-- 4a. Ödenmiş süresi (paid_until) geçen aktif abonelikleri "gecikti" yap (Bölüm 11.2).
-- Otomatik askıya ALMAZ; karar süper yöneticinindir (panoda "askıya alınmalı" işareti).
create or replace function private.refresh_subscription_statuses()
returns int
language sql
security definer
set search_path = ''
as $$
  with updated as (
    update public.subscriptions
    set status = 'overdue'
    where status = 'active'
      and paid_until is not null
      and paid_until < (now() at time zone 'Europe/Istanbul')::date
    returning 1
  )
  select count(*)::int from updated;
$$;

-- 4b. KVKK (Bölüm 7.5): tamamlanmış/iptal/gelinmemiş randevularda, bitişinden p_months ay
-- sonra müşteri iletişim bilgileri anonimleştirilir. Randevu satırı istatistik için kalır.
-- Varsayılan 24 ay = uygulamadaki DATA_RETENTION_MONTHS (lib/constants.ts) ile aynı olmalı.
create or replace function private.anonymize_old_appointments(p_months int default 24)
returns int
language sql
security definer
set search_path = ''
as $$
  with updated as (
    update public.appointments
    set customer_name = 'Anonim',
        customer_phone = '900000000000',
        customer_email = null,
        customer_note = null,
        manage_token_hash = null
    where status in ('completed', 'cancelled_by_customer', 'cancelled_by_shop', 'no_show')
      and ends_at < now() - make_interval(months => p_months)
      and customer_name <> 'Anonim'
    returning 1
  )
  select count(*)::int from updated;
$$;

-- 4c. Bir günden eski hız sınırı sayaçlarını sil (tablo şişmesin)
create or replace function private.cleanup_rate_limits()
returns int
language sql
security definer
set search_path = ''
as $$
  with deleted as (
    delete from public.rate_limits where window_start < now() - interval '1 day' returning 1
  )
  select count(*)::int from deleted;
$$;

create or replace function private.daily_maintenance()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.refresh_subscription_statuses();
  perform private.anonymize_old_appointments(24);
  perform private.cleanup_rate_limits();
end;
$$;

-- Bakım fonksiyonları sadece veritabanının kendisi (pg_cron) tarafından çalıştırılır
revoke execute on function
  private.refresh_subscription_statuses(),
  private.anonymize_old_appointments(int),
  private.cleanup_rate_limits(),
  private.daily_maintenance()
from public, anon, authenticated;

-- pg_cron (Supabase ücretsiz planda var). Saat UTC: 00:00 UTC = 03:00 İstanbul.
create extension if not exists pg_cron;
select cron.schedule('berberplatform-daily-maintenance', '0 0 * * *', 'select private.daily_maintenance()');
