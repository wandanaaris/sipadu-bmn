// Logika halaman Label Barcode BMN — Kanwil Ditjenpas Riau.
// Fungsi di sini murni (tanpa React/Supabase) supaya bisa diuji langsung.

export type BarisLabel = {
  kodeRegister: string
  kodeBarang: string
  nup: string
  namaBarang: string
  merk: string
  /** Merk/tipe apa adanya dari SIMAN, sebelum diisi manual. */
  merkSimpan: string
  /** Merk sudah diisi manual saat pemasangan label. */
  merkTerisi: boolean
  kondisi: string
  /** Kondisi nyata hasil pengamatan di lapangan. */
  kondisiReal: string | null
  /** URL foto (base64 data URL, sudah dikompres ≤ 500 KB). */
  fotoUrl: string | null
  /** Ukuran foto terkompres dalam byte. */
  fotoUkuran: number | null
  statusBmn: string
  noPsp: string
  tahunPerolehan: string
  /** Nilai perolehan aset (Rp, dari SIMAN). */
  nilaiPerolehan: number | null
  /** NUP pada satker asal sebelum transfer (dari file Mapping TK–TM SIMAN). */
  nupLama: string | null
  sumber: string
  lokasiSimpan: string
  labelTercetak: boolean
  sudahDitempel: boolean
  tanggalTempel: string | null
  petugas: string | null
  sudahDiscan: boolean
  ruangBaru: string | null
  keterangan: string | null
}

export type RekapSumber = {
  sumber: string
  total: number
  selesai: number
  labelTercetak: number
  berlokasi: number
  merkKosong: number
  kondisiTerisi: number
  fotoAda: number
}

/** Urutan sumber: transfer Kemenkum dulu (paling banyak belum dikerjakan). */
export const URUTAN_SUMBER = [
  'Transfer Kanwil Kemenkum',
  'Eks Rupbasan Rengat',
  'Eks Rupbasan Bangkinang',
  'Eks Rupbasan Bengkalis',
  'PSP lain (Kanwil)',
] as const

/** Label singkat + kelas badge untuk tiap sumber aset. */
export const badgeSumber: Record<string, { label: string; kelas: string }> = {
  'Transfer Kanwil Kemenkum': { label: 'Transfer Kemenkum', kelas: 'asal-kemenkum' },
  'Eks Rupbasan Rengat': { label: 'Eks Rupb. Rengat', kelas: 'asal-rengat' },
  'Eks Rupbasan Bangkinang': { label: 'Eks Rupb. Bangkinang', kelas: 'asal-bangkinang' },
  'Eks Rupbasan Bengkalis': { label: 'Eks Rupb. Bengkalis', kelas: 'asal-bengkalis' },
  'PSP lain (Kanwil)': { label: 'PSP Kanwil', kelas: 'asal-kanwil' },
}

export function badgeUntuk(sumber: string): { label: string; kelas: string } {
  return badgeSumber[sumber] ?? { label: sumber, kelas: 'asal-lain' }
}

/** Sisa pekerjaan = aset yang belum selesai. */
export function sisaPekerjaan(r: RekapSumber): number {
  return r.total - r.selesai
}

/** Persentase selesai (ditempel + discan dianggap satu tahap utuh). */
export function persenSelesai(total: number, selesai: number): number {
  if (total <= 0) return 0
  return Math.min(100, Math.round((selesai / total) * 100))
}

/** Merk belum ada di SIMAN maupun belum diisi saat pemasangan. */
export function merkKosong(b: BarisLabel): boolean {
  return !b.merkTerisi && b.merkSimpan.trim() === ''
}

/** NUP numerik diurut naik; NUP non-numerik (mis. "1A") ditaruh di akhir. */
export function bandingNup(a: string, b: string): number {
  const na = /^\d+$/.test(a), nb = /^\d+$/.test(b)
  if (na && nb) return Number(a) - Number(b)
  if (na) return -1
  if (nb) return 1
  return a.localeCompare(b)
}

export type FilterLabel = {
  sumber?: string
  status?: 'semua' | 'belum' | 'selesai'
  ruang?: string
  cari?: string
}

/** Saring daftar aset menurut sumber, status, ruang, dan kata kunci. */
export function saringBaris(daftar: BarisLabel[], f: FilterLabel): BarisLabel[] {
  const cari = (f.cari ?? '').trim().toLowerCase()
  return daftar.filter(b => {
    if (f.sumber && b.sumber !== f.sumber) return false
    if (f.ruang && (b.ruangBaru ?? '') !== f.ruang) return false
    if (cari) {
      const teks = `${b.kodeBarang} ${b.nup} ${b.namaBarang} ${b.merk} ${b.ruangBaru ?? ''} ${b.keterangan ?? ''}`.toLowerCase()
      if (!teks.includes(cari)) return false
    }
    switch (f.status) {
      case 'belum': return !sudahSelesai(b)
      case 'selesai': return sudahSelesai(b)
      default: return true
    }
  })
}

/** Urutkan: sumber (sesuai URUTAN_SUMBER), lalu kode barang, lalu NUP numerik. */
export function urutkanBaris(daftar: BarisLabel[]): BarisLabel[] {
  return [...daftar].sort((a, b) => {
    const ia = URUTAN_SUMBER.indexOf(a.sumber as (typeof URUTAN_SUMBER)[number])
    const ib = URUTAN_SUMBER.indexOf(b.sumber as (typeof URUTAN_SUMBER)[number])
    const sa = ia === -1 ? URUTAN_SUMBER.length : ia
    const sb = ib === -1 ? URUTAN_SUMBER.length : ib
    if (sa !== sb) return sa - sb
    if (a.kodeBarang !== b.kodeBarang) return a.kodeBarang.localeCompare(b.kodeBarang)
    return bandingNup(a.nup, b.nup)
  })
}

/** NUP bergeser: NUP lama (satker asal) berbeda dari NUP sekarang di Kanwil. */
export function nupBergeser(b: BarisLabel): boolean {
  return b.nupLama !== null && b.nupLama.trim() !== '' && b.nupLama.trim() !== b.nup.trim()
}

/**
 * Penanda khusus aset yang TIDAK perlu dipasang label barcode.
 * - `tanpa-label`  : fisik masih di Rupbasan (akan dihapus / belum dipindah).
 * - `asp-kejaksaan`: akan diserahkan (Alih Status Penggunaan) ke Kejaksaan.
 */
export type PenandaLabel = 'tanpa-label' | 'asp-kejaksaan' | null

/**
 * Aset eks Rupbasan Bengkalis yang penggunaannya oleh Kejaksaan (akan di-ASP,
 * tidak perlu barcode). Sumber: kolom "Penggunaan" pada
 * `Kanwil/ASP Rupbasan/Rupbasan Bengkalis/ANAK SATKER/Aset Rupbasan Bengkalis
 * pembagian.xlsx` (sheet Sheet1) — 28 baris bernilai "Kejaksaan", dicocokkan ke
 * kode_register lewat (kode_barang, NUP) + kode_satker_raw ...692507001KD.
 * Kunci (kode_barang, NUP) saja TIDAK cukup: 28 pasangan itu cocok ke 47 aset.
 */
export const KODE_REGISTER_KEJAKSAAN: ReadonlySet<string> = new Set<string>([
  '07E5D79D6BAC9DABE0631661F20AED77',
  '0E42C07365497551E063BAAAD80A6A15',
  '0E42C073654A7551E063BAAAD80A6A15',
  '0E43C873D2F0538DE063B9AAD80A7079',
  'E0B5C0909F8751B1E0531161F20A35C5',
  'E0B5C0909FA751B1E0531161F20A35C5',
  'E0B5C0909FAC51B1E0531161F20A35C5',
  'E0B5C0909FB351B1E0531161F20A35C5',
  'E0B5C090A9D76EFFE0531161F20A056C',
  'E0B5C090B29951AFE0531161F20A22F1',
  'E0B5C090B29A51AFE0531161F20A22F1',
  'E0B5C090B29B51AFE0531161F20A22F1',
  'E0B5C090B2A051AFE0531161F20A22F1',
  'E0B5C090B2A351AFE0531161F20A22F1',
  'E0B5C090B2C751AFE0531161F20A22F1',
  'E0B5C090B2D151AFE0531161F20A22F1',
  'E0B5C090B2D251AFE0531161F20A22F1',
  'E0B5C090B2D451AFE0531161F20A22F1',
  'E0B5C090B2D551AFE0531161F20A22F1',
  'E0B5C090B2D651AFE0531161F20A22F1',
  'E0B5C090B2E651AFE0531161F20A22F1',
  'E0B5C090B2E751AFE0531161F20A22F1',
  'E0B5C090B2E851AFE0531161F20A22F1',
  'E0B5C090B2ED51AFE0531161F20A22F1',
  'E0B5C090B2EE51AFE0531161F20A22F1',
  'E44DB1D0DA54F0E5E0531661F20A6432',
  'E874850E25DA5D6DE0531661F20A14CE',
  'E874A7EE6490DC34E0531261F20A0308',
])

/** Penanda yang dipakai untuk mewarnai kartu (merah/kuning). */
export function penandaLabel(b: BarisLabel): PenandaLabel {
  if (KODE_REGISTER_KEJAKSAAN.has(b.kodeRegister)) return 'asp-kejaksaan'
  // Bangkinang: fisik masih di Rupbasan dan akan dihapus karena rusak berat.
  if (b.sumber === 'Eks Rupbasan Bangkinang') return 'tanpa-label'
  // Rengat: fisik masih di Rupbasan — kecuali yang sudah dipindahkan ke Kanwil.
  if (b.sumber === 'Eks Rupbasan Rengat' && !fisikDiKanwil(b)) return 'tanpa-label'
  return null
}

/** Judul + alasan penanda, untuk pil dan tooltip di kartu. */
export function keteranganPenanda(p: PenandaLabel): { judul: string; alasan: string } | null {
  if (p === 'tanpa-label') return { judul: 'Tidak perlu label', alasan: 'Fisik masih di Rupbasan (akan dihapus / belum dipindah ke Kanwil).' }
  if (p === 'asp-kejaksaan') return { judul: 'ASP ke Kejaksaan', alasan: 'Penggunaan oleh Kejaksaan — akan dialihkan status penggunaannya, tidak perlu barcode.' }
  return null
}

/** Urutkan hasil pencarian: NUP terkecil lebih dulu, lalu kode barang. */
export function urutkanPencarian(daftar: BarisLabel[]): BarisLabel[] {
  return [...daftar].sort((a, b) => {
    const n = bandingNup(a.nup, b.nup)
    if (n !== 0) return n
    return a.kodeBarang.localeCompare(b.kodeBarang)
  })
}

/** Daftar ruang baru yang sudah dipakai, terurut, tanpa yang kosong. */
export function daftarRuang(daftar: BarisLabel[]): string[] {
  return [...new Set(daftar.map(b => (b.ruangBaru ?? '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

/** Daftar petugas yang sudah pernah dicatat, terurut, tanpa yang kosong. */
export function daftarPetugas(daftar: BarisLabel[]): string[] {
  return [...new Set(daftar.map(b => (b.petugas ?? '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

/** Ubah bentuk baris jsonb (dari RPC bmn_label_daftar) menjadi BarisLabel. */
export function dariJsonb(raw: unknown): BarisLabel {
  const r = (raw ?? {}) as Record<string, unknown>
  const teks = (v: unknown) => (v === null || v === undefined ? '' : String(v))
  return {
    kodeRegister: teks(r.kodeRegister),
    kodeBarang: teks(r.kodeBarang),
    nup: teks(r.nup),
    namaBarang: teks(r.namaBarang),
    merk: teks(r.merk),
    merkSimpan: teks(r.merkSimpan),
    merkTerisi: Boolean(r.merkTerisi),
    kondisi: teks(r.kondisi),
    kondisiReal: r.kondisiReal ? teks(r.kondisiReal) : null,
    fotoUrl: r.fotoUrl ? teks(r.fotoUrl) : null,
    fotoUkuran: r.fotoUkuran === null || r.fotoUkuran === undefined ? null : Number(r.fotoUkuran),
    statusBmn: teks(r.statusBmn),
    noPsp: teks(r.noPsp),
    tahunPerolehan: teks(r.tahunPerolehan),
    nilaiPerolehan: r.nilaiPerolehan === null || r.nilaiPerolehan === undefined ? null : Number(r.nilaiPerolehan),
    nupLama: r.nupLama ? teks(r.nupLama) : null,
    sumber: teks(r.sumber),
    lokasiSimpan: teks(r.lokasiSimpan),
    labelTercetak: Boolean(r.labelTercetak),
    sudahDitempel: Boolean(r.sudahDitempel),
    tanggalTempel: r.tanggalTempel ? teks(r.tanggalTempel) : null,
    petugas: r.petugas ? teks(r.petugas) : null,
    sudahDiscan: Boolean(r.sudahDiscan),
    ruangBaru: r.ruangBaru ? teks(r.ruangBaru) : null,
    keterangan: r.keterangan ? teks(r.keterangan) : null,
  }
}

/** Aset yang fisiknya sudah berada di Kanwil (hasil ASP Rupbasan). */
export function fisikDiKanwil(b: BarisLabel): boolean {
  return (b.keterangan ?? '').trim().startsWith('Fisik sudah di Kanwil')
}

/** Selesai = label sudah ditempel DAN sudah discan. */
export function sudahSelesai(b: BarisLabel): boolean {
  return b.sudahDitempel && b.sudahDiscan
}

/** Kunci stabil untuk satu baris: kode barang / NUP / kode register. */
export function kunciBaris(b: BarisLabel): string {
  return `${b.kodeBarang}/${b.nup}/${b.kodeRegister}`
}
