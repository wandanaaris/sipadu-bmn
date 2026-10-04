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
  rb_ab: number
  rb_c: number
  belum_psp: number
  skor_rb: number
  skor_psp: number
  total_aset: number
  nilai_selesai: number
  terdaftar_hapus: number
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
