// Logika perhitungan Kertas Kerja Penaksiran Kendaraan Bermotor
// Sesuai KMK 375/2024 (perbandingan data harga lelang DJKN).
// Murni — tanpa DOM/React, agar bisa dites dan dipakai ulang.

export type KondisiKendaraan = 'rusak90' | 'rusak80' | 'rusak70'
export type KelasKendaraan = 'low' | 'middle' | 'high'
export type KategoriLokasi = 1 | 2 | 3 | 4

export type IdentitasPenaksiran = {
  nomorKertasKerja: string
  namaObjek: string
  kodeBarang: string
  nup: string
  /** Wilayah kerja KPKNL — menentukan kategori lokasi & lingkup pencarian pembanding. */
  lokasiObjek: string
  /** Rencana lokasi pelaksanaan lelang — isian bebas untuk kertas kerja. */
  rencanaLokasi: string
  kategoriLokasiObjek: KategoriLokasi
  jenisKendaraan: 'roda2' | 'roda4'
  kapasitasCc: number
  merek: string
  tipe: string
  nomorPolisi: string
  dokumenKepemilikan: 'BPKB' | 'STNK' | 'Lainnya' | 'TidakAda'
  pemilikDokumen: string
  masaBerlaku: 'Masih Berlaku' | 'Habis Masa Berlaku'
  keteranganLain: string
  warna: string
  tahunPembuatan: number
  bahanBakar: string
  kondisi: KondisiKendaraan
  penggunaan: string
  tahunTaksiran: number
  tujuan: 'lelang' | 'harga-jual'
  kota: string
  tanggal: string
  ketua: string
  /** Anggota panitia dinamis (KMK 375: ketua merangkap anggota + anggota). */
  anggota: string[]
  /** Harga baru/harga jual saat ini objek (NJT) — untuk Fpm bila merek pembanding berbeda. */
  hargaBaruObjek?: number
}

export type BarisLelang = {
  merek: string
  kodeLelang: string
  tipe: string
  hargaLelang: number
  tahunLelang: number
  lokasiLelang: string
  kategoriLokasiLelang: KategoriLokasi
  tahunPembuatanLelang: number
  /** % penyesuaian tipe (ketik sendiri; superior → negatif) */
  penyesuaianTipe: number
  /** % penyesuaian merek (dari harga baru/jual saat ini; superior → negatif) */
  penyesuaianMerek: number
  /** Harga baru/harga jual saat ini pembanding (NJP) — untuk Fpm bila merek berbeda. */
  hargaBaru?: number
  /** Tahapan pencarian KMK 375 angka 4 tempat baris ini ditemukan (hasil generate). */
  tahap?: number
}

/** Penyesuaian tahun pembuatan per tahun: 5% low, 7% middle, 10% high. */
export function faktorTahunPembuatan(kelas: KelasKendaraan): number {
  if (kelas === 'high') return 10
  if (kelas === 'middle') return 7
  return 5
}

/** Klasifikasi kelas kendaraan dari jenis + kapasitas silinder (KMK 375 C.1.b). */
export function klasifikasiKendaraan(jenis: 'roda2' | 'roda4', cc: number): KelasKendaraan {
  const batas = jenis === 'roda2' ? { low: 100, middle: 150 } : { low: 1200, middle: 2500 }
  if (cc <= batas.low) return 'low'
  if (cc <= batas.middle) return 'middle'
  return 'high'
}

/** Faktor kondisi: lelang 0.5/0.6/0.7; harga jual 0.8/0.9/1.0; tanpa dokumen → 0.5. */
export function faktorKondisi(objek: Pick<IdentitasPenaksiran, 'kondisi' | 'dokumenKepemilikan' | 'tujuan'>): number {
  if (objek.dokumenKepemilikan === 'TidakAda') return 0.5
  if (objek.tujuan === 'harga-jual') {
    if (objek.kondisi === 'rusak90') return 0.8
    if (objek.kondisi === 'rusak80') return 0.9
    return 1
  }
  if (objek.kondisi === 'rusak90') return 0.5
  if (objek.kondisi === 'rusak80') return 0.6
  return 0.7
}

export type HasilBaris = {
  penyesuaianTipe: number
  penyesuaianMerek: number
  penyesuaianWaktu: number
  penyesuaianLokasi: number
  penyesuaianTahun: number
  total: number
  nilaiTaksiran: number
}

/** Hitung satu baris penyesuaian terhadap objek. Semua penyesuaian dalam persen. */
export function hitungBaris(
  row: BarisLelang,
  objek: Pick<IdentitasPenaksiran, 'kategoriLokasiObjek' | 'tahunPembuatan' | 'tahunTaksiran' | 'jenisKendaraan' | 'kapasitasCc'>,
): HasilBaris {
  const kelas = klasifikasiKendaraan(objek.jenisKendaraan, objek.kapasitasCc)
  const waktu = (objek.tahunTaksiran - row.tahunLelang) * 2
  const lokasi = (row.kategoriLokasiLelang - objek.kategoriLokasiObjek) * 5
  const tahun = (objek.tahunPembuatan - row.tahunPembuatanLelang) * faktorTahunPembuatan(kelas)
  const total = row.penyesuaianTipe + row.penyesuaianMerek + waktu + lokasi + tahun
  const nilaiTaksiran = row.hargaLelang * (1 + total / 100)
  return {
    penyesuaianTipe: row.penyesuaianTipe,
    penyesuaianMerek: row.penyesuaianMerek,
    penyesuaianWaktu: waktu,
    penyesuaianLokasi: lokasi,
    penyesuaianTahun: tahun,
    total,
    nilaiTaksiran,
  }
}

export type RingkasanPenaksiran = {
  baris: HasilBaris[]
  jumlahNilaiTaksiran: number
  rataRata: number
  faktor: number
  limitLelang: number
  pembulatan: number
}

/** Pembulatan ke ribuan terdekat (contoh KMK: 28.802.839,42 → 28.803.000). */
export function pembulatanRibuan(v: number): number {
  return Math.round(v / 1000) * 1000
}

export function hitungPenaksiran(
  rows: BarisLelang[],
  objek: IdentitasPenaksiran,
): RingkasanPenaksiran {
  const baris = rows.map(r => hitungBaris(r, objek))
  const jumlahNilaiTaksiran = baris.reduce((s, b) => s + b.nilaiTaksiran, 0)
  const rataRata = baris.length ? jumlahNilaiTaksiran / baris.length : 0
  const faktor = faktorKondisi(objek)
  const limitLelang = rataRata * faktor
  return {
    baris,
    jumlahNilaiTaksiran,
    rataRata,
    faktor,
    limitLelang,
    pembulatan: pembulatanRibuan(limitLelang),
  }
}

/** Format rupiah gaya kertas kerja: Rp47.022.000,00 */
export function formatRp(v: number): string {
  return 'Rp' + (Number.isFinite(v) ? v : 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Format persen kertas kerja: 2% / -7% */
export function formatPersen(v: number): string {
  return Math.round(v) + '%'
}
