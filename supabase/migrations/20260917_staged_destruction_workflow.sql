-- Production staged-destruction workflow (v2).
-- Adds per-assignment stage tracking + submit/verify/return RPCs.
-- Safe to re-run.

begin;

alter table public.task_assignments
  add column if not exists current_stage integer not null default 0;

alter table public.task_assignments
  add column if not exists stage_states jsonb not null default '[]'::jsonb;

-- Operator menyetujui tahap: hanya untuk satker pemilik token.
create or replace function public.submit_staged_stage(
  p_token uuid,
  p_task_key text,
  p_stage_index integer
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  update public.task_assignments a
  set
    stage_states = jsonb_set(
      a.stage_states,
      array[p_stage_index::text],
      '"menunggu_verifikasi"'::jsonb
    ),
    status = 'verifikasi',
    submitted_at = now(),
    updated_at = now()
  from public.tasks t, public.satkers s
  where t.task_key = p_task_key
    and s.access_token = p_token
    and s.is_active
    and a.task_id = t.id
    and a.satker_id = s.id
    and a.current_stage = p_stage_index
    and jsonb_array_length(a.stage_states) > p_stage_index
    and (a.stage_states ->> p_stage_index) = 'terbuka'
  returning jsonb_build_object(
    'ok', true,
    'assignment_id', a.id,
    'stage_index', p_stage_index,
    'state', 'menunggu_verifikasi'
  );
$$;

-- Korwil memverifikasi atau mengembalikan tahap.
create or replace function public.review_staged_stage(
  p_task_key text,
  p_satker_code text,
  p_stage_index integer,
  p_action text
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with admin_check as (
    select public.is_sipadu_admin() as ok
  ),
  target as (
    select a.id, a.stage_states, jsonb_array_length(a.stage_states) as stage_count
    from public.task_assignments a
    join public.tasks t on t.id = a.task_id
    join public.satkers s on s.id = a.satker_id
    where t.task_key = p_task_key
      and s.code = p_satker_code
      and s.is_active
      and jsonb_array_length(a.stage_states) > p_stage_index
      and (a.stage_states ->> p_stage_index) = 'menunggu_verifikasi'
  ),
  updated as (
    update public.task_assignments a
    set
      stage_states = case
        when p_action = 'verify' then
          jsonb_set(
            jsonb_set(
              a.stage_states,
              array[p_stage_index::text],
              '"selesai"'::jsonb
            ),
            array[(p_stage_index + 1)::text],
            case
              when p_stage_index + 1 < jsonb_array_length(a.stage_states)
              then '"terbuka"'::jsonb
              else 'null'::jsonb
            end
          )
        when p_action = 'return' then
          jsonb_set(
            a.stage_states,
            array[p_stage_index::text],
            '"perbaikan"'::jsonb
          )
        else a.stage_states
      end,
      current_stage = case
        when p_action = 'verify' and p_stage_index + 1 < jsonb_array_length(a.stage_states)
        then p_stage_index + 1
        when p_action = 'verify' then p_stage_index
        else a.current_stage
      end,
      status = case
        when p_action = 'verify' and p_stage_index + 1 >= jsonb_array_length(a.stage_states) then 'selesai'
        when p_action = 'verify' then 'proses'
        when p_action = 'return' then 'perbaikan'
        else a.status
      end,
      progress = case
        when p_action = 'verify' then round(((p_stage_index + 1)::numeric / jsonb_array_length(a.stage_states)) * 100)
        when p_action = 'return' then round((p_stage_index::numeric / jsonb_array_length(a.stage_states)) * 100)
        else a.progress
      end,
      revision_count = case when p_action = 'return' then a.revision_count + 1 else a.revision_count end,
      updated_at = now()
    from target, admin_check ac
    where ac.ok
      and a.id = target.id
    returning a.*
  )
  select case
    when not (select ok from admin_check) then jsonb_build_object('ok', false, 'error', 'Akses ditolak: hanya Korwil yang dapat memverifikasi.')
    when not exists (select 1 from updated) then jsonb_build_object('ok', false, 'error', 'Pengajuan tidak ditemukan atau bukan menunggu_verifikasi.')
    else (
      select jsonb_build_object(
        'ok', true,
        'assignment_id', id,
        'action', p_action,
        'status', status,
        'progress', progress
      )
      from updated
      limit 1
    )
  end;
$$;

commit;

revoke all on function public.submit_staged_stage(uuid, text, integer) from public;
grant execute on function public.submit_staged_stage(uuid, text, integer) to anon, authenticated;
revoke all on function public.review_staged_stage(text, text, integer, text) from public;
grant execute on function public.review_staged_stage(text, text, integer, text) to authenticated;
