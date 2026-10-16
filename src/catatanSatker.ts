// Catatan penting per Satker — satu catatan bebas yang diisi Korwil supaya
// permasalahan khas tiap Satker langsung terlihat tanpa harus mencari ulang,
// termasuk saat pimpinan bertanya. Data hidup di tabel satker_catatan.
import { supabase } from './lib/supabase'

export type CatatanSatker = { satker: string; catatan: string; updated_at: string }

/** Semua catatan yang terisi, urut kode Satker. Kosong bila gagal/belum ada. */
export async function muatCatatanSatker(): Promise<CatatanSatker[]> {
  try {
    if (!supabase) return []
    const { data, error } = await supabase.rpc('get_satker_catatan')
    if (error) throw new Error(error.message)
    return Array.isArray(data) ? (data as CatatanSatker[]) : []
  } catch {
    return []
  }
}

/** Simpan (upsert) catatan satu Satker. true bila berhasil. */
export async function simpanCatatanSatker(satker: string, catatan: string): Promise<boolean> {
  try {
    if (!supabase) return false
    const { error } = await supabase.rpc('simpan_satker_catatan', { p_satker: satker, p_catatan: catatan })
    return !error
  } catch {
    return false
  }
}
