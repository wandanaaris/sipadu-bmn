import { describe, expect, it } from 'vitest'
import {
  faktorKondisi, hitungPenaksiran, klasifikasiKendaraan, faktorTahunPembuatan,
  pembulatanRibuan, type IdentitasPenaksiran, type BarisLelang,
} from './penaksiranKendaraan'

// Simulasi I dari "Kertas Kerja Simulasi (2).xlsx" (Contoh 1 KMK 375/2024):
// Toyota Corolla Altis 1.8 (middle 7%), Jakarta kategori 2, tahun 2005,
// kerusakan >90% (faktor 0,5), dokumen BPKB, tahun taksiran 2024.
const objek: IdentitasPenaksiran = {
  nomorKertasKerja: '001/PP/2024',
  namaObjek: 'Kendaraan Jabatan',
  nup: '',
  lokasiObjek: 'Jakarta',
  kategoriLokasiObjek: 2,
  jenisKendaraan: 'roda4',
  kapasitasCc: 1800,
  merek: 'Toyota',
  tipe: 'Corolla Altis',
  nomorPolisi: 'XX XXXX XX',
  dokumenKepemilikan: 'BPKB',
  pemilikDokumen: 'Kementerian Imigrasi dan Pemasyarakatan',
  masaBerlaku: 'Masih Berlaku',
  keteranganLain: '',
  warna: 'Hitam',
  tahunPembuatan: 2005,
  bahanBakar: 'Bensin',
  kondisi: 'rusak90',
  penggunaan: 'Kendaraan Dinas',
  tahunTaksiran: 2024,
  tujuan: 'lelang',
  kota: 'Pekanbaru',
  tanggal: '2024-10-28',
  ketua: '', anggota: ['', ''],
}
// nominal tipe/merek 0 pada semua baris
const b = (merek: string, kode: string, tipe: string, harga: number, tahunLelang: number, lokasi: string, kategori: 1|2|3|4, tahun: number, tipePct = 0, merekPct = 0): BarisLelang =>
  ({ merek, kodeLelang: kode, tipe, hargaLelang: harga, tahunLelang, lokasiLelang: lokasi, kategoriLokasiLelang: kategori, tahunPembuatanLelang: tahun, penyesuaianTipe: tipePct, penyesuaianMerek: merekPct, hargaBaru: 0 })
const rows: BarisLelang[] = [
  b('Toyota', 'BCTT0N', 'Corolla Altis 1.8', 55_583_000, 2023, 'Jakarta', 2, 2004),
  b('Toyota', 'CK47MN', 'Corolla Altis 1.8', 55_583_000, 2023, 'Jakarta', 2, 2004),
  b('Toyota', 'TZ4FD1', 'Corolla Altis 1.8', 44_803_000, 2023, 'Jakarta', 2, 2004),
  b('Toyota', 'UCXOUN', 'Corolla Altis 1.8', 63_533_000, 2023, 'Jakarta', 2, 2004),
  b('Toyota', 'MG4ZLQ', 'Corolla Altis 1.8', 46_000_000, 2022, 'Jakarta', 2, 2006),
  b('Toyota', 'U6PQHA', 'Corolla Altis 1.8', 63_666_900, 2022, 'Jakarta', 2, 2006),
]

describe('KMK 375 — klasifikasi kelas kendaraan', () => {
  it('roda dua: batas 100cc dan 150cc', () => {
    expect(klasifikasiKendaraan('roda2', 100)).toBe('low')
    expect(klasifikasiKendaraan('roda2', 110)).toBe('middle')
    expect(klasifikasiKendaraan('roda2', 150)).toBe('middle')
    expect(klasifikasiKendaraan('roda2', 151)).toBe('high')
  })
  it('roda empat: batas 1.200cc dan 2.500cc', () => {
    expect(klasifikasiKendaraan('roda4', 1200)).toBe('low')
    expect(klasifikasiKendaraan('roda4', 1800)).toBe('middle')
    expect(klasifikasiKendaraan('roda4', 2500)).toBe('middle')
    expect(klasifikasiKendaraan('roda4', 2501)).toBe('high')
  })
  it('faktor tahun pembuatan 5/7/10%', () => {
    expect(faktorTahunPembuatan('low')).toBe(5)
    expect(faktorTahunPembuatan('middle')).toBe(7)
    expect(faktorTahunPembuatan('high')).toBe(10)
  })
})

describe('KMK 375 — faktor kondisi', () => {
  it('lelang: 0,5 / 0,6 / 0,7', () => {
    expect(faktorKondisi({ kondisi: 'rusak90', dokumenKepemilikan: 'BPKB', tujuan: 'lelang' })).toBe(0.5)
    expect(faktorKondisi({ kondisi: 'rusak80', dokumenKepemilikan: 'STNK', tujuan: 'lelang' })).toBe(0.6)
    expect(faktorKondisi({ kondisi: 'rusak70', dokumenKepemilikan: 'Lainnya', tujuan: 'lelang' })).toBe(0.7)
  })
  it('harga jual (tanpa lelang): 0,8 / 0,9 / 1,0', () => {
    expect(faktorKondisi({ kondisi: 'rusak90', dokumenKepemilikan: 'BPKB', tujuan: 'harga-jual' })).toBe(0.8)
    expect(faktorKondisi({ kondisi: 'rusak80', dokumenKepemilikan: 'BPKB', tujuan: 'harga-jual' })).toBe(0.9)
    expect(faktorKondisi({ kondisi: 'rusak70', dokumenKepemilikan: 'BPKB', tujuan: 'harga-jual' })).toBe(1)
  })
  it('tanpa dokumen kepemilikan → turun ke 0,5', () => {
    expect(faktorKondisi({ kondisi: 'rusak80', dokumenKepemilikan: 'TidakAda', tujuan: 'lelang' })).toBe(0.5)
    expect(faktorKondisi({ kondisi: 'rusak70', dokumenKepemilikan: 'TidakAda', tujuan: 'lelang' })).toBe(0.5)
  })
})

describe('KMK 375 — Simulasi I Corolla Altis', () => {
  const hasil = hitungPenaksiran(rows, objek)
  it('baris 6: waktu 4% + tahun -7% = -3% → 61.756.893', () => {
    const r = hasil.baris[5]
    expect(r.penyesuaianWaktu).toBe(4)
    expect(r.penyesuaianTahun).toBe(-7)
    expect(r.total).toBe(-3)
    expect(r.nilaiTaksiran).toBeCloseTo(61_756_893, 4)
  })
  it('baris 1: waktu 2%; tahun (2005-2004)x7% = +7%; total 9%', () => {
    const r = hasil.baris[0]
    expect(r.penyesuaianWaktu).toBe(2)
    expect(r.penyesuaianTahun).toBe(7)
    expect(r.penyesuaianLokasi).toBe(0)
    expect(r.total).toBe(9)
    expect(r.nilaiTaksiran).toBeCloseTo(60_585_470, 4)
  })
  it('jumlah nilai taksiran = 345.634.073', () => {
    expect(hasil.jumlahNilaiTaksiran).toBeCloseTo(345_634_073, 2)
  })
  it('rata-rata = 57.605.678,83 → limit lelang 0,5 = 28.802.839,42', () => {
    expect(hasil.rataRata).toBeCloseTo(57_605_678.8333, 2)
    expect(hasil.faktor).toBe(0.5)
    expect(hasil.limitLelang).toBeCloseTo(28_802_839.4166, 2)
  })
  it('pembulatan ke ribuan = 28.803.000', () => {
    expect(hasil.pembulatan).toBe(28_803_000)
  })
})

describe('pembulatan ribuan', () => {
  it('mengikuti contoh KMK', () => {
    expect(pembulatanRibuan(25_829_599.64)).toBe(25_830_000)
    expect(pembulatanRibuan(2_823_691)).toBe(2_824_000)
  })
})

describe('penyesuaian lokasi 5% per kategori (matriks KMK)', () => {
  it('objek kategori 3, pembanding kategori 1 → -10%', () => {
    const hasil = hitungPenaksiran([b('Toyota', 'X', 'Innova G', 165_000_000, 2015, 'Cirebon', 1, 2015)],
      { ...objek, kategoriLokasiObjek: 3, tahunTaksiran: 2024, tahunPembuatan: 2010, kapasitasCc: 2000, kondisi: 'rusak70' })
    expect(hasil.baris[0].penyesuaianLokasi).toBe(-10)
  })
  it('objek kategori 1, pembanding kategori 2 → +5%', () => {
    const hasil = hitungPenaksiran([b('Toyota', 'X', 'Innova G', 165_000_000, 2015, 'Serang', 2, 2015)],
      { ...objek, kategoriLokasiObjek: 1, tahunTaksiran: 2024, tahunPembuatan: 2010, kapasitasCc: 2000, kondisi: 'rusak70' })
    expect(hasil.baris[0].penyesuaianLokasi).toBe(5)
  })
})

// Simulasi manual pengguna ("Kertas Kerja Simulasi.xlsx"): Daihatsu Sigra 1.2 MT,
// Jakarta kat. 2, tahun 2019 (1.198cc → low-end 5%), dokumen Tidak Ada → faktor 0,5,
// tahun taksiran 2024. Baris 1 lembar tersebut harus terreproduksi persis oleh rumus.
describe('Kertas Kerja Simulasi.xlsx — Daihatsu Sigra (paritas dengan lembar manual)', () => {
  const objekSigra = { ...objek, namaObjek: 'Daihatsu Sigra 1.2 MT', lokasiObjek: 'Jakarta',
    kategoriLokasiObjek: 2, jenisKendaraan: 'roda4' as const, kapasitasCc: 1198,
    merek: 'Daihatsu', tipe: 'Sigra 1.2 MT', dokumenKepemilikan: 'TidakAda' as const,
    tahunPembuatan: 2019, kondisi: 'rusak70' as const, tahunTaksiran: 2024, tujuan: 'lelang' as const }

  it('baris 1 (EBTMHR Cirebon): waktu 4% + lokasi -5% + tahun 0% = -1% → 68.329.800', () => {
    const hasil = hitungPenaksiran([b('Daihatsu', 'EBTMHR', 'Sigra 1.2 MT', 69_020_000, 2022, 'Cirebon', 1, 2019)], objekSigra)
    const r = hasil.baris[0]
    expect(r.penyesuaianWaktu).toBe(4)
    expect(r.penyesuaianLokasi).toBe(-5)
    expect(r.penyesuaianTahun).toBe(0)
    expect(r.total).toBe(-1)
    expect(r.nilaiTaksiran).toBeCloseTo(68_329_800, 4)
  })

  it('tahun pembuatan low-end 5%/tahun (bukan 8%): (2019-2016) x 5% = 15%', () => {
    const hasil = hitungPenaksiran([b('Daihatsu', 'MVEIBW', 'Sigra 1.2 MT', 79_914_000, 2022, 'Pamekasan', 3, 2016)], objekSigra)
    expect(hasil.baris[0].penyesuaianTahun).toBe(15)
    expect(hasil.baris[0].penyesuaianLokasi).toBe(5)
    expect(hasil.baris[0].total).toBe(24)
  })

  it('dokumen Tidak Ada → faktor tetap 0,5 meski kondisi s.d. 80%', () => {
    const hasil = hitungPenaksiran([b('Daihatsu', 'GYTLIN', 'Sigra 1.2 MT', 74_800_000, 2023, 'Serang', 2, 2018)], objekSigra)
    expect(hasil.faktor).toBe(0.5)
  })
})

// ===== AUDIT FINAL: tiga contoh kertas kerja lengkap di KMK 375 hal 27, 29, 31 =====
// Setiap baris dan ringkasannya diverifikasi terhadap angka yang tercetak di KMK.
describe('KMK 375 — audit penuh contoh kertas kerja (hal 27, 29, 31)', () => {
  const dasar: IdentitasPenaksiran = { ...objek }

  it('Contoh 1 hal 27 — Corolla Altis: 7 baris + rata-rata + limit + pembulatan', () => {
    const rows: BarisLelang[] = [
      b('Toyota', 'WKDLTZ', 'Corolla Altis 1.800 cc', 46_100_000, 2023, 'Jakarta', 2, 2005),
      b('Toyota', 'BCTT0N', 'Corolla Altis 1.800 cc', 55_583_000, 2023, 'Jakarta', 2, 2004),
      b('Toyota', 'MG4ZLQ', 'Corolla Altis 1.800 cc', 46_000_000, 2022, 'Jakarta', 2, 2006),
      b('Toyota', 'CK47MN', 'Corolla Altis 1.800 cc', 55_583_000, 2023, 'Jakarta', 2, 2004),
      b('Toyota', 'TZ4FD1', 'Corolla Altis 1.800 cc', 44_803_000, 2023, 'Jakarta', 2, 2004),
      b('Toyota', 'WIUSNI', 'Corolla Altis 1.800 cc', 54_321_321, 2023, 'Jakarta', 2, 2006),
      b('Toyota', 'MZYIJN', 'Corolla Altis 1.800 cc', 52_001_000, 2024, 'Jakarta', 2, 2006),
    ]
    const harusNilai = [47_022_000, 60_585_470, 44_620_000, 60_585_470, 48_835_270, 51_605_254.95, 48_360_930]
    const harusTotal = [2, 9, -3, 9, 9, -5, -7]
    const h = hitungPenaksiran(rows, dasar)
    h.baris.forEach((x, i) => {
      expect(x.total).toBe(harusTotal[i])
      expect(x.nilaiTaksiran).toBeCloseTo(harusNilai[i], 2)
    })
    // Rata-rata KMK 51.659.199,28 = jumlah 361.614.394,95 / 7 (angka 'Nilai Taksiran'
    // 361.614.398,95 di PDF mengandung typo 4 rupiah; rata-rata PDF membuktikan 394,95 yang benar)
    expect(h.jumlahNilaiTaksiran).toBeCloseTo(361_614_394.95, 2)
    expect(h.rataRata).toBeCloseTo(51_659_199.2786, 2)
    expect(h.limitLelang).toBeCloseTo(25_829_599.64, 2)
    expect(h.pembulatan).toBe(25_830_000)
  })

  it('Contoh 2 hal 29 — Honda Revo 110: tanpa dokumen → faktor 0,5', () => {
    const o = { ...dasar, namaObjek: 'Honda Revo 110 cc', jenisKendaraan: 'roda2' as const, kapasitasCc: 110, tipe: 'Revo 110 cc', tahunPembuatan: 2012, dokumenKepemilikan: 'TidakAda' as const, kondisi: 'rusak80' as const }
    const rows: BarisLelang[] = [
      b('Honda', 'US5O6B', 'Revo 110 cc', 5_300_000, 2022, 'Jakarta', 2, 2011),
      b('Honda', '95U1EI', 'Revo 110 cc', 5_292_000, 2022, 'Jakarta', 2, 2011),
      b('Honda', 'C0SBZ6', 'Revo 110 cc', 3_180_000, 2022, 'Jakarta', 2, 2011),
      b('Honda', 'EET49M', 'Revo 110 cc', 5_820_000, 2023, 'Jakarta', 2, 2013),
      b('Honda', 'NEJ401', 'Revo 110 cc', 4_825_000, 2023, 'Jakarta', 2, 2011),
      b('Honda', '8DUZAO', 'Revo 110 cc', 5_120_000, 2023, 'Jakarta', 2, 2011),
      b('Honda', 'RY1FXJ', 'Revo 110 cc', 5_120_000, 2023, 'Jakarta', 2, 2011),
    ]
    const harusNilai = [5_883_000, 5_874_120, 3_529_800, 5_529_000, 5_259_250, 5_580_800, 5_580_800]
    const h = hitungPenaksiran(rows, o)
    h.baris.forEach((x, i) => expect(x.nilaiTaksiran).toBeCloseTo(harusNilai[i], 2))
    // PDF mencetak r3 = 3.539.790 padahal inputnya sendiri 3.180.000 x 1,11 = 3.529.800 (typo PDF)
    expect(h.faktor).toBe(0.5)
    expect(h.pembulatan).toBe(2_660_000) // sama dengan pembulatan PDF
  })

  it('Contoh 3 hal 31 — Jialing JL 100: Fpm -42%, total -43%, limit x 0,7', () => {
    const o = { ...dasar, namaObjek: 'Jialing JL 100', jenisKendaraan: 'roda2' as const, kapasitasCc: 100, tipe: 'JL 100', tahunPembuatan: 1998, dokumenKepemilikan: 'BPKB' as const, kondisi: 'rusak70' as const, kategoriLokasiObjek: 3 as const, lokasiObjek: 'Palu', hargaBaruObjek: 3_500_000 }
    const rows: BarisLelang[] = [
      b('Jialing', 'NSM74Q', 'JL 100', 409_999, 2022, 'Palu', 3, 1998),
      b('Honda', 'ZDYJK', 'Astrea C100', 870_990, 2022, 'Makassar', 1, 1997, 0, -42),
      b('Honda', 'A7NVCM', 'Astrea C100', 620_000, 2024, 'Surabaya', 2, 1997, 0, -42),
      b('Honda', '0RWZ8H', 'Astrea C100', 1_510_000, 2024, 'Surabaya', 2, 1997, 0, -42),
    ]
    const harusNilai = [426_398.96, 496_464.30, 359_600, 875_800]
    const harusTotal = [4, -43, -42, -42]
    const h = hitungPenaksiran(rows, o)
    h.baris.forEach((x, i) => {
      expect(x.total).toBe(harusTotal[i])
      expect(x.nilaiTaksiran).toBeCloseTo(harusNilai[i], 2)
    })
    expect(h.jumlahNilaiTaksiran).toBeCloseTo(2_158_263.26, 2)
    // Rata-rata benar = 539.565,82 (PDF salah cetak 593.565,82; limit PDF
    // 377.696,07 = 539.565,815 x 0,7 membuktikan 539 yang benar)
    expect(h.rataRata).toBeCloseTo(539_565.815, 2)
    expect(h.limitLelang).toBeCloseTo(377_696.07, 2)
    expect(h.pembulatan).toBe(378_000)
  })

  it('Fpm merek (hal 21-22): Honda -51% dan Suzuki -34% dari NJT 2.950.000', () => {
    const fpm = (njp: number) => Math.round(((2_950_000 - njp) / njp) * 100)
    expect(fpm(6_000_000)).toBe(-51)
    expect(fpm(4_500_000)).toBe(-34)
  })
})
