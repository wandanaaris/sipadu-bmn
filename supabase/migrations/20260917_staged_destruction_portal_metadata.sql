-- Expose staged-destruction metadata stored in tasks.sync_config to public portal RPCs.
-- The metadata is limited to workflow configuration, Drive links, and document references.

-- Supabase requires dropping a function when its return type changes.
drop function if exists public.get_satker_portal(uuid);
drop function if exists public.get_active_portal();

create function public.get_satker_portal(p_token uuid)
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select jsonb_build_object(
    'satker', jsonb_build_object('code', s.code, 'name', s.name, 'slug', s.slug),
    'tasks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.task_key,
        'title', t.title,
        'description', t.description,
        'method', t.method,
        'due', coalesce(t.due_label, to_char(t.due_date,'DD Mon YYYY')),
        'letter', coalesce(t.source_letter,''),
        'link', t.source_url,
        'uploadLink', t.sync_config->>'upload_link',
        'references', coalesce(t.sync_config->'references','[]'::jsonb),
        'workflow', t.sync_config->>'workflow',
        'stages', coalesce(t.sync_config->'stages','[]'::jsonb),
        'active', t.is_active,
        'priority', t.priority,
        'assignments', jsonb_build_array(jsonb_build_object(
          'satker', s.code,
          'progress', a.progress,
          'status', a.status,
          'missing', a.missing,
          'revisionCount', a.revision_count,
          'updated', a.updated_at
        ))
      ) order by t.due_date nulls last, t.title)
      from public.task_assignments a
      join public.tasks t on t.id = a.task_id
      where a.satker_id = s.id and t.is_active
    ), '[]'::jsonb)
  )
  from public.satkers s
  where s.access_token = p_token and s.is_active;
$$;

create or replace function public.get_active_portal()
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',t.task_key,
    'title',t.title,
    'description',t.description,
    'method',t.method,
    'due',coalesce(t.due_label,to_char(t.due_date,'DD Mon YYYY')),
    'letter',coalesce(t.source_letter,''),
    'link',t.source_url,
    'uploadLink',t.sync_config->>'upload_link',
    'references',coalesce(t.sync_config->'references','[]'::jsonb),
    'workflow',t.sync_config->>'workflow',
    'stages',coalesce(t.sync_config->'stages','[]'::jsonb),
    'active',t.is_active,
    'priority',t.priority,
    'assignments',coalesce((select jsonb_agg(jsonb_build_object(
      'satker',s.code,
      'progress',a.progress,
      'status',a.status,
      'missing',a.missing,
      'revisionCount',a.revision_count,
      'updated',a.updated_at
    ) order by s.name)
    from public.task_assignments a
    join public.satkers s on s.id=a.satker_id
    where a.task_id=t.id and s.is_active),'[]'::jsonb)
  ) order by t.due_date nulls last,t.title),'[]'::jsonb)
  from public.tasks t
  where t.is_active;
$$;

revoke all on function public.get_satker_portal(uuid) from public;
grant execute on function public.get_satker_portal(uuid) to anon, authenticated;
revoke all on function public.get_active_portal() from public;
grant execute on function public.get_active_portal() to anon, authenticated;
