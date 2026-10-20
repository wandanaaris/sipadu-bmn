// Rekap aset rusak berat yang dibaca LANGSUNG dari master aset (bmn_aktif)
// di database — bukan sumber hardcoded — supaya selalu mengikuti data terbaru.
export type RusakBeratRekap = {
  satker_code: string
  nama: string
  a: number
  b: number
  c: number
  total: number
  nilai_a: number
  nilai_b: number
  nilai_c: number
  nilai: number
}

let cache: RusakBeratRekap[] | null | undefined

export async function loadRusakBeratDb(force = false): Promise<RusakBeratRekap[] | null> {
  if (!force && cache !== undefined) return cache
  const { supabase } = await import('./supabase')
  if (!supabase) return (cache = null)
  const { data, error } = await supabase.rpc('get_bmn_rusak_rekap_semua')
  if (error) return (cache = null)
  cache = ((data ?? []) as Array<Record<string, unknown>>).map(d => ({
    satker_code: String(d.satker_code ?? ''),
    nama: String(d.nama ?? ''),
    a: Number(d.a ?? 0),
    b: Number(d.b ?? 0),
    c: Number(d.c ?? 0),
    total: Number(d.total ?? 0),
    nilai_a: Number(d.nilai_a ?? 0),
    nilai_b: Number(d.nilai_b ?? 0),
    nilai_c: Number(d.nilai_c ?? 0),
    nilai: Number(d.nilai ?? 0),
  }))
  return cache
}
