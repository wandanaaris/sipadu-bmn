import { describe, expect, it } from 'vitest'
import { satkers } from './data'
import { laporServiceTasks, taskLaporServiceBmn } from './laporServiceData'

const knownCodes = new Set(satkers.map(s => s.code))

describe('Lapor Service BMN (pratinjau lokal)', () => {
  it('berjalan pada workflow bertahap empat tahap', () => {
    expect(taskLaporServiceBmn.workflow).toBe('staged-destruction')
    const stages = taskLaporServiceBmn.stages!
    expect(stages.map(s => s.id)).toEqual([
      'laporan-kebutuhan',
      'usulan-berjenjang',
      'persetujuan-pemeliharaan',
      'pelaksanaan',
    ])
  })

  it('Tahap I memakai tabel aset dengan lima kolom dan satu kolom angka', () => {
    const fields = taskLaporServiceBmn.stages![0].fields!
    expect(fields.map(f => f.type)).toEqual(['item-table'])
    const columns = fields[0].columns!
    expect(columns.map(c => c.key)).toEqual(['nama', 'kategori', 'keluhan', 'layanan', 'biaya'])
    expect(columns.find(c => c.key === 'biaya')!.numeric).toBe(true)
    expect(columns.filter(c => c.numeric)).toHaveLength(1)
  })

  it('Tahap II dan III mencatat nomor dan tanggal surat berjenjang', () => {
    const tahapII = taskLaporServiceBmn.stages![1]
    expect(tahapII.fields!.map(f => f.key)).toEqual(['nomorSuratUsulan', 'tanggalUsulan'])
    expect(tahapII.fields!.find(f => f.key === 'tanggalUsulan')!.type).toBe('date')
    const tahapIII = taskLaporServiceBmn.stages![2]
    expect(tahapIII.fields!.map(f => f.key)).toEqual(['nomorPersetujuan', 'tanggalPersetujuan'])
  })

  it('hanya Tahap IV yang konfirmasi tanpa isian', () => {
    const stages = taskLaporServiceBmn.stages!
    expect(stages.slice(0, 3).every(s => !s.confirmOnly)).toBe(true)
    const tahapIV = stages[3]
    expect(tahapIV.confirmOnly).toBe(true)
    expect(tahapIV.confirmLabel).toContain('SIMAN')
  })

  it('tidak memakai unggah dokumen: tanpa folder Drive dan tanpa requirements unggah', () => {
    expect(taskLaporServiceBmn.uploadLink).toBeUndefined()
    expect(taskLaporServiceBmn.stages!.every(s => (s.requirements ?? []).length === 0)).toBe(true)
  })

  it('ditugaskan ke seluruh Satker dengan status awal', () => {
    const codes = taskLaporServiceBmn.assignments.map(a => a.satker)
    expect(codes).toEqual(satkers.map(s => s.code))
    expect(codes.every(c => knownCodes.has(c))).toBe(true)
    expect(new Set(codes).size).toBe(codes.length)
    expect(taskLaporServiceBmn.assignments.every(a => a.status === 'belum' && a.progress === 0)).toBe(true)
  })

  it('modul mengekspor satu pekerjaan pratinjau', () => {
    expect(laporServiceTasks.map(t => t.id)).toEqual(['lapor-service-bmn-2026'])
  })
})
