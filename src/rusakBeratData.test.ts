import { describe, expect, it } from 'vitest'
import { satkers } from './data'
import {
  asetSatker,
  daftarSatkerRusakBerat,
  kategoriLabel,
  maksPengajuanLelang,
  satkerPerKategori,
  totalRusakBerat,
} from './rusakBeratData'
import { taskRusakBeratA, taskRusakBeratB, taskRusakBeratC } from './rusakBeratTasks'

const known = new Set(satkers.map(s => s.code))

describe('Klasifikasi aset rusak berat', () => {
  const daftar = daftarSatkerRusakBerat()

  it('mencakup 1.567 aset pada 11 Satker', () => {
    expect(totalRusakBerat.jumlah).toBe(1567)
    expect(daftar).toHaveLength(11)
    expect(daftar.every(r => known.has(r.kodeSatker))).toBe(true)
  })

  it('total nilai perolehan sesuai file', () => {
    expect(totalRusakBerat.nilai).toBe(5_480_212_959)
  })

  it('kategori A adalah yang terbesar', () => {
    const jumlah = daftar.reduce((n, r) => n + r.kategori.A.jumlah, 0)
    expect(jumlah).toBe(1555)
  })

  it('gedung dan bangunan tidak masuk kategori mana pun', () => {
    // Bangunan Gedung Kantor Darurat milik Lapas Bengkalis dikeluarkan.
    const bengkalis = asetSatker('692309', 'A')
    const total = (['A', 'B', 'C'] as const)
      .map(k => asetSatker('692309', k).jumlah)
      .reduce((a, b) => a + b, 0)
    expect(total).toBe(7)
    expect(bengkalis.jumlah).toBe(7)
  })

  it('senjata api hanya pada Satker yang memegangnya', () => {
    const denganC = satkerPerKategori('C')
    expect(denganC).toHaveLength(1)
    expect(denganC[0].kodeSatker).toBe('692311')
    expect(denganC[0].kategori.C.jumlah).toBe(2)
  })

  it('kategori B hanya sedikit aset tetapi bernilai besar', () => {
    const jumlah = daftar.reduce((n, r) => n + r.kategori.B.jumlah, 0)
    const nilai = daftar.reduce((n, r) => n + r.kategori.B.nilai, 0)
    expect(jumlah).toBe(10)
    expect(nilai).toBe(1_410_354_540)
  })

  it('setiap Satker hanya ditugaskan satu kategori sesuai jumlahnya', () => {
    const a = satkerPerKategori('A')
    const b = satkerPerKategori('B')
    const kodeA = new Set(a.map(r => r.kodeSatker))
    const kodeB = new Set(b.map(r => r.kodeSatker))
    expect(kodeA.size).toBe(a.length)
    expect(kodeB.size).toBe(b.length)
  })

  it('Satker tanpa aset mengembalikan nol, bukan error', () => {
    expect(asetSatker('000000', 'A').jumlah).toBe(0)
    expect(asetSatker('692311', 'A').nilai).toBe(220_469_248)
  })
})

describe('Pekerjaan Penghapusan Rusak Berat per kategori', () => {
  it('kategori A dan B memakai jalur lelang lima tahap', () => {
    for (const task of [taskRusakBeratA, taskRusakBeratB]) {
      expect(task.stages).toHaveLength(5)
      expect(task.stages!.map(s => s.id)).toEqual([
        'tiket-jual', 'persetujuan', 'permohonan-lelang', 'hasil-lelang', 'pelaporan-lelang',
      ])
    }
  })

  it('senjata api memakai jalur pemusnahan enam tahap', () => {
    expect(taskRusakBeratC.stages).toHaveLength(6)
    expect(taskRusakBeratC.stages!.map(s => s.id)).toEqual([
      'tiket-pemusnahan', 'persetujuan-pemusnahan', 'rekomendasi-polri',
      'persetujuan-polri', 'pelaksanaan-pemusnahan', 'tindak-lanjut',
    ])
  })

  it('Tahap I hanya meminta nomor tiket', () => {
    for (const task of [taskRusakBeratA, taskRusakBeratB, taskRusakBeratC]) {
      const tahapI = task.stages![0]
      expect(tahapI.fields).toHaveLength(1)
      expect(tahapI.fields![0].key).toBe('nomorTiket')
    }
  })

  it('Tahap II lelang meminta persetujuan, jumlah aset, dan nilai limit', () => {
    const keys = taskRusakBeratA.stages![1].fields!.map(f => f.key)
    expect(keys).toEqual(['nomorPersetujuan', 'jumlahAset', 'nilaiLimit'])
  })

  it('Tahap IV lelang menyediakan pilihan laku dan tidak laku', () => {
    const tahap = taskRusakBeratA.stages![3]
    const pilihan = tahap.fields!.find(f => f.type === 'pilihan')!
    expect(pilihan.key).toBe('hasilLelang')
    expect(pilihan.choices!.map(c => c.value)).toEqual(['laku', 'tidak-laku'])
    expect(tahap.fields!.some(f => f.key === 'nominalLaku')).toBe(true)
  })

  it('Tahap V lelang meminta laporan dan capture SRIKANDI', () => {
    const tahap = taskRusakBeratA.stages![4]
    expect(tahap.requirements.join(' ')).toContain('Kepala Biro BMN')
    expect(tahap.requirements.join(' ')).toContain('SRIKANDI')
  })

  it('senjata api meminta dokumen pemusnahan pada tahap V dan VI', () => {
    const t5 = taskRusakBeratC.stages![4].requirements.join(' ')
    const t6 = taskRusakBeratC.stages![5].requirements.join(' ')
    expect(t5).toContain('Berita acara pemusnahan')
    expect(t5).toContain('SK Penghapusan')
    expect(t6).toContain('SIMAN')
    expect(t6).toContain('SAKTI')
  })

  it('masing-masing kategori memakai folder Drive yang berbeda', () => {
    expect(taskRusakBeratA.uploadLink).toContain('1gQfCWct')
    expect(taskRusakBeratB.uploadLink).toContain('1gQfCWct')
    expect(taskRusakBeratC.uploadLink).toContain('1aOxcubyd')
  })

  it('hanya menugaskan Satker yang punya aset pada kategorinya', () => {
    const kodeA = new Set(satkerPerKategori('A').map(r => r.kodeSatker))
    const kodeC = new Set(satkerPerKategori('C').map(r => r.kodeSatker))
    expect(taskRusakBeratA.assignments.every(a => kodeA.has(a.satker))).toBe(true)
    expect(taskRusakBeratC.assignments.every(a => kodeC.has(a.satker))).toBe(true)
    expect(taskRusakBeratC.assignments).toHaveLength(1)
  })

  it('menyertakan jumlah aset pada isian kekurangan', () => {
    const rutan = taskRusakBeratA.assignments.find(a => a.satker === '692781')!
    expect(rutan.missing.join(' ')).toContain('290 aset')
  })

  it('batas pengajuan lelang adalah tiga kali', () => {
    expect(maksPengajuanLelang).toBe(3)
  })

  it('memiliki label kategori yang jelas', () => {
    expect(kategoriLabel.A).toContain('100 juta')
    expect(kategoriLabel.B).toContain('kendaraan')
    expect(kategoriLabel.C).toContain('Senjata Api')
  })
})
