import { describe, expect, it } from 'vitest'
import type { Task } from './data'
import { mergePreviewAssignments, taskSertifikasiTanah } from './dukmanTasks'

// Bentuk data prod untuk satu Satker yang sudah ada penugasannya.
const dbTask = (assignments: Task['assignments']): Task => ({
  ...taskSertifikasiTanah,
  title: 'Progress Target Sertifikasi Tanah',
  assignments,
})

describe('Penggabungan progress prod dengan Satker tambahan lokal', () => {
  it('memakai status dan progress prod untuk Satker yang sudah ada', () => {
    const merged = mergePreviewAssignments(taskSertifikasiTanah, dbTask([
      { satker: '692311', progress: 60, status: 'proses', missing: [], updated: '22 September 2026, 13.44 WIB', revisionCount: 2 },
    ]))
    const bagansiapiapi = merged.assignments.find(a => a.satker === '692311')!
    expect(bagansiapiapi.status).toBe('proses')
    expect(bagansiapiapi.progress).toBe(60)
    expect(bagansiapiapi.revisionCount).toBe(2)
    expect(bagansiapiapi.updated).toBe('22 September 2026, 13.44 WIB')
  })

  it('menyisipkan Satker baru sekaligus mempertahankan data prod Satker lama', () => {
    const merged = mergePreviewAssignments(taskSertifikasiTanah, dbTask([
      { satker: '692311', progress: 60, status: 'proses', missing: [], updated: '22 September 2026', revisionCount: 2 },
    ]))
    expect(merged.assignments).toHaveLength(15)
    expect(merged.assignments.find(a => a.satker === '692307')?.status).toBe('belum')
    expect(merged.assignments.find(a => a.satker === '692311')?.progress).toBe(60)
  })

  it('tidak mengubah urutan dan identitas Satker dari versi lokal', () => {
    const merged = mergePreviewAssignments(taskSertifikasiTanah, dbTask([
      { satker: '692311', progress: 100, status: 'selesai', missing: [], updated: '22 September 2026', revisionCount: 0 },
    ]))
    expect(merged.assignments.map(a => a.satker)).toEqual(taskSertifikasiTanah.assignments.map(a => a.satker))
  })

  it('berfungsi ketika belum ada penugasan sama sekali di prod', () => {
    const merged = mergePreviewAssignments(taskSertifikasiTanah, dbTask([]))
    expect(merged.assignments.every(a => a.status === 'belum' && a.progress === 0)).toBe(true)
    expect(merged.assignments).toHaveLength(15)
  })

  it('menjalankan status selesai prod tanpa mengulang penugasan', () => {
    const merged = mergePreviewAssignments(taskSertifikasiTanah, dbTask([
      { satker: '692794', progress: 100, status: 'selesai', missing: [], updated: '23 September 2026', revisionCount: 0 },
      { satker: '692311', progress: 25, status: 'perbaikan', missing: ['Capture SRIKANDI'], updated: '22 September 2026', revisionCount: 1 },
    ]))
    const codes = merged.assignments.map(a => a.satker)
    expect(new Set(codes).size).toBe(15)
    expect(merged.assignments.find(a => a.satker === '692794')?.status).toBe('selesai')
    expect(merged.assignments.find(a => a.satker === '692311')?.missing).toEqual(['Capture SRIKANDI'])
  })
})
