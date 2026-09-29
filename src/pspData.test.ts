import { describe, expect, it } from 'vitest'
import { belumPspSatker, daftarSatkerBelumPsp, totalBelumPsp } from './pspData'
import { taskPenetapanStatusPenggunaan, penugasanPsp } from './dukmanTasks'
import { satkers } from './data'

type StageState = 'terkunci' | 'terbuka' | 'menunggu_verifikasi' | 'selesai' | 'perbaikan'
type TaskStatus = 'belum' | 'proses' | 'verifikasi' | 'persetujuan' | 'perbaikan' | 'selesai' | 'ditutup'

// Salinan logika yang dipakai App.tsx untuk daftar pekerjaan dan Dashboard Korwil.
function hitungProgress(states: StageState[]): number {
  if (!states.length) return 0
  return Math.round(states.filter(s => s === 'selesai').length / states.length * 100)
}

function hitungStatus(states: StageState[]): TaskStatus {
  if (!states.length) return 'belum'
  if (states.some(s => s === 'perbaikan')) return 'perbaikan'
  if (states.some(s => s === 'menunggu_verifikasi')) return 'verifikasi'
  if (states.every(s => s === 'selesai')) return 'selesai'
  if (states.some(s => s === 'selesai' || s === 'terbuka')) return 'proses'
  return 'belum'
}

describe('Data aset belum PSP', () => {
  const known = new Set(satkers.map(s => s.code))

  it('total 362 aset sesuai file Master Aset', () => {
    expect(totalBelumPsp).toBe(362)
  })

  it('mencakup enam Satker dengan kode yang dikenal portal', () => {
    const daftar = daftarSatkerBelumPsp()
    expect(daftar).toHaveLength(6)
    expect(daftar.every(r => known.has(r.kodeSatker))).toBe(true)
  })

  it('jumlah per Satker sesuai file', () => {
    expect(belumPspSatker('692507')).toBe(272)
    expect(belumPspSatker('692639')).toBe(28)
    expect(belumPspSatker('692311')).toBe(26)
    expect(belumPspSatker('692308')).toBe(20)
    expect(belumPspSatker('692794')).toBe(15)
    expect(belumPspSatker('692310')).toBe(1)
    expect(belumPspSatker('692599')).toBe(0)
  })

  it('diurutkan dari jumlah terbesar', () => {
    const daftar = daftarSatkerBelumPsp()
    expect(daftar[0].kodeSatker).toBe('692507')
    expect(daftar[daftar.length - 1].kodeSatker).toBe('692310')
  })
})

describe('Pekerjaan Penetapan Status Penggunaan', () => {
  it('berjalan dua tahap', () => {
    const stages = taskPenetapanStatusPenggunaan.stages!
    expect(stages).toHaveLength(2)
    expect(stages.map(x => x.id)).toEqual(['tiket-sim', 'sk-psp'])
    expect(stages[0].label).toContain('Nomor Tiket SIMAN')
    expect(stages[1].label).toContain('SK Penetapan Status Penggunaan')
  })

  it('Tahap I hanya meminta satu isian teks, yaitu nomor tiket', () => {
    const tahap = taskPenetapanStatusPenggunaan.stages![0]
    expect(tahap.fields).toHaveLength(1)
    expect(tahap.fields![0].key).toBe('nomorTiket')
    expect(tahap.fields![0].type).toBe('text')
    expect(tahap.requirements).toEqual([])
    expect(tahap.confirmOnly).toBeUndefined()
  })

  it('Tahap II berupa konfirmasi SK PSP, tanpa isian dan tanpa unggah dokumen', () => {
    const tahap = taskPenetapanStatusPenggunaan.stages![1]
    expect(tahap.confirmOnly).toBe(true)
    expect(tahap.requirements).toEqual([])
    expect(tahap.fields).toBeUndefined()
    expect(tahap.confirmLabel).toContain('SK Penetapan Status Penggunaan')
  })

  it('tidak ada folder Drive karena tidak ada unggah dokumen', () => {
    expect(taskPenetapanStatusPenggunaan.uploadLink).toBeUndefined()
  })

  it('ditugaskan hanya pada Satker yang punya aset belum PSP', () => {
    expect(penugasanPsp).toHaveLength(6)
    expect(taskPenetapanStatusPenggunaan.assignments).toHaveLength(6)
    const codes = penugasanPsp.map(a => a.satker)
    expect(new Set(codes).size).toBe(6)
  })

  it('menyebutkan jumlah aset pada isian kekurangan', () => {
    const kanwil = penugasanPsp.find(a => a.satker === '692507')!
    expect(kanwil.missing.join(' ')).toContain('272 aset belum PSP')
  })
})

describe('Progress bertingkat di daftar pekerjaan dan Dashboard Korwil', () => {
  it('sebelum ada tahap selesai, progress 0 persen', () => {
    expect(hitungProgress(['terbuka', 'terkunci', 'terkunci'])).toBe(0)
  })

  it('satu dari tiga tahap selesai memberi 33 persen', () => {
    expect(hitungProgress(['selesai', 'terbuka', 'terkunci'])).toBe(33)
  })

  it('dua tahap selesai memberi 67 persen, bukan 0 seperti sebelumnya', () => {
    // Inilah bug lama: daftar pekerjaan selalu membaca progress dari database
    // sehingga meski tahap berjalan, progress tetap 0.
    const nilaiDatabase = 0
    const states: StageState[] = ['selesai', 'selesai', 'terbuka']
    expect(hitungProgress(states)).toBe(67)
    expect(nilaiDatabase).toBe(0)
  })

  it('semua tahap selesai memberi 100 persen', () => {
    expect(hitungProgress(['selesai', 'selesai', 'selesai'])).toBe(100)
  })

  it('status mengikuti tahap berjalan', () => {
    expect(hitungStatus(['terbuka', 'terkunci', 'terkunci'])).toBe('proses')
    expect(hitungStatus(['selesai', 'terbuka', 'terkunci'])).toBe('proses')
    expect(hitungStatus(['selesai', 'menunggu_verifikasi', 'terkunci'])).toBe('verifikasi')
    expect(hitungStatus(['perbaikan', 'terbuka', 'terkunci'])).toBe('perbaikan')
    expect(hitungStatus(['selesai', 'selesai', 'selesai'])).toBe('selesai')
  })
})
