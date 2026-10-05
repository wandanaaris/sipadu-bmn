-- Skema penilaian dan register aset — SIPADU BMN
-- Diperbarui: 4 Oktober 2026
--
-- Berkas ini berisi definisi objek database yang dibuat atau diubah
-- langsung di database produksi. Jalankan dari awal ke akhir pada
-- database kosong agar perilakunya sama dengan produksi.

-- ══ 1. Tabel register ══

create table if not exists public.bmn_lelang (
  id bigserial primary key,
  satker_code text not null,
  nomor_sk text not null,
  tanggal_sk date,
  dasar text,
  jumlah_barang int not null default 0 check (jumlah_barang >= 0),
  nilai_perolehan numeric not null default 0,
  nilai_limit numeric,
  nilai_penjualan numeric,
  catatan text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (satker_code, nomor_sk)
);

create table if not exists public.bmn_pemanfaatan (
  id bigserial primary key,
  satker_code text not null,
  nama_item text not null,
  jenis text not null default 'Sewa',
  nomor_sk text,
  tanggal_sk date,
  status text not null default 'diajukan',
  catatan text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (satker_code, nama_item)
);

create index if not exists bmn_lelang_satker_idx on public.bmn_lelang(satker_code);
create index if not exists bmn_pemanfaatan_satker_idx on public.bmn_pemanfaatan(satker_code);

alter table public.bmn_lelang enable row level security;
alter table public.bmn_pemanfaatan enable row level security;
grant select, insert, update, delete on public.bmn_lelang to anon, authenticated;
grant select, insert, update, delete on public.bmn_pemanfaatan to anon, authenticated;
grant usage, select on sequence public.bmn_lelang_id_seq to anon, authenticated;
grant usage, select on sequence public.bmn_pemanfaatan_id_seq to anon, authenticated;

-- Jalankan setelah berkas 001 dan 002 bila membuat database dari nol.
