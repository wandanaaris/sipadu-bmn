import { describe, expect, it } from 'vitest'
import {
  daftarKpknl, generateBarisPembanding, kategoriDariJenis, kategoriPerKpknl,
  kunciKpknl, namaLokasi, normTeks, tipeSama, wilayahPencarian,
  type KandidatLelang,
} from './penaksiranLelang'

// Fixture gaya Simulasi I(2) KMK 375 (Honda MCB di KPKNL Pekanbaru).
const k = (over: Partial<KandidatLelang>): KandidatLelang => ({
  kode: 'K1',
  kategoriObjek: 'Motor',
  kpknl: 'KPKNL Pekanbaru',
  tahunLelang: 2023,
  katLokasi: 1,
  sumberKat: 'SEMESTER I 2025',
  merek: 'Honda',
  tipe: 'MCB',
  tahunPembuatan: 2001,
  warna: 'Hitam',
  harga: 4_848_000,
  ...over,
})

const objek = {
  kpknl: 'KPKNL Pekanbaru',
  kategoriObjek: 'Motor' as const,
  merek: 'Honda',
  tipe: 'MCB',
  tahunPembuatan: 2001,
  tahunTaksiran: 2024,
}

describe('wilayah pencarian KMK 375 angka 3.d', () => {
  it('Pekanbaru urutan pertama: Riau + provinsi berbatasan (Sumut, Sumbar, Jambi, Kepri)', () => {
    const u1 = wilayahPencarian('KPKNL Pekanbaru', 1)
    for (const nama of ['pekanbaru', 'dumai', 'medan', 'padang', 'bukittinggi', 'jambi', 'batam', 'kisaran']) {
      expect(u1.has(nama), nama).toBe(true)
    }
    expect(u1.has('makassar')).toBe(false)
    expect(u1.has('surabaya')).toBe(false)
  })
  it('Pekanbaru urutan kedua: seluruh Sumatera + Jakarta, Bogor, Tangerang, Bekasi', () => {
    const u2 = wilayahPencarian('KPKNL Pekanbaru', 2)
    for (const nama of ['medan', 'bandarlampung', 'bandaaceh', 'palembang', 'jakartai', 'bogor', 'tangerangi', 'bekasi']) {
      expect(u2.has(nama), nama).toBe(true)
    }
    expect(u2.has('makassar')).toBe(false)
    expect(u2.has('surabaya')).toBe(false)
  })
  it('urutan ketiga mencakup seluruh Indonesia', () => {
    const u3 = wilayahPencarian('KPKNL Pekanbaru', 3)
    expect(u3.has('makassar')).toBe(true)
    expect(u3.has('sorong')).toBe(true)
  })
  it('Kalimantan Barat urutan pertama = satu provinsi; urutan kedua = JBT (Jakarta/Bogor/Tangerang/Bekasi)', () => {
    const u1 = wilayahPencarian('KPKNL Pontianak', 1)
    expect(u1.has('pontianak')).toBe(true)
    expect(u1.has('singkawang')).toBe(true)
    expect(u1.has('palangkaraya')).toBe(false)
    const u2 = wilayahPencarian('KPKNL Pontianak', 2)
    expect(u2.has('jakartai')).toBe(true)
    expect(u2.has('banjarmasin')).toBe(false)
  })
  it('Kalimantan Timur urutan kedua = Surabaya & Sidoarjo saja', () => {
    const u2 = wilayahPencarian('KPKNL Samarinda', 2)
    expect(u2.has('surabaya')).toBe(true)
    expect(u2.has('sidoarjo')).toBe(true)
    expect(u2.has('jakartai')).toBe(false)
    expect(u2.has('balikpapan')).toBe(false)
  })
  it('Batam tidak diperluas, dan data Batam tidak dipakai objek di luar Batam', () => {
    for (const u of [1, 2, 3] as const) {
      const set = wilayahPencarian('KPKNL Batam', u)
      expect(set.size).toBe(1)
      expect(set.has('batam')).toBe(true)
    }
    const u1Pekanbaru = wilayahPencarian('KPKNL Pekanbaru', 1)
    expect(u1Pekanbaru.has('batam')).toBe(true) // ada di peta, tapi saringan generator menolaknya
  })
  it('kunciKpknl & namaLokasi menormalkan prefiks dan ejaan', () => {
    expect(kunciKpknl('KPKNL Padang Sidempuan')).toBe('padangsidempuan')
    expect(kunciKpknl('Padangsidimpuan')).toBe('padangsidimpuan')
    expect(namaLokasi('KPKNL Jakarta IV')).toBe('Jakarta IV')
    expect(normTeks('Revo 110 cc')).toBe('revo110cc')
  })
})

describe('pencocokan tipe', () => {
  it('tipeSama ketat: hanya tipe identik setelah normalisasi', () => {
    expect(tipeSama('Supra X 125', 'Supra X 125')).toBe(true)
    expect(tipeSama('Supra X125', 'Supra X 125')).toBe(true) // spasi diabaikan
    expect(tipeSama('MCB', 'Win MCB')).toBe(false)
    expect(tipeSama('Revo 110 cc', 'Revo')).toBe(false)
    expect(tipeSama('Innova G', 'Innova V')).toBe(false)
    expect(tipeSama('Jupiter Z', '')).toBe(false)
  })
  it('kategoriDariJenis: roda2 → Motor, roda4 → Mobil', () => {
    expect(kategoriDariJenis('roda2')).toBe('Motor')
    expect(kategoriDariJenis('roda4')).toBe('Mobil')
  })
})

describe('generate tahapan pencarian (KMK 375 angka 4)', () => {
  it('Tahap 1 (2 data) dilanjutkan Tahap 3 (tipe sama, tahun ±5) hingga minimal 3', () => {
    const kandidat = [
      k({ kode: 'A1', harga: 4_848_000 }),
      k({ kode: 'A2', harga: 4_307_000 }),
      k({ kode: 'A3', tahunPembuatan: 2004, harga: 7_282_000 }),
      k({ kode: 'Y1', merek: 'Yamaha', tipe: 'Mio', tahunPembuatan: 2010, harga: 3_000_000 }),
    ]
    const hasil = generateBarisPembanding(kandidat, objek)
    // dalam satu tahap urutan berdasar harga terendah; Tahap 1 (2 data) lalu Tahap 3
    expect(hasil.baris.map(b => b.kodeLelang)).toEqual(['A2', 'A1', 'A3'])
    expect(hasil.ringkasanTahap).toEqual([{ tahap: 1, jumlah: 2 }, { tahap: 3, jumlah: 1 }])
    expect(hasil.baris[2].tahunPembuatanLelang).toBe(2004)
    expect(hasil.baris[2].penyesuaianTipe).toBe(0)
    // lokasi lelang tanpa prefiks KPKNL
    expect(hasil.baris[0].lokasiLelang).toBe('Pekanbaru')
  })

  it('melebihi 7 data pada satu tahap → diambil 7 data bernilai terendah', () => {
    const kandidat = Array.from({ length: 8 }, (_, i) =>
      k({ kode: `T${i}`, harga: 3_000_000 + i * 1_000_000 }))
    const hasil = generateBarisPembanding(kandidat, objek)
    expect(hasil.baris).toHaveLength(7)
    const harga = hasil.baris.map(b => b.hargaLelang)
    expect(Math.max(...harga)).toBe(9_000_000) // tertinggi (T7, 10 juta) tersisih
    expect(hasil.baris.some(b => b.kodeLelang === 'T7')).toBe(false)
  })

  it('tahun transaksi lelang maksimal 3 tahun sebelum tahun taksiran', () => {
    const kandidat = [
      k({ kode: 'LAMA', tahunLelang: 2021, harga: 1_000_000 }),
      k({ kode: 'OK', tahunLelang: 2022, harga: 2_000_000 }),
      k({ kode: 'OK2', tahunLelang: 2023, harga: 2_500_000 }),
    ]
    const hasil = generateBarisPembanding(kandidat, { ...objek, tahunTaksiran: 2025 })
    expect(hasil.baris.map(b => b.kodeLelang)).toEqual(['OK', 'OK2'])
  })

  it('kategori objek disaring: objek Motor tidak memakai pembanding Mobil', () => {
    const kandidat = [
      k({ kode: 'MOBIL', kategoriObjek: 'Mobil', tipe: 'Innova', harga: 100_000_000 }),
      k({ kode: 'M1' }), k({ kode: 'M2' }), k({ kode: 'M3', harga: 5_000_000 }),
    ]
    const hasil = generateBarisPembanding(kandidat, objek)
    expect(hasil.baris.map(b => b.kodeLelang)).toEqual(['M1', 'M2', 'M3'])
  })

  it('data Batam tidak dipakai untuk objek di Pekanbaru meski wilayahnya berbatasan', () => {
    const kandidat = [
      k({ kode: 'BTM', kpknl: 'KPKNL Batam', harga: 4_000_000 }),
      k({ kode: 'P1' }), k({ kode: 'P2', harga: 4_100_000 }), k({ kode: 'P3', harga: 4_200_000 }),
    ]
    const hasil = generateBarisPembanding(kandidat, objek)
    expect(hasil.baris.some(b => b.kodeLelang === 'BTM')).toBe(false)
    expect(hasil.baris).toHaveLength(3)
  })

  it('objek di Batam: pencarian tidak diperluas keluar Batam', () => {
    const kandidat = [
      k({ kode: 'B1', kpknl: 'KPKNL Batam' }),
      k({ kode: 'B2', kpknl: 'KPKNL Batam', harga: 4_500_000 }),
      k({ kode: 'B3', kpknl: 'KPKNL Batam', harga: 4_600_000 }),
      k({ kode: 'DKI', kpknl: 'KPKNL Jakarta II', harga: 4_700_000 }),
    ]
    const hasil = generateBarisPembanding(kandidat, { ...objek, kpknl: 'KPKNL Batam' })
    expect(hasil.baris.map(b => b.kodeLelang)).toEqual(['B2', 'B3', 'B1'])
    expect(hasil.catatan.some(c => c.includes('Batam'))).toBe(true)
  })

  it('kurang dari 3 data sampai Tahap 10 → catatan peringatan', () => {
    const hasil = generateBarisPembanding([k({ kode: 'X1' })], objek)
    expect(hasil.baris).toHaveLength(1)
    expect(hasil.catatan.some(c => c.includes('minimal 3'))).toBe(true)
  })

  it('tipe mengandung objek tidak masuk Tahap 1, tetapi diutamakan di Tahap 3 (merek sama, tahun ±5)', () => {
    const kandidat = [
      k({ kode: 'EXACT', tipe: 'Supra X 125', tahunPembuatan: 2011, tahunLelang: 2026, harga: 5_944_000 }),
      k({ kode: 'RACING', tipe: 'Supra X 125 RACING NF 125 TR M/T', tahunPembuatan: 2011, tahunLelang: 2024, harga: 2_120_000 }),
      k({ kode: 'FIT', tipe: 'Supra Fit', tahunPembuatan: 2010, tahunLelang: 2024, harga: 2_261_000 }),
    ]
    const hasil = generateBarisPembanding(kandidat, { ...objek, tahunTaksiran: 2026, tahunPembuatan: 2011, tipe: 'Supra X 125' })
    // Tahap 1: hanya tipe persis. Tahap 3: RACING (spesifikasi paling mendekati) didahulukan FIT.
    expect(hasil.baris.map(b => b.kodeLelang)).toEqual(['EXACT', 'RACING', 'FIT'])
    expect(hasil.ringkasanTahap).toEqual([{ tahap: 1, jumlah: 1 }, { tahap: 3, jumlah: 2 }])
    // badge tahap tersimpan di baris
    expect(hasil.baris[0].tahap).toBe(1)
    expect(hasil.baris[1].tahap).toBe(3)
  })

  it('baris tanpa harga tidak pernah terpilih', () => {
    const kandidat = [
      k({ kode: 'NOHARGA', harga: 0 }),
      k({ kode: 'P1', harga: 4_000_000 }), k({ kode: 'P2', harga: 4_100_000 }), k({ kode: 'P3', harga: 4_200_000 }),
    ]
    const hasil = generateBarisPembanding(kandidat, objek)
    expect(hasil.baris.some(b => b.kodeLelang === 'NOHARGA')).toBe(false)
    expect(hasil.baris).toHaveLength(3)
  })

  it('prioritas lokasi vs atribut: merek+tipe+tahun persis di KPKNL berbatasan (Tahap 2) didahulukan daripada tipe berbeda di wilayah kerja (Tahap 3)', () => {
    const kandidat = [
      // wilayah kerja (Pekanbaru): merek sama, tipe BERBEDA, tahun ±5 → Tahap 3
      k({ kode: 'PKB-VARIO', tipe: 'Vario 125', tahunPembuatan: 2010, harga: 3_000_000 }),
      k({ kode: 'PKB-BEAT', tipe: 'Beat 110', tahunPembuatan: 2012, harga: 3_100_000 }),
      // KPKNL berbatasan (Jambi): merek, tipe, dan tahun PERSIS sama → Tahap 2
      k({ kode: 'JMB-1', kpknl: 'KPKNL Jambi', harga: 5_000_000 }),
      k({ kode: 'JMB-2', kpknl: 'KPKNL Jambi', harga: 5_100_000 }),
      k({ kode: 'JMB-3', kpknl: 'KPKNL Jambi', harga: 5_200_000 }),
    ]
    const hasil = generateBarisPembanding(kandidat, objek)
    // Tahap 1 kosong; Tahap 2 menemukan 3 data identik di Jambi → berhenti,
    // baris tipe berbeda di Pekanbaru TIDAK dipakai.
    expect(hasil.baris.map(b => b.kodeLelang)).toEqual(['JMB-1', 'JMB-2', 'JMB-3'])
    expect(hasil.ringkasanTahap).toEqual([{ tahap: 2, jumlah: 3 }])
  })

  it('spesifikasi diutamakan dalam merek sama: FD 110 XCSD/Smash di Pare-pare mengalahkan tipe lain di wilayah kerja', () => {
    // Meniru kertas kerja asli Kanwil: objek Suzuki FD 110 (Pekanbaru, 2002).
    const kandidat = [
      k({ kode: 'PKB-ECO', tipe: 'Econos', tahunPembuatan: 2004, harga: 1_074_000 }),
      k({ kode: 'PP-1', kpknl: 'KPKNL Parepare', tipe: 'FD 110 XCSD / Smash', tahunPembuatan: 2005, harga: 1_700_000 }),
      k({ kode: 'PP-2', kpknl: 'KPKNL Parepare', tipe: 'FD 110 XCSD / Smash', tahunPembuatan: 2005, harga: 1_410_000 }),
      k({ kode: 'PP-3', kpknl: 'KPKNL Parepare', tipe: 'FD 110 XCSD / Smash', tahunPembuatan: 2005, harga: 1_860_000 }),
    ]
    const hasil = generateBarisPembanding(kandidat, { ...objek, tipe: 'FD 110', tahunPembuatan: 2002, tahunTaksiran: 2026 })
    // skor tipe: 'FD 110 XCSD / Smash' memuat 'FD 110' → 50; 'Econos' → 0.
    // Urutan: spesifikasi terdekat dulu (Tahap 8) — PKB-ECO (T3) menyusul karena
    // seluruh data yang ditemukan wajib dipakai sampai batas 7 (KMK angka 4.a).
    expect(hasil.baris.map(b => b.kodeLelang)).toEqual(['PP-2', 'PP-1', 'PP-3', 'PKB-ECO'])
    expect(hasil.baris.filter(b => b.kodeLelang.startsWith('PP')).every(b => b.tahap === 8)).toBe(true)
    expect(hasil.baris[3].tahap).toBe(3)
  })

  it('tahun pembuatan terdekat didahulukan: ±3 tahun mengisi 3 slot tanpa menyentuh selisih 5 tahun', () => {
    const kandidat = [
      k({ kode: 'JAUH', tipe: 'FD 110', tahunPembuatan: 2007, harga: 1_000_000 }),
      k({ kode: 'DEKAT', tipe: 'FD 110', tahunPembuatan: 2003, harga: 2_000_000 }),
      k({ kode: 'DEKAT2', tipe: 'FD 110', tahunPembuatan: 2001, harga: 3_000_000 }),
      k({ kode: 'DEKAT3', tipe: 'FD 110', tahunPembuatan: 2003, harga: 500_000 }),
    ]
    const hasil = generateBarisPembanding(kandidat, { ...objek, tipe: 'FD 110', tahunPembuatan: 2002, tahunTaksiran: 2026 })
    // Δtahun 1 (DEKAT/DEKAT2/DEKAT3, urut harga) cukup untuk minimal 3 —
    // JAUH (Δ5) tidak diambil sebelum jatah ±3 tahun habis (KMK angka 3.b)
    expect(hasil.baris.map(b => b.kodeLelang)).toEqual(['DEKAT3', 'DEKAT', 'DEKAT2'])
  })

  it('selisih 4-5 tahun baru dipakai bila kandidat ±3 tahun kurang dari 3', () => {
    const kandidat = [
      k({ kode: 'DEKAT', tipe: 'FD 110', tahunPembuatan: 2003, harga: 2_000_000 }),
      k({ kode: 'JAUH1', tipe: 'FD 110', tahunPembuatan: 2006, harga: 1_000_000 }),
      k({ kode: 'JAUH2', tipe: 'FD 110', tahunPembuatan: 2007, harga: 1_500_000 }),
    ]
    const hasil = generateBarisPembanding(kandidat, { ...objek, tipe: 'FD 110', tahunPembuatan: 2002, tahunTaksiran: 2026 })
    // ±3 hanya 1 data → lanjut ±4-5: JAUH1 (Δ4) didahulukan JAUH2 (Δ5)
    expect(hasil.baris.map(b => b.kodeLelang)).toEqual(['DEKAT', 'JAUH1', 'JAUH2'])
  })

  it('Tahap 9: merek berbeda dengan tipe terdekat pada wilayah kerja', () => {
    const kandidat = [
      k({ kode: 'Y1', merek: 'Yamaha', tipe: 'Mio MCB', harga: 3_500_000 }),
      k({ kode: 'Y2', merek: 'Yamaha', tipe: 'Nmax', harga: 3_600_000 }),
      k({ kode: 'Y3', merek: 'Suzuki', tipe: 'MCB', harga: 3_700_000 }),
    ]
    const hasil = generateBarisPembanding(kandidat, { ...objek, merek: 'Kawasaki' })
    // Y3 (tipe MCB persis, skor 100) > Y1 (Mio MCB, 50) > Y2 (Nmax, 0)
    expect(hasil.baris.map(b => b.kodeLelang)).toEqual(['Y3', 'Y1', 'Y2'])
    expect(hasil.ringkasanTahap[0].tahap).toBe(9)
  })
})

describe('ringkasan basis data', () => {
  it('kategoriPerKpknl memakai nilai terbanyak dan menyimpan label semester', () => {
    const kat = kategoriPerKpknl([
      k({ kode: '1' }), k({ kode: '2' }), k({ kode: '3', katLokasi: 2 }),
    ])
    expect(kat.get('pekanbaru')).toEqual({ kat: 1, sumber: 'SEMESTER I 2025' })
  })
  it('daftarKpknl mengurutkan nama dan menyertakan kategori', () => {
    const daftar = daftarKpknl([k({ kode: '1' }), k({ kode: '2', kpknl: 'KPKNL Ambon' })])
    expect(daftar[0].nama).toBe('KPKNL Ambon')
    expect(daftar[1].nama).toBe('KPKNL Pekanbaru')
    expect(daftar[1].kat).toBe(1)
  })
})
