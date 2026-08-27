-- Integrasi pekerjaan Akun Mitra dengan monitoring portal.
-- Jalankan sesudah 20260827_mitra_accounts.sql.
alter table public.mitra_accounts add column if not exists completion_progress numeric not null default 0 check(completion_progress between 0 and 100);

-- Form satker membaca data lengkap hanya selama masih dapat diedit. Setelah
-- diajukan/selesai, respons publik hanya memuat status dan catatan review.
create or replace function public.get_mitra_satker_form(p_satker_code text) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_record public.mitra_accounts;
begin
 select * into v_record from public.mitra_accounts where satker_code=p_satker_code;
 if not found then return null;end if;
 if v_record.status in ('draf','perbaikan') then return to_jsonb(v_record);end if;
 return jsonb_build_object('satker_code',v_record.satker_code,'status',v_record.status,'review_note',v_record.review_note,'updated_at',v_record.updated_at);
end$$;
revoke all on function public.get_mitra_satker_form(text) from public;
grant execute on function public.get_mitra_satker_form(text) to anon,authenticated;

-- Jangan izinkan pembacaan langsung data sensitif oleh pengunjung setelah
-- pengajuan. Korwil yang terautentikasi tetap dapat membaca seluruh record.
drop policy if exists "mitra public read" on public.mitra_accounts;
drop policy if exists "mitra public editable read" on public.mitra_accounts;
create policy "mitra public editable read" on public.mitra_accounts for select to anon using(status in ('draf','perbaikan'));
drop policy if exists "mitra admin read" on public.mitra_accounts;
create policy "mitra admin read" on public.mitra_accounts for select to authenticated using(public.is_sipadu_admin());

-- Foto hanya dapat dibaca/ditulis publik ketika record belum dikunci.
drop policy if exists "mitra photo read" on storage.objects;
drop policy if exists "mitra photo editable read" on storage.objects;
drop policy if exists "mitra photo admin read" on storage.objects;
create policy "mitra photo editable read" on storage.objects for select to anon using(bucket_id='mitra-private' and exists(select 1 from public.mitra_accounts m where m.satker_code=(storage.foldername(name))[1] and m.status in ('draf','perbaikan')));
create policy "mitra photo admin read" on storage.objects for select to authenticated using(bucket_id='mitra-private' and public.is_sipadu_admin());
drop policy if exists "mitra photo insert" on storage.objects;
drop policy if exists "mitra photo editable insert" on storage.objects;
create policy "mitra photo editable insert" on storage.objects for insert to anon with check(bucket_id='mitra-private' and public.is_valid_mitra_satker((storage.foldername(name))[1]) and (not exists(select 1 from public.mitra_accounts m where m.satker_code=(storage.foldername(name))[1]) or exists(select 1 from public.mitra_accounts m where m.satker_code=(storage.foldername(name))[1] and m.status in ('draf','perbaikan'))));

create or replace function public.review_mitra_account(p_satker_code text,p_decision text,p_review_note text default '') returns public.mitra_accounts language plpgsql security definer set search_path=public as $$
declare v_current public.mitra_accounts;v_saved public.mitra_accounts;
begin
 if not public.is_sipadu_admin() then raise exception 'Akses Korwil diperlukan.';end if;
 if p_decision not in ('perbaikan','selesai') then raise exception 'Keputusan review tidak valid.';end if;
 select * into v_current from public.mitra_accounts where satker_code=p_satker_code for update;
 if not found then raise exception 'Data Akun Mitra belum tersedia.';end if;
 if not (v_current.status='siap_verifikasi' or (v_current.status='selesai' and p_decision='perbaikan')) then raise exception 'Status data tidak dapat direview.';end if;
 if p_decision='perbaikan' and btrim(coalesce(p_review_note,''))='' then raise exception 'Catatan perbaikan wajib diisi.';end if;
 update public.mitra_accounts set status=p_decision,review_note=btrim(coalesce(p_review_note,'')),completion_progress=case when p_decision='selesai' then 100 else completion_progress end,completed_at=case when p_decision='selesai' then now() else null end where satker_code=p_satker_code returning * into v_saved;
 return v_saved;
end$$;
revoke all on function public.review_mitra_account(text,text,text) from public;
grant execute on function public.review_mitra_account(text,text,text) to authenticated;

create or replace function public.update_accepted_mitra_account(p_satker_code text,p_unit_data jsonb,p_kpb_data jsonb,p_operator_data jsonb) returns public.mitra_accounts language plpgsql security definer set search_path=public as $$
declare v_saved public.mitra_accounts;
begin
 if not public.is_sipadu_admin() then raise exception 'Akses Korwil diperlukan.';end if;
 update public.mitra_accounts set unit_data=coalesce(p_unit_data,'{}'::jsonb),kpb_data=coalesce(p_kpb_data,'{}'::jsonb),operator_data=coalesce(p_operator_data,'{}'::jsonb),status='selesai',completion_progress=100 where satker_code=p_satker_code and status='selesai' returning * into v_saved;
 if not found then raise exception 'Hanya data yang sudah diterima dapat dikoreksi Korwil.';end if;
 return v_saved;
end$$;
revoke all on function public.update_accepted_mitra_account(text,jsonb,jsonb,jsonb) from public;
grant execute on function public.update_accepted_mitra_account(text,jsonb,jsonb,jsonb) to authenticated;

insert into public.tasks(task_key,title,description,method,due_label,source_letter,is_active,priority)
values('akun-mitra','Pemutakhiran Data Akun Mitra Satker','Melengkapi data unit, Pejabat KPB, dan operator untuk pendaftaran akun pada web Mitra.','portal','Belum ditentukan','Pemutakhiran Data Akun Mitra Satker',true,'tinggi')
on conflict(task_key) do update set title=excluded.title,description=excluded.description,method=excluded.method,due_label=excluded.due_label,source_letter=excluded.source_letter,is_active=true,priority=excluded.priority,updated_at=now();

insert into public.task_assignments(task_id,satker_id,progress,status,missing,source_snapshot)
select t.id,s.id,0,'belum','["Lengkapi Data Unit, Pejabat KPB, dan Operator"]'::jsonb,jsonb_build_object('source','mitra_accounts')
from public.tasks t cross join public.satkers s
where t.task_key='akun-mitra' and s.is_active and s.code<>'692507'
and not exists(select 1 from public.task_assignments a where a.task_id=t.id and a.satker_id=s.id);

create or replace function public.sync_mitra_assignment() returns trigger language plpgsql security definer set search_path=public as $$
declare v_task uuid;v_satker uuid;v_progress numeric;v_status task_status;
begin
 select id into v_task from tasks where task_key='akun-mitra';
 select id into v_satker from satkers where code=new.satker_code;
 if v_task is null or v_satker is null then return new;end if;
 v_progress:=case when new.status='selesai' then 100 else least(new.completion_progress,99) end;
 v_status:=case when new.status='selesai' then 'selesai'::task_status when new.status='perbaikan' then 'perbaikan'::task_status when new.status='siap_verifikasi' then 'verifikasi'::task_status when v_progress>0 then 'proses'::task_status else 'belum'::task_status end;
 update task_assignments set progress=v_progress,status=v_status,missing=case when new.status='selesai' then '[]'::jsonb else '["Lengkapi atau verifikasi Data Unit, Pejabat KPB, dan Operator"]'::jsonb end,submitted_at=case when new.status='siap_verifikasi' then coalesce(new.submitted_at,now()) else submitted_at end,completed_at=case when new.status='selesai' then coalesce(new.completed_at,now()) else null end,updated_at=now() where task_id=v_task and satker_id=v_satker;
 return new;
end$$;

drop trigger if exists trg_sync_mitra_assignment on public.mitra_accounts;
create trigger trg_sync_mitra_assignment after insert or update of completion_progress,status on public.mitra_accounts for each row execute function public.sync_mitra_assignment();
