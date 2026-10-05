-- =============================================================================
-- Hız sınırı sayacı (Bölüm 6.5)
--
-- Sabit pencere (fixed window): ör. 10 dakikalık pencerede bir anahtar için kaç istek
-- geldiğini sayar. "insert ... on conflict do update" tek adımda çalıştığı için aynı anda
-- gelen isteklerde de sayaç doğru artar. Yeni sayıyı döndürür; limiti uygulama kontrol eder.
--
-- Sadece sunucu (service_role / secret key) çağırabilir; ziyaretçi ve panel kullanıcıları
-- bu fonksiyonu çağıramaz.
-- =============================================================================

create or replace function public.rate_limit_hit(p_key text, p_window_seconds int)
returns int
language sql
volatile
security invoker
set search_path = ''
as $$
  insert into public.rate_limits (key, window_start, count)
  values (
    p_key,
    to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds),
    1
  )
  on conflict (key, window_start)
  do update set count = public.rate_limits.count + 1
  returning count;
$$;

revoke execute on function public.rate_limit_hit(text, int) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, int) to service_role;

comment on function public.rate_limit_hit(text, int) is
  'Hız sınırı sayacını artırır ve penceredeki güncel sayıyı döndürür. Sadece sunucu kullanır.';
