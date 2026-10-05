-- Fungsi penilaian dan pembaca data aset
-- Diperbarui: 4 Oktober 2026

-- Salinan definisi yang sama dengan yang berjalan di produksi.

-- ────────────────────────────────────────────────────────────────────
-- get_kondisi_scores — Skor Kondisi Aset
-- ────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_kondisi_scores()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with a as (
    select satker_code, coalesce(nilai_perolehan,0) as nilai,
      coalesce(btrim(coalesce(no_psp,'')),'')='' as tanpa_psp,
      (kondisi = 'Rusak Berat') as rb,
      (upper(coalesce(jenis_bmn,'')) like '%PERSENJATAAN%') as rb_c,
      (upper(coalesce(jenis_bmn,'')) like 'ALAT%') as alat,
      (upper(coalesce(jenis_bmn,'')) like 'ALAT%'
        and (coalesce(btrim(coalesce(merk,'')),'')='' or coalesce(btrim(coalesce(tipe,'')),'')='')) as alat_bolong,
      (jenis_bmn='RUMAH NEGARA') as rn,
      (jenis_bmn='RUMAH NEGARA' and coalesce(btrim(coalesce(penghuni,'')),'')='') as rn_b,
      (jenis_bmn='ALAT ANGKUTAN BERMOTOR') as kend,
      (jenis_bmn='ALAT ANGKUTAN BERMOTOR' and coalesce(btrim(coalesce(pengguna,'')),'')='') as kend_b,
      (coalesce(jumlah_foto,0) = 0) as tanpa_foto,
      -- Aset tetap quartet memakai kolom alamat; aset lainnya memakai lokasi.
      -- Kolom lokasi_ruang tidak selalu berarti terisi karena isinya dapat
      -- berupa teks "Belum berlokasi".
      (upper(coalesce(jenis_bmn,'')) in ('TANAH','RUMAH NEGARA','BANGUNAN DAN GEDUNG','JALAN DAN JEMBATAN')) as butuh_alamat,
      (coalesce(btrim(coalesce(alamat,'')),'')=''
        and upper(coalesce(jenis_bmn,'')) in ('TANAH','RUMAH NEGARA','BANGUNAN DAN GEDUNG','JALAN DAN JEMBATAN'))
      or (upper(coalesce(jenis_bmn,'')) not in ('TANAH','RUMAH NEGARA','BANGUNAN DAN GEDUNG','JALAN DAN JEMBATAN')
        and lower(coalesce(btrim(coalesce(lokasi_ruang,'')),'')) in ('', 'belum berlokasi')) as tanpa_lokasi
    from public.bmn_aktif
  ),
  d as (
    select satker_code,
      count(*) as total,
      count(*) filter (where tanpa_psp) as belum_psp,
      count(*) filter (where rb) as rb_total,
      count(*) filter (where rb and rb_c) as rb_c,
      count(*) filter (where rb and not rb_c) as rb_ab,
      count(*) filter (where rb and not rb_c and nilai > 100000000) as rb_b,
      count(*) filter (where rb and not rb_c and nilai <= 100000000) as rb_a,
      count(*) filter (where alat) as alat_total,
      count(*) filter (where alat and alat_bolong) as alat_bolong,
      count(*) filter (where rn) as rn_total,
      count(*) filter (where rn and rn_b) as rn_bolong,
      count(*) filter (where kend) as kend_total,
      count(*) filter (where kend and kend_b) as kend_bolong,
      count(*) filter (where tanpa_foto) as tanpa_foto,
      count(*) filter (where tanpa_lokasi) as tanpa_lokasi
    from a group by satker_code
  ),
  h as (
    -- Opsi C: Korwil mencatat per kategori (bukan per barang).
    select satker_code,
      coalesce(sum(jumlah_barang),0)::int as tercatat_barang,
      coalesce(sum(nilai_total),0)::bigint as tercatat_nilai,
      coalesce(max(jumlah_barang) filter (where kategori='A'),0)::int as hapus_a,
      coalesce(max(jumlah_barang) filter (where kategori='B'),0)::int as hapus_b,
      coalesce(max(jumlah_barang) filter (where kategori='C'),0)::int as hapus_c
    from public.bmn_penghapusan_kategori group by satker_code
  ),
  lg as (
    select satker_code,
      count(*) as jumlah_sk,
      coalesce(sum(jumlah_barang),0)::int as lelang_barang,
      coalesce(sum(nilai_perolehan),0)::bigint as lelang_nilai,
      coalesce(sum(nilai_penjualan),0)::bigint as lelang_jual
    from public.bmn_lelang group by satker_code
  ),
  k as (
    select satker_code,
      round(100.0 *
        (( case when alat_total > 0 then (alat_total - alat_bolong)*1.0/alat_total end)
        + ( case when rn_total  > 0 then (rn_total  - rn_bolong )*1.0/rn_total  end)
        + ( case when kend_total > 0 then (kend_total - kend_bolong)*1.0/kend_total end)
        + (total - tanpa_foto)*1.0/total
        + (total - tanpa_lokasi)*1.0/total )
        / ( (case when alat_total > 0 then 1 else 0 end)
          + (case when rn_total  > 0 then 1 else 0 end)
          + (case when kend_total > 0 then 1 else 0 end) + 2 )
      )::int as kelengkapan,
      coalesce(case when alat_total > 0 then round(100.0*(alat_total - alat_bolong)*1.0/alat_total) end, -1) as p_merk,
      coalesce(case when rn_total  > 0 then round(100.0*(rn_total  - rn_bolong )*1.0/rn_total)  end, -1) as p_penghuni,
      coalesce(case when kend_total > 0 then round(100.0*(kend_total - kend_bolong)*1.0/kend_total) end, -1) as p_pengguna,
      round(100.0*(total - tanpa_foto)*1.0/total) as p_foto,
      round(100.0*(total - tanpa_lokasi)*1.0/total) as p_lokasi
    from d
  )
  select coalesce(jsonb_agg(row_to_json(z) order by z.skor_kondisi desc), '[]'::jsonb)
  from (
    select d.satker_code, d.total,
      coalesce(k.kelengkapan,0) as kelengkapan,
      k.p_merk, k.p_penghuni, k.p_pengguna, k.p_foto, k.p_lokasi,
      d.rb_total, d.rb_a as rb_a, d.rb_b as rb_b, d.rb_c,
      greatest(0, d.rb_a - coalesce(h.hapus_a,0)) as sisa_a,
      greatest(0, d.rb_b - coalesce(h.hapus_b,0)) as sisa_b,
      greatest(0, d.rb_c - coalesce(h.hapus_c,0)) as sisa_c,
      greatest(0, d.rb_a - coalesce(h.hapus_a,0))
    + greatest(0, d.rb_b - coalesce(h.hapus_b,0))
    + greatest(0, d.rb_c - coalesce(h.hapus_c,0)) as rb_sisa,
      coalesce(h.tercatat_barang,0) as rb_terhapus,
      coalesce(h.tercatat_nilai,0)::bigint as nilai_selesai,
      d.belum_psp,
      d.tanpa_lokasi,
      coalesce(lg.jumlah_sk,0) as lelang_sk,
      coalesce(lg.lelang_barang,0) as lelang_barang,
      coalesce(lg.lelang_nilai,0)::bigint as lelang_nilai,
      coalesce(lg.lelang_jual,0)::bigint as lelang_jual,
      greatest(0, 100 - round(100.0 *
        ( greatest(0, d.rb_a - coalesce(h.hapus_a,0))
        + greatest(0, d.rb_b - coalesce(h.hapus_b,0))
        + greatest(0, d.rb_c - coalesce(h.hapus_c,0)) )
        / nullif(d.total,0))::int) as skor_rb,
      greatest(0, 100 - round(100.0 * d.belum_psp / nullif(d.total,0))::int) as skor_psp,
      -- Capaian Penghapusan: rata-rata rasio per kategori yang berlaku.
      -- Progres pemusnahan amunisi & non-amunisi TIDAK dihitung di sini
      -- karena sudah masuk Skor Kinerja Pekerjaan (penyelesaian & dorongan).
      case when d.rb_a = 0 and d.rb_b = 0 and d.rb_c = 0 then 100
           else round( (
             coalesce(case when d.rb_a > 0 then 100.0 * least(d.rb_a, coalesce(h.hapus_a,0)) / d.rb_a end, 0)
           + coalesce(case when d.rb_b > 0 then 100.0 * least(d.rb_b, coalesce(h.hapus_b,0)) / d.rb_b end, 0)
           + coalesce(case when d.rb_c > 0 then 100.0 * least(d.rb_c, coalesce(h.hapus_c,0)) / d.rb_c end, 0)
           ) / greatest(1, (case when d.rb_a > 0 then 1 else 0 end)
                          + (case when d.rb_b > 0 then 1 else 0 end)
                          + (case when d.rb_c > 0 then 1 else 0 end)) )::int
      end as capaian_penghapusan,
      -- Capaian Pelepasan: basis nilai perolehan. Setiap Rp 1 miliar = 100 poin.
      least(100, round(coalesce(lg.lelang_nilai,0)::numeric / 10000000)::int) as capaian_pelepasan,
      round(0.30 * coalesce(k.kelengkapan,0)
          + 0.40 * (case when d.rb_a = 0 and d.rb_b = 0 and d.rb_c = 0 then 100
                       else round( (
                         coalesce(case when d.rb_a > 0 then 100.0 * least(d.rb_a, coalesce(h.hapus_a,0)) / d.rb_a end, 0)
                       + coalesce(case when d.rb_b > 0 then 100.0 * least(d.rb_b, coalesce(h.hapus_b,0)) / d.rb_b end, 0)
                       + coalesce(case when d.rb_c > 0 then 100.0 * least(d.rb_c, coalesce(h.hapus_c,0)) / d.rb_c end, 0)
                         ) / greatest(1, (case when d.rb_a > 0 then 1 else 0 end)
                                        + (case when d.rb_b > 0 then 1 else 0 end)
                                        + (case when d.rb_c > 0 then 1 else 0 end)) )::int end)
          + 0.15 * greatest(0, 100 - round(100.0 * d.belum_psp / nullif(d.total,0))::int)
          + 0.15 * least(100, round(coalesce(lg.lelang_nilai,0)::numeric / 10000000)::int))::int as skor_kondisi
    from d left join k on k.satker_code = d.satker_code
           left join h on h.satker_code = d.satker_code
           left join lg on lg.satker_code = d.satker_code) z;
$function$;

-- ────────────────────────────────────────────────────────────────────
-- get_kinerja_scores — Skor Kinerja Pekerjaan
-- ────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_kinerja_scores()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with a as (
    select s.code as satker, s.name as nama, t.is_active, t.due_date, ass.status,
           ass.revision_count, ass.completed_at, ass.progress
    from public.task_assignments ass
    join public.tasks t on t.id = ass.task_id
    join public.satkers s on s.id = ass.satker_id
    where s.is_active and t.is_active
  ),
  per as (
    select satker, any_value(nama) as nama,
      count(*) as total,
      count(*) filter (where status in ('selesai','ditutup')) as selesai,
      count(*) filter (where status in ('selesai','ditutup') and completed_at is not null
           and due_date is not null) as bisa_nilai,
      count(*) filter (where status in ('selesai','ditutup') and completed_at is not null
           and due_date is not null and completed_at::date <= due_date) as tepat,
      coalesce(sum(revision_count),0) as revisi,
      count(*) filter (where status in ('proses','perbaikan')) as berjalan
    from a group by satker
  )
  select coalesce(jsonb_agg(row_to_json(z) order by z.skor_kinerja desc), '[]'::jsonb)
  from (
    select nama, satker,
      coalesce(round(100.0*selesai/nullif(total,0)),0) as penyelesaian,
      case when bisa_nilai = 0 then 100
           else round(100.0*tepat/bisa_nilai) end as ketepatan,
      coalesce(round(100.0*(selesai + 0.3*berjalan)/nullif(total,0)),0) as dorongan,
      greatest(0, 100 - revisi*5) as kualitas,
      round(
        0.45 * coalesce(100.0*selesai/nullif(total,0),0)
      + 0.30 * (case when bisa_nilai = 0 then 100 else 100.0*tepat/bisa_nilai end)
      + 0.15 * coalesce(100.0*(selesai + 0.3*berjalan)/nullif(total,0),0)
      + 0.10 * greatest(0, 100 - revisi*5)
      )::int as skor_kinerja,
      total, selesai, tepat, bisa_nilai, revisi, berjalan
    from per) z;
$function$;

-- ────────────────────────────────────────────────────────────────────
-- get_upt_scores — Skor gabungan UPT
-- ────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_upt_scores()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with k as (
    select * from jsonb_to_recordset(public.get_kinerja_scores()) as x(
      satker text, nama text, penyelesaian int, ketepatan int, dorongan int, kualitas int,
      total int, selesai int, tepat int, bisa_nilai int, revisi int, berjalan int, skor_kinerja int)
  ),
  mf as (
    select satker_code,
      count(*)::int as item,
      count(*) filter (where status <> 'diajukan')::int as sudah_sk
    from public.bmn_pemanfaatan group by satker_code
  ),
  c as (
    select * from jsonb_to_recordset(public.get_kondisi_scores()) as y(
      satker_code text, total int, kelengkapan int, rb_total int, rb_sisa int, rb_ab int, rb_c int,
      rb_a int, rb_b int, sisa_a int, sisa_b int, sisa_c int,
      rb_terhapus int, nilai_selesai bigint, belum_psp int, tanpa_lokasi int,
      p_merk int, p_penghuni int, p_pengguna int, p_foto int, p_lokasi int,
      lelang_sk int, lelang_barang int, lelang_nilai bigint, lelang_jual bigint,
      capaian_penghapusan int, capaian_pelepasan int,
      skor_rb int, skor_psp int, skor_kondisi int)
  )
  select coalesce(jsonb_agg(row_to_json(z) order by z.score desc), '[]'::jsonb)
  from (
    select k.satker, k.nama,
      k.skor_kinerja as "skorKinerja",
      coalesce(c.skor_kondisi, 0) as "skorKondisi",
      round(0.60 * k.skor_kinerja + 0.40 * coalesce(c.skor_kondisi, 0))::int as score,
      k.penyelesaian, k.ketepatan, k.dorongan, k.kualitas,
      k.total, k.selesai, k.tepat, k.bisa_nilai, k.revisi, k.berjalan,
      coalesce(c.kelengkapan, 0) as kelengkapan,
      coalesce(c.rb_total, 0) as rb_total,
      coalesce(c.rb_sisa, 0) as rb_sisa,
      coalesce(c.rb_terhapus, 0) as rb_terhapus,
      coalesce(c.rb_ab, 0) as rb_ab,
      coalesce(c.rb_c, 0) as rb_c,
      coalesce(c.rb_a, 0) as rb_a,
      coalesce(c.rb_b, 0) as rb_b,
      coalesce(c.sisa_a, 0) as sisa_a,
      coalesce(c.sisa_b, 0) as sisa_b,
      coalesce(c.sisa_c, 0) as sisa_c,
      coalesce(c.belum_psp, 0) as belum_psp,
      coalesce(c.lelang_sk, 0) as lelang_sk,
      coalesce(c.lelang_barang, 0) as lelang_barang,
      coalesce(c.lelang_nilai, 0) as lelang_nilai,
      coalesce(c.lelang_jual, 0) as lelang_jual,
      coalesce(c.capaian_penghapusan, 0) as capaian_penghapusan,
      coalesce(c.capaian_pelepasan, 0) as capaian_pelepasan,
      coalesce(c.tanpa_lokasi, 0) as tanpa_lokasi,
      coalesce(c.p_merk, -1) as p_merk,
      coalesce(c.p_penghuni, -1) as p_penghuni,
      coalesce(c.p_pengguna, -1) as p_pengguna,
      coalesce(c.p_foto, 0) as p_foto,
      coalesce(c.p_lokasi, 0) as p_lokasi,
      coalesce(mf.item, 0) as pemanfaatan_item,
      coalesce(mf.sudah_sk, 0) as pemanfaatan_sk,
      coalesce(c.skor_rb, 0) as skor_rb,
      coalesce(c.skor_psp, 0) as skor_psp,
      coalesce(c.total, 0) as total_aset,
      coalesce(c.nilai_selesai, 0) as nilai_selesai
    from k left join c on c.satker_code = k.satker
         left join mf on mf.satker_code = k.satker
  ) z;
$function$;
