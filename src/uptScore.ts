// Skor UPT — satu sumber kebenaran untuk kartu Monitoring Satker dan menu Kinerja UPT.
// Dihitung di database lewat RPC get_upt_scores, jadi tidak bisa berbeda antar tampilan.
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

export type UptScore = {
  satker: string
  satkerName: string
  totalAssignments: number
  completed: number
  inRevision: number
  pendingVerification: number
  totalRevisions: number
  completionRate: number
  revisionScore: number
  score: number
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
