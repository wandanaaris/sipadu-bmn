// Membaca file .xlsx hasil export SIMAN menjadi baris aset yang siap diimpor.
// Dipakai oleh halaman "Impor Data Aset" — validasi dan pratinjau dilakukan di sini
// sebelum apa pun dikirim ke database.

export type BarisAsetImport = {
  kunci: string
  no: number | null
  jenis_bmn: string
  satker_code: string
  nama_satker: string
  kode_barang: string | null
  nup: string | null
  nama_barang: string
  status_bmn: string | null
  merk: string | null
  tipe: string | null
  kondisi: string | null
  nilai_perolehan: number | null
  nilai_buku: number | null
  tanggal_perolehan: string | null
  no_psp: string | null
  tanggal_psp: string | null
  pengguna: string | null
  alamat: string | null
  luas_tanah_seluruhnya: number | null
  luas_bangunan: number | null
  /** Seluruh kolom tabel bmn_assets; dipakai penuh saat impor. */
  [kolom: string]: string | number | null | undefined
}

export type HasilBaca = {
  ok: boolean
  baris: BarisAsetImport[]
  snapshotDate: string | null
  namaSheet: string
  kolom: string[]
  /** Dimension yang tertulis di berkas, dan yang dipakai setelah diperbaiki. */
  refAsli?: string
  refDipakai?: string
  /** Daftar kolom wajib yang tidak ditemukan di header. */
  kurangKolom: string[]
  /** Baris yang dibuang, beserta alasannya (maksimal 20 shown). */
  masalah: Array<{ baris: number; alasan: string }>
  jumlahDitolak: number
}

// Header wajib — tanpa ini file dianggap bukan export SIMAN Master Aset.
const KOLOM_WAJIB = [
  'Jenis BMN', 'Kode Barang', 'NUP', 'Nama Barang',
  'Kondisi', 'Nilai Perolehan', 'No PSP', 'Nama Satker',
]

type Sel = string | number | boolean | Date | null | undefined

const teks = (v: Sel): string | null => {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

const angka = (v: Sel): number | null => {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (v instanceof Date) return null

  // Buang mata uang dan spasi, sisakan angka, pemisah, dan tanda minus.
  let s = String(v).replace(/[^\d.,-]/g, '').trim()
  if (!s) return null
  const minus = s.startsWith('-')
  s = s.replace(/-/g, '')

  // Grup ribuan gaya Indonesia: "3.266.200.000" (titik tiap 3 digit)
  const titikRibuan = /(\.\d{3})+$/.test(s)
  // Koma sebagai pemisah ribuan: "3,266,200,000"
  const komaRibuan = /,\d{3}(,\d{3})*$/.test(s) && !/,\d{1,2}$/.test(s)

  let cleaned: string
  if (s.includes(',') && s.includes('.')) {
    // Yang paling kanan adalah tanda desimal, yang lain pemisah ribuan.
    cleaned = s.lastIndexOf(',') > s.lastIndexOf('.')
      ? s.replace(/\./g, '').replace(',', '.')
      : s.replace(/,/g, '')
  } else if (s.includes(',')) {
    cleaned = komaRibuan ? s.replace(/,/g, '') : s.replace(',', '.')
  } else if (s.includes('.')) {
    cleaned = titikRibuan ? s.replace(/\./g, '') : s
  } else {
    cleaned = s
  }

  const n = Number(cleaned)
  if (!Number.isFinite(n)) return null
  return minus ? -n : n
}

const tanggal = (v: Sel): string | null => {
  if (v === null || v === undefined || v === '') return null
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10)
  }
  const s = String(v).trim()
  const m = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  const m2 = s.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`
  return null
}

// Kode Satker disembunyikan di dalam kode registrasi seperti 137040900692307000KD
const kodeDariKodeSatker = (mentah: string | null): string | null => {
  if (!mentah) return null
  const m = mentah.match(/1370409\d{2}(\d{6})/)
  if (m && m[1]) return m[1]
  const m2 = mentah.match(/(\d{6})\d{3}[A-Z]{0,2}$/)
  return m2 && m2[1] ? m2[1] : (mentah.trim() || null)
}

/** Tebakan tanggal snapshot dari nama berkas, mis. "Master aset 30 september 2026.xlsx". */
export function tebakSnapshotDate(namaBerkas: string): string | null {
  const nama = namaBerkas.toLowerCase()
  const bulan: Record<string, string> = {
    januari: '01', februari: '02', maret: '03', april: '04', mei: '05', juni: '06',
    juli: '07', agustus: '08', september: '09', oktober: '10', november: '11', desember: '12',
  }
  for (const [namaBulan, angkaBulan] of Object.entries(bulan)) {
    const re = new RegExp(`(\\d{1,2})\\s*${namaBulan}\\s*(\\d{4})`)
    const m = nama.match(re)
    if (m) return `${m[2]}-${angkaBulan}-${m[1].padStart(2, '0')}`
  }
  const m = nama.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  return null
}

/**
 * Beberapa export SIMAN menuliskan <dimension> yang salah (mis. hanya A1:F1)
 * padahal selnya lengkap. SheetJS memercayai nilai itu, sehingga sheet terbaca
 * kosong. Kita abaikan !ref dari berkas dan hitung sendiri dari sel yang ada.
 */
export function perbaikiRefSheet(ws: Record<string, unknown>, utils: { encode_col: (n: number) => string }): string | null {
  let maksBaris = 0
  let maksKol = -1
  for (const kunci of Object.keys(ws)) {
    const m = /^([A-Z]+)(\d+)$/.exec(kunci)
    if (!m) continue
    let n = 0
    for (const ch of m[1]) n = n * 26 + (ch.charCodeAt(0) - 64)
    const kolom = n - 1
    if (kolom > maksKol) maksKol = kolom
    const baris = Number(m[2])
    if (baris > maksBaris) maksBaris = baris
  }
  if (maksKol < 0 || maksBaris < 1) return null
  const ref = `A1:${utils.encode_col(maksKol)}${maksBaris}`
  ws['!ref'] = ref
  return ref
}

/** Peta lengkap kolom SIMAN -> kolom tabel bmn_assets. */
type TipeKolom = 'teks' | 'angka' | 'tanggal' | 'kode'
export const PETA_KOLOM: Array<{ kolom: string; header: string; tipe: TipeKolom }> = [
  { kolom: 'satker_code', header: 'Kode Satker', tipe: 'kode' },
  { kolom: 'no', header: 'No', tipe: 'angka' },
  { kolom: 'jenis_bmn', header: 'Jenis BMN', tipe: 'teks' },
  { kolom: 'kode_satker_raw', header: 'Kode Satker', tipe: 'teks' },
  { kolom: 'nama_satker', header: 'Nama Satker', tipe: 'teks' },
  { kolom: 'kode_barang', header: 'Kode Barang', tipe: 'teks' },
  { kolom: 'nup', header: 'NUP', tipe: 'teks' },
  { kolom: 'nama_barang', header: 'Nama Barang', tipe: 'teks' },
  { kolom: 'status_bmn', header: 'Status BMN', tipe: 'teks' },
  { kolom: 'merk', header: 'Merk', tipe: 'teks' },
  { kolom: 'tipe', header: 'Tipe', tipe: 'teks' },
  { kolom: 'kondisi', header: 'Kondisi', tipe: 'teks' },
  { kolom: 'umur_aset', header: 'Umur Aset', tipe: 'angka' },
  { kolom: 'intra_extra', header: 'Intra / Extra', tipe: 'teks' },
  { kolom: 'henti_guna', header: 'Henti Guna', tipe: 'teks' },
  { kolom: 'status_sbsn', header: 'Status SBSN', tipe: 'teks' },
  { kolom: 'status_bmn_idle', header: 'Status BMN Idle', tipe: 'teks' },
  { kolom: 'status_kemitraan', header: 'Status Kemitraan', tipe: 'teks' },
  { kolom: 'bpybds', header: 'BPYBDS', tipe: 'teks' },
  { kolom: 'usulan_barang_hilang', header: 'Usulan Barang Hilang', tipe: 'teks' },
  { kolom: 'usulan_barang_rb', header: 'Usulan Barang RB', tipe: 'teks' },
  { kolom: 'usul_hapus', header: 'Usul Hapus', tipe: 'teks' },
  { kolom: 'hibah_dktp', header: 'Hibah DKTP', tipe: 'teks' },
  { kolom: 'konsensi_jasa', header: 'Konsensi Jasa', tipe: 'teks' },
  { kolom: 'properti_investasi', header: 'Properti Investasi', tipe: 'teks' },
  { kolom: 'jenis_dokumen', header: 'Jenis Dokumen', tipe: 'teks' },
  { kolom: 'no_dokumen', header: 'No Dokumen', tipe: 'teks' },
  { kolom: 'no_bpkp', header: 'No BPKP', tipe: 'teks' },
  { kolom: 'no_polisi', header: 'No Polisi', tipe: 'teks' },
  { kolom: 'status_sertifikasi', header: 'Status Sertifikasi', tipe: 'teks' },
  { kolom: 'jenis_sertipikat', header: 'Jenis Sertipikat', tipe: 'teks' },
  { kolom: 'no_sertifikat', header: 'No Sertifikat', tipe: 'teks' },
  { kolom: 'nama', header: 'Nama', tipe: 'teks' },
  { kolom: 'tanggal_buku_pertama', header: 'Tanggal Buku Pertama', tipe: 'tanggal' },
  { kolom: 'tanggal_perolehan', header: 'Tanggal Perolehan', tipe: 'tanggal' },
  { kolom: 'tanggal_pengapusan', header: 'Tanggal Pengapusan', tipe: 'tanggal' },
  { kolom: 'nilai_perolehan_pertama', header: 'Nilai Perolehan Pertama', tipe: 'angka' },
  { kolom: 'nilai_mutasi', header: 'Nilai Mutasi', tipe: 'angka' },
  { kolom: 'nilai_perolehan', header: 'Nilai Perolehan', tipe: 'angka' },
  { kolom: 'nilai_penyusutan', header: 'Nilai Penyusutan', tipe: 'angka' },
  { kolom: 'nilai_buku', header: 'Nilai Buku', tipe: 'angka' },
  { kolom: 'luas_tanah_seluruhnya', header: 'Luas Tanah Seluruhnya', tipe: 'angka' },
  { kolom: 'luas_tanah_untuk_bangunan', header: 'Luas Tanah Untuk Bangunan', tipe: 'angka' },
  { kolom: 'luas_tanah_sarana_lingkungan', header: 'Luas Tanah Untuk Sarana Lingkungan', tipe: 'angka' },
  { kolom: 'luas_lahan_kosong', header: 'Luas Lahan Kosong', tipe: 'angka' },
  { kolom: 'luas_bangunan', header: 'Luas Bangunan', tipe: 'angka' },
  { kolom: 'luas_tapak_bangunan', header: 'Luas Tapak Bangunan', tipe: 'angka' },
  { kolom: 'luas_pemanfaatan', header: 'Luas Pemanfataan', tipe: 'angka' },
  { kolom: 'jumlah_lantai', header: 'Jumlah Lantai', tipe: 'angka' },
  { kolom: 'jumlah_foto', header: 'Jumlah Foto', tipe: 'angka' },
  { kolom: 'status_penggunaan', header: 'Status Penggunaan', tipe: 'teks' },
  { kolom: 'no_psp', header: 'No PSP', tipe: 'teks' },
  { kolom: 'tanggal_psp', header: 'Tanggal PSP', tipe: 'tanggal' },
  { kolom: 'alamat', header: 'Alamat', tipe: 'teks' },
  { kolom: 'rt_rw', header: 'RT/RW', tipe: 'teks' },
  { kolom: 'kelurahan', header: 'Kelurahan/Desa', tipe: 'teks' },
  { kolom: 'kecamatan', header: 'Kecamatan', tipe: 'teks' },
  { kolom: 'kab_kota', header: 'Kab/Kota', tipe: 'teks' },
  { kolom: 'kode_kab_kota', header: 'Kode Kab/Kota', tipe: 'teks' },
  { kolom: 'provinsi', header: 'Provinsi', tipe: 'teks' },
  { kolom: 'kode_provinsi', header: 'Kode Provinsi', tipe: 'teks' },
  { kolom: 'kode_pos', header: 'Kode Pos', tipe: 'teks' },
  { kolom: 'sbsk', header: 'SBSK', tipe: 'teks' },
  { kolom: 'optimalisasi', header: 'Optimalisasi', tipe: 'teks' },
  { kolom: 'penghuni', header: 'Penghuni', tipe: 'teks' },
  { kolom: 'pengguna', header: 'Pengguna', tipe: 'teks' },
  { kolom: 'kode_kpknl', header: 'Kode KPKNL', tipe: 'teks' },
  { kolom: 'uraian_kpknl', header: 'Uraian KPKNL', tipe: 'teks' },
  { kolom: 'uraian_kanwil_djkn', header: 'Uraian Kanwil DJKN', tipe: 'teks' },
  { kolom: 'nama_kl', header: 'Nama K/L', tipe: 'teks' },
  { kolom: 'nama_e1', header: 'Nama E1', tipe: 'teks' },
  { kolom: 'nama_korwil', header: 'Nama Korwil', tipe: 'teks' },
  { kolom: 'kode_register', header: 'Kode Register', tipe: 'teks' },
  { kolom: 'lokasi_ruang', header: 'Lokasi Ruang', tipe: 'teks' },
  { kolom: 'jenis_identitas', header: 'Jenis Identitas', tipe: 'teks' },
  { kolom: 'no_identitas', header: 'No Identitas', tipe: 'teks' },
  { kolom: 'no_stnk', header: 'No STNK', tipe: 'teks' },
  { kolom: 'nama_pengguna', header: 'Nama Pengguna', tipe: 'teks' },
  { kolom: 'status_pmk', header: 'Status PMK', tipe: 'teks' },
]

/**
 * Baca .xlsx. Setiap kolom yang dibutuhkan diambil berdasarkan nama header,
 * bukan posisi, karena urutan kolom hasil export SIMAN bisa berubah.
 */
export async function bacaFileAset(berkas: File): Promise<HasilBaca> {
  const XLSX = await import('xlsx')
  const buf = await berkas.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array', cellDates: true })
  const namaSheet = wb.SheetNames[0]
  if (!namaSheet) {
    return { ok: false, baris: [], snapshotDate: null, namaSheet: '', kolom: [], kurangKolom: KOLOM_WAJIB, masalah: [{ baris: 0, alasan: 'Berkas tidak memiliki sheet.' }], jumlahDitolak: 0 }
  }
  const sheet = wb.Sheets[namaSheet] as unknown as Record<string, unknown>
  // Abaikan dimension yang salah pada sebagian export SIMAN.
  const refAsli = (sheet['!ref'] as string | undefined) ?? ''
  perbaikiRefSheet(sheet, XLSX.utils)
  const refDipakai = (sheet['!ref'] as string | undefined) ?? refAsli
  const aoA = XLSX.utils.sheet_to_json<Record<string, Sel>>(sheet as never, { defval: null, raw: true })
  if (aoA.length === 0) {
    return { ok: false, baris: [], snapshotDate: null, namaSheet, kolom: [], kurangKolom: KOLOM_WAJIB, masalah: [{ baris: 0, alasan: 'Sheet kosong.' }], jumlahDitolak: 0 }
  }

  const kolom = Object.keys(aoA[0])
  const normalisasiKolom = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
  const cari = (...nama: string[]): string | undefined => {
    const target = nama.map(normalisasiKolom)
    return kolom.find(k => target.includes(normalisasiKolom(k)))
  }

  const kurangKolom = KOLOM_WAJIB.filter(w => !cari(w))
  if (kurangKolom.length > 0) {
    return { ok: false, baris: [], snapshotDate: tebakSnapshotDate(berkas.name), namaSheet, kolom, kurangKolom, masalah: [], jumlahDitolak: 0 }
  }

  // Cari kolom sumber untuk setiap kolom tabel lewat PETA_KOLOM (bukan per posisi).
  const sumberKolom = new Map<string, string>()
  for (const p of PETA_KOLOM) {
    const ketemu = cari(p.header)
    if (ketemu) sumberKolom.set(p.kolom, ketemu)
  }
  const kNama = cari('Nama Barang')!
  const kSatker = cari('Kode Satker')
  const kKodeBarang = cari('Kode Barang')!
  const kNup = cari('NUP')!

  const masalah: Array<{ baris: number; alasan: string }> = []
  const baris: BarisAsetImport[] = []
  const kunciDipakai = new Set<string>()
  let jumlahDitolak = 0

  aoA.forEach((r, i) => {
    const nomorBaris = i + 2 // +1 header, +1 basis 1
    const namaBarang = teks(r[kNama])
    if (!namaBarang) return // baris kosong — lewati diam-diam, bukan error

    const satker = kodeDariKodeSatker(kSatker ? teks(r[kSatker]) : null)
    const kodeBarang = teks(r[kKodeBarang])
    const nup = teks(r[kNup])
    const no = angka(r['No'] ?? r['no'])

    if (!satker) {
      jumlahDitolak++
      if (masalah.length < 20) masalah.push({ baris: nomorBaris, alasan: `Kode Satker tidak terbaca pada "${namaBarang}".` })
      return
    }
    if (!kodeBarang) {
      jumlahDitolak++
      if (masalah.length < 20) masalah.push({ baris: nomorBaris, alasan: `Kode Barang kosong pada "${namaBarang}".` })
      return
    }

    // Kunci alami: Satker + Kode Barang + NUP + No. Kalau NUP/No kosong,
    // pakai nama barang agar tetap bisa mengunci baris.
    const kunci = `${satker}|${kodeBarang}|${nup ?? ''}|${no ?? namaBarang}`
    if (kunciDipakai.has(kunci)) {
      jumlahDitolak++
      if (masalah.length < 20) masalah.push({ baris: nomorBaris, alasan: `Kunci ganda: ${satker} / ${kodeBarang} / ${nup ?? '-'}.` })
      return
    }
    kunciDipakai.add(kunci)

    // Susun SELURUH kolom tabel, bukan hanya kolom yang tampil di UI.
    const hasil: Record<string, string | number | null> = {}
    for (const p of PETA_KOLOM) {
      const sumber = sumberKolom.get(p.kolom)
      const nilai = sumber ? r[sumber] : null
      if (p.tipe === 'angka') hasil[p.kolom] = angka(nilai)
      else if (p.tipe === 'tanggal') hasil[p.kolom] = tanggal(nilai)
      else if (p.tipe === 'kode' && p.kolom === 'satker_code') hasil[p.kolom] = satker
      else hasil[p.kolom] = teks(nilai)
    }
    // 'Kode Satker' dipetakan ke dua kolom: satker_code (6 digit) dan kode_satker_raw (penuh)
    const sumberKodeSatker = kSatker ? teks(r[kSatker]) : null
    hasil.kode_satker_raw = sumberKodeSatker
    hasil.satker_code = satker
    if (!hasil.nama_satker) hasil.nama_satker = satker
    hasil.kunci = kunci

    baris.push(hasil as BarisAsetImport)

  })

  return {
    ok: baris.length > 0,
    baris,
    snapshotDate: tebakSnapshotDate(berkas.name),
    namaSheet,
    kolom,
    refAsli,
    refDipakai,
    kurangKolom,
    masalah,
    jumlahDitolak,
  }
}

export type HasilBanding = {
  total_baru: number
  nilai_baru: number
  nilai_lama: number
  baris_lama: number
  aset_baru: number
  berubah: number
  sama: number
  hilang: number
  satker: number
  jenis: number
}
