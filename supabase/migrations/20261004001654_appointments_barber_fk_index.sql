-- appointments (barber_id, shop_id) bileşik foreign key'i için kapsayan indeks.
-- Supabase advisors "unindexed_foreign_keys" uyarısı üzerine eklendi: berber
-- silinirken/güncellenirken foreign key kontrolü tüm tabloyu taramasın.
create index appointments_barber_shop_idx on public.appointments (barber_id, shop_id);
