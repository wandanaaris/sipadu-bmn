-- Satu sumber inbox terproteksi mencegah RLS mengembalikan [] diam-diam
-- ketika badge publik tetap melihat assignment berstatus verifikasi.
create or replace function public.get_verification_inbox()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare v_result jsonb;
begin
  if not public.is_sipadu_admin() then
    raise exception 'Akses Korwil diperlukan';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id',sub.id,
      'submission_number',sub.submission_number,
      'sender_name',sub.sender_name,
      'sender_phone',sub.sender_phone,
      'sender_note',sub.sender_note,
      'status',sub.status,
      'review_note',sub.review_note,
      'submitted_at',sub.submitted_at,
      'created_at',sub.created_at,
      'tasks',jsonb_build_object('task_key',t.task_key,'title',t.title),
      'satkers',jsonb_build_object('code',s.code,'name',s.name),
      'supporting_documents',coalesce((
        select jsonb_agg(jsonb_build_object(
          'id',d.id,
          'document_type',d.document_type,
          'original_filename',d.original_filename,
          'stored_path',d.stored_path,
          'file_size',d.file_size,
          'mime_type',d.mime_type,
          'verification_status',d.verification_status,
          'archive_status',d.archive_status,
          'drive_url',d.drive_url,
          'review_note',d.review_note
        ) order by d.uploaded_at)
        from public.supporting_documents d
        where d.submission_id=sub.id
      ),'[]'::jsonb)
    ) order by sub.created_at desc
  ),'[]'::jsonb)
  into v_result
  from public.submissions sub
  join public.tasks t on t.id=sub.task_id
  join public.satkers s on s.id=sub.satker_id;

  return v_result;
end$$;

revoke all on function public.get_verification_inbox() from public;
grant execute on function public.get_verification_inbox() to authenticated;

notify pgrst, 'reload schema';
