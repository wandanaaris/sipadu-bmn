-- Perbaikan halaman Label Barcode BMN (Kanwil Ditjenpas Riau, satker 692507).
--
-- 1) bmn_nup_lama — NUP lama aset transfer (sumber: file Mapping TK-TM SIMAN).
-- 2) Klasifikasi sumber aset:
--    a. bmn_label_sumber_psp: PSP batch transfer Kemenkum (SEK.3-PB.03.01-1626)
--       diperlakukan seperti PSP kosong (dulu kosong, sejak master 16-Okt-2026 terisi).
--    b. bmn_label_sumber_aset: memakai KODE SATKER lebih dulu — semua aset dengan
--       kode ...692507001KD adalah Eks Rupbasan Bengkalis walau nomor PSP-nya lain
--       (2 aset ber-PSP 75/MK/KNL.0305/2025 sebelumnya salah masuk "PSP lain").
-- 3) bmn_label_daftar & bmn_label_rekap membaca view bmn_aktif (snapshot aktif),
--    bukan tabel bmn_assets mentah. Tanpa ini halaman menampilkan gabungan SEMUA
--    snapshot (882 aset padahal snapshot aktif 815).

create table if not exists public.bmn_nup_lama (
  id bigint generated always as identity primary key,
  satker_code text not null,
  kode_register text not null,
  kode_barang text not null,
  nup_lama text not null,
  created_at timestamptz not null default now(),
  unique (satker_code, kode_register)
);
create index if not exists bmn_nup_lama_register_idx on public.bmn_nup_lama (kode_register);
alter table public.bmn_nup_lama enable row level security;
drop policy if exists "label nup lama terbaca" on public.bmn_nup_lama;
create policy "label nup lama terbaca" on public.bmn_nup_lama for select using (true);

create or replace function public.bmn_label_sumber_aset(p_psp text, p_merk text default null, p_tahun text default null, p_satker_raw text default null)
returns text language sql immutable set search_path = public as $fungsi$
  select case
    -- Kode satker asal lebih menentukan daripada nomor PSP: seluruh aset dengan
    -- kode ...692507001KD adalah Eks Rupbasan Bengkalis, walau PSP-nya berbeda.
    when btrim(coalesce(p_satker_raw,'')) = '137040900692507001KD' then 'Eks Rupbasan Bengkalis'
    when coalesce(btrim(p_psp), '') = ''
      or btrim(p_psp) like 'SEK.3-PB.03.01-1626%' then
      case
        when left(coalesce(btrim(p_tahun), ''), 4) = '2026'
             and (lower(coalesce(p_merk, '')) like '%orbitrend%'
               or lower(coalesce(p_merk, '')) like '%futura%')
          then 'PSP lain (Kanwil)'
        else 'Transfer Kanwil Kemenkum'
      end
    when btrim(p_psp) like 'SEK.3-PB.03.01-904%' then 'Eks Rupbasan Rengat'
    when btrim(p_psp) like 'SEK.3-PB.03.01-905%' then 'Eks Rupbasan Bangkinang'
    when btrim(p_psp) like 'SEK.3-PB.03.01-1008%' then 'Eks Rupbasan Bengkalis'
    else 'PSP lain (Kanwil)'
  end
$fungsi$;

create or replace function public.bmn_label_sumber_psp(p_psp text, p_merk text default null, p_tahun text default null)
returns text language sql immutable set search_path = public as $fungsi$
  select case
    when coalesce(btrim(p_psp), '') = ''
      or btrim(p_psp) like 'SEK.3-PB.03.01-1626%' then
      case
        when left(coalesce(btrim(p_tahun), ''), 4) = '2026'
             and (lower(coalesce(p_merk, '')) like '%orbitrend%'
               or lower(coalesce(p_merk, '')) like '%futura%')
          then 'PSP lain (Kanwil)'
        else 'Transfer Kanwil Kemenkum'
      end
    when btrim(p_psp) like 'SEK.3-PB.03.01-904%' then 'Eks Rupbasan Rengat'
    when btrim(p_psp) like 'SEK.3-PB.03.01-905%' then 'Eks Rupbasan Bangkinang'
    when btrim(p_psp) like 'SEK.3-PB.03.01-1008%' then 'Eks Rupbasan Bengkalis'
    else 'PSP lain (Kanwil)'
  end
$fungsi$;

create or replace function public.bmn_label_daftar(p_satker text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $fungsi$
  with berreg as (
    select distinct on (kode_register)
      kode_register, kode_barang, nup::text as nup, nama_barang, merk, tipe, kode_satker_raw,
      kondisi, status_bmn, no_psp, coalesce(nilai_perolehan, 0) as nilai_perolehan,
      coalesce(nullif(btrim(merk), ''), nullif(btrim(tipe), ''), '') as merk_pakai,
      coalesce(tanggal_perolehan, tanggal_buku_pertama, '') as tahun_pakai
    from public.bmn_aktif
    where satker_code = p_satker
      and coalesce(nullif(btrim(kode_register), ''), '') <> ''
    order by kode_register, id
  ),
  lokasi as (
    select kode_register,
           max(nullif(btrim(lokasi_ruang), '')) filter (
             where btrim(lokasi_ruang) <> '' and btrim(lokasi_ruang) <> 'Belum berlokasi'
           ) as lokasi
    from public.bmn_aktif
    where satker_code = p_satker
      and coalesce(nullif(btrim(kode_register), ''), '') <> ''
    group by kode_register
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'kodeRegister', u.kode_register,
    'kodeBarang', u.kode_barang,
    'nup', u.nup,
    'namaBarang', u.nama_barang,
    'merk', coalesce(nullif(btrim(p.merk), ''), u.merk_pakai, ''),
    'merkSimpan', u.merk_pakai,
    'merkTerisi', coalesce(nullif(btrim(p.merk), ''), '') <> '',
    'kondisi', u.kondisi,
    'kondisiReal', p.kondisi_real,
    'fotoUrl', p.foto_url,
    'fotoUkuran', p.foto_ukuran,
    'statusBmn', u.status_bmn,
    'noPsp', u.no_psp,
    'tahunPerolehan', left(u.tahun_pakai, 10),
    'nilaiPerolehan', u.nilai_perolehan,
    'nupLama', nl.nup_lama,
    'sumber', public.bmn_label_sumber_aset(u.no_psp, u.merk_pakai, u.tahun_pakai, u.kode_satker_raw),
    'lokasiSimpan', coalesce(l.lokasi, ''),
    'labelTercetak', (ct.id is not null),
    'sudahDitempel', coalesce(p.sudah_ditempel, false),
    'tanggalTempel', to_char(p.tanggal_tempel, 'YYYY-MM-DD'),
    'petugas', p.petugas,
    'sudahDiscan', coalesce(p.sudah_discan, false),
    'ruangBaru', p.ruang_baru,
    'keterangan', p.keterangan
  ) order by u.kode_barang, u.nup, u.kode_register), '[]'::jsonb)
  from berreg u
  join lokasi l using (kode_register)
  left join public.bmn_label_cetak ct
    on ct.satker_code = p_satker and ct.kode_barang = u.kode_barang and ct.nup = u.nup
  left join public.bmn_label_pemasangan p
    on p.satker_code = p_satker and p.kode_register = u.kode_register
  left join public.bmn_nup_lama nl
    on nl.satker_code = p_satker and nl.kode_register = u.kode_register
$fungsi$;

create or replace function public.bmn_label_rekap(p_satker text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $fungsi$
  with berreg as (
    select distinct on (kode_register)
      kode_register, kode_barang, nup::text as nup, no_psp, merk, tipe, kode_satker_raw,
      coalesce(nullif(btrim(merk), ''), nullif(btrim(tipe), ''), '') as merk_pakai,
      coalesce(tanggal_perolehan::text, tanggal_buku_pertama::text, '') as tahun_pakai
    from public.bmn_aktif
    where satker_code = p_satker
      and coalesce(nullif(btrim(kode_register), ''), '') <> ''
    order by kode_register, id
  ),
  lokasi as (
    select kode_register,
           max(nullif(btrim(lokasi_ruang), '')) filter (
             where btrim(lokasi_ruang) <> '' and btrim(lokasi_ruang) <> 'Belum berlokasi'
           ) as lokasi
    from public.bmn_aktif
    where satker_code = p_satker
      and coalesce(nullif(btrim(kode_register), ''), '') <> ''
    group by kode_register
  ),
  gabung as (
    select
      public.bmn_label_sumber_aset(u.no_psp, u.merk_pakai, u.tahun_pakai, u.kode_satker_raw) as sumber,
      (ct.id is not null) as label_tercetak,
      coalesce(p.sudah_ditempel, false) and coalesce(p.sudah_discan, false) as selesai,
      (l.lokasi is not null) as berlokasi,
      (coalesce(nullif(btrim(p.merk), ''), u.merk_pakai, '') = '') as merk_kosong,
      (coalesce(nullif(btrim(p.kondisi_real), ''), '') <> '') as kondisi_terisi,
      (p.foto_url is not null) as foto_ada
    from berreg u
    join lokasi l using (kode_register)
    left join public.bmn_label_cetak ct
      on ct.satker_code = p_satker and ct.kode_barang = u.kode_barang and ct.nup = u.nup
    left join public.bmn_label_pemasangan p
      on p.satker_code = p_satker and p.kode_register = u.kode_register
  ),
  ringkas as (
    select sumber,
           count(*) as total,
           count(*) filter (where selesai) as selesai,
           count(*) filter (where label_tercetak) as label_tercetak,
           count(*) filter (where berlokasi) as berlokasi,
           count(*) filter (where merk_kosong) as merk_kosong,
           count(*) filter (where kondisi_terisi) as kondisi_terisi,
           count(*) filter (where foto_ada) as foto_ada
    from gabung group by sumber
  )
  select jsonb_build_object(
    'total', (select count(*) from gabung),
    'selesai', (select count(*) from gabung where selesai),
    'belum', (select count(*) from gabung where not selesai),
    'merkKosong', (select count(*) from gabung where merk_kosong),
    'sudahFoto', (select count(*) from gabung where foto_ada),
    'sudahKondisi', (select count(*) from gabung where kondisi_terisi),
    'perSumber', coalesce((
      select jsonb_agg(jsonb_build_object(
        'sumber', sumber, 'total', total, 'selesai', selesai,
        'labelTercetak', label_tercetak, 'berlokasi', berlokasi,
        'merkKosong', merk_kosong,
        'kondisiTerisi', kondisi_terisi, 'fotoAda', foto_ada
      ) order by total desc)
      from ringkas
    ), '[]'::jsonb)
  )
$fungsi$;

grant execute on function public.bmn_label_sumber_aset(text,text,text,text) to anon, authenticated;
grant execute on function public.bmn_label_sumber_psp(text,text,text) to anon, authenticated;
revoke all on function public.bmn_label_daftar(text) from public;
revoke all on function public.bmn_label_rekap(text) from public;
grant execute on function public.bmn_label_daftar(text) to authenticated;
grant execute on function public.bmn_label_rekap(text) to authenticated;
