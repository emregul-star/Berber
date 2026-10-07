-- =============================================================================
-- BerberPlatform — Güvenlik kontrol script'i (Aşama 2 kabul kriterleri)
--
-- Çalıştırma:  npm run db:test
--
-- Ne yapar? Bir işlem (transaction) içinde sahte kullanıcılar ve iki dükkan oluşturur,
-- farklı rollere bürünüp (ziyaretçi, sahip, berber, süper yönetici) erişimleri dener.
-- En sonda ROLLBACK yapılır: veritabanında hiçbir iz kalmaz.
-- Sonuç tablosunda her satır bir kontroldür; "passed" sütununun hepsi true olmalı.
--
-- Rol taklidi nasıl yapılıyor? Supabase'in Data API'si de aynısını yapar:
--   set local role authenticated;                        -- Postgres rolü
--   set_config('request.jwt.claims', '{"sub": ...}')     -- auth.uid() bu değeri okur
-- =============================================================================

begin;

create temp table results (
  id serial primary key,
  check_name text not null,
  passed boolean not null,
  detail text
) on commit drop;

-- -----------------------------------------------------------------------------
-- Test verisi (postgres rolüyle, RLS'siz)
-- -----------------------------------------------------------------------------
do $$
declare
  u_owner_a  uuid := '00000000-0000-4000-a000-000000000001';
  u_owner_b  uuid := '00000000-0000-4000-a000-000000000002';
  u_barber_1 uuid := '00000000-0000-4000-a000-000000000003';
  u_barber_2 uuid := '00000000-0000-4000-a000-000000000004';
  u_admin    uuid := '00000000-0000-4000-a000-000000000005';
  u_stranger uuid := '00000000-0000-4000-a000-000000000006';
  t0 timestamptz := date_trunc('day', now()) + interval '10 days 10 hours';
begin
  insert into auth.users (id, email, aud, role)
  values
    (u_owner_a,  'rls-owner-a@test.local',  'authenticated', 'authenticated'),
    (u_owner_b,  'rls-owner-b@test.local',  'authenticated', 'authenticated'),
    (u_barber_1, 'rls-barber-1@test.local', 'authenticated', 'authenticated'),
    (u_barber_2, 'rls-barber-2@test.local', 'authenticated', 'authenticated'),
    (u_admin,    'rls-admin@test.local',    'authenticated', 'authenticated'),
    (u_stranger, 'rls-stranger@test.local', 'authenticated', 'authenticated');

  insert into public.platform_admins (user_id) values (u_admin);

  insert into public.shops (id, slug, name, email, status) values
    ('10000000-0000-4000-a000-00000000000a', 'rls-test-a', 'Test A', 'a@test.local', 'active'),
    ('10000000-0000-4000-a000-00000000000b', 'rls-test-b', 'Test B', 'b@test.local', 'active'),
    ('10000000-0000-4000-a000-00000000000c', 'rls-test-c', 'Test C (askıda)', 'c@test.local', 'suspended');

  insert into public.shop_members (shop_id, user_id, role) values
    ('10000000-0000-4000-a000-00000000000a', u_owner_a, 'owner'),
    ('10000000-0000-4000-a000-00000000000b', u_owner_b, 'owner'),
    ('10000000-0000-4000-a000-00000000000a', u_barber_1, 'barber'),
    ('10000000-0000-4000-a000-00000000000a', u_barber_2, 'barber');

  insert into public.subscriptions (shop_id, monthly_fee) values
    ('10000000-0000-4000-a000-00000000000a', 500),
    ('10000000-0000-4000-a000-00000000000b', 500);

  insert into public.barbers (id, shop_id, name, user_id) values
    ('20000000-0000-4000-a000-0000000000a1', '10000000-0000-4000-a000-00000000000a', 'Berber A1', u_barber_1),
    ('20000000-0000-4000-a000-0000000000a2', '10000000-0000-4000-a000-00000000000a', 'Berber A2', u_barber_2),
    ('20000000-0000-4000-a000-0000000000b1', '10000000-0000-4000-a000-00000000000b', 'Berber B1', null),
    ('20000000-0000-4000-a000-0000000000c1', '10000000-0000-4000-a000-00000000000c', 'Berber C1', null);

  insert into public.services (id, shop_id, name, duration_minutes, price, is_active) values
    ('30000000-0000-4000-a000-0000000000a1', '10000000-0000-4000-a000-00000000000a', 'Kesim A', 30, 300, true),
    ('30000000-0000-4000-a000-0000000000a9', '10000000-0000-4000-a000-00000000000a', 'Pasif hizmet A', 30, 300, false),
    ('30000000-0000-4000-a000-0000000000b1', '10000000-0000-4000-a000-00000000000b', 'Kesim B', 30, 300, true),
    ('30000000-0000-4000-a000-0000000000c1', '10000000-0000-4000-a000-00000000000c', 'Kesim C', 30, 300, true);

  insert into public.appointments
    (id, shop_id, barber_id, service_id, starts_at, ends_at, blocked_until, status, customer_name, customer_phone, price_at_booking)
  values
    ('40000000-0000-4000-a000-0000000000a1', '10000000-0000-4000-a000-00000000000a', '20000000-0000-4000-a000-0000000000a1',
     '30000000-0000-4000-a000-0000000000a1', t0, t0 + interval '30 min', t0 + interval '30 min', 'confirmed', 'Müşteri 1', '905320000001', 300),
    ('40000000-0000-4000-a000-0000000000a2', '10000000-0000-4000-a000-00000000000a', '20000000-0000-4000-a000-0000000000a2',
     '30000000-0000-4000-a000-0000000000a1', t0, t0 + interval '30 min', t0 + interval '30 min', 'confirmed', 'Müşteri 2', '905320000002', 300),
    ('40000000-0000-4000-a000-0000000000b1', '10000000-0000-4000-a000-00000000000b', '20000000-0000-4000-a000-0000000000b1',
     '30000000-0000-4000-a000-0000000000b1', t0, t0 + interval '30 min', t0 + interval '30 min', 'confirmed', 'Müşteri 3', '905320000003', 300);
end;
$$;

-- -----------------------------------------------------------------------------
-- 1) ZİYARETÇİ (anon)
-- -----------------------------------------------------------------------------
do $$
declare
  n int;
  ok boolean;
  msg text;
begin
  -- 1a. Randevular okunamaz
  begin
    set local role anon;
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    select count(*) into n from public.appointments;
    ok := false; msg := format('%s satır okundu', n);
  exception when insufficient_privilege then
    ok := true; msg := 'yetki hatası (beklenen)';
  end;
  reset role;
  insert into results (check_name, passed, detail) values ('anon: randevuları okuyamaz', ok, msg);

  -- 1b. Dükkanın iletişim e-postası okunamaz
  begin
    set local role anon;
    select count(email) into n from public.shops;
    ok := false; msg := 'e-posta okundu';
  exception when insufficient_privilege then
    ok := true; msg := 'yetki hatası (beklenen)';
  end;
  reset role;
  insert into results (check_name, passed, detail) values ('anon: shops.email okuyamaz', ok, msg);

  -- 1c. Aktif dükkanlar görünür, askıdaki görünmez
  set local role anon;
  select count(*) into n from public.shops where slug in ('rls-test-a', 'rls-test-b', 'rls-test-c');
  reset role;
  insert into results (check_name, passed, detail)
  values ('anon: sadece aktif dükkanları görür (2 beklenir)', n = 2, format('%s dükkan', n));

  -- 1d. Askıdaki dükkanın hizmetleri görünmez
  set local role anon;
  select count(*) into n from public.services where shop_id = '10000000-0000-4000-a000-00000000000c';
  reset role;
  insert into results (check_name, passed, detail)
  values ('anon: askıdaki dükkanın hizmetlerini görmez', n = 0, format('%s hizmet', n));

  -- 1e. Pasif hizmet görünmez
  set local role anon;
  select count(*) into n from public.services where shop_id = '10000000-0000-4000-a000-00000000000a';
  reset role;
  insert into results (check_name, passed, detail)
  values ('anon: pasif hizmeti görmez (1 beklenir)', n = 1, format('%s hizmet', n));

  -- 1f. rate_limits okunamaz
  begin
    set local role anon;
    select count(*) into n from public.rate_limits;
    ok := false; msg := 'okundu';
  exception when insufficient_privilege then
    ok := true; msg := 'yetki hatası (beklenen)';
  end;
  reset role;
  insert into results (check_name, passed, detail) values ('anon: rate_limits okuyamaz', ok, msg);

  -- 1g. Randevu ekleyemez
  begin
    set local role anon;
    insert into public.appointments (shop_id, barber_id, service_id, starts_at, ends_at, blocked_until, customer_name, customer_phone, price_at_booking)
    values ('10000000-0000-4000-a000-00000000000a', '20000000-0000-4000-a000-0000000000a1', '30000000-0000-4000-a000-0000000000a1',
            now() + interval '20 days', now() + interval '20 days 30 min', now() + interval '20 days 30 min', 'X', '905320000009', 1);
    ok := false; msg := 'eklendi';
  exception when insufficient_privilege then
    ok := true; msg := 'yetki hatası (beklenen)';
  end;
  reset role;
  insert into results (check_name, passed, detail) values ('anon: doğrudan randevu ekleyemez', ok, msg);
end;
$$;

-- -----------------------------------------------------------------------------
-- 2) DÜKKAN SAHİBİ A
-- -----------------------------------------------------------------------------
do $$
declare
  n int;
  ok boolean;
  msg text;
  claims text := '{"sub":"00000000-0000-4000-a000-000000000001","role":"authenticated"}';
begin
  -- 2a. Kendi dükkanının tüm randevularını görür, başka dükkanınkini görmez
  set local role authenticated;
  perform set_config('request.jwt.claims', claims, true);
  select count(*) into n from public.appointments where shop_id = '10000000-0000-4000-a000-00000000000a';
  reset role;
  insert into results (check_name, passed, detail)
  values ('sahip A: kendi randevularını görür (2 beklenir)', n = 2, format('%s randevu', n));

  set local role authenticated;
  perform set_config('request.jwt.claims', claims, true);
  select count(*) into n from public.appointments where shop_id = '10000000-0000-4000-a000-00000000000b';
  reset role;
  insert into results (check_name, passed, detail)
  values ('sahip A: B dükkanının randevularını görmez', n = 0, format('%s randevu', n));

  -- 2b. B dükkanının üyelerini ve aboneliğini görmez
  set local role authenticated;
  perform set_config('request.jwt.claims', claims, true);
  select (select count(*) from public.shop_members where shop_id = '10000000-0000-4000-a000-00000000000b')
       + (select count(*) from public.subscriptions where shop_id = '10000000-0000-4000-a000-00000000000b')
    into n;
  reset role;
  insert into results (check_name, passed, detail)
  values ('sahip A: B dükkanının üye/abonelik bilgisini görmez', n = 0, format('%s satır', n));

  -- 2c. B dükkanını güncelleyemez (0 satır etkilenir)
  set local role authenticated;
  perform set_config('request.jwt.claims', claims, true);
  update public.shops set name = 'Ele geçirildi' where id = '10000000-0000-4000-a000-00000000000b';
  get diagnostics n = row_count;
  reset role;
  insert into results (check_name, passed, detail)
  values ('sahip A: B dükkanını güncelleyemez', n = 0, format('%s satır güncellendi', n));

  -- 2d. B dükkanına hizmet ekleyemez
  begin
    set local role authenticated;
    perform set_config('request.jwt.claims', claims, true);
    insert into public.services (shop_id, name, duration_minutes, price)
    values ('10000000-0000-4000-a000-00000000000b', 'Sızma', 30, 1);
    ok := false; msg := 'eklendi';
  exception when insufficient_privilege then
    ok := true; msg := 'RLS reddetti (beklenen)';
  end;
  reset role;
  insert into results (check_name, passed, detail) values ('sahip A: B dükkanına hizmet ekleyemez', ok, msg);

  -- 2e. Kendi dükkanının durumunu (askı) değiştiremez
  begin
    set local role authenticated;
    perform set_config('request.jwt.claims', claims, true);
    update public.shops set status = 'demo' where id = '10000000-0000-4000-a000-00000000000a';
    ok := false; msg := 'değiştirildi';
  exception when insufficient_privilege then
    ok := true; msg := 'trigger reddetti (beklenen)';
  end;
  reset role;
  insert into results (check_name, passed, detail) values ('sahip A: dükkan durumunu değiştiremez', ok, msg);

  -- 2f. Kendi dükkan adını değiştirebilir
  set local role authenticated;
  perform set_config('request.jwt.claims', claims, true);
  update public.shops set name = 'Test A (yeni ad)' where id = '10000000-0000-4000-a000-00000000000a';
  get diagnostics n = row_count;
  reset role;
  insert into results (check_name, passed, detail)
  values ('sahip A: kendi dükkan adını değiştirebilir', n = 1, format('%s satır güncellendi', n));

  -- 2g. Kendi aboneliğini okuyabilir ama değiştiremez
  set local role authenticated;
  perform set_config('request.jwt.claims', claims, true);
  select count(*) into n from public.subscriptions where shop_id = '10000000-0000-4000-a000-00000000000a';
  reset role;
  insert into results (check_name, passed, detail)
  values ('sahip A: kendi aboneliğini okuyabilir', n = 1, format('%s satır', n));

  set local role authenticated;
  perform set_config('request.jwt.claims', claims, true);
  update public.subscriptions set monthly_fee = 0 where shop_id = '10000000-0000-4000-a000-00000000000a';
  get diagnostics n = row_count;
  reset role;
  insert into results (check_name, passed, detail)
  values ('sahip A: aboneliğini değiştiremez', n = 0, format('%s satır güncellendi', n));

  -- 2h. Kendi dükkanına başka dükkanın berberiyle randevu ekleyemez (bileşik foreign key)
  begin
    set local role authenticated;
    perform set_config('request.jwt.claims', claims, true);
    insert into public.appointments (shop_id, barber_id, service_id, starts_at, ends_at, blocked_until, customer_name, customer_phone, price_at_booking, source)
    values ('10000000-0000-4000-a000-00000000000a', '20000000-0000-4000-a000-0000000000b1', '30000000-0000-4000-a000-0000000000a1',
            now() + interval '20 days', now() + interval '20 days 30 min', now() + interval '20 days 30 min', 'X', '905320000009', 1, 'panel');
    ok := false; msg := 'eklendi';
  exception when foreign_key_violation then
    ok := true; msg := 'foreign key reddetti (beklenen)';
  end;
  reset role;
  insert into results (check_name, passed, detail) values ('sahip A: başka dükkanın berberini kullanamaz', ok, msg);
end;
$$;

-- -----------------------------------------------------------------------------
-- 3) BERBER A1 (A dükkanında berber hesabı)
-- -----------------------------------------------------------------------------
do $$
declare
  n int;
  ok boolean;
  msg text;
  claims text := '{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated"}';
begin
  -- 3a. Sadece kendi randevusunu görür
  set local role authenticated;
  perform set_config('request.jwt.claims', claims, true);
  select count(*) into n from public.appointments;
  reset role;
  insert into results (check_name, passed, detail)
  values ('berber A1: sadece kendi randevusunu görür (1 beklenir)', n = 1, format('%s randevu', n));

  -- 3b. Kendi randevusunun durumunu güncelleyebilir
  set local role authenticated;
  perform set_config('request.jwt.claims', claims, true);
  update public.appointments set status = 'completed' where id = '40000000-0000-4000-a000-0000000000a1';
  get diagnostics n = row_count;
  reset role;
  insert into results (check_name, passed, detail)
  values ('berber A1: kendi randevu durumunu güncelleyebilir', n = 1, format('%s satır güncellendi', n));

  -- 3c. Başka berberin randevusunu güncelleyemez
  set local role authenticated;
  perform set_config('request.jwt.claims', claims, true);
  update public.appointments set status = 'cancelled_by_shop' where id = '40000000-0000-4000-a000-0000000000a2';
  get diagnostics n = row_count;
  reset role;
  insert into results (check_name, passed, detail)
  values ('berber A1: başka berberin randevusunu güncelleyemez', n = 0, format('%s satır güncellendi', n));

  -- 3d. Kendi randevusunun saatini değiştiremez (sadece durum)
  begin
    set local role authenticated;
    perform set_config('request.jwt.claims', claims, true);
    update public.appointments set customer_name = 'Değişti' where id = '40000000-0000-4000-a000-0000000000a1';
    ok := false; msg := 'değiştirildi';
  exception when insufficient_privilege then
    ok := true; msg := 'trigger reddetti (beklenen)';
  end;
  reset role;
  insert into results (check_name, passed, detail) values ('berber A1: randevuda durum dışı alan değiştiremez', ok, msg);

  -- 3e. Hizmet ekleyemez (sahip yetkisi)
  begin
    set local role authenticated;
    perform set_config('request.jwt.claims', claims, true);
    insert into public.services (shop_id, name, duration_minutes, price)
    values ('10000000-0000-4000-a000-00000000000a', 'Berberden', 30, 1);
    ok := false; msg := 'eklendi';
  exception when insufficient_privilege then
    ok := true; msg := 'RLS reddetti (beklenen)';
  end;
  reset role;
  insert into results (check_name, passed, detail) values ('berber A1: hizmet ekleyemez', ok, msg);

  -- 3f. Aboneliği göremez
  set local role authenticated;
  perform set_config('request.jwt.claims', claims, true);
  select count(*) into n from public.subscriptions;
  reset role;
  insert into results (check_name, passed, detail)
  values ('berber A1: abonelik bilgisini göremez', n = 0, format('%s satır', n));
end;
$$;

-- -----------------------------------------------------------------------------
-- 4) ÜYE OLMAYAN KULLANICI ve SÜPER YÖNETİCİ
-- -----------------------------------------------------------------------------
do $$
declare
  n int;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-000000000006","role":"authenticated"}', true);
  select count(*) into n from public.appointments;
  reset role;
  insert into results (check_name, passed, detail)
  values ('üye olmayan kullanıcı: hiç randevu görmez', n = 0, format('%s randevu', n));

  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-000000000005","role":"authenticated"}', true);
  select count(*) into n from public.appointments
  where shop_id in ('10000000-0000-4000-a000-00000000000a', '10000000-0000-4000-a000-00000000000b');
  reset role;
  insert into results (check_name, passed, detail)
  values ('süper yönetici: tüm dükkanların randevularını görür (3 beklenir)', n = 3, format('%s randevu', n));
end;
$$;

-- -----------------------------------------------------------------------------
-- 5) ÇİFT RANDEVU ENGELİ (exclusion constraint)
-- -----------------------------------------------------------------------------
do $$
declare
  ok boolean;
  msg text;
  t0 timestamptz := date_trunc('day', now()) + interval '10 days 10 hours';
begin
  -- 5a. Berber A2'nin 10:00-10:30 randevusu varken 10:15-10:45 eklenemez
  begin
    insert into public.appointments (shop_id, barber_id, service_id, starts_at, ends_at, blocked_until, status, customer_name, customer_phone, price_at_booking)
    values ('10000000-0000-4000-a000-00000000000a', '20000000-0000-4000-a000-0000000000a2', '30000000-0000-4000-a000-0000000000a1',
            t0 + interval '15 min', t0 + interval '45 min', t0 + interval '45 min', 'pending', 'Çakışan', '905320000010', 300);
    ok := false; msg := 'eklendi';
  exception when exclusion_violation then
    ok := true; msg := 'exclusion constraint reddetti (beklenen)';
  end;
  insert into results (check_name, passed, detail) values ('çakışan randevu yazılamaz', ok, msg);

  -- 5b. Bitişik randevu (10:30-11:00) eklenebilir
  begin
    insert into public.appointments (shop_id, barber_id, service_id, starts_at, ends_at, blocked_until, status, customer_name, customer_phone, price_at_booking)
    values ('10000000-0000-4000-a000-00000000000a', '20000000-0000-4000-a000-0000000000a2', '30000000-0000-4000-a000-0000000000a1',
            t0 + interval '30 min', t0 + interval '60 min', t0 + interval '60 min', 'confirmed', 'Bitişik', '905320000011', 300);
    ok := true; msg := 'eklendi';
  exception when exclusion_violation then
    ok := false; msg := 'yanlışlıkla reddedildi';
  end;
  insert into results (check_name, passed, detail) values ('bitişik randevu yazılabilir', ok, msg);

  -- 5c. Buffer: blocked_until çakışıyorsa eklenemez (11:00 bitiş + 10 dk buffer)
  begin
    insert into public.appointments (shop_id, barber_id, service_id, starts_at, ends_at, blocked_until, status, customer_name, customer_phone, price_at_booking)
    values ('10000000-0000-4000-a000-00000000000a', '20000000-0000-4000-a000-0000000000a2', '30000000-0000-4000-a000-0000000000a1',
            t0 - interval '40 min', t0 - interval '5 min', t0 + interval '5 min', 'confirmed', 'Buffer', '905320000012', 300);
    ok := false; msg := 'eklendi';
  exception when exclusion_violation then
    ok := true; msg := 'buffer çakışması reddedildi (beklenen)';
  end;
  insert into results (check_name, passed, detail) values ('buffer (blocked_until) çakışması yazılamaz', ok, msg);

  -- 5d. İptal edilmiş randevunun saatine yeni randevu alınabilir
  update public.appointments set status = 'cancelled_by_customer' where id = '40000000-0000-4000-a000-0000000000b1';
  begin
    insert into public.appointments (shop_id, barber_id, service_id, starts_at, ends_at, blocked_until, status, customer_name, customer_phone, price_at_booking)
    values ('10000000-0000-4000-a000-00000000000b', '20000000-0000-4000-a000-0000000000b1', '30000000-0000-4000-a000-0000000000b1',
            t0, t0 + interval '30 min', t0 + interval '30 min', 'pending', 'Yeni', '905320000013', 300);
    ok := true; msg := 'eklendi';
  exception when exclusion_violation then
    ok := false; msg := 'yanlışlıkla reddedildi';
  end;
  insert into results (check_name, passed, detail) values ('iptal edilen saate yeni randevu alınabilir', ok, msg);
end;
$$;

-- -----------------------------------------------------------------------------
-- 6) GÜVENLİK SIKILAŞTIRMASI (2026-10-07 denetimi)
-- -----------------------------------------------------------------------------
do $$
declare
  n int;
  ok boolean;
  msg text;
  claims text := '{"sub":"00000000-0000-4000-a000-000000000001","role":"authenticated"}';  -- sahip A
begin
  -- 6a. Başka dükkanın izin kayıtları (sebep dahil) okunamaz
  insert into public.time_off (shop_id, barber_id, starts_at, ends_at, reason)
  values ('10000000-0000-4000-a000-00000000000b', null, now() + interval '20 days', now() + interval '21 days', 'gizli sebep');
  set local role authenticated;
  perform set_config('request.jwt.claims', claims, true);
  select count(*) into n from public.time_off where shop_id = '10000000-0000-4000-a000-00000000000b';
  reset role;
  insert into results (check_name, passed, detail)
  values ('sahip A: B dükkanının izin kayıtlarını görmez', n = 0, format('%s satır', n));

  -- 6b. Demo dükkanda sahip bile giriş hesaplarını (üyelik, berber bağlantısı) değiştiremez
  update public.shops set is_demo = true where id = '10000000-0000-4000-a000-00000000000a';
  begin
    set local role authenticated;
    perform set_config('request.jwt.claims', claims, true);
    delete from public.shop_members
    where shop_id = '10000000-0000-4000-a000-00000000000a' and user_id = '00000000-0000-4000-a000-000000000003';
    ok := false; msg := 'üyelik silindi';
  exception when insufficient_privilege then
    ok := true; msg := 'yetki hatası (beklenen)';
  end;
  reset role;
  insert into results (check_name, passed, detail) values ('demo sahibi: üyelik silemez', ok, msg);

  begin
    set local role authenticated;
    perform set_config('request.jwt.claims', claims, true);
    update public.barbers set user_id = null where id = '20000000-0000-4000-a000-0000000000a1';
    ok := false; msg := 'berber bağlantısı değişti';
  exception when insufficient_privilege then
    ok := true; msg := 'yetki hatası (beklenen)';
  end;
  reset role;
  insert into results (check_name, passed, detail) values ('demo sahibi: berber hesap bağlantısını değiştiremez', ok, msg);

  -- Demo olmayan dükkanda sahip berber hesabını yönetebilmeye devam eder
  update public.shops set is_demo = false where id = '10000000-0000-4000-a000-00000000000a';
  set local role authenticated;
  perform set_config('request.jwt.claims', claims, true);
  update public.barbers set user_id = null where id = '20000000-0000-4000-a000-0000000000a1';
  get diagnostics n = row_count;
  reset role;
  insert into results (check_name, passed, detail) values ('normal sahip: berber hesap bağlantısını yönetebilir', n = 1, format('%s satır', n));

  -- 6c. Dosya deposunda SVG gibi çalıştırılabilir içerik barındırabilen türler kapalı
  select count(*) into n from storage.buckets
  where id = 'shop-assets' and allowed_mime_types <@ array['image/jpeg', 'image/png', 'image/webp'];
  insert into results (check_name, passed, detail) values ('shop-assets: sadece jpeg/png/webp', n = 1, format('%s', n));
end;
$$;

-- Sonuç: tüm satırlarda passed = true olmalı
select id, passed, check_name, detail from results order by id;

rollback;
