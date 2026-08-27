-- Pengajuan publik hanya melalui RPC terkontrol; anon tidak boleh mengubah
-- status langsung atau menetapkan data sebagai selesai.
create or replace function public.submit_mitra_account(
  p_satker_code text,
  p_unit_data jsonb,
  p_kpb_data jsonb,
  p_operator_data jsonb,
  p_progress numeric
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_saved public.mitra_accounts;
begin
  if not public.is_valid_mitra_satker(p_satker_code) then
    raise exception 'Satuan kerja tidak valid.';
  end if;
  if p_progress <> 100 then
    raise exception 'Data Akun Mitra belum lengkap.';
  end if;

  insert into public.mitra_accounts(
    satker_code,unit_data,kpb_data,operator_data,status,review_note,
    completion_progress,submitted_at,completed_at
  ) values(
    p_satker_code,coalesce(p_unit_data,'{}'::jsonb),coalesce(p_kpb_data,'{}'::jsonb),
    coalesce(p_operator_data,'{}'::jsonb),'siap_verifikasi','',100,now(),null
  )
  on conflict(satker_code) do update set
    unit_data=excluded.unit_data,
    kpb_data=excluded.kpb_data,
    operator_data=excluded.operator_data,
    status='siap_verifikasi',
    review_note='',
    completion_progress=100,
    submitted_at=now(),
    completed_at=null
  where public.mitra_accounts.status in ('draf','perbaikan')
  returning * into v_saved;

  if not found then
    raise exception 'Data sudah diajukan dan tidak dapat diubah.';
  end if;
  return jsonb_build_object(
    'satker_code',v_saved.satker_code,
    'status',v_saved.status,
    'review_note',v_saved.review_note,
    'updated_at',v_saved.updated_at
  );
end$$;
revoke all on function public.submit_mitra_account(text,jsonb,jsonb,jsonb,numeric) from public;
grant execute on function public.submit_mitra_account(text,jsonb,jsonb,jsonb,numeric) to anon,authenticated;

drop policy if exists "mitra public insert" on public.mitra_accounts;
create policy "mitra public insert" on public.mitra_accounts
for insert to anon
with check(public.is_valid_mitra_satker(satker_code) and status='draf');

drop policy if exists "mitra public update" on public.mitra_accounts;
create policy "mitra public update" on public.mitra_accounts
for update to anon
using(status in ('draf','perbaikan'))
with check(public.is_valid_mitra_satker(satker_code) and status in ('draf','perbaikan'));

notify pgrst, 'reload schema';
