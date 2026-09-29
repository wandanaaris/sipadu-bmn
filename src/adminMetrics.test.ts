import { describe, expect, it } from 'vitest'
import type { Task } from './data'
import { satkers } from './data'
import {
  barisSatker,
  filterTugas,
  kategoriPekerjaan,
  papanTindakan,
  ringkasanAngka,
  setNamaSatker,
} from './adminMetrics'

setNamaSatker(satkers.map(s => [s.code, s.name] as [string, string]))

const tugas = (
  id: string,
  title: string,
  items: Array<{ satker: string; status: Task['assignments'][number]['status']; progress: number; updated?: string }>,
  extra: Partial<Task> = {},
): Task => ({
  id,
  title,
  description: '',
  method: 'portal',
  due: '30 September 2026',
  letter: '',
  active: true,
  priority: 'normal',
  assignments: items.map(i => ({
    satker: i.satker,
    status: i.status,
    progress: i.progress,
    missing: [],
    updated: i.updated ?? new Date().toISOString(),
    revisionCount: 0,
  })),
  ...extra,
})

const contoh: Task[] = [
  tugas('sertifikasi-tanah-2026', 'Sertifikasi Tanah', [
    { satker: '692308', status: 'selesai', progress: 100 },
    { satker: '692309', status: 'belum', progress: 0 },
    { satker: '692311', status: 'proses', progress: 50 },
  ]),
  tugas('penetapan-status-penggunaan-2026', 'Penetapan Status Penggunaan', [
    { satker: '692308', status: 'belum', progress: 0 },
    { satker: '692309', status: 'perbaikan', progress: 40 },
  ]),
  tugas('penghapusan-bmn-rusak-berat-a-2026', 'Penghapusan BMN Rusak Berat - Kategori A', [
    { satker: '692308', status: 'proses', progress: 30 },
    { satker: '692309', status: 'selesai', progress: 100 },
  ]),
]

describe('Filter pekerjaan menurut kategori DUKMAN', () => {
  it('semua pekerjaan kembali utuh', () => {
    expect(filterTugas(contoh, 'semua')).toHaveLength(3)
  })

  it('memisahkan tanah, PSP, dan rusak berat', () => {
    expect(filterTugas(contoh, 'tanah').map(t => t.id)).toEqual(['sertifikasi-tanah-2026'])
    expect(filterTugas(contoh, 'psp').map(t => t.id)).toEqual(['penetapan-status-penggunaan-2026'])
    expect(filterTugas(contoh, 'rusak-berat').map(t => t.id)).toEqual(['penghapusan-bmn-rusak-berat-a-2026'])
  })

  it('kategori lainnya menyertakan sisa pekerjaan', () => {
    expect(filterTugas(contoh, 'lainnya')).toHaveLength(0)
  })

  it('daftar kategori selalu punya kunci semu', () => {
    expect(kategoriPekerjaan[0].key).toBe('semua')
    expect(kategoriPekerjaan.length).toBe(6)
  })
})

describe('Papan ketepatan waktu per Satker', () => {
  const baris = barisSatker(contoh)

  it('menghitung jumlah pekerjaan per Satker', () => {
    const Pekanbaru = baris.find(b => b.kodeSatker === '692308')!
    const Bengkalis = baris.find(b => b.kodeSatker === '692309')!
    expect(Pekanbaru.total).toBe(3)
    expect(Bengkalis.total).toBe(3)
  })

  it('tidak menghitung Kanwil sebagai Satker penerima tugas', () => {
    const denganKanwil = barisSatker([
      tugas('x', 'Uji', [{ satker: '692507', status: 'belum', progress: 0 }, { satker: '692308', status: 'selesai', progress: 100 }]),
    ])
    expect(denganKanwil.some(b => b.kodeSatker === '692507')).toBe(false)
  })

  it('menghitung status selesai, berjalan, belum, dan perbaikan', () => {
    const Pekanbaru = baris.find(b => b.kodeSatker === '692308')!
    expect(Pekanbaru.selesai).toBe(1)
    expect(Pekanbaru.belumMulai).toBe(1)
    expect(Pekanbaru.berjalan).toBe(1)
    const Bengkalis = baris.find(b => b.kodeSatker === '692309')!
    expect(Bengkalis.perluPerbaikan).toBe(1)
  })

  it('mengurutkan dari yang paling tertinggal', () => {
    const ketepatan = baris.map(b => b.ketepatanWaktu)
    expect([...ketepatan].sort((a, b) => a - b)).toEqual(ketepatan)
  })

  it('pekerjaan tanpa tenggat tetap dianggap tepat waktu', () => {
    const tanpaTenggat = [tugas('y', 'Tanpa Batas', [{ satker: '692308', status: 'selesai', progress: 100 }], { due: 'Belum ditentukan' })]
    expect(barisSatker(tanpaTenggat)[0].ketepatanWaktu).toBe(100)
  })
})

describe('Papan tindakan Korwil', () => {
  it('menampilkan pekerjaan yang perlu perbaikan', () => {
    const daftar = papanTindakan(contoh)
    expect(daftar.some(t => t.jenis === 'perbaikan')).toBe(true)
  })

  it('menampilkan pekerjaan yang belum dimulai lebih dari tiga hari', () => {
    const limaHariLalu = new Date(Date.now() - 5 * 86_400_000).toISOString()
    const daftar = papanTindakan([
      tugas('z', 'Tertinggal', [{ satker: '692308', status: 'belum', progress: 0, updated: limaHariLalu }]),
    ])
    const item = daftar.find(t => t.jenis === 'dimulai')
    expect(item).toBeTruthy()
    expect(item!.keterangan).toContain('5 hari')
  })

  it('tidak menandai pekerjaan yang baru saja dimulai', () => {
    const daftar = papanTindakan([
      tugas('z', 'Baru', [{ satker: '692308', status: 'belum', progress: 0, updated: new Date().toISOString() }]),
    ])
    expect(daftar.some(t => t.jenis === 'dimulai')).toBe(false)
  })

  it('menandai pekerjaan yang lewat tenggat', () => {
    const lewat = tugas('l', 'Lewat', [{ satker: '692308', status: 'proses', progress: 30 }], { due: '1 Januari 2020' })
    const daftar = papanTindakan([lewat])
    expect(daftar.some(t => t.jenis === 'telat')).toBe(true)
  })

  it('mengurutkan berdasarkan prioritas: verifikasi dulu', () => {
    const daftar = papanTindakan(contoh)
    if (daftar.length > 1) {
      const level = daftar.map(t => t.prioritas)
      expect([...level].sort((a, b) => a - b)).toEqual(level)
    }
  })

  it('dapat disaring per Satker', () => {
    const daftar = papanTindakan(contoh, '692309')
    expect(daftar.every(t => t.kodeSatker === '692309')).toBe(true)
  })
})

describe('Ringkasan angka BMN', () => {
  it('menampilkan aset belum PSP dan rusak berat', () => {
    const angka = ringkasanAngka()
    expect(angka).toHaveLength(2)
    expect(angka[0].label).toContain('PSP')
    expect(angka[0].nilai).toBe('362')
    expect(angka[1].nilai).toBe('1.567')
  })
})
