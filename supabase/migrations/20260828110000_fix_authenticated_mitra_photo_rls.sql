-- Izinkan form satker tetap bekerja bila browser memiliki sesi authenticated.
-- Semua akses tetap dibatasi pada record draf/perbaikan; data terkunci tidak terbuka.

drop policy if exists "mitra public editable read" on public.mitra_accounts;
create policy "mitra public editable read" on public.mitra_accounts
for select to anon,authenticated
using(status in ('draf','perbaikan'));

drop policy if exists "mitra public insert" on public.mitra_accounts;
create policy "mitra public insert" on public.mitra_accounts
for insert to anon,authenticated
with check(public.is_valid_mitra_satker(satker_code) and status='draf');

drop policy if exists "mitra public update" on public.mitra_accounts;
create policy "mitra public update" on public.mitra_accounts
for update to anon,authenticated
using(status in ('draf','perbaikan'))
with check(public.is_valid_mitra_satker(satker_code) and status in ('draf','perbaikan'));

drop policy if exists "mitra photo editable read" on storage.objects;
create policy "mitra photo editable read" on storage.objects
for select to anon,authenticated
using(
  bucket_id='mitra-private' and
  exists(select 1 from public.mitra_accounts m
    where m.satker_code=(storage.foldername(name))[1]
      and m.status in ('draf','perbaikan'))
);

drop policy if exists "mitra photo editable insert" on storage.objects;
create policy "mitra photo editable insert" on storage.objects
for insert to anon,authenticated
with check(
  bucket_id='mitra-private' and
  public.is_valid_mitra_satker((storage.foldername(name))[1]) and
  (
    not exists(select 1 from public.mitra_accounts m
      where m.satker_code=(storage.foldername(name))[1])
    or exists(select 1 from public.mitra_accounts m
      where m.satker_code=(storage.foldername(name))[1]
        and m.status in ('draf','perbaikan'))
  )
);

drop policy if exists "mitra photo update" on storage.objects;
create policy "mitra photo update" on storage.objects
for update to anon,authenticated
using(
  bucket_id='mitra-private' and (
    public.is_sipadu_admin() or
    exists(select 1 from public.mitra_accounts m
      where m.satker_code=(storage.foldername(name))[1]
        and m.status in ('draf','perbaikan'))
  )
)
with check(
  bucket_id='mitra-private' and
  public.is_valid_mitra_satker((storage.foldername(name))[1]) and (
    public.is_sipadu_admin() or
    exists(select 1 from public.mitra_accounts m
      where m.satker_code=(storage.foldername(name))[1]
        and m.status in ('draf','perbaikan'))
  )
);

drop policy if exists "mitra photo delete" on storage.objects;
create policy "mitra photo delete" on storage.objects
for delete to anon,authenticated
using(
  bucket_id='mitra-private' and (
    public.is_sipadu_admin() or
    exists(select 1 from public.mitra_accounts m
      where m.satker_code=(storage.foldername(name))[1]
        and m.status in ('draf','perbaikan'))
  )
);

notify pgrst, 'reload schema';
