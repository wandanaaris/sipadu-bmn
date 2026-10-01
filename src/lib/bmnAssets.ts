export type BmnSatker = { code: string; name: string; jumlah: number; nilai: number }
export type BmnJenis = { jenis: string; jumlah: number; nilai: number }

export type BmnOverview = {
  snapshotDate: string
  importedAt: string
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

const api = '/api/local/bmn-assets'

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error || fallback)
  }
  return (await response.json()) as T
}

/**
 * Data Master Aset hanya ada di database lokal (.local-data/bmn-assets.sqlite).
 * Di produksi nanti diganti pembacaan tabel Supabase; bentuk datanya sama.
 */
export async function loadBmnOverview(): Promise<BmnOverview | null> {
  const response = await fetch(api, undefined)
  if (response.status === 404) return null
  return readJson<BmnOverview>(response, 'Data Master Aset belum dapat dimuat.')
}

export async function loadBmnSatkerDetail(code: string): Promise<BmnSatkerDetail | null> {
  const response = await fetch(`${api}/satker/${encodeURIComponent(code)}`, undefined)
  if (response.status === 404) return null
  return readJson<BmnSatkerDetail>(response, 'Rincian aset satker belum dapat dimuat.')
}
