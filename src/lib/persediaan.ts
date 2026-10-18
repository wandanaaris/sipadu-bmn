// Data Persediaan Usang & Rusak dibaca dari tabel bmn_persediaan di database.
export type PersediaanBaris = {
  satker_code: string
  satker_nama: string
  kategori: string
  jumlah: number
  nilai: number
  nomor_sk: string
  keterangan: string
}

export async function loadPersediaan(): Promise<PersediaanBaris[] | null> {
  const { supabase } = await import('./supabase')
  if (!supabase) return null
  try {
    const { data, error } = await supabase.rpc('bmn_persediaan_daftar')
    if (error) throw new Error(error.message)
    const daftar = Array.isArray(data) ? (data as Array<Record<string, unknown>>) : []
    return daftar.map(r => ({
      satker_code: String(r.satker_code ?? ''),
      satker_nama: String(r.satker_nama ?? ''),
      kategori: String(r.kategori ?? ''),
      jumlah: Number(r.jumlah ?? 0),
      nilai: Number(r.nilai ?? 0),
      nomor_sk: String(r.nomor_sk ?? ''),
      keterangan: String(r.keterangan ?? ''),
    }))
  } catch {
    return null
  }
}
