export type BmnSatker = { kode?: string; nama?: string; code?: string; name?: string; jumlah: number; nilai: number }
export type BmnJenis = { jenis: string; jumlah: number; nilai: number }

export type BmnOverview = {
  snapshotDate: string
  sourceFile: string
  totalAset: number
  totalNilai: number
  tanpaPsp: number
  jumlahSatker: number
  jumlahJenis: number
  perSatker: BmnSatker[]
  perJenis: BmnJenis[]
}

export type BmnSatkerDetail = {
  snapshotDate: string
  satkerCode: string
  baris: Array<{ jenis_bmn: string; jumlah: number; nilai_perolehan: number }>
}

async function supabaseClient() {
  const { supabase } = await import('./supabase')
  return supabase
}

/**
 * Data Master Aset dibaca dari tabel bmn_assets di database.
 * Semula memakai API lokal (/api/local/bmn-assets) yang hanya ada di dev server —
 * di produksi Vercel melayani index.html sehingga JSON gagal dibaca.
 */
export async function loadBmnOverview(): Promise<BmnOverview | null> {
  const supabase = await supabaseClient()
  if (!supabase) return null
  try {
    const { data, error } = await supabase.rpc('get_bmn_rekap_wilayah')
    if (error) throw new Error(error.message)
    const baris = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null
    if (!baris) return null
    return {
      snapshotDate: String(baris.snapshot_date ?? ''),
      sourceFile: String(baris.source_file ?? ''),
      totalAset: Number(baris.total_aset ?? 0),
      totalNilai: Number(baris.total_nilai ?? 0),
      tanpaPsp: Number(baris.tanpa_psp ?? 0),
      jumlahSatker: Number(baris.jumlah_satker ?? 0),
      jumlahJenis: Number(baris.jumlah_jenis ?? 0),
      perSatker: ((baris.per_satker ?? []) as Array<Record<string, unknown>>).map(r => ({
        kode: String(r.kode ?? ''), nama: String(r.nama ?? ''),
        jumlah: Number(r.jumlah ?? 0), nilai: Number(r.nilai ?? 0),
      })),
      perJenis: ((baris.per_jenis ?? []) as Array<Record<string, unknown>>).map(j => ({
        jenis: String(j.jenis ?? ''), jumlah: Number(j.jumlah ?? 0), nilai: Number(j.nilai ?? 0),
      })),
    }
  } catch {
    return null
  }
}

export async function loadBmnSatkerDetail(code: string): Promise<BmnSatkerDetail | null> {
  const supabase = await supabaseClient()
  if (!supabase) return null
  try {
    const { data, error } = await supabase.rpc('get_bmn_rekap_jenis', { p_satker: code })
    if (error) throw new Error(error.message)
    const daftar = Array.isArray(data) ? (data as Array<Record<string, unknown>>) : []
    let snapshot = ''
    try {
      const { data: rekap } = await supabase.rpc('get_bmn_rekap_wilayah')
      if (Array.isArray(rekap)) snapshot = String(rekap[0]?.snapshot_date ?? '')
    } catch { /* tanggal bersifat informatif */ }
    return {
      snapshotDate: snapshot,
      satkerCode: code,
      baris: daftar.map(r => ({
        jenis_bmn: String(r.jenis ?? ''),
        jumlah: Number(r.jumlah ?? 0),
        nilai_perolehan: Number(r.nilai ?? 0),
      })),
    }
  } catch {
    return null
  }
}
