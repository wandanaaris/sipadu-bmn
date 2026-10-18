// Data Aset Eks-Rupbasan (tidak di-ASP ke Kejaksaan) dari tabel bmn_rupbasan.
export type RupbasanBaris = {
  sumber: string
  kode_barang: string
  nup: string
  nama_barang: string
  merk: string
  tahun_perolehan: number | null
  nilai_perolehan: number
  kondisi: string
  lokasi: string
  penggunaan: string
}

export async function loadRupbasan(): Promise<RupbasanBaris[] | null> {
  const { supabase } = await import('./supabase')
  if (!supabase) return null
  try {
    const { data, error } = await supabase.rpc('bmn_rupbasan_daftar')
    if (error) throw new Error(error.message)
    const daftar = Array.isArray(data) ? (data as Array<Record<string, unknown>>) : []
    return daftar.map(r => ({
      sumber: String(r.sumber ?? ''),
      kode_barang: String(r.kode_barang ?? ''),
      nup: String(r.nup ?? ''),
      nama_barang: String(r.nama_barang ?? ''),
      merk: String(r.merk ?? ''),
      tahun_perolehan: r.tahun_perolehan ? Number(r.tahun_perolehan) : null,
      nilai_perolehan: Number(r.nilai_perolehan ?? 0),
      kondisi: String(r.kondisi ?? ''),
      lokasi: String(r.lokasi ?? ''),
      penggunaan: String(r.penggunaan ?? ''),
    }))
  } catch {
    return null
  }
}
