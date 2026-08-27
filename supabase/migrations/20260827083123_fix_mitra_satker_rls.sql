create or replace function public.is_valid_mitra_satker(p_code text) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from public.satkers where code=p_code)$$;
revoke all on function public.is_valid_mitra_satker(text) from public;
grant execute on function public.is_valid_mitra_satker(text) to anon,authenticated;
drop policy if exists "mitra public insert" on public.mitra_accounts;
create policy "mitra public insert" on public.mitra_accounts for insert to anon,authenticated with check(public.is_valid_mitra_satker(satker_code));
drop policy if exists "mitra public update" on public.mitra_accounts;
create policy "mitra public update" on public.mitra_accounts for update to anon,authenticated using(true) with check(public.is_valid_mitra_satker(satker_code));
drop policy if exists "mitra photo insert" on storage.objects;
create policy "mitra photo insert" on storage.objects for insert to anon,authenticated with check(bucket_id='mitra-private' and public.is_valid_mitra_satker((storage.foldername(name))[1]));;
