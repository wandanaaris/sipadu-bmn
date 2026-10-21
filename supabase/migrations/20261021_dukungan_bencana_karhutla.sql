-- =====================================================================
-- Dukungan Bencana (Karhutla & Kekeringan) — monitoring pegawai per satker
-- Kanwil Ditjenpas Riau
--
-- Konteks: Biro Umum Setjen meminta pendataan pegawai & keluarga inti yang
-- terdampak bencana via Google Form. Kanwil memantau siapa saja pegawai per
-- satker yang sudah mengisi form (bukti = capture) dan yang belum.
--
-- Tabel:
--   pegawai          -> master data pegawai (NIP unik), sumber: datapegawai-21-10-2026.xlsx
--   dukungan_bencana -> status pengisian per pegawai (belum/menunggu_verifikasi/selesai/perbaikan)
--
-- RPC:
--   get_pegawai_by_nip(p_nip)              anon  -> isian form (nama+satker muncul saat ketik NIP)
--   submit_dukungan_bencana(...)           anon  -> tandai menunggu verifikasi usai unggah capture
--   get_dukungan_bencana_rekap()           admin -> rekap per satker (total/sudah/belum)
--   get_dukungan_bencana_detail(p_satker)  admin -> daftar pegawai per satker + status
--   review_dukungan_bencana(...)           admin -> terima / minta perbaikan
-- =====================================================================

-- ── 1. Master pegawai ────────────────────────────────────────────────
create table if not exists public.pegawai (
  nip text primary key,
  nama_lengkap text not null,
  satker_code text not null,
  jenis_kelamin text,
  pendidikan text,
  pangkat text,
  jabatan text,
  jenis_pegawai text,
  tmt_cpns text,
  tanggal_lahir text,
  perkiraan_bup_tahun integer,
  kelas_jabatan text,
  no_sk_jabatan text,
  tanggal_sk_jabatan text,
  periode_kp text,
  keterangan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pegawai_satker_idx on public.pegawai (satker_code);

-- ── 2. Status pengisian per pegawai ──────────────────────────────────
create table if not exists public.dukungan_bencana (
  id bigint generated always as identity primary key,
  nip text not null references public.pegawai(nip),
  nama_lengkap text not null,
  satker_code text not null,
  capture_path text,
  capture_size bigint,
  status text not null default 'belum',
  catatan text,
  submitted_at timestamptz,
  reviewed_by text,
  reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(nip)
);
create index if not exists dukungan_bencana_satker_idx on public.dukungan_bencana (satker_code, status);

drop trigger if exists dukungan_bencana_updated_at on public.dukungan_bencana;
create trigger dukungan_bencana_updated_at before update on public.dukungan_bencana
  for each row execute function public.set_updated_at();

-- ── 3. RLS ───────────────────────────────────────────────────────────
alter table public.pegawai enable row level security;
alter table public.dukungan_bencana enable row level security;
do $$
begin
  execute 'drop policy if exists sipadu_admin_all on public.pegawai';
  execute 'create policy sipadu_admin_all on public.pegawai for all to authenticated using (public.is_sipadu_admin()) with check (public.is_sipadu_admin())';
  execute 'drop policy if exists sipadu_admin_all on public.dukungan_bencana';
  execute 'create policy sipadu_admin_all on public.dukungan_bencana for all to authenticated using (public.is_sipadu_admin()) with check (public.is_sipadu_admin())';
end $$;

-- ── 4. Cari pegawai by NIP (untuk form publik) ───────────────────────
create or replace function public.get_pegawai_by_nip(p_nip text)
returns jsonb
language sql stable security definer set search_path=public as $$
  select case
    when p.nip is null then 'null'::jsonb
    else jsonb_build_object(
      'nip', p.nip, 'nama', p.nama_lengkap, 'satker', p.satker_code,
      'status', coalesce(d.status,'belum'), 'catatan', d.catatan
    )
  end
  from public.pegawai p
  left join public.dukungan_bencana d on d.nip = p.nip
  where p.nip = p_nip
$$;
revoke all on function public.get_pegawai_by_nip(text) from public;
grant execute on function public.get_pegawai_by_nip(text) to anon, authenticated;

-- ── 5. Submit unggah capture (form publik) ───────────────────────────
create or replace function public.submit_dukungan_bencana(
  p_nip text,
  p_capture_path text default null,
  p_capture_size bigint default null
)
returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_nama text; v_satker text; v_path text;
begin
  select nama_lengkap, satker_code into v_nama, v_satker
  from public.pegawai where nip = p_nip;
  if v_nama is null then
    raise exception 'NIP tidak ditemukan dalam database pegawai. Harap periksa kembali.';
  end if;

  v_path := trim(coalesce(p_capture_path,''));
  -- capture_path wajib berada di dalam folder NIP sendiri.
  if v_path <> '' and not (v_path like p_nip || '/%') then
    raise exception 'Lokasi berkas bukti tidak valid.';
  end if;

  insert into public.dukungan_bencana
    (nip, nama_lengkap, satker_code, capture_path, capture_size, status, submitted_at)
  values
    (p_nip, v_nama, v_satker, nullif(v_path,''), p_capture_size, 'menunggu_verifikasi', now())
  on conflict (nip) do update set
    capture_path = coalesce(excluded.capture_path, dukungan_bencana.capture_path),
    capture_size = excluded.capture_size,
    status = case when dukungan_bencana.status in ('belum','perbaikan')
                  then 'menunggu_verifikasi' else dukungan_bencana.status end,
    catatan = null,
    submitted_at = now(),
    updated_at = now();

  return jsonb_build_object('ok', true, 'nip', p_nip, 'nama', v_nama, 'satker', v_satker, 'status', 'menunggu_verifikasi');
end;
$$;
revoke all on function public.submit_dukungan_bencana(text,text,bigint) from public;
grant execute on function public.submit_dukungan_bencana(text,text,bigint) to anon, authenticated;

-- ── 6. Rekap per satker (Korwil) ─────────────────────────────────────
create or replace function public.get_dukungan_bencana_rekap()
returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare v jsonb;
begin
  if not public.is_sipadu_admin() then raise exception 'Akses Korwil diperlukan.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'satker', s.code, 'nama', s.name,
    'total', t.total,
    'selesai', coalesce(d.sudah,0),
    'belum', t.total - coalesce(d.sudah,0),
    'menunggu', coalesce(m.menunggu,0)
  ) order by s.name), '[]'::jsonb) into v
  from public.satkers s
  join (select satker_code, count(*) total from public.pegawai group by 1) t on t.satker_code = s.code
  left join (select satker_code, count(*) sudah from public.dukungan_bencana where status='selesai' group by 1) d on d.satker_code = s.code
  left join (select satker_code, count(*) menunggu from public.dukungan_bencana where status='menunggu_verifikasi' group by 1) m on m.satker_code = s.code
  where s.is_active;
  return coalesce(v, '[]'::jsonb);
end;
$$;
revoke all on function public.get_dukungan_bencana_rekap() from public;
grant execute on function public.get_dukungan_bencana_rekap() to authenticated;

-- ── 7. Detail pegawai per satker (Korwil) ────────────────────────────
create or replace function public.get_dukungan_bencana_detail(p_satker text)
returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare v jsonb;
begin
  if not public.is_sipadu_admin() then raise exception 'Akses Korwil diperlukan.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'nip', p.nip,
    'nama', p.nama_lengkap,
    'jabatan', p.jabatan,
    'status', coalesce(d.status,'belum'),
    'catatan', d.catatan,
    'submitted_at', d.submitted_at,
    'sedang_verifikasi', (coalesce(d.status,'belum') = 'menunggu_verifikasi')
  ) order by (coalesce(d.status,'belum') = 'belum') desc, p.nama_lengkap), '[]'::jsonb) into v
  from public.pegawai p
  left join public.dukungan_bencana d on d.nip = p.nip
  where p.satker_code = p_satker;
  return coalesce(v, '[]'::jsonb);
end;
$$;
revoke all on function public.get_dukungan_bencana_detail(text) from public;
grant execute on function public.get_dukungan_bencana_detail(text) to authenticated;

-- ── 8. Review Korwil (selesai / perbaikan) ───────────────────────────
create or replace function public.review_dukungan_bencana(
  p_nip text,
  p_status text,
  p_catatan text default null
)
returns jsonb
language plpgsql security definer set search_path=public as $$
begin
  if not public.is_sipadu_admin() then raise exception 'Akses Korwil diperlukan.'; end if;
  if p_status not in ('selesai','perbaikan') then raise exception 'Status keputusan tidak valid.'; end if;
  update public.dukungan_bencana set
    status = p_status,
    catatan = nullif(trim(coalesce(p_catatan,'')), ''),
    reviewed_by = auth.jwt()->>'email',
    reviewed_at = now(),
    updated_at = now()
  where nip = p_nip;
  if not found then raise exception 'Pegawai belum pernah mengajukan bukti.'; end if;
  return jsonb_build_object('ok', true, 'nip', p_nip, 'status', p_status);
end;
$$;
revoke all on function public.review_dukungan_bencana(text,text,text) from public;
grant execute on function public.review_dukungan_bencana(text,text,text) to authenticated;
