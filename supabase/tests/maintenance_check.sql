-- =============================================================================
-- Günlük bakım kontrolü (Aşama 9): gecikmiş abonelik işaretleme ve KVKK anonimleştirme.
-- Çalıştırma: npm run db:test:maintenance   — sonunda ROLLBACK, veritabanında iz kalmaz.
-- =============================================================================
begin;

create temp table results (id serial, check_name text, passed boolean, detail text) on commit drop;

do $$
declare
  v_shop uuid;
  v_barber uuid;
  v_service uuid;
  v_old uuid;
  v_recent uuid;
  v_future uuid;
  r record;
begin
  insert into public.shops (slug, name, status) values ('bakim-test', 'Bakım Test', 'active') returning id into v_shop;
  insert into public.barbers (shop_id, name) values (v_shop, 'B') returning id into v_barber;
  insert into public.services (shop_id, name, duration_minutes, price) values (v_shop, 'S', 30, 100) returning id into v_service;

  -- 25 ay önce tamamlanmış (anonimleşmeli), 23 ay önce (kalmalı), gelecekte onaylı (kalmalı)
  insert into public.appointments (shop_id, barber_id, service_id, starts_at, ends_at, blocked_until, status, customer_name, customer_phone, customer_email, customer_note, price_at_booking, manage_token_hash)
  values (v_shop, v_barber, v_service, now() - interval '25 months', now() - interval '25 months' + interval '30 min', now() - interval '25 months' + interval '30 min', 'completed', 'Eski Müşteri', '905321111111', 'eski@test.local', 'not', 100, 'hash-eski')
  returning id into v_old;
  insert into public.appointments (shop_id, barber_id, service_id, starts_at, ends_at, blocked_until, status, customer_name, customer_phone, price_at_booking)
  values (v_shop, v_barber, v_service, now() - interval '23 months', now() - interval '23 months' + interval '30 min', now() - interval '23 months' + interval '30 min', 'completed', 'Yeni Müşteri', '905322222222', 100)
  returning id into v_recent;
  insert into public.appointments (shop_id, barber_id, service_id, starts_at, ends_at, blocked_until, status, customer_name, customer_phone, price_at_booking)
  values (v_shop, v_barber, v_service, now() + interval '2 days', now() + interval '2 days 30 min', now() + interval '2 days 30 min', 'confirmed', 'Gelecek Müşteri', '905323333333', 100)
  returning id into v_future;

  -- Abonelik: ödeme süresi dün bitmiş
  insert into public.subscriptions (shop_id, monthly_fee, paid_until, status)
  values (v_shop, 500, (now() at time zone 'Europe/Istanbul')::date - 1, 'active');

  perform private.daily_maintenance();

  select customer_name, customer_phone, customer_email, customer_note, manage_token_hash, price_at_booking into r
  from public.appointments where id = v_old;
  insert into results (check_name, passed, detail) values
    ('25 aylık randevu anonimleşti', r.customer_name = 'Anonim' and r.customer_phone = '900000000000' and r.customer_email is null and r.customer_note is null and r.manage_token_hash is null, r.customer_name),
    ('anonimleşen randevunun fiyatı istatistik için kaldı', r.price_at_booking = 100, r.price_at_booking::text);

  select customer_name into r from public.appointments where id = v_recent;
  insert into results (check_name, passed, detail) values ('23 aylık randevuya dokunulmadı', r.customer_name = 'Yeni Müşteri', r.customer_name);
  select customer_name into r from public.appointments where id = v_future;
  insert into results (check_name, passed, detail) values ('gelecekteki randevuya dokunulmadı', r.customer_name = 'Gelecek Müşteri', r.customer_name);

  select status into r from public.subscriptions where shop_id = v_shop;
  insert into results (check_name, passed, detail) values ('süresi geçen abonelik "gecikti" oldu', r.status = 'overdue', r.status);
  select status into r from public.shops where id = v_shop;
  insert into results (check_name, passed, detail) values ('dükkan otomatik askıya ALINMADI', r.status = 'active', r.status);
end;
$$;

select id, passed, check_name, detail from results order by id;
rollback;
