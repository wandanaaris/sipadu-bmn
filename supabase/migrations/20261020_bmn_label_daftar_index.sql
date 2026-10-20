-- Percepat RPC bmn_label_daftar & bmn_label_rekap (halaman Label Barcode).
-- Query memakai DISTINCT ON (kode_register) ... ORDER BY kode_register, id
-- di atas view bmn_aktif (snapshot aktif). Tanpa indeks pendukung, Postgres
-- mengurutkan seluruh baris -> melewati statement_timeout (8s untuk authenticated).
-- Indeks komposit ini memberi akses berurutan per satker tanpa sort.
CREATE INDEX IF NOT EXISTS bmn_assets_label_daftar_idx
  ON public.bmn_assets (satker_code, kode_register, id);
