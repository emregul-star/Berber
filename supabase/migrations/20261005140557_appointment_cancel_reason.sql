-- Dükkanın randevuyu iptal ederken yazabileceği isteğe bağlı sebep (Bölüm 8.1, randevu detayı).
-- Müşteriye giden iptal e-postasında gösterilir.
alter table public.appointments
  add column cancel_reason text check (char_length(cancel_reason) <= 300);

-- Berber kendi randevusunda durumla birlikte iptal sebebini de yazabilsin.
-- (Diğer alanlar yine sadece sahip/süper yönetici tarafından değiştirilebilir.)
create or replace function private.guard_appointment_barber_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user = 'authenticated'
     and not private.is_platform_admin()
     and not private.is_shop_owner(old.shop_id) then
    if (to_jsonb(new) - array['status', 'cancelled_at', 'cancel_reason'])
       is distinct from (to_jsonb(old) - array['status', 'cancelled_at', 'cancel_reason']) then
      raise exception 'Berberler randevuda sadece durumu değiştirebilir.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
