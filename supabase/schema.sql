-- SIPADU BMN DITJENPAS RIAU — Supabase/PostgreSQL schema
-- Jalankan file ini satu kali melalui Supabase SQL Editor.

create extension if not exists pgcrypto;

do $$ begin
  create type public.task_method as enum ('spreadsheet','portal','upload');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.task_status as enum ('belum','proses','verifikasi','persetujuan','perbaikan','selesai','ditutup');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.task_priority as enum ('normal','tinggi');
exception when duplicate_object then null; end $$;

create table if not exists public.admin_users (
  email text primary key,
  display_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.satkers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[0-9]{6}$'),
  name text not null,
  slug text not null unique,
  access_token uuid not null unique default gen_random_uuid(),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  task_key text not null unique,
  title text not null,
  description text not null default '',
  method public.task_method not null,
  source_url text,
  source_spreadsheet_id text,
  source_sheet text,
  source_letter text,
  start_date date,
  due_date date,
  due_label text,
  is_active boolean not null default true,
  priority public.task_priority not null default 'normal',
  sync_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_requirements (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  requirement_key text not null,
  label text not null,
  track text,
  weight numeric(8,4) not null default 1,
  display_order integer not null default 0,
  is_required boolean not null default true,
  unique(task_id, requirement_key)
);

create table if not exists public.task_assignments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  satker_id uuid not null references public.satkers(id) on delete cascade,
  progress numeric(5,2) not null default 0 check (progress between 0 and 100),
  status public.task_status not null default 'belum',
  missing jsonb not null default '[]'::jsonb,
  source_snapshot jsonb not null default '{}'::jsonb,
  revision_count integer not null default 0,
  first_opened_at timestamptz,
  submitted_at timestamptz,
  completed_at timestamptz,
  last_synced_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(task_id, satker_id)
);

create table if not exists public.supporting_documents (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.task_assignments(id) on delete cascade,
  document_type text not null,
  title text not null,
  drive_file_id text,
  drive_url text,
  verification_status text not null default 'menunggu',
  uploaded_at timestamptz not null default now(),
  verified_at timestamptz
);

create table if not exists public.activity_logs (
  id bigint generated always as identity primary key,
  actor_email text,
  actor_role text not null default 'system',
  task_id uuid references public.tasks(id) on delete set null,
  satker_id uuid references public.satkers(id) on delete set null,
  action text not null,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.performance_events (
  id bigint generated always as identity primary key,
  satker_id uuid not null references public.satkers(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  metric_key text not null,
  metric_value numeric(10,2) not null,
  source_event text not null,
  occurred_at timestamptz not null default now(),
  unique(satker_id, task_id, metric_key, source_event)
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists satkers_set_updated_at on public.satkers;
create trigger satkers_set_updated_at before update on public.satkers for each row execute function public.set_updated_at();
drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at before update on public.tasks for each row execute function public.set_updated_at();
drop trigger if exists assignments_set_updated_at on public.task_assignments;
create trigger assignments_set_updated_at before update on public.task_assignments for each row execute function public.set_updated_at();

create or replace function public.is_sipadu_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where lower(email) = lower(coalesce(auth.jwt()->>'email','')) and is_active
  );
$$;

alter table public.admin_users enable row level security;
alter table public.satkers enable row level security;
alter table public.tasks enable row level security;
alter table public.task_requirements enable row level security;
alter table public.task_assignments enable row level security;
alter table public.supporting_documents enable row level security;
alter table public.activity_logs enable row level security;
alter table public.performance_events enable row level security;

-- Hapus lalu buat ulang policy agar file aman dijalankan kembali.
do $$
declare t text;
begin
  foreach t in array array['admin_users','satkers','tasks','task_requirements','task_assignments','supporting_documents','activity_logs','performance_events'] loop
    execute format('drop policy if exists sipadu_admin_all on public.%I', t);
    execute format('create policy sipadu_admin_all on public.%I for all to authenticated using (public.is_sipadu_admin()) with check (public.is_sipadu_admin())', t);
  end loop;
end $$;

-- Satu-satunya jalur baca tanpa login. Token hanya mengembalikan data milik satu satker.
create or replace function public.get_satker_portal(p_token uuid)
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

revoke all on function public.get_satker_portal(uuid) from public;
grant execute on function public.get_satker_portal(uuid) to anon, authenticated;

-- Daftar pekerjaan aktif yang aman ditampilkan pada halaman pilihan satker tanpa login.
create or replace function public.get_active_portal()
returns jsonb language sql stable security definer set search_path=public as $$
select coalesce(jsonb_agg(jsonb_build_object(
  'id',t.task_key,'title',t.title,'description',t.description,'method',t.method,
  'due',coalesce(t.due_label,to_char(t.due_date,'DD Mon YYYY')),
  'letter',coalesce(t.source_letter,''),'link',t.source_url,'active',t.is_active,'priority',t.priority,
  'assignments',coalesce((select jsonb_agg(jsonb_build_object(
    'satker',s.code,'progress',a.progress,'status',a.status,'missing',a.missing,
    'revisionCount',a.revision_count,'updated',a.updated_at
  ) order by s.name) from public.task_assignments a join public.satkers s on s.id=a.satker_id where a.task_id=t.id and s.is_active),'[]'::jsonb)
) order by t.due_date nulls last,t.title),'[]'::jsonb) from public.tasks t where t.is_active;
$$;
revoke all on function public.get_active_portal() from public;
grant execute on function public.get_active_portal() to anon, authenticated;

create or replace function public.get_my_admin_profile()
returns jsonb language sql stable security definer set search_path=public as $$
select case when a.email is null then null else jsonb_build_object('email',a.email,'displayName',a.display_name) end
from (select auth.jwt()->>'email' as email) j
left join public.admin_users a on lower(a.email)=lower(j.email) and a.is_active;
$$;
revoke all on function public.get_my_admin_profile() from public;
grant execute on function public.get_my_admin_profile() to authenticated;

-- Workflow unggah terbuka dan verifikasi Korwil.
do $$ begin create type public.submission_status as enum ('mengunggah','menunggu_verifikasi','diterima','perlu_perbaikan','ditolak','dialihkan'); exception when duplicate_object then null; end $$;
create table if not exists public.submissions (id uuid primary key default gen_random_uuid(),submission_number text not null unique default ('SIPADU-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(encode(gen_random_bytes(5),'hex'),1,8))),task_id uuid not null references public.tasks(id) on delete restrict,satker_id uuid not null references public.satkers(id) on delete restrict,assignment_id uuid not null references public.task_assignments(id) on delete restrict,sender_name text not null,sender_phone text,sender_note text,status public.submission_status not null default 'mengunggah',review_note text,reviewed_by text,reviewed_at timestamptz,submitted_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
alter table public.supporting_documents add column if not exists submission_id uuid references public.submissions(id) on delete cascade;alter table public.supporting_documents add column if not exists requirement_key text;alter table public.supporting_documents add column if not exists original_filename text;alter table public.supporting_documents add column if not exists stored_path text;alter table public.supporting_documents add column if not exists file_size bigint;alter table public.supporting_documents add column if not exists mime_type text;alter table public.supporting_documents add column if not exists version integer not null default 1;alter table public.supporting_documents add column if not exists archive_status text not null default 'inbox';alter table public.supporting_documents add column if not exists review_note text;
create index if not exists submissions_status_idx on public.submissions(status,created_at desc);create index if not exists submissions_task_satker_idx on public.submissions(task_id,satker_id,created_at desc);create index if not exists documents_submission_idx on public.supporting_documents(submission_id);
drop trigger if exists submissions_set_updated_at on public.submissions;create trigger submissions_set_updated_at before update on public.submissions for each row execute function public.set_updated_at();
alter table public.submissions enable row level security;drop policy if exists sipadu_admin_all on public.submissions;create policy sipadu_admin_all on public.submissions for all to authenticated using (public.is_sipadu_admin()) with check (public.is_sipadu_admin());
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('submission-inbox','submission-inbox',false,26214400,array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/jpeg','image/png','image/webp','application/zip']) on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists sipadu_admin_read_inbox on storage.objects;create policy sipadu_admin_read_inbox on storage.objects for select to authenticated using (bucket_id='submission-inbox' and public.is_sipadu_admin());
create or replace function public.get_submission_receipt(p_number text) returns jsonb language sql stable security definer set search_path=public as $$ select jsonb_build_object('submissionNumber',sub.submission_number,'status',sub.status,'task',t.title,'satker',s.name,'submittedAt',sub.submitted_at,'reviewNote',sub.review_note,'documentCount',(select count(*) from public.supporting_documents d where d.submission_id=sub.id)) from public.submissions sub join public.tasks t on t.id=sub.task_id join public.satkers s on s.id=sub.satker_id where upper(sub.submission_number)=upper(p_number); $$;
revoke all on function public.get_submission_receipt(text) from public;grant execute on function public.get_submission_receipt(text) to anon,authenticated;

-- Rahasia konektor eksternal. Tidak memiliki policy; hanya service-role yang dapat membaca/menulis.
create table if not exists public.integration_secrets (secret_key text primary key,secret_value text not null,updated_at timestamptz not null default now());
alter table public.integration_secrets enable row level security;revoke all on public.integration_secrets from anon,authenticated;
create table if not exists public.setup_tokens (token_hash text primary key,purpose text not null,expires_at timestamptz not null,used_at timestamptz,created_at timestamptz not null default now());
alter table public.setup_tokens enable row level security;revoke all on public.setup_tokens from anon,authenticated;
