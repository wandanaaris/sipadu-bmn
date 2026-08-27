create table if not exists public.mitra_accounts (
  satker_code text primary key references public.satkers(code) on update cascade on delete restrict,
  unit_data jsonb not null default '{}'::jsonb,
  kpb_data jsonb not null default '{}'::jsonb,
  operator_data jsonb not null default '{}'::jsonb,
  status text not null default 'draf' check (status in ('draf','siap_verifikasi','perbaikan','selesai')),
  photo_unit_path text,
  photo_kpb_path text,
  photo_operator_path text,
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.mitra_accounts enable row level security;
drop policy if exists "mitra public read" on public.mitra_accounts;
create policy "mitra public read" on public.mitra_accounts for select to anon, authenticated using (true);
drop policy if exists "mitra public insert" on public.mitra_accounts;
create policy "mitra public insert" on public.mitra_accounts for insert to anon, authenticated with check (exists(select 1 from public.satkers s where s.code=satker_code));
drop policy if exists "mitra public update" on public.mitra_accounts;
create policy "mitra public update" on public.mitra_accounts for update to anon, authenticated using (true) with check (exists(select 1 from public.satkers s where s.code=satker_code));
grant select,insert,update on public.mitra_accounts to anon,authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('mitra-private','mitra-private',false,3145728,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=3145728,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "mitra photo read" on storage.objects;
create policy "mitra photo read" on storage.objects for select to anon,authenticated using(bucket_id='mitra-private');
drop policy if exists "mitra photo insert" on storage.objects;
create policy "mitra photo insert" on storage.objects for insert to anon,authenticated with check(bucket_id='mitra-private' and (storage.foldername(name))[1] in (select code from public.satkers));
drop policy if exists "mitra photo update" on storage.objects;
create policy "mitra photo update" on storage.objects for update to anon,authenticated using(bucket_id='mitra-private') with check(bucket_id='mitra-private');
drop policy if exists "mitra photo delete" on storage.objects;
create policy "mitra photo delete" on storage.objects for delete to anon,authenticated using(bucket_id='mitra-private');
create or replace function public.set_mitra_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end$$;
drop trigger if exists trg_mitra_updated_at on public.mitra_accounts;
create trigger trg_mitra_updated_at before update on public.mitra_accounts for each row execute function public.set_mitra_updated_at();;
