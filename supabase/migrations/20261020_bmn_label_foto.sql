-- Perbaikan timeout halaman Label Barcode.
-- Masalah: bmn_label_daftar mengembalikan ~30 MB (foto base64 74 aset) sehingga
-- mendekati/melampaui statement_timeout (8s) -> "canceling statement due to
-- statement timeout". Solusi: RPC daftar TIDAK menanamkan foto; cukup flag
-- adaFoto. Foto diambil terpisah per aset lewat bmn_label_foto saat diklik.

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
    'adaFoto', (p.foto_url is not null),
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

-- Foto satu aset, diambil saat pengguna menekan "Lihat foto".
create or replace function public.bmn_label_foto(p_satker text, p_kode_register text)
returns text
language sql
stable
security definer
set search_path = public
as $fungsi$
  select p.foto_url
  from public.bmn_label_pemasangan p
  where p.satker_code = p_satker
    and p.kode_register = p_kode_register
  limit 1
$fungsi$;

revoke all on function public.bmn_label_daftar(text) from public;
grant execute on function public.bmn_label_daftar(text) to authenticated;
grant execute on function public.bmn_label_foto(text, text) to authenticated, anon;
