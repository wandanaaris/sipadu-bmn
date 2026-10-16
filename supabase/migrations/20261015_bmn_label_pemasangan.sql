-- =====================================================================
-- Label Barcode BMN — Kanwil Ditjenpas Riau (satker 692507)
-- Pencatatan pelaksanaan: label sudah dicetak / ditempel / discan,
-- ruang baru, dan keterangan. Dipisah dari bmn_assets supaya tidak
-- hilang saat master SIMAN diimpor ulang.
-- =====================================================================

-- ── 1. Label yang sudah dicetak (riwayat cetak, tidak berubah) ──────
create table if not exists public.bmn_label_cetak (
  id bigint generated always as identity primary key,
  satker_code text not null,
  kode_barang text not null,
  nup text not null,
  nama_barang text,
  merk text,
  batch text,
  created_at timestamptz not null default now()
);
create unique index if not exists bmn_label_cetak_unik
  on public.bmn_label_cetak (satker_code, kode_barang, nup);
create index if not exists bmn_label_cetak_satker_idx
  on public.bmn_label_cetak (satker_code);

-- ── 2. Pelaksanaan pemasangan per aset (satu baris per aset) ────────
create table if not exists public.bmn_label_pemasangan (
  id bigint generated always as identity primary key,
  satker_code text not null,
  kode_barang text not null,
  nup text not null,
  sumber_psp text,
  ruang_baru text,
  sudah_ditempel boolean not null default false,
  tanggal_tempel date,
  petugas text,
  sudah_discan boolean not null default false,
  keterangan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists bmn_label_pemasangan_unik
  on public.bmn_label_pemasangan (satker_code, kode_barang, nup);
create index if not exists bmn_label_pemasangan_satker_idx
  on public.bmn_label_pemasangan (satker_code, sudah_ditempel);

drop trigger if exists bmn_label_pemasangan_updated_at on public.bmn_label_pemasangan;
create trigger bmn_label_pemasangan_updated_at
  before update on public.bmn_label_pemasangan
  for each row execute function public.set_updated_at();

alter table public.bmn_label_cetak enable row level security;
alter table public.bmn_label_pemasangan enable row level security;
revoke all on public.bmn_label_cetak from anon, authenticated;
revoke all on public.bmn_label_pemasangan from anon, authenticated;

-- ── 3. Sumber aset dari No PSP ──────────────────────────────────────
create or replace function public.bmn_label_sumber_psp(p_psp text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when coalesce(btrim(p_psp), '') = '' then 'Transfer Kanwil Kemenkum'
    when btrim(p_psp) like 'SEK.3-PB.03.01-904%' then 'Eks Rupbasan Rengat'
    when btrim(p_psp) like 'SEK.3-PB.03.01-905%' then 'Eks Rupbasan Bangkinang'
    when btrim(p_psp) like 'SEK.3-PB.03.01-1008%' then 'Eks Rupbasan Bengkalis'
    else 'PSP lain (Kanwil)'
  end
$$;
revoke all on function public.bmn_label_sumber_psp(text) from public;
grant execute on function public.bmn_label_sumber_psp(text) to authenticated;

-- ── 4. Daftar aset + status pelaksanaan ─────────────────────────────
-- bmn_assets memuat 2.646 baris untuk 813 aset unik (salinan ganda dari
-- impor). Baris yang dipakai: yang punya kode_register; lokasi diambil
-- dari salinan mana pun yang terisi.
create or replace function public.bmn_label_daftar(p_satker text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with unik as (
    select distinct on (kode_barang, nup::text)
      kode_barang, nup::text as nup, nama_barang, merk, tipe, kondisi, status_bmn,
      no_psp, kode_register
    from public.bmn_assets
    where satker_code = p_satker
    order by kode_barang, nup::text, (kode_register is not null) desc, id
  ),
  lokasi as (
    select kode_barang, nup::text as nup,
           max(nullif(btrim(lokasi_ruang), '')) filter (
             where btrim(lokasi_ruang) <> '' and btrim(lokasi_ruang) <> 'Belum berlokasi'
           ) as lokasi
    from public.bmn_assets
    where satker_code = p_satker
    group by kode_barang, nup::text
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'kodeBarang', u.kode_barang,
    'nup', u.nup,
    'namaBarang', u.nama_barang,
    'merk', coalesce(nullif(btrim(u.merk), ''), nullif(btrim(u.tipe), ''), ''),
    'kondisi', u.kondisi,
    'statusBmn', u.status_bmn,
    'noPsp', u.no_psp,
    'sumber', public.bmn_label_sumber_psp(u.no_psp),
    'lokasiSimpan', coalesce(l.lokasi, ''),
    'labelTercetak', (c.id is not null),
    'sudahDitempel', coalesce(p.sudah_ditempel, false),
    'tanggalTempel', to_char(p.tanggal_tempel, 'YYYY-MM-DD'),
    'petugas', p.petugas,
    'sudahDiscan', coalesce(p.sudah_discan, false),
    'ruangBaru', p.ruang_baru,
    'keterangan', p.keterangan
  ) order by u.kode_barang, u.nup), '[]'::jsonb)
  from unik u
  join lokasi l using (kode_barang, nup)
  left join public.bmn_label_cetak c
    on c.satker_code = p_satker and c.kode_barang = u.kode_barang and c.nup = u.nup
  left join public.bmn_label_pemasangan p
    on p.satker_code = p_satker and p.kode_barang = u.kode_barang and p.nup = u.nup
$$;
revoke all on function public.bmn_label_daftar(text) from public;
grant execute on function public.bmn_label_daftar(text) to authenticated;

-- ── 5. Simpan / ubah pelaksanaan satu aset ──────────────────────────
create or replace function public.bmn_label_simpan(
  p_satker text,
  p_kode_barang text,
  p_nup text,
  p_sumber_psp text default null,
  p_ruang_baru text default null,
  p_sudah_ditempel boolean default null,
  p_tanggal_tempel date default null,
  p_petugas text default null,
  p_sudah_discan boolean default null,
  p_keterangan text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_id bigint;
begin
  if coalesce(btrim(p_kode_barang), '') = '' then
    raise exception 'Kode barang wajib diisi.';
  end if;
  if coalesce(btrim(p_nup), '') = '' then
    raise exception 'NUP wajib diisi.';
  end if;

  insert into public.bmn_label_pemasangan
    (satker_code, kode_barang, nup, sumber_psp, ruang_baru,
     sudah_ditempel, tanggal_tempel, petugas, sudah_discan, keterangan)
  values
    (p_satker, btrim(p_kode_barang), btrim(p_nup),
     nullif(btrim(p_sumber_psp), ''), nullif(btrim(p_ruang_baru), ''),
     coalesce(p_sudah_ditempel, false), p_tanggal_tempel,
     nullif(btrim(p_petugas), ''), coalesce(p_sudah_discan, false),
     nullif(btrim(p_keterangan), ''))
  on conflict (satker_code, kode_barang, nup) do update set
    sumber_psp       = excluded.sumber_psp,
    ruang_baru       = excluded.ruang_baru,
    sudah_ditempel   = excluded.sudah_ditempel,
    tanggal_tempel   = excluded.tanggal_tempel,
    petugas          = excluded.petugas,
    sudah_discan     = excluded.sudah_discan,
    keterangan       = excluded.keterangan
  returning id into v_id;

  return jsonb_build_object('id', v_id);
end $$;
revoke all on function public.bmn_label_simpan(text, text, text, text, text, boolean, date, text, boolean, text) from public;
grant execute on function public.bmn_label_simpan(text, text, text, text, text, boolean, date, text, boolean, text) to authenticated;

-- ── 6. Rekap per sumber aset ────────────────────────────────────────
create or replace function public.bmn_label_rekap(p_satker text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with unik as (
    select distinct on (kode_barang, nup::text) kode_barang, nup::text as nup, no_psp
    from public.bmn_assets
    where satker_code = p_satker
    order by kode_barang, nup::text, (kode_register is not null) desc, id
  )
  select jsonb_build_object(
    'total', (select count(*) from unik),
    'perSumber', coalesce((
      select jsonb_agg(jsonb_build_object(
        'sumber', x.sumber,
        'total', x.total,
        'labelTercetak', x.label_tercetak,
        'sudahDitempel', x.sudah_ditempel,
        'sudahDiscan', x.sudah_discan,
        'berlokasi', x.berlokasi
      ) order by x.total desc)
      from (
        select
          public.bmn_label_sumber_psp(u.no_psp) as sumber,
          count(*) as total,
          count(*) filter (where c.id is not null) as label_tercetak,
          count(*) filter (where p.sudah_ditempel) as sudah_ditempel,
          count(*) filter (where p.sudah_discan) as sudah_discan,
          count(*) filter (where l.lokasi is not null) as berlokasi
        from unik u
        left join public.bmn_label_cetak c
          on c.satker_code = p_satker and c.kode_barang = u.kode_barang and c.nup = u.nup
        left join public.bmn_label_pemasangan p
          on p.satker_code = p_satker and p.kode_barang = u.kode_barang and p.nup = u.nup
        left join (
          select kode_barang, nup::text as nup,
                 max(nullif(btrim(lokasi_ruang), '')) filter (
                   where btrim(lokasi_ruang) <> '' and btrim(lokasi_ruang) <> 'Belum berlokasi'
                 ) as lokasi
          from public.bmn_assets where satker_code = p_satker group by kode_barang, nup::text
        ) l using (kode_barang, nup)
        group by 1
      ) x
    ), '[]'::jsonb)
  )
$$;
revoke all on function public.bmn_label_rekap(text) from public;
grant execute on function public.bmn_label_rekap(text) to authenticated;


-- =====================================================================
-- SEED: label yang sudah tercetak batch SIMAN 10 Desember 2025
-- Sumber: Label\2025_12_10-Kantor Wilayah Ditjen Pemasyarakatan Riau-Label--.pdf
-- 369 label terparse, 248 asetnya masih ada di bmn_assets satker 692507
-- (121 sisanya tidak ada asetnya sehingga tidak disertakan).
-- =====================================================================
insert into public.bmn_label_cetak (satker_code, kode_barang, nup, nama_barang, merk, batch)
values
  ('692507','3010110005','1','Forklift','CATERPILLAR DP30ND'),
  ('692507','3010110015','1','Hand Palet Truck','PLASTIC PALLET LIGHT BLUE'),
  ('692507','3010110015','2','Hand Palet Truck','PLASTIC PALLET LIGHT BLUE'),
  ('692507','3010110015','3','Hand Palet Truck','PLASTIC PALLET LIGHT BLUE'),
  ('692507','3010110015','4','Hand Palet Truck','PLASTIC PALLET LIGHT BLUE'),
  ('692507','3010110015','5','Hand Palet Truck','PLASTIC PALLET LIGHT BLUE'),
  ('692507','3010110015','6','Hand Palet Truck','PLASTIC PALLET LIGHT BLUE'),
  ('692507','3010110015','7','Hand Palet Truck','PLASTIC PALLET LIGHT BLUE'),
  ('692507','3010110015','8','Hand Palet Truck','PLASTIC PALLET LIGHT BLUE'),
  ('692507','3010110015','9','Hand Palet Truck','PLASTIC PALLET LIGHT BLUE'),
  ('692507','3010110015','10','Hand Palet Truck','PLASTIC PALLET LIGHT BLUE'),
  ('692507','3010304003','1','Stationary Generating Set','KOBELL GENERATOR SET 30KVA'),
  ('692507','3020103002','1','Pick Up','SUZUKI FUTURA ST 150 TAHUN 2005 NO.POL'),
  ('692507','3020104001','1','Sepeda Motor','SUZUKI'),
  ('692507','3030101018','1','Mesin Kompresor',''),
  ('692507','3040104004','1','Lemari Penyimpan','elite'),
  ('692507','3040104004','2','Lemari Penyimpan','elite'),
  ('692507','3050104001','1','Lemari Besi/Metal','ELITE'),
  ('692507','3050104001','2','Lemari Besi/Metal','ELITE'),
  ('692507','3050104001','3','Lemari Besi/Metal',''),
  ('692507','3050104001','4','Lemari Besi/Metal',''),
  ('692507','3050104001','5','Lemari Besi/Metal',''),
  ('692507','3050104001','6','Lemari Besi/Metal',''),
  ('692507','3050104001','7','Lemari Besi/Metal',''),
  ('692507','3050104003','1','Rak Besi','LOKAL'),
  ('692507','3050104003','2','Rak Besi','LOKAL'),
  ('692507','3050104003','3','Rak Besi',''),
  ('692507','3050104003','4','Rak Besi',''),
  ('692507','3050104003','5','Rak Besi',''),
  ('692507','3050104005','1','Filing Cabinet Besi','ALBA'),
  ('692507','3050104005','2','Filing Cabinet Besi','UNITAL'),
  ('692507','3050104005','3','Filing Cabinet Besi','MITSUWA'),
  ('692507','3050104005','4','Filing Cabinet Besi','elite'),
  ('692507','3050104007','1','Brandkas','YOUNG FA'),
  ('692507','3050104007','2','Brandkas','chubb safes'),
  ('692507','3050105001','1','Tabung Pemadam Api','APPION AP - 35P'),
  ('692507','3050105001','2','Tabung Pemadam Api',''),
  ('692507','3050105001','3','Tabung Pemadam Api',''),
  ('692507','3050105001','4','Tabung Pemadam Api',''),
  ('692507','3050105001','5','Tabung Pemadam Api',''),
  ('692507','3050105029','1','Hand Metal Detector','Hand Metal Detector Merk Ranger Type M-1500'),
  ('692507','3050105029','2','Hand Metal Detector','Hand Metal Detector Merk Ranger Type M-150000'),
  ('692507','3050105048','1','LCD Projector/Infocus','Proyektor InFocus P109'),
  ('692507','3050201002','1','Meja Kerja Kayu','LOKAL'),
  ('692507','3050201002','2','Meja Kerja Kayu','LOKAL'),
  ('692507','3050201002','3','Meja Kerja Kayu','LOKAL'),
  ('692507','3050201002','4','Meja Kerja Kayu','LOKAL'),
  ('692507','3050201002','5','Meja Kerja Kayu','LOKAL'),
  ('692507','3050201002','6','Meja Kerja Kayu','LOKAL'),
  ('692507','3050201002','7','Meja Kerja Kayu','LOKAL'),
  ('692507','3050201002','8','Meja Kerja Kayu','LOKAL'),
  ('692507','3050201002','9','Meja Kerja Kayu','LOKAL'),
  ('692507','3050201002','10','Meja Kerja Kayu','LOKAL'),
  ('692507','3050201002','11','Meja Kerja Kayu','1 biro'),
  ('692507','3050201002','12','Meja Kerja Kayu','1/2 biro'),
  ('692507','3050201002','13','Meja Kerja Kayu','1/2 biro'),
  ('692507','3050201002','14','Meja Kerja Kayu','1/2 biro'),
  ('692507','3050201002','15','Meja Kerja Kayu','1/2 biro'),
  ('692507','3050201002','16','Meja Kerja Kayu','1/2 biro'),
  ('692507','3050201003','1','Kursi Besi/Metal','Kursi Kantor Hadap Hitam'),
  ('692507','3050201003','2','Kursi Besi/Metal','Kursi Kantor Hadap Hitam'),
  ('692507','3050201003','3','Kursi Besi/Metal','Kursi Kantor Hadap Hitam'),
  ('692507','3050201003','4','Kursi Besi/Metal','Kursi Kantor Hadap Hitam'),
  ('692507','3050201003','5','Kursi Besi/Metal','Kursi Kantor Hadap Hitam'),
  ('692507','3050201003','6','Kursi Besi/Metal','Kursi Kantor Hadap Hitam'),
  ('692507','3050201003','7','Kursi Besi/Metal','Kursi Kantor Hadap Hitam'),
  ('692507','3050201003','8','Kursi Besi/Metal','Kursi Kantor Hadap Hitam'),
  ('692507','3050201003','9','Kursi Besi/Metal','Kursi Kantor Hadap Hitam'),
  ('692507','3050201003','10','Kursi Besi/Metal','Kursi Kantor Hadap Hitam'),
  ('692507','3050201003','11','Kursi Besi/Metal','Kursi Kantor Hadap Hitam'),
  ('692507','3050201003','12','Kursi Besi/Metal','Kursi Kantor Hadap Hitam'),
  ('692507','3050201003','13','Kursi Besi/Metal','Kursi Kantor Hadap Hitam'),
  ('692507','3050201003','14','Kursi Besi/Metal','Kursi Kantor Hadap Hitam'),
  ('692507','3050201003','15','Kursi Besi/Metal','Kursi Kantor Hadap Hitam'),
  ('692507','3050201003','16','Kursi Besi/Metal','Kursi Kantor Hadap Hitam'),
  ('692507','3050201003','17','Kursi Besi/Metal','Kursi Kantor Hadap Hitam'),
  ('692507','3050201003','18','Kursi Besi/Metal','Kursi Kantor Hadap Hitam'),
  ('692507','3050201003','19','Kursi Besi/Metal','Kursi Kantor Hadap Hitam'),
  ('692507','3050201003','20','Kursi Besi/Metal','Kursi Kantor Hadap Hitam'),
  ('692507','3050201003','21','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','22','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','23','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','24','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','25','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','26','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','27','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','28','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','29','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','30','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','31','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','32','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','33','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','34','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','35','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','36','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','37','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','38','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','39','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','40','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','41','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','42','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','43','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','44','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','45','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','46','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','47','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','48','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','49','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','50','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','51','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','52','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','53','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','54','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','55','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','56','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','57','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','58','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','59','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','60','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','61','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','62','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','63','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','64','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','65','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','66','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','67','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','68','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','69','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','70','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','71','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','72','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','73','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','74','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','75','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','76','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','77','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','78','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','79','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','80','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','81','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','82','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','83','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','84','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','85','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','86','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','87','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','88','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','89','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','90','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','91','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','92','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','93','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','94','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','95','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','96','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','97','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','98','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','99','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','100','Kursi Besi/Metal','Kursi Besi Futura Biru'),
  ('692507','3050201003','110','Kursi Besi/Metal','Kursi Besi / Metal'),
  ('692507','3050201003','111','Kursi Besi/Metal','Kursi Besi / Metal'),
  ('692507','3050201003','112','Kursi Besi/Metal','Kursi Besi / Metal'),
  ('692507','3050201003','113','Kursi Besi/Metal','Kursi Besi / Metal'),
  ('692507','3050201003','114','Kursi Besi/Metal','Kursi Besi / Metal'),
  ('692507','3050201009','1','Meja Komputer',''),
  ('692507','3050201009','2','Meja Komputer','INOVA'),
  ('692507','3050201009','3','Meja Komputer','Meja dan Kursi Komputer Informa'),
  ('692507','3050201009','4','Meja Komputer','Meja dan Kursi Komputer Informa'),
  ('692507','3050201009','5','Meja Komputer','Meja dan Kursi Komputer Informa'),
  ('692507','3050204004','1','A.C. Split','LG'),
  ('692507','3050204004','2','A.C. Split','DAIKIN 1 PK'),
  ('692507','3050204004','3','A.C. Split','DAIKIN 1 PK'),
  ('692507','3050204004','5','A.C. Split','Panasonic'),
  ('692507','3050204004','6','A.C. Split','Panasonic'),
  ('692507','3050206008','1','Sound System','Black Spider'),
  ('692507','3050206017','1','Unit Power Supply','Star SVC-1.5KVA'),
  ('692507','3050206017','2','Unit Power Supply','Pascal PL850/PL285'),
  ('692507','3050206017','3','Unit Power Supply','Pascal PL850/PL285'),
  ('692507','3050206017','4','Unit Power Supply','APC Tipe 800VA BV800I-GR'),
  ('692507','3050206017','5','Unit Power Supply','APC Tipe 800VA BV800I-GR'),
  ('692507','3050206026','1','Lambang Garuda Pancasila','LOKAL'),
  ('692507','3050206030','1','Tiang Bendera','LOKAL'),
  ('692507','3050299999','1','Alat Rumah Tangga Lainnya','LOKAL'),
  ('692507','3060102003','1','Camera Electronic','CANON'),
  ('692507','3060102128','1','Camera Digital','Kamera SLR CANON EOS 3000D'),
  ('692507','3060201006','1','Handy Talky (HT)','Handy Talky Motorolla MOTOTRBO Xir C2660 350-400 MFKP Series Portable Radio'),
  ('692507','3060201006','2','Handy Talky (HT)','Handy Talky Motorolla MOTOTRBO Xir C2660 350-400 MFKP Series Portable Radio'),
  ('692507','3060201006','3','Handy Talky (HT)','Handy Talky Motorolla MOTOTRBO Xir C2660 350-400 MFKP Series Portable Radio'),
  ('692507','3060201006','4','Handy Talky (HT)','Handy Talky Motorolla MOTOTRBO Xir C2660 350-400 MFKP Series Portable Radio'),
  ('692507','3060201006','5','Handy Talky (HT)','Handy Talky HYTERA PoC PNC380'),
  ('692507','3060201006','6','Handy Talky (HT)','Handy Talky HYTERA PoC PNC380'),
  ('692507','3060201006','7','Handy Talky (HT)','Handy Talky HYTERA PoC PNC380'),
  ('692507','3060208031','1','Alat Rx Radio UHF','RIG'),
  ('692507','3070101127','1','Kursi Dorong','new star'),
  ('692507','3100102001','1','P.C Unit','PC All In One MSI Pro AP242 ID'),
  ('692507','3100102001','2','P.C Unit','PC All In One MSI Pro AP242 ID'),
  ('692507','3100102001','3','P.C Unit','LENOVO'),
  ('692507','3100102001','4','P.C Unit','HP ProDesk 600 G3 SFF'),
  ('692507','3100102001','5','P.C Unit','DELL I5-7500T 4 GB 2400 MHz DDR4'),
  ('692507','3100102001','6','P.C Unit','DELL I5-7500T 4 GB 2400 MHz DDR4'),
  ('692507','3100102001','7','P.C Unit','DELL I5-7500T 4 GB 2400 MHz DDR4'),
  ('692507','3100102001','8','P.C Unit','Asus Tipe PCD340MC-i38100023T'),
  ('692507','3100102001','9','P.C Unit','Asus Tipe PCD340MC-i38100023T'),
  ('692507','3100102001','10','P.C Unit','Asus Vivo AiO 22 Core Intel-i51135G7'),
  ('692507','3100102001','11','P.C Unit','Asus Vivo AiO 22 Core Intel-i51135G7'),
  ('692507','3100102001','12','P.C Unit','Axioo MyPC One Pro K5 (8N5)'),
  ('692507','3100102001','13','P.C Unit','MERK HP'),
  ('692507','3100102002','1','Lap Top','Laptop Acer Travelmate P214 Core-i7'),
  ('692507','3100102002','2','Lap Top','Laptop Acer Travelmate P214 Core-i7'),
  ('692507','3100102002','3','Lap Top','Lenovo Notebook K14'),
  ('692507','3100102002','4','Lap Top','HP'),
  ('692507','3100102002','5','Lap Top','HP 348 G4, core i5 dan HDD 256SSD'),
  ('692507','3100102002','6','Lap Top','HP 348 G4, core i5 dan HDD 256SSD'),
  ('692507','3100102002','7','Lap Top','Laptop ASUS P1440FA-FQ1572T + Office Pro + Endpoin'),
  ('692507','3100102002','8','Lap Top','ASUS M415D AMD RYZEN 3'),
  ('692507','3100102002','9','Lap Top','ASUS M415D AMD RYZEN 3'),
  ('692507','3100102002','10','Lap Top','ACER TRAVELMATE P214'),
  ('692507','3100102002','11','Lap Top','ACER TRAVELMATE P214'),
  ('692507','3100102002','12','Lap Top','ACER TRAVELMATE P214'),
  ('692507','3100102009','1','Tablet PC','Apple iPad Pro M4 - 11 inch'),
  ('692507','3100202010','1','Scanner (Peralatan Mini Komputer)','Scanner Barcode Wireless Postronik 2D SCANPRO'),
  ('692507','3100202010','2','Scanner (Peralatan Mini Komputer)','Scanner Barcode Wireless Postronik 2D SCANPRO'),
  ('692507','3100203002','1','Monitor','Monitor Server Tower Asus LED VS207 DF'),
  ('692507','3100203003','1','Printer (Peralatan Personal Komputer)','CANON PIXMA 1980'),
  ('692507','3100203003','2','Printer (Peralatan Personal Komputer)',''),
  ('692507','3100203003','3','Printer (Peralatan Personal Komputer)','Printer CANON PIXMA [G2000]'),
  ('692507','3100203003','4','Printer (Peralatan Personal Komputer)','Printer CANON PIXMA [G2000]'),
  ('692507','3100203003','5','Printer (Peralatan Personal Komputer)','Printer CANON PIXMA [G2000]'),
  ('692507','3100203003','6','Printer (Peralatan Personal Komputer)','Printer All in One Canon G2010'),
  ('692507','3100203003','7','Printer (Peralatan Personal Komputer)','Printer All in One Canon G2010'),
  ('692507','3100203003','8','Printer (Peralatan Personal Komputer)','Printer All in One Canon G2010'),
  ('692507','3100203003','10','Printer (Peralatan Personal Komputer)','HP Desk Jet Ink Advantage 2766 Print-Copy-Scan'),
  ('692507','3100203003','11','Printer (Peralatan Personal Komputer)','HP Desk Jet Ink Advantage 2766 Print-Copy-Scan'),
  ('692507','3100203004','1','Scanner (Peralatan Personal Komputer)','Canon Image Formula DR-F120'),
  ('692507','3100203999','1','Peralatan Personal Komputer Lainnya','Emerson Liebert itON [PSA 1000-BX]'),
  ('692507','3100204001','1','Server','Lenovo Tower Xeon bronze  8C 1,7 Ghz 11 MB L3 Cac'),
  ('692507','3100204002','1','Router','Wireless-N Router TP-LINK TL-WR 841HP'),
  ('692507','3100204021','1','Kabel UTP','Kabel UTP Optronics Cat6'),
  ('692507','3100204024','1','Switch','Switch Hub TP-LINK Tipe TL-SG 1008PE'),
  ('692507','3100204024','2','Switch','Switch Hub TP-LINK Tipe TL-SG 1008PE'),
  ('692507','3100204024','3','Switch','Switch Hub TP-LINK Tipe TL-SG 1008PE'),
  ('692507','4010101001','1','Bangunan Gedung Kantor Permanen',''),
  ('692507','4010102001','1','Bangunan Gudang Tertutup Permanen',''),
  ('692507','4010201007','1','Rumah Negara Golongan I Tipe C Permanen',''),
  ('692507','4010201007','2','Rumah Negara Golongan I Tipe C Permanen',''),
  ('692507','4010201007','3','Rumah Negara Golongan I Tipe C Permanen',''),
  ('692507','4010201007','4','Rumah Negara Golongan I Tipe C Permanen',''),
  ('692507','4040104001','1','Pagar Permanen','')
on conflict (satker_code, kode_barang, nup) do nothing;
