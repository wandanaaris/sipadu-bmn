-- Fix RPCs using plpgsql for proper return values
create or replace function public.submit_staged_stage(
  p_token uuid,
  p_task_key text,
  p_stage_index integer
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_assignment_id uuid;
begin
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
  returning a.id into v_assignment_id;

  if v_assignment_id is null then
    return jsonb_build_object('ok', false, 'error', 'Stage tidak ditemukan atau sudah pernah diajukan.');
  end if;

  return jsonb_build_object(
    'ok', true,
    'assignment_id', v_assignment_id,
    'stage_index', p_stage_index,
    'state', 'menunggu_verifikasi'
  );
end;
$$;

create or replace function public.review_staged_stage(
  p_task_key text,
  p_satker_code text,
  p_stage_index integer,
  p_action text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_assignment_id uuid;
  v_stage_count integer;
  v_new_status text;
  v_new_progress numeric;
  v_new_current_stage integer;
  v_new_revision_count integer;
begin
  if not public.is_sipadu_admin() then
    return jsonb_build_object('ok', false, 'error', 'Akses ditolak: hanya Korwil yang dapat memverifikasi.');
  end if;

  select a.id, jsonb_array_length(a.stage_states)
  into v_assignment_id, v_stage_count
  from public.task_assignments a
  join public.tasks t on t.id = a.task_id
  join public.satkers s on s.id = a.satker_id
  where t.task_key = p_task_key
    and s.code = p_satker_code
    and s.is_active
    and jsonb_array_length(a.stage_states) > p_stage_index
    and (a.stage_states ->> p_stage_index) = 'menunggu_verifikasi';

  if v_assignment_id is null then
    return jsonb_build_object('ok', false, 'error', 'Pengajuan tidak ditemukan atau bukan menunggu_verifikasi.');
  end if;

  v_new_current_stage := case
    when p_action = 'verify' and p_stage_index + 1 < v_stage_count then p_stage_index + 1
    when p_action = 'verify' then p_stage_index
    else 0
  end;

  v_new_status := case
    when p_action = 'verify' and p_stage_index + 1 >= v_stage_count then 'selesai'
    when p_action = 'verify' then 'proses'
    when p_action = 'return' then 'perbaikan'
    else 'belum'
  end;

  v_new_progress := case
    when p_action = 'verify' then round(((p_stage_index + 1)::numeric / v_stage_count) * 100)
    when p_action = 'return' then round((p_stage_index::numeric / v_stage_count) * 100)
    else 0
  end;

  v_new_revision_count := case when p_action = 'return' then 1 else 0 end;

  update public.task_assignments
  set
    stage_states = case
      when p_action = 'verify' then
        jsonb_set(
          jsonb_set(
            stage_states,
            array[p_stage_index::text],
            '"selesai"'::jsonb
          ),
          array[(p_stage_index + 1)::text],
          case
            when p_stage_index + 1 < v_stage_count
            then '"terbuka"'::jsonb
            else 'null'::jsonb
          end
        )
      when p_action = 'return' then
        jsonb_set(
          stage_states,
          array[p_stage_index::text],
          '"perbaikan"'::jsonb
        )
      else stage_states
    end,
    current_stage = v_new_current_stage,
    status = v_new_status,
    progress = v_new_progress,
    revision_count = revision_count + v_new_revision_count,
    updated_at = now()
  where id = v_assignment_id;

  return jsonb_build_object(
    'ok', true,
    'assignment_id', v_assignment_id,
    'action', p_action,
    'status', v_new_status,
    'progress', v_new_progress
  );
end;
$$;

revoke all on function public.submit_staged_stage(uuid, text, integer) from public;
grant execute on function public.submit_staged_stage(uuid, text, integer) to anon, authenticated;
revoke all on function public.review_staged_stage(text, text, integer, text) from public;
grant execute on function public.review_staged_stage(text, text, integer, text) to authenticated;
