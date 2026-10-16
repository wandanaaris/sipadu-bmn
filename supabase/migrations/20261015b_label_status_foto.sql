-- =====================================================================
-- Label Barcode BMN — status dua (selesai/belum), aturan sumber PSP 2026,
-- serta kolom kondisi real + foto bukti.
-- Revisi atas 20261015_bmn_label_pemasangan.sql.
-- =====================================================================

-- ── 1. Aturan sumber aset ───────────────────────────────────────────
-- PSP kosong = transfer dari Kanwil Kemenkum, KECUALI aset perolehan 2026
-- (Orbitrend / Kursi Futura) yang merupakan pengadaan sendiri Kanwil.
create or replace function public.bmn_label_sumber_psp(
  p_psp text,
  p_merk text default null,
  p_tahun text default null
)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when coalesce(btrim(p_psp), '') = '' then
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
$$;
revoke all on function public.bmn_label_sumber_psp(text, text, text) from public;
grant execute on function public.bmn_label_sumber_psp(text, text, text) to authenticated;

-- ── 2. Kolom baru: kondisi real + foto bukti ────────────────────────
alter table public.bmn_label_pemasangan add column if not exists kondisi_real text;
alter table public.bmn_label_pemasangan add column if not exists foto_url text;
alter table public.bmn_label_pemasangan add column if not exists foto_ukuran bigint;

create index if not exists bmn_label_pemasangan_foto_idx
  on public.bmn_label_pemasangan (satker_code) where foto_url is not null;
