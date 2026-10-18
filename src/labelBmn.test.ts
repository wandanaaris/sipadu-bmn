// @vitest-environment jsdom
/// <reference types="vitest" />
import { describe, it, expect } from 'vitest'
import {
  bandingNup,
  badgeUntuk,
  daftarPetugas,
  daftarRuang,
  dariJsonb,
  fisikDiKanwil,
  kunciBaris,
  merkKosong,
  persenSelesai,
  saringBaris,
  sudahSelesai,
  sisaPekerjaan,
  urutkanBaris,
  type BarisLabel,
  type RekapSumber,
} from './labelBmn'

const baris = (sebagian: Partial<BarisLabel>): BarisLabel => ({
  kodeRegister: 'REG-1',
  kodeBarang: '3050201003',
  nup: '1',
  namaBarang: 'Lemari Besi/Metal',
  merk: '',
  merkSimpan: '',
  merkTerisi: false,
  kondisi: 'Baik',
  kondisiReal: null,
  fotoUrl: null,
  fotoUkuran: null,
  statusBmn: 'Aktif',
  noPsp: '',
  tahunPerolehan: '2024-01-01',
  nilaiPerolehan: 3_000_000,
  nupLama: null,
  sumber: 'Transfer Kanwil Kemenkum',
  lokasiSimpan: '',
  labelTercetak: false,
  sudahDitempel: false,
  tanggalTempel: null,
  petugas: null,
  sudahDiscan: false,
  ruangBaru: null,
  keterangan: null,
  ...sebagian,
})

describe('bandingNup', () => {
  it('mengurut NUP numerik naik, bukan leksikografis', () => {
    expect(['10', '2', '1'].sort(bandingNup)).toEqual(['1', '2', '10'])
  })

  it('menaruh NUP non-numerik di akhir', () => {
    expect(['1A', '3', '2B'].sort(bandingNup)).toEqual(['3', '1A', '2B'])
  })
})

describe('sudahSelesai', () => {
  it('selesai hanya bila label sudah ditempel dan sudah discan', () => {
    expect(sudahSelesai(baris({ sudahDitempel: false, sudahDiscan: false }))).toBe(false)
    expect(sudahSelesai(baris({ sudahDitempel: true, sudahDiscan: false }))).toBe(false)
    expect(sudahSelesai(baris({ sudahDitempel: false, sudahDiscan: true }))).toBe(false)
    expect(sudahSelesai(baris({ sudahDitempel: true, sudahDiscan: true }))).toBe(true)
  })
})

describe('saringBaris', () => {
  const daftar = [
    baris({ kodeBarang: 'A', nup: '1', sumber: 'Transfer Kanwil Kemenkum' }),
    baris({ kodeBarang: 'B', nup: '2', sumber: 'Eks Rupbasan Rengat', sudahDitempel: true }),
    baris({ kodeBarang: 'C', nup: '3', sumber: 'Eks Rupbasan Rengat', sudahDitempel: true, sudahDiscan: true, ruangBaru: '010 - TIM TATA USAHA' }),
  ]

  it('menyaring menurut sumber', () => {
    expect(saringBaris(daftar, { sumber: 'Eks Rupbasan Rengat' }).map(b => b.kodeBarang)).toEqual(['B', 'C'])
  })

  it('menyaring dengan status hanya dua: belum dan selesai', () => {
    expect(saringBaris(daftar, { status: 'belum' }).map(b => b.kodeBarang)).toEqual(['A', 'B'])
    expect(saringBaris(daftar, { status: 'selesai' }).map(b => b.kodeBarang)).toEqual(['C'])
  })

  it('menyaring menurut ruang baru', () => {
    expect(saringBaris(daftar, { ruang: '010 - TIM TATA USAHA' }).map(b => b.kodeBarang)).toEqual(['C'])
  })

  it('mencari tanpa peduli huruf besar-kecil di nama, merk, dan keterangan', () => {
    const d = [baris({ kodeBarang: 'A', namaBarang: 'Lemari BESI' }), baris({ kodeBarang: 'B', namaBarang: 'Meja Kayu' })]
    expect(saringBaris(d, { cari: 'besi' }).map(b => b.kodeBarang)).toEqual(['A'])
  })

  it('mencari juga pada keterangan', () => {
    const d = [baris({ kodeBarang: 'A', keterangan: 'label rusak, tempel ulang' })]
    expect(saringBaris(d, { cari: 'tempel ulang' })).toHaveLength(1)
  })

  it('mengembalikan semua bila filter kosong', () => {
    expect(saringBaris(daftar, {})).toHaveLength(3)
  })
})

describe('urutkanBaris', () => {
  it('mengurut sumber sesuai URUTAN_SUMBER lalu kode barang lalu NUP numerik', () => {
    const daftar = [
      baris({ kodeBarang: '3050201003', nup: '10', sumber: 'PSP lain (Kanwil)' }),
      baris({ kodeBarang: '3050201003', nup: '2', sumber: 'PSP lain (Kanwil)' }),
      baris({ kodeBarang: '3010110005', nup: '1', sumber: 'Eks Rupbasan Rengat' }),
      baris({ kodeBarang: '3010110005', nup: '1', sumber: 'Transfer Kanwil Kemenkum' }),
    ]
    expect(urutkanBaris(daftar).map(b => `${b.sumber}/${b.kodeBarang}/${b.nup}`)).toEqual([
      'Transfer Kanwil Kemenkum/3010110005/1',
      'Eks Rupbasan Rengat/3010110005/1',
      'PSP lain (Kanwil)/3050201003/2',
      'PSP lain (Kanwil)/3050201003/10',
    ])
  })
})

describe('daftarRuang', () => {
  it('mengumpulkan ruang unik tanpa yang kosong, terurut abjad', () => {
    const d = [
      baris({ ruangBaru: '015 - GUDANG UMUM DAN BMN' }),
      baris({ ruangBaru: '010 - TIM TATA USAHA' }),
      baris({ ruangBaru: '010 - TIM TATA USAHA' }),
      baris({ ruangBaru: null }),
      baris({ ruangBaru: '   ' }),
    ]
    expect(daftarRuang(d)).toEqual(['010 - TIM TATA USAHA', '015 - GUDANG UMUM DAN BMN'])
  })
})

describe('rekap', () => {
  const r: RekapSumber = {
    sumber: 'Eks Rupbasan Rengat',
    total: 107,
    selesai: 40,
    labelTercetak: 96,
    berlokasi: 1,
    merkKosong: 31,
    kondisiTerisi: 0,
    fotoAda: 0,
  }

  it('sisaPekerjaan = total - selesai', () => {
    expect(sisaPekerjaan(r)).toBe(67)
  })

  it('persenSelesai dibulatkan dan dibatasi 100', () => {
    expect(persenSelesai(0, 0)).toBe(0)
    expect(persenSelesai(3, 1)).toBe(33)
    expect(persenSelesai(2, 5)).toBe(100)
  })
})

describe('dariJsonb', () => {
  it('mengubah jsonb RPC menjadi BarisLabel, null menjadi kosong', () => {
    expect(dariJsonb({
      kodeRegister: 'E12B81F5C7FB6B7BE0531561F20ABCB6',
      kodeBarang: '3050201003', nup: '7', namaBarang: 'Lemari Besi/Metal',
      merk: null, merkSimpan: null, merkTerisi: false,
      kondisi: 'Baik', statusBmn: 'Aktif', noPsp: 'SEK.3-PB.03.01-904',
      sumber: 'Eks Rupbasan Rengat', lokasiSimpan: '',
      labelTercetak: false,
      sudahDitempel: false, tanggalTempel: null, petugas: null,
      sudahDiscan: false, ruangBaru: null, keterangan: null,
    })).toEqual(baris({
      kodeRegister: 'E12B81F5C7FB6B7BE0531561F20ABCB6',
      kodeBarang: '3050201003', nup: '7', noPsp: 'SEK.3-PB.03.01-904',
      tahunPerolehan: '',
      nilaiPerolehan: null,
      nupLama: null,
      sumber: 'Eks Rupbasan Rengat',
    }))
  })

  it('membaca tahun perolehan, kondisi real, dan foto', () => {
    const b = dariJsonb({
      kodeBarang: '3050201020', nup: '4', merk: 'FUTURA',
      tahunPerolehan: '2026-03-11',
      kondisiReal: 'Rusak Ringan',
      fotoUrl: 'data:image/jpeg;base64,AAAA', fotoUkuran: 314572,
    })
    expect(b.tahunPerolehan).toBe('2026-03-11')
    expect(b.kondisiReal).toBe('Rusak Ringan')
    expect(b.fotoUkuran).toBe(314572)
  })

  it('membaca nilai perolehan dan NUP lama (Transfer Kanwil Kemenkum)', () => {
    const b = dariJsonb({
      kodeBarang: '3050104001', nup: '10', namaBarang: 'Lemari Besi/Metal',
      tahunPerolehan: '2018-05-01',
      nilaiPerolehan: 3487000,
      nupLama: '37',
      sumber: 'Transfer Kanwil Kemenkum',
    })
    expect(b.nilaiPerolehan).toBe(3487000)
    expect(b.nupLama).toBe('37')
  })

  it('NUP lama bernilai null bila kosong, dan nilai nol dibaca angka 0', () => {
    const b = dariJsonb({
      kodeBarang: '3050104003', nup: '3', namaBarang: 'Rak Besi',
      tahunPerolehan: '2015-01-01',
      nilaiPerolehan: 0,
      nupLama: null,
      sumber: 'Eks Rupbasan Rengat',
    })
    expect(b.nupLama).toBeNull()
    expect(b.nilaiPerolehan).toBe(0)
  })

  it('membaca merk hasil pengisian terpisah dari merk SIMAN', () => {
    const b = dariJsonb({
      kodeBarang: '3050104001', nup: '3', merk: 'OLYMPIC',
      merkSimpan: '', merkTerisi: true,
    })
    expect(b.merk).toBe('OLYMPIC')
    expect(b.merkTerisi).toBe(true)
    expect(merkKosong(b)).toBe(false)
  })

  it('tahan terhadap jsonb kosong atau null', () => {
    expect(dariJsonb(null).namaBarang).toBe('')
    expect(dariJsonb({}).sudahDitempel).toBe(false)
  })
})

describe('merkKosong', () => {
  it('benar bila belum ada di SIMAN dan belum diisi manual', () => {
    expect(merkKosong(baris({ merkSimpan: '', merkTerisi: false }))).toBe(true)
  })

  it('salah bila sudah diisi manual walau SIMAN kosong', () => {
    expect(merkKosong(baris({ merk: 'BROTHER', merkSimpan: '', merkTerisi: true }))).toBe(false)
  })

  it('salah bila SIMAN sudah punya merk', () => {
    expect(merkKosong(baris({ merkSimpan: 'ELITE', merkTerisi: false }))).toBe(false)
  })
})

describe('badgeUntuk', () => {
  it('memberi label singkat dan kelas berbeda per sumber asal', () => {
    expect(badgeUntuk('Transfer Kanwil Kemenkum')).toEqual({ label: 'Transfer Kemenkum', kelas: 'asal-kemenkum' })
    expect(badgeUntuk('Eks Rupbasan Rengat').kelas).toBe('asal-rengat')
    expect(badgeUntuk('Eks Rupbasan Bangkinang').kelas).toBe('asal-bangkinang')
    expect(badgeUntuk('Eks Rupbasan Bengkalis').kelas).toBe('asal-bengkalis')
    expect(badgeUntuk('PSP lain (Kanwil)').kelas).toBe('asal-kanwil')
  })

  it('tidak ada dua sumber yang berbagi kelas badge yang sama', () => {
    const kelas = ['Transfer Kanwil Kemenkum', 'Eks Rupbasan Rengat', 'Eks Rupbasan Bangkinang', 'Eks Rupbasan Bengkalis', 'PSP lain (Kanwil)']
      .map(s => badgeUntuk(s).kelas)
    expect(new Set(kelas).size).toBe(kelas.length)
  })

  it('memakai kelas cadangan untuk sumber tak dikenal', () => {
    expect(badgeUntuk('Sumber Baru').kelas).toBe('asal-lain')
  })
})

describe('daftarPetugas', () => {
  it('mengumpulkan petugas unik tanpa yang kosong, terurut', () => {
    const d = [
      baris({ petugas: 'Budi' }),
      baris({ petugas: 'Andi' }),
      baris({ petugas: 'Budi' }),
      baris({ petugas: null }),
      baris({ petugas: '  ' }),
    ]
    expect(daftarPetugas(d)).toEqual(['Andi', 'Budi'])
  })
})

describe('fisikDiKanwil', () => {
  it('benar bila keterangan diawali "Fisik sudah di Kanwil"', () => {
    expect(fisikDiKanwil(baris({ keterangan: 'Fisik sudah di Kanwil (hasil ASP eks Rupbasan Rengat)' }))).toBe(true)
    expect(fisikDiKanwil(baris({ keterangan: 'Fisik sudah di Kanwil (hasil ASP eks Rupbasan Bengkalis)' }))).toBe(true)
  })

  it('salah untuk keterangan lain atau kosong', () => {
    expect(fisikDiKanwil(baris({ keterangan: 'label rusak, tempel ulang' }))).toBe(false)
    expect(fisikDiKanwil(baris({ keterangan: null }))).toBe(false)
    expect(fisikDiKanwil(baris({ keterangan: '  ' }))).toBe(false)
  })
})

describe('kunciBaris', () => {
  it('memakai kode register agar aset berkode barang + NUP sama tetap terpisah', () => {
    const a = baris({ kodeRegister: 'REG-A', kodeBarang: '3050104001', nup: '1' })
    const b = baris({ kodeRegister: 'REG-B', kodeBarang: '3050104001', nup: '1' })
    expect(kunciBaris(a)).not.toBe(kunciBaris(b))
    expect(kunciBaris(a)).toBe('3050104001/1/REG-A')
  })
})
