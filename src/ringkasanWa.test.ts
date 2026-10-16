import { describe, expect, it } from 'vitest'
import type { Task } from './data'
import { normalizeStageStates } from './stageStates'
import { susunRingkasanWA } from './AdminPanels'

// Data nyata dari RPC get_active_portal (14 Oktober 2026) untuk pekerjaan
// "Tindak Lanjut Pemusnahan Persediaan Usang Non-Amunisi".
const barisDb: Array<[string, string, number, unknown]> = [
  ['692311', 'belum', 0, ['terbuka', 'terkunci']],
  ['692316', 'proses', 50, ['selesai', 'terbuka']],
  ['692309', 'verifikasi', 50, ['selesai', 'menunggu_verifikasi']],
  ['692308', 'belum', 0, ['terbuka', 'terkunci']],
  ['692317', 'selesai', 100, ['selesai', 'selesai', null]],
  ['692794', 'belum', 0, ['terbuka', 'terkunci']],
  ['692519', 'proses', 50, ['selesai', 'terbuka']],
  ['692484', 'selesai', 100, ['selesai', 'selesai', null]],
]

const tugas: Task = {
  id: 'persediaan-usang-non-amunisi-2026',
  title: 'Tindak Lanjut Pemusnahan Persediaan Usang Non-Amunisi',
  description: '',
  method: 'spreadsheet',
  due: 'Sesuai batas waktu dalam persetujuan',
  letter: 'Persetujuan Pemusnahan Barang Persediaan Usang jalur NON POLRI',
  active: true,
  priority: 'tinggi',
  workflow: 'staged-destruction',
  stages: [
    { id: 't1', label: 'Tahap I · Pemusnahan Internal', description: '', requirements: [] },
    { id: 't2', label: 'Tahap II · Pelaporan', description: '', requirements: [] },
  ],
  assignments: barisDb.map(([satker, status, progress, stageStates]) =>
    normalizeStageStates({
      satker,
      status: status as Task['assignments'][number]['status'],
      progress,
      missing: [],
      updated: '',
      revisionCount: 0,
      stageStates: stageStates as Task['assignments'][number]['stageStates'],
    }, 2),
  ),
}

describe('Ringkasan WhatsApp memakai status tahap dari database', () => {
  const pesan = susunRingkasanWA(tugas)

  it('menampilkan pekerjaan yang benar-benar selesai', () => {
    const bagianSelesai = pesan.split('BELUM SELESAI')[0]
    expect(bagianSelesai).toContain('SUDAH SELESAI (2)')
    expect(bagianSelesai).toContain('Rutan Kelas IIB Dumai')
    expect(bagianSelesai).toContain('Lapas Kelas IIB Pasir Pangarayan')
    expect(bagianSelesai).toContain('| Selesai | 100%')
  })

  it('tidak lagi menandai pekerjaan yang selesai sebagai belum selesai', () => {
    const bagianBelum = pesan.split('BELUM SELESAI')[1]
    expect(bagianBelum).not.toContain('Rutan Kelas IIB Dumai')
    expect(bagianBelum).not.toContain('Pasir Pangarayan')
    expect(pesan).toContain('BELUM SELESAI (6)')
  })

  it('status tiap Satker sesuai kolom status di database', () => {
    const bagianBelum = pesan.split('BELUM SELESAI')[1]
    expect(bagianBelum).toContain('Lapas Kelas IIA Bengkalis | Menunggu verifikasi | 50%')
    expect(bagianBelum).toContain('Lapas Kelas IIA Bangkinang | Dalam proses | 50%')
    expect(bagianBelum).toContain('Lapas Kelas IIA Bagansiapiapi | Belum dikerjakan | 0%')
    expect(bagianBelum).toContain('Lapas Kelas IIA Pekanbaru | Belum dikerjakan | 0%')
  })

  it('judul, batas waktu, dan dasar ikut tampil', () => {
    expect(pesan).toContain('*Tindak Lanjut Pemusnahan Persediaan Usang Non-Amunisi*')
    expect(pesan).toContain('Batas waktu: Sesuai batas waktu dalam persetujuan')
    expect(pesan).toContain('Dasar: Persetujuan Pemusnahan Barang Persediaan Usang jalur NON POLRI')
  })

  it('setiap bagian dipisah satu baris kosong', () => {
    expect(pesan).toContain('NON POLRI\n\nSUDAH SELESAI (2)')
    expect(pesan).toContain('| 100%\n\nBELUM SELESAI (6)')
  })

  it('bagian yang tidak berlaku ditulis "tidak ada"', () => {
    const tanpaSelesai: Task = {
      ...tugas,
      assignments: tugas.assignments.map(a => normalizeStageStates({ ...a, stageStates: ['terbuka', 'terkunci'] as never }, 2)),
    }
    expect(susunRingkasanWA(tanpaSelesai)).toContain('SUDAH SELESAI: tidak ada')
  })

  it('isi pesan lengkap', () => {
    console.log('\n' + pesan + '\n')
    expect(pesan.length).toBeGreaterThan(0)
  })
})
