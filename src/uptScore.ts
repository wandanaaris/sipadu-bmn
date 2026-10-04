// Skor UPT — satu sumber kebenaran untuk kartu Monitoring Satker dan menu Kinerja UPT.
// Dihitung di database lewat RPC get_upt_scores, jadi tidak bisa berbeda antar tampilan.
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

export type UptScore = {
  satker: string
  nama: string
  /** Skor akhir = 60% Kinerja Pekerjaan + 40% Kondisi Aset. */
  score: number
  /** Skor Kinerja Pekerjaan (0-100). */
  skorKinerja: number
  /** Skor Kondisi Aset (0-100). */
  skorKondisi: number
  // rincian Kinerja Pekerjaan
  penyelesaian: number
  ketepatan: number
  dorongan: number
  kualitas: number
  total: number
  selesai: number
  tepat: number
  bisa_nilai: number
  revisi: number
  berjalan: number
  // rincian Kondisi Aset
  kelengkapan: number
  rb_total: number
  rb_sisa: number
  rb_terhapus: number
  rb_a: number
  rb_b: number
  rb_c: number
  /** Sisa rusak berat per kategori setelah dikurangi yang sudah dihapus. */
  sisa_a: number
  sisa_b: number
  sisa_c: number
  belum_psp: number
  /** Aset yang alamat atau lokasinya belum diisi. */
  tanpa_lokasi: number
  /** Rincian lima penyusun Kelengkapan Data. -1 berarti tidak berlaku. */
  p_merk: number
  p_penghuni: number
  p_pengguna: number
  p_foto: number
  p_lokasi: number
  skor_rb: number
  skor_psp: number
  total_aset: number
  nilai_selesai: number
  /** Pencapaian lelang BMN (SK penghapusan karena penjualan). */
  lelang_sk: number
  lelang_barang: number
  lelang_nilai: number
  lelang_jual: number
  /** Rata-rata rasio penghapusan barang rusak berat per kategori A/B/C. */
  capaian_penghapusan: number
  /** Capaian pelepasan aset — basis nilai perolehan (Rp 1 miliar = 100). */
  capaian_pelepasan: number
  /** Jumlah item pemanfaatan (sewa atau pinjam pakai) yang tercatat. Tidak masuk skor. */
  pemanfaatan_item: number
  /** Dari jumlah item tersebut, berapa yang sudah punya SK Penetapan. */
  pemanfaatan_sk: number
}

/** Tingkat lencana pemanfaatan: 0 item 0, 1 item 1, 3 item 2, 5 item atau lebih 3. */
export function tingkatLencanaPemanfaatan(item: number): 0 | 1 | 2 | 3 {
  if (item >= 5) return 3
  if (item >= 3) return 2
  if (item >= 1) return 1
  return 0
}

// Cache modul supaya kedua halaman tidak memanggil RPC dua kali.
let cache: Map<string, UptScore> | null = null
let sedangMemuat: Promise<Map<string, UptScore>> | null = null

async function ambilSkor(): Promise<Map<string, UptScore>> {
  if (cache) return cache
  if (sedangMemuat) return sedangMemuat
  sedangMemuat = (async () => {
    try {
      if (!supabase) { cache = new Map(); return cache }
      const { data, error } = await supabase.rpc('get_upt_scores')
      if (error) throw new Error(error.message)
      const baris = (Array.isArray(data) ? data : []) as UptScore[]
      cache = new Map(baris.map(b => [b.satker, b]))
    } catch {
      cache = new Map()
    }
    return cache
  })()
  return sedangMemuat
}

export function useUptScores(): Map<string, UptScore> {
  const [skor, setSkor] = useState<Map<string, UptScore>>(cache ?? new Map())
  useEffect(() => {
    let hidup = true
    void ambilSkor().then(m => { if (hidup) setSkor(m) })
    return () => { hidup = false }
  }, [])
  return skor
}

/** Skor UPT sebuah Satker; 0 bila Satker tidak ada data. */
export function skorUpt(skor: Map<string, UptScore>, kode: string): UptScore | undefined {
  return skor.get(kode)
}

/** Rincian lima penyusun Kelengkapan Data sebagai teks ringkas. */
export function rincianKelengkapan(s: UptScore): string {
  const bagian = [
    `merk/tipe ${s.p_merk}%`,
    s.p_penghuni >= 0 ? `penghuni ${s.p_penghuni}%` : '',
    s.p_pengguna >= 0 ? `pengguna ${s.p_pengguna}%` : '',
    `foto ${s.p_foto}%`,
    `lokasi ${s.p_lokasi}%`,
  ].filter(Boolean)
  return bagian.join(' · ')
}