-- RPC pembacaan aset, impor snapshot, dan register
-- Diperbarui: 4 Oktober 2026
--
-- Salinan definisi yang sama dengan yang berjalan di produksi.
-- Fungsi register per-aset yang sudah tidak terpakai tidak disertakan.

-- ──────────────────────────────────────────────────────────────────
-- bmn_aktifkan_snapshot
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bmn_aktifkan_snapshot(p_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_tanggal date;
begin
  select snapshot_date into v_tanggal from public.bmn_snapshots where id = p_id;
  if v_tanggal is null then raise exception 'Snapshot tidak ditemukan.'; end if;

  -- snapshot lama yang masih aktif disimpan sebagai riwayat
  update public.bmn_snapshots set status = 'arsip' where status = 'active';
  update public.bmn_snapshots set status = 'active', aktifkan_at = now() where id = p_id;

  -- semua halaman membaca snapshot aktif saja
  return jsonb_build_object(
    'aktif', p_id,
    'arsip', (select count(*) from public.bmn_snapshots where status = 'arsip')
  );
end $function$;

-- ──────────────────────────────────────────────────────────────────
-- bmn_banding
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bmn_banding(p_baru jsonb)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with baru as (
    select * from jsonb_to_recordset(p_baru) as x(
      kunci text, nama_barang text, kondisi text, no_psp text,
      nilai_perolehan numeric, nilai_buku numeric, satker_code text, jenis_bmn text)
  ), lama as (
    select kunci, nama_barang, kondisi, no_psp, nilai_perolehan, nilai_buku
    from public.bmn_assets
    where snapshot_id = (select id from public.bmn_snapshots where status='active' limit 1)
  )
  select jsonb_build_object(
    'total_baru',   (select count(*) from baru),
    'nilai_baru',   (select coalesce(sum(nilai_perolehan),0)::bigint from baru),
    'satker',       (select count(distinct satker_code) from baru),
    'jenis',        (select count(distinct jenis_bmn) from baru),
    'sama',         (select count(*) from baru b join lama l using (kunci)),
    'aset_baru',    (select count(*) from baru b left join lama l using (kunci) where l.kunci is null),
    'berubah',      (select count(*) from baru b join lama l using (kunci)
                       where b.nama_barang is distinct from l.nama_barang
                          or b.kondisi is distinct from l.kondisi
                          or coalesce(btrim(coalesce(b.no_psp,'')),'') is distinct from coalesce(btrim(coalesce(l.no_psp,'')),'')
                          or b.nilai_perolehan is distinct from l.nilai_perolehan
                          or b.nilai_buku is distinct from l.nilai_buku),
    'nilai_lama',   (select coalesce(sum(nilai_perolehan),0)::bigint from lama),
    'baris_lama',   (select count(*) from lama),
    'hilang',       (select count(*) from lama l left join baru b using (kunci) where b.kunci is null)
  );
$function$;

-- ──────────────────────────────────────────────────────────────────
-- bmn_daftar_snapshot
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bmn_daftar_snapshot()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(jsonb_agg(row_to_json(z) order by z.snapshot_date desc), '[]'::jsonb) from (
    select s.id, s.snapshot_date, s.source_file, s.status, s.total_baris, s.total_nilai,
           s.jumlah_satker, s.jumlah_jenis, s.catatan, s.created_at, s.aktifkan_at,
           extract(epoch from (now() - s.snapshot_date))::int as umur_hari
    from public.bmn_snapshots s) z;
$function$;

-- ──────────────────────────────────────────────────────────────────
-- bmn_hapus_daftar
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bmn_hapus_daftar(p_satker text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(jsonb_agg(row_to_json(z) order by z.kategori), '[]'::jsonb)
  from (select id, satker_code, kategori, jumlah_barang,
               coalesce(nilai_total,0)::bigint as nilai_total,
               nomor_tiket, catatan, tanggal
        from public.bmn_penghapusan_kategori
        where satker_code = p_satker) z;
$function$;

-- ──────────────────────────────────────────────────────────────────
-- bmn_hapus_kosongkan
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bmn_hapus_kosongkan(p_satker text, p_kategori text)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  delete from public.bmn_penghapusan_kategori
  where satker_code = p_satker and kategori = p_kategori returning true;
$function$;

-- ──────────────────────────────────────────────────────────────────
-- bmn_hapus_simpan
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bmn_hapus_simpan(p_satker text, p_kategori text, p_jumlah integer, p_nilai numeric, p_nomor_tiket text DEFAULT NULL::text, p_catatan text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ 
declare
  v_id bigint;
  v_tersedia int;
  v_jumlah int;
begin
  if p_kategori not in ('A','B','C') then
    raise exception 'Kategori harus A, B, atau C.';
  end if;
  v_jumlah := coalesce(p_jumlah, 0);
  if v_jumlah < 0 then raise exception 'Jumlah barang tidak boleh negatif.'; end if;
  if coalesce(p_nilai,0) < 0 then raise exception 'Nilai tidak boleh negatif.'; end if;

  -- Baris yang tersedia per kategori, dikurangi yang sudah tercatat
  select case p_kategori
      when 'A' then count(*) filter (where kondisi='Rusak Berat'
              and upper(coalesce(jenis_bmn,'')) not like '%PERSENJATAAN%'
              and coalesce(nilai_perolehan,0) <= 100000000)
      when 'B' then count(*) filter (where kondisi='Rusak Berat'
              and upper(coalesce(jenis_bmn,'')) not like '%PERSENJATAAN%'
              and coalesce(nilai_perolehan,0) > 100000000)
      else count(*) filter (where kondisi='Rusak Berat'
              and upper(coalesce(jenis_bmn,'')) like '%PERSENJATAAN%')
    end
    - coalesce((select jumlah_barang from public.bmn_penghapusan_kategori
                where satker_code = p_satker and kategori = p_kategori), 0)
    into v_tersedia
  from public.bmn_aktif where satker_code = p_satker;

  if v_jumlah > v_tersedia then
    raise exception 'Kategori %: tercatat % barang, padahal hanya % yang masih dapat dicatat.', p_kategori, v_jumlah, v_tersedia;
  end if;

  insert into public.bmn_penghapusan_kategori (satker_code, kategori, jumlah_barang, nilai_total, nomor_tiket, catatan)
  values (p_satker, p_kategori, v_jumlah, coalesce(p_nilai,0),
          nullif(btrim(p_nomor_tiket),''), nullif(btrim(p_catatan),''))
  on conflict (satker_code, kategori) do update
    set jumlah_barang = excluded.jumlah_barang, nilai_total = excluded.nilai_total,
        nomor_tiket = excluded.nomor_tiket, catatan = excluded.catatan,
        tanggal = current_date, updated_at = now()
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'sisa_kategori', v_tersedia - v_jumlah);
end  $function$;

-- ──────────────────────────────────────────────────────────────────
-- bmn_impor_batch
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bmn_impor_batch(p_snapshot_date date, p_source_file text, p_baris jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id bigint;
  v_total int;
begin
  select id into v_id from public.bmn_snapshots
   where snapshot_date = p_snapshot_date and source_file = p_source_file and status = 'draft'
  order by id desc limit 1;

  if v_id is null then
    insert into public.bmn_snapshots (snapshot_date, source_file, status, catatan)
    values (p_snapshot_date, p_source_file, 'draft', 'Diimpor oleh sistem')
    returning id into v_id;
  end if;

  insert into public.bmn_assets (
    snapshot_id, snapshot_date, source_file, kunci,
      satker_code, no, jenis_bmn, kode_satker_raw, nama_satker, kode_barang, nup, nama_barang, status_bmn, merk, tipe, kondisi, umur_aset, intra_extra, henti_guna, status_sbsn, status_bmn_idle, status_kemitraan, bpybds, usulan_barang_hilang, usulan_barang_rb, usul_hapus, hibah_dktp, konsensi_jasa, properti_investasi, jenis_dokumen, no_dokumen, no_bpkp, no_polisi, status_sertifikasi, jenis_sertipikat, no_sertifikat, nama, tanggal_buku_pertama, tanggal_perolehan, tanggal_pengapusan, nilai_perolehan_pertama, nilai_mutasi, nilai_perolehan, nilai_penyusutan, nilai_buku, luas_tanah_seluruhnya, luas_tanah_untuk_bangunan, luas_tanah_sarana_lingkungan, luas_lahan_kosong, luas_bangunan, luas_tapak_bangunan, luas_pemanfaatan, jumlah_lantai, jumlah_foto, status_penggunaan, no_psp, tanggal_psp, alamat, rt_rw, kelurahan, kecamatan, kab_kota, kode_kab_kota, provinsi, kode_provinsi, kode_pos, sbsk, optimalisasi, penghuni, pengguna, kode_kpknl, uraian_kpknl, uraian_kanwil_djkn, nama_kl, nama_e1, nama_korwil, kode_register, lokasi_ruang, jenis_identitas, no_identitas, no_stnk, nama_pengguna, status_pmk
  )
  select v_id, p_snapshot_date, p_source_file, b.kunci,
      b.satker_code,
      b.no,
      b.jenis_bmn,
      b.kode_satker_raw,
      b.nama_satker,
      b.kode_barang,
      b.nup,
      b.nama_barang,
      b.status_bmn,
      b.merk,
      b.tipe,
      b.kondisi,
      b.umur_aset,
      b.intra_extra,
      b.henti_guna,
      b.status_sbsn,
      b.status_bmn_idle,
      b.status_kemitraan,
      b.bpybds,
      b.usulan_barang_hilang,
      b.usulan_barang_rb,
      b.usul_hapus,
      b.hibah_dktp,
      b.konsensi_jasa,
      b.properti_investasi,
      b.jenis_dokumen,
      b.no_dokumen,
      b.no_bpkp,
      b.no_polisi,
      b.status_sertifikasi,
      b.jenis_sertipikat,
      b.no_sertifikat,
      b.nama,
      b.tanggal_buku_pertama,
      b.tanggal_perolehan,
      b.tanggal_pengapusan,
      b.nilai_perolehan_pertama,
      b.nilai_mutasi,
      b.nilai_perolehan,
      b.nilai_penyusutan,
      b.nilai_buku,
      b.luas_tanah_seluruhnya,
      b.luas_tanah_untuk_bangunan,
      b.luas_tanah_sarana_lingkungan,
      b.luas_lahan_kosong,
      b.luas_bangunan,
      b.luas_tapak_bangunan,
      b.luas_pemanfaatan,
      b.jumlah_lantai,
      b.jumlah_foto,
      b.status_penggunaan,
      b.no_psp,
      b.tanggal_psp,
      b.alamat,
      b.rt_rw,
      b.kelurahan,
      b.kecamatan,
      b.kab_kota,
      b.kode_kab_kota,
      b.provinsi,
      b.kode_provinsi,
      b.kode_pos,
      b.sbsk,
      b.optimalisasi,
      b.penghuni,
      b.pengguna,
      b.kode_kpknl,
      b.uraian_kpknl,
      b.uraian_kanwil_djkn,
      b.nama_kl,
      b.nama_e1,
      b.nama_korwil,
      b.kode_register,
      b.lokasi_ruang,
      b.jenis_identitas,
      b.no_identitas,
      b.no_stnk,
      b.nama_pengguna,
      b.status_pmk
  from jsonb_to_recordset(p_baris) as b(
    kunci text,
      satker_code text,
      no bigint,
      jenis_bmn text,
      kode_satker_raw text,
      nama_satker text,
      kode_barang text,
      nup text,
      nama_barang text,
      status_bmn text,
      merk text,
      tipe text,
      kondisi text,
      umur_aset float8,
      intra_extra text,
      henti_guna text,
      status_sbsn text,
      status_bmn_idle text,
      status_kemitraan text,
      bpybds text,
      usulan_barang_hilang text,
      usulan_barang_rb text,
      usul_hapus text,
      hibah_dktp text,
      konsensi_jasa text,
      properti_investasi text,
      jenis_dokumen text,
      no_dokumen text,
      no_bpkp text,
      no_polisi text,
      status_sertifikasi text,
      jenis_sertipikat text,
      no_sertifikat text,
      nama text,
      tanggal_buku_pertama text,
      tanggal_perolehan text,
      tanggal_pengapusan text,
      nilai_perolehan_pertama float8,
      nilai_mutasi float8,
      nilai_perolehan float8,
      nilai_penyusutan float8,
      nilai_buku float8,
      luas_tanah_seluruhnya float8,
      luas_tanah_untuk_bangunan float8,
      luas_tanah_sarana_lingkungan float8,
      luas_lahan_kosong float8,
      luas_bangunan float8,
      luas_tapak_bangunan float8,
      luas_pemanfaatan float8,
      jumlah_lantai float8,
      jumlah_foto float8,
      status_penggunaan text,
      no_psp text,
      tanggal_psp text,
      alamat text,
      rt_rw text,
      kelurahan text,
      kecamatan text,
      kab_kota text,
      kode_kab_kota text,
      provinsi text,
      kode_provinsi text,
      kode_pos text,
      sbsk text,
      optimalisasi text,
      penghuni text,
      pengguna text,
      kode_kpknl text,
      uraian_kpknl text,
      uraian_kanwil_djkn text,
      nama_kl text,
      nama_e1 text,
      nama_korwil text,
      kode_register text,
      lokasi_ruang text,
      jenis_identitas text,
      no_identitas text,
      no_stnk text,
      nama_pengguna text,
      status_pmk text
  );
  get diagnostics v_total = row_count;

  return jsonb_build_object('snapshot_id', v_id, 'ditambahkan', v_total);
end $function$;

-- ──────────────────────────────────────────────────────────────────
-- bmn_lelang_daftar
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bmn_lelang_daftar(p_satker text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(jsonb_agg(row_to_json(z) order by z.tanggal_sk desc nulls last), '[]'::jsonb)
  from (select id, satker_code, nomor_sk, tanggal_sk, jumlah_barang,
               coalesce(nilai_perolehan,0)::bigint as nilai_perolehan,
               coalesce(nilai_limit,0)::bigint as nilai_limit,
               coalesce(nilai_penjualan,0)::bigint as nilai_penjualan,
               dasar, catatan
        from public.bmn_lelang where p_satker is null or satker_code = p_satker) z;
$function$;

-- ──────────────────────────────────────────────────────────────────
-- bmn_lelang_hapus
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bmn_lelang_hapus(p_id bigint)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  delete from public.bmn_lelang where id = p_id returning true;
$function$;

-- ──────────────────────────────────────────────────────────────────
-- bmn_lelang_simpan
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bmn_lelang_simpan(p_satker text, p_nomor_sk text, p_tanggal_sk date, p_jumlah integer, p_nilai_perolehan numeric, p_nilai_limit numeric DEFAULT NULL::numeric, p_nilai_penjualan numeric DEFAULT NULL::numeric, p_dasar text DEFAULT NULL::text, p_catatan text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id bigint;
begin
  if coalesce(btrim(p_nomor_sk),'') = '' then raise exception 'Nomor SK wajib diisi.'; end if;
  if coalesce(p_jumlah,0) < 0 then raise exception 'Jumlah barang tidak boleh negatif.'; end if;

  insert into public.bmn_lelang (satker_code, nomor_sk, tanggal_sk, jumlah_barang,
                                nilai_perolehan, nilai_limit, nilai_penjualan, dasar, catatan)
  values (p_satker, btrim(p_nomor_sk), p_tanggal_sk, coalesce(p_jumlah,0),
          coalesce(p_nilai_perolehan,0), p_nilai_limit, p_nilai_penjualan,
          nullif(btrim(p_dasar),''), nullif(btrim(p_catatan),''))
  on conflict (satker_code, nomor_sk) do update
    set tanggal_sk = excluded.tanggal_sk, jumlah_barang = excluded.jumlah_barang,
        nilai_perolehan = excluded.nilai_perolehan, nilai_limit = excluded.nilai_limit,
        nilai_penjualan = excluded.nilai_penjualan, dasar = excluded.dasar,
        catatan = excluded.catatan, updated_at = now()
  returning id into v_id;
  return jsonb_build_object('id', v_id);
end $function$;

-- ──────────────────────────────────────────────────────────────────
-- bmn_pemanfaatan_daftar
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bmn_pemanfaatan_daftar(p_satker text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(jsonb_agg(row_to_json(z) order by z.tanggal_sk desc nulls last, z.nama_item), '[]'::jsonb)
  from (select id, satker_code, nama_item, jenis, nomor_sk, tanggal_sk, status, catatan
        from public.bmn_pemanfaatan
        where p_satker is null or satker_code = p_satker) z;
$function$;

-- ──────────────────────────────────────────────────────────────────
-- bmn_pemanfaatan_hapus
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bmn_pemanfaatan_hapus(p_id bigint)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  delete from public.bmn_pemanfaatan where id = p_id returning true;
$function$;

-- ──────────────────────────────────────────────────────────────────
-- bmn_pemanfaatan_simpan
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bmn_pemanfaatan_simpan(p_satker text, p_nama_item text, p_jenis text DEFAULT 'Sewa'::text, p_nomor_sk text DEFAULT NULL::text, p_tanggal_sk date DEFAULT NULL::date, p_status text DEFAULT 'diajukan'::text, p_catatan text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_id bigint;
begin
  if coalesce(btrim(p_nama_item),'')='' then raise exception 'Nama item pemanfaatan wajib diisi.'; end if;
  if coalesce(p_jenis,'Sewa') not in ('Sewa','Pinjam Pakai')
    then raise exception 'Jenis pemanfaatan hanya Sewa atau Pinjam Pakai.'; end if;
  if coalesce(p_status,'diajukan') not in ('diajukan','sk_penetapan','selesai')
    then raise exception 'Status pemanfaatan tidak dikenal.'; end if;
  insert into public.bmn_pemanfaatan (satker_code, nama_item, jenis, nomor_sk, tanggal_sk, status, catatan)
  values (p_satker, btrim(p_nama_item), coalesce(p_jenis,'Sewa'),
          nullif(btrim(coalesce(p_nomor_sk,'')),''), p_tanggal_sk,
          coalesce(p_status,'diajukan'), nullif(btrim(coalesce(p_catatan,'')),''))
  on conflict (satker_code, nama_item) do update
    set jenis=excluded.jenis, nomor_sk=excluded.nomor_sk, tanggal_sk=excluded.tanggal_sk,
        status=excluded.status, catatan=excluded.catatan, updated_at=now()
  returning id into v_id;
  return jsonb_build_object('id', v_id);
end $function$;

-- ──────────────────────────────────────────────────────────────────
-- bmn_simpan_snapshot
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bmn_simpan_snapshot(p_snapshot_date date, p_source_file text, p_baris jsonb, p_catatan text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id bigint;
begin
  if p_baris is null or jsonb_array_length(p_baris) = 0 then
    raise exception 'Tidak ada baris untuk disimpan.';
  end if;

  insert into public.bmn_snapshots (snapshot_date, source_file, status, catatan)
  values (p_snapshot_date, p_source_file, 'draft', p_catatan)
  returning id into v_id;

  insert into public.bmn_assets (
    snapshot_id, snapshot_date, source_file, kunci,
      satker_code, no, jenis_bmn, kode_satker_raw, nama_satker, kode_barang, nup, nama_barang, status_bmn, merk, tipe, kondisi, umur_aset, intra_extra, henti_guna, status_sbsn, status_bmn_idle, status_kemitraan, bpybds, usulan_barang_hilang, usulan_barang_rb, usul_hapus, hibah_dktp, konsensi_jasa, properti_investasi, jenis_dokumen, no_dokumen, no_bpkp, no_polisi, status_sertifikasi, jenis_sertipikat, no_sertifikat, nama, tanggal_buku_pertama, tanggal_perolehan, tanggal_pengapusan, nilai_perolehan_pertama, nilai_mutasi, nilai_perolehan, nilai_penyusutan, nilai_buku, luas_tanah_seluruhnya, luas_tanah_untuk_bangunan, luas_tanah_sarana_lingkungan, luas_lahan_kosong, luas_bangunan, luas_tapak_bangunan, luas_pemanfaatan, jumlah_lantai, jumlah_foto, status_penggunaan, no_psp, tanggal_psp, alamat, rt_rw, kelurahan, kecamatan, kab_kota, kode_kab_kota, provinsi, kode_provinsi, kode_pos, sbsk, optimalisasi, penghuni, pengguna, kode_kpknl, uraian_kpknl, uraian_kanwil_djkn, nama_kl, nama_e1, nama_korwil, kode_register, lokasi_ruang, jenis_identitas, no_identitas, no_stnk, nama_pengguna, status_pmk
  )
  select v_id, p_snapshot_date, p_source_file, b.kunci,
      b.satker_code,
      b.no,
      b.jenis_bmn,
      b.kode_satker_raw,
      b.nama_satker,
      b.kode_barang,
      b.nup,
      b.nama_barang,
      b.status_bmn,
      b.merk,
      b.tipe,
      b.kondisi,
      b.umur_aset,
      b.intra_extra,
      b.henti_guna,
      b.status_sbsn,
      b.status_bmn_idle,
      b.status_kemitraan,
      b.bpybds,
      b.usulan_barang_hilang,
      b.usulan_barang_rb,
      b.usul_hapus,
      b.hibah_dktp,
      b.konsensi_jasa,
      b.properti_investasi,
      b.jenis_dokumen,
      b.no_dokumen,
      b.no_bpkp,
      b.no_polisi,
      b.status_sertifikasi,
      b.jenis_sertipikat,
      b.no_sertifikat,
      b.nama,
      b.tanggal_buku_pertama,
      b.tanggal_perolehan,
      b.tanggal_pengapusan,
      b.nilai_perolehan_pertama,
      b.nilai_mutasi,
      b.nilai_perolehan,
      b.nilai_penyusutan,
      b.nilai_buku,
      b.luas_tanah_seluruhnya,
      b.luas_tanah_untuk_bangunan,
      b.luas_tanah_sarana_lingkungan,
      b.luas_lahan_kosong,
      b.luas_bangunan,
      b.luas_tapak_bangunan,
      b.luas_pemanfaatan,
      b.jumlah_lantai,
      b.jumlah_foto,
      b.status_penggunaan,
      b.no_psp,
      b.tanggal_psp,
      b.alamat,
      b.rt_rw,
      b.kelurahan,
      b.kecamatan,
      b.kab_kota,
      b.kode_kab_kota,
      b.provinsi,
      b.kode_provinsi,
      b.kode_pos,
      b.sbsk,
      b.optimalisasi,
      b.penghuni,
      b.pengguna,
      b.kode_kpknl,
      b.uraian_kpknl,
      b.uraian_kanwil_djkn,
      b.nama_kl,
      b.nama_e1,
      b.nama_korwil,
      b.kode_register,
      b.lokasi_ruang,
      b.jenis_identitas,
      b.no_identitas,
      b.no_stnk,
      b.nama_pengguna,
      b.status_pmk
  from jsonb_to_recordset(p_baris) as b(
    kunci text,
      satker_code text,
      no bigint,
      jenis_bmn text,
      kode_satker_raw text,
      nama_satker text,
      kode_barang text,
      nup text,
      nama_barang text,
      status_bmn text,
      merk text,
      tipe text,
      kondisi text,
      umur_aset float8,
      intra_extra text,
      henti_guna text,
      status_sbsn text,
      status_bmn_idle text,
      status_kemitraan text,
      bpybds text,
      usulan_barang_hilang text,
      usulan_barang_rb text,
      usul_hapus text,
      hibah_dktp text,
      konsensi_jasa text,
      properti_investasi text,
      jenis_dokumen text,
      no_dokumen text,
      no_bpkp text,
      no_polisi text,
      status_sertifikasi text,
      jenis_sertipikat text,
      no_sertifikat text,
      nama text,
      tanggal_buku_pertama text,
      tanggal_perolehan text,
      tanggal_pengapusan text,
      nilai_perolehan_pertama float8,
      nilai_mutasi float8,
      nilai_perolehan float8,
      nilai_penyusutan float8,
      nilai_buku float8,
      luas_tanah_seluruhnya float8,
      luas_tanah_untuk_bangunan float8,
      luas_tanah_sarana_lingkungan float8,
      luas_lahan_kosong float8,
      luas_bangunan float8,
      luas_tapak_bangunan float8,
      luas_pemanfaatan float8,
      jumlah_lantai float8,
      jumlah_foto float8,
      status_penggunaan text,
      no_psp text,
      tanggal_psp text,
      alamat text,
      rt_rw text,
      kelurahan text,
      kecamatan text,
      kab_kota text,
      kode_kab_kota text,
      provinsi text,
      kode_provinsi text,
      kode_pos text,
      sbsk text,
      optimalisasi text,
      penghuni text,
      pengguna text,
      kode_kpknl text,
      uraian_kpknl text,
      uraian_kanwil_djkn text,
      nama_kl text,
      nama_e1 text,
      nama_korwil text,
      kode_register text,
      lokasi_ruang text,
      jenis_identitas text,
      no_identitas text,
      no_stnk text,
      nama_pengguna text,
      status_pmk text
  );

  update public.bmn_snapshots s
  set total_baris = (select count(*) from public.bmn_assets where snapshot_id = v_id),
      total_nilai = (select coalesce(sum(nilai_perolehan),0)::bigint from public.bmn_assets where snapshot_id = v_id),
      jumlah_satker = (select count(distinct satker_code) from public.bmn_assets where snapshot_id = v_id),
      jumlah_jenis = (select count(distinct jenis_bmn) from public.bmn_assets where snapshot_id = v_id)
  where s.id = v_id;

  return jsonb_build_object(
    'id', v_id,
    'total', (select total_baris from public.bmn_snapshots where id = v_id));
end $function$;

-- ──────────────────────────────────────────────────────────────────
-- get_bmn_aset_satker
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_bmn_aset_satker(p_satker text, p_jenis text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare result jsonb;
begin
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  into result
  from (
    select no, jenis_bmn, satker_code, nama_satker, kode_barang, nup, nama_barang,
           kondisi, status_bmn, merk, tipe, nilai_perolehan, nilai_buku,
           tanggal_perolehan,
           luas_tanah_seluruhnya, luas_bangunan, luas_tapak_bangunan,
           luas_pemanfaatan, jumlah_lantai,
           no_psp, tanggal_psp, status_sertifikasi, no_sertifikat,
           alamat, rt_rw, kelurahan, kecamatan, kab_kota, provinsi, kode_pos,
           penghuni, pengguna, no_polisi, no_identitas, jenis_identitas
    from public.bmn_aktif
    where satker_code = p_satker
      and (p_jenis is null or jenis_bmn = p_jenis)
    order by jenis_bmn, no
  ) t;
  return result;
end;
$function$;

-- ──────────────────────────────────────────────────────────────────
-- get_bmn_aset_wilayah
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_bmn_aset_wilayah(p_jenis text, p_limit integer DEFAULT 500)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ 
  select jsonb_build_object(
    'jumlah', (select count(*) from public.bmn_aktif where jenis_bmn = p_jenis),
    'nilai', (select coalesce(sum(nilai_perolehan),0)::bigint from public.bmn_aktif where jenis_bmn = p_jenis),
    'satker', (select count(distinct satker_code) from public.bmn_aktif where jenis_bmn = p_jenis),
    'baris', (select coalesce(jsonb_agg(row_to_json(z)), '[]'::jsonb) from (
        select no, jenis_bmn, satker_code, nama_satker, kode_barang, nup, nama_barang,
               kondisi, status_bmn, nilai_perolehan::bigint as nilai_perolehan,
               nilai_buku::bigint as nilai_buku, tanggal_perolehan,
               luas_tanah_seluruhnya, luas_bangunan, luas_tapak_bangunan, luas_pemanfaatan,
               jumlah_lantai, no_psp, tanggal_psp, status_sertifikasi, no_sertifikat,
               alamat, rt_rw, kelurahan, kecamatan, kab_kota, provinsi, kode_pos,
               penghuni, pengguna, merk, tipe, no_polisi, no_identitas
        from public.bmn_aktif where jenis_bmn = p_jenis
        order by nilai_perolehan desc nulls last limit greatest(1, least(coalesce(p_limit,500),2000))) z)
  );
 $function$;

-- ──────────────────────────────────────────────────────────────────
-- get_bmn_perhatian
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_bmn_perhatian(p_satker text, p_jenis text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ 
  select case
    when p_jenis = 'psp' then (
      select coalesce(jsonb_agg(row_to_json(z)), '[]'::jsonb) from (
        select nama_barang, jenis_bmn, kode_barang, nup, kondisi,
               nilai_perolehan::bigint as nilai_perolehan, pengguna, no_psp, alamat
        from public.bmn_aktif
        where satker_code = p_satker and coalesce(btrim(coalesce(no_psp,'')),'') = ''
        order by nilai_perolehan desc nulls last, nama_barang limit 500) z)
    when p_jenis = 'rusak' then (
      select coalesce(jsonb_agg(row_to_json(z)), '[]'::jsonb) from (
        select nama_barang, jenis_bmn, kode_barang, nup, merk, tipe, kondisi,
               nilai_perolehan::bigint as nilai_perolehan, pengguna,
               case
                 when upper(jenis_bmn) like '%PERSENJATAAN%' then 'C'
                 when coalesce(nilai_perolehan,0) > 100000000 then 'B'
                 else 'A' end as kategori
        from public.bmn_aktif
        where satker_code = p_satker and kondisi = 'Rusak Berat'
        order by kategori, nilai_perolehan desc nulls last, nama_barang) z)
    else '[]'::jsonb end;
 $function$;

-- ──────────────────────────────────────────────────────────────────
-- get_bmn_rekap_jenis
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_bmn_rekap_jenis(p_satker text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ 
  select coalesce(jsonb_agg(jsonb_build_object(
           'jenis', jenis_bmn, 'jumlah', n, 'nilai', nilai, 'tanpa_psp', tp, 'luas', luas
         ) order by n desc), '[]'::jsonb)
  from (select jenis_bmn, count(*) as n,
               coalesce(sum(nilai_perolehan),0)::bigint as nilai,
               count(*) filter (where coalesce(btrim(coalesce(no_psp,'')),'')='') as tp,
               coalesce(round(sum(case when jenis_bmn='TANAH' then coalesce(luas_tanah_seluruhnya,0)
                                    else coalesce(luas_bangunan,0) end)),0)::bigint as luas
        from public.bmn_aktif
        where satker_code = p_satker
          and snapshot_id = (select id from public.bmn_snapshots where status='active' limit 1)
        group by jenis_bmn) x;
 $function$;

-- ──────────────────────────────────────────────────────────────────
-- get_bmn_rekap_satker
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_bmn_rekap_satker()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ 
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) from (
    select satker_code,
      count(*) filter (where jenis_bmn='TANAH') as tanah,
      count(*) filter (where jenis_bmn='RUMAH NEGARA') as rumah_negara,
      count(*) filter (where jenis_bmn='BANGUNAN DAN GEDUNG') as gedung,
      count(*) as total_aset,
      count(distinct jenis_bmn) as jumlah_jenis,
      round(sum(nilai_perolehan)::numeric,0)::bigint as total_nilai
    from public.bmn_aktif
    group by satker_code order by satker_code
  ) t;
 $function$;

-- ──────────────────────────────────────────────────────────────────
-- get_bmn_rekap_wilayah
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_bmn_rekap_wilayah()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ 
  select jsonb_build_object(
    'snapshot_date', (select max(snapshot_date) from public.bmn_aktif),
    'source_file', (select max(source_file) from public.bmn_aktif),
    'total_aset', (select count(*) from public.bmn_aktif),
    'total_nilai', (select coalesce(sum(nilai_perolehan),0)::bigint from public.bmn_aktif),
    'jumlah_satker', (select count(distinct satker_code) from public.bmn_aktif),
    'jumlah_jenis', (select count(distinct jenis_bmn) from public.bmn_aktif),
    'tanpa_psp', (select count(*) from public.bmn_aktif where coalesce(btrim(coalesce(no_psp,'')),'')=''),
    'per_jenis', (select coalesce(jsonb_agg(jsonb_build_object(
        'jenis', jenis_bmn, 'jumlah', n, 'nilai', nilai
      ) order by n desc), '[]'::jsonb)
      from (select jenis_bmn, count(*) as n, coalesce(sum(nilai_perolehan),0)::bigint as nilai
            from public.bmn_aktif group by jenis_bmn) x),
    'per_satker', (select coalesce(jsonb_agg(jsonb_build_object(
        'kode', satker_code, 'nama', nama, 'jumlah', n, 'nilai', nilai, 'tanpa_psp', tp
      ) order by nilai desc), '[]'::jsonb)
      from (select satker_code, max(nama_satker) as nama, count(*) as n,
                   coalesce(sum(nilai_perolehan),0)::bigint as nilai,
                   count(*) filter (where coalesce(btrim(coalesce(no_psp,'')),'')='') as tp
            from public.bmn_aktif group by satker_code) y),
    'top_aset', (select coalesce(jsonb_agg(row_to_json(z)), '[]'::jsonb) from (
        select nama_barang, jenis_bmn, satker_code, nama_satker, nilai_perolehan::bigint as nilai
        from public.bmn_aktif where nilai_perolehan is not null
        order by nilai_perolehan desc limit 20) z)
  );
 $function$;

-- ──────────────────────────────────────────────────────────────────
-- get_bmn_rusak_rekap
-- ──────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_bmn_rusak_rekap(p_satker text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ 
  select jsonb_build_object(
    'A', count(*) filter (where upper(jenis_bmn) not like '%PERSENJATAAN%' and coalesce(nilai_perolehan,0) <= 100000000),
    'B', count(*) filter (where upper(jenis_bmn) not like '%PERSENJATAAN%' and coalesce(nilai_perolehan,0) > 100000000),
    'C', count(*) filter (where upper(jenis_bmn) like '%PERSENJATAAN%'),
    'total', count(*),
    'nilai', coalesce(sum(nilai_perolehan),0)::bigint
  ) from public.bmn_aktif where satker_code = p_satker and kondisi = 'Rusak Berat';
 $function$;
