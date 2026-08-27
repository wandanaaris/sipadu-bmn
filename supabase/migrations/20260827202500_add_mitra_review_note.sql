-- Kolom catatan review diperlukan oleh alur perbaikan Korwil.
alter table public.mitra_accounts
  add column if not exists review_note text not null default '';

notify pgrst, 'reload schema';
