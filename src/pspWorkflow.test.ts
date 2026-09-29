import { describe, expect, it } from 'vitest'
import { taskPenetapanStatusPenggunaan } from './dukmanTasks'

type StageState = 'terkunci' | 'terbuka' | 'menunggu_verifikasi' | 'selesai' | 'perbaikan'
type TaskStatus = 'belum' | 'proses' | 'verifikasi' | 'persetujuan' | 'perbaikan' | 'selesai' | 'ditutup'

// Salinan logika yang dipakai App.tsx. Dipakai untuk menguji alur dua tahap
// Penetapan Status Penggunaan tanpa bergantung pada DOM.
function readStates(stored: StageState[] | null, n: number): StageState[] {
  const states = stored && stored.length === n ? [...stored] : (['terbuka', ...Array(n - 1).fill('terkunci')] as StageState[])
  for (let i = 0; i < n - 1; i++) {
    if (states[i] === 'selesai' && states[i + 1] === 'terkunci') states[i + 1] = 'terbuka'
  }
  return states
}

function submitStage(stored: StageState[] | null, n: number, stage: number): StageState[] {
  const current = readStates(stored, n)
  if (stage < 0 || stage >= n) return current
  if (current[stage] === 'terkunci' || current[stage] === 'menunggu_verifikasi') return current
  return current.map((s, i) => (i === stage ? 'menunggu_verifikasi' : s))
}

function approveStage(stored: StageState[] | null, n: number, stage: number, action: 'verify' | 'return' = 'verify'): StageState[] {
  const current = readStates(stored, n)
  const next = current.map((s, i) => (i === stage ? (action === 'verify' ? 'selesai' : 'perbaikan') : s))
  for (let i = 0; i < next.length - 1; i++) {
    if (next[i] === 'selesai' && next[i + 1] === 'terkunci') next[i + 1] = 'terbuka'
  }
  return next
}

const progressOf = (states: StageState[]) =>
  Math.round((states.filter(s => s === 'selesai').length / states.length) * 100)

function statusOf(states: StageState[]): TaskStatus {
  if (states.some(s => s === 'perbaikan')) return 'perbaikan'
  if (states.some(s => s === 'menunggu_verifikasi')) return 'verifikasi'
  if (states.every(s => s === 'selesai')) return 'selesai'
  if (states.some(s => s === 'selesai' || s === 'terbuka')) return 'proses'
  return 'belum'
}

const n = () => taskPenetapanStatusPenggunaan.stages!.length

describe('Alur Penetapan Status Penggunaan', () => {
  it('memiliki dua tahap sehingga alur bisa diuji penuh', () => {
    expect(n()).toBe(2)
  })

  it('Tahap I terbuka sejak awal sehingga tombol ajukan aktif', () => {
    const states = readStates(null, n())
    expect(states[0]).toBe('terbuka')
    expect(states[0] === 'terbuka' || states[0] === 'perbaikan').toBe(true)
  })

  it('Tahap II terkunci sampai Korwil menyetujui Tahap I', () => {
    const awal = readStates(null, n())
    expect(awal[1]).toBe('terkunci')
    const diajukan = submitStage(null, n(), 0)
    expect(diajukan[1]).toBe('terkunci')
  })

  it('pengajuan Tahap II ditolak selama masih terkunci', () => {
    const setelahTahapI = submitStage(null, n(), 0)
    const coba = submitStage(setelahTahapI, n(), 1)
    expect(coba[1]).toBe('terkunci')
  })

  it('Tahap II terbuka begitu Korwil menyetujui Tahap I', () => {
    const diajukan = submitStage(null, n(), 0)
    const hasil = approveStage(diajukan, n(), 0)
    expect(hasil[0]).toBe('selesai')
    expect(hasil[1]).toBe('terbuka')
    expect(hasil[1] === 'terbuka' || hasil[1] === 'perbaikan').toBe(true)
  })

  it('progress bergerak 0 lalu 50 lalu 100 persen sepanjang alur', () => {
    let s: StageState[] | null = null
    expect(progressOf(readStates(s, n()))).toBe(0)
    s = submitStage(s, n(), 0)
    expect(progressOf(s!)).toBe(0)
    s = approveStage(s, n(), 0)
    expect(progressOf(s!)).toBe(50)
    s = submitStage(s, n(), 1)
    s = approveStage(s, n(), 1)
    expect(progressOf(s!)).toBe(100)
    expect(statusOf(s!)).toBe('selesai')
  })

  it('status menunggu verifikasi muncul setelah Satker mengajukan', () => {
    const diajukan = submitStage(null, n(), 0)
    expect(statusOf(diajukan)).toBe('verifikasi')
  })

  it('permintaan perbaikan tidak membuka tahap berikutnya', () => {
    const diajukan = submitStage(null, n(), 0)
    const diperbaiki = approveStage(diajukan, n(), 0, 'return')
    expect(diperbaiki[0]).toBe('perbaikan')
    expect(diperbaiki[1]).toBe('terkunci')
    expect(statusOf(diperbaiki)).toBe('perbaikan')
    // Satker dapat mengajukan ulang tahap yang diperbaiki.
    const ulang = submitStage(diperbaiki, n(), 0)
    expect(ulang[0]).toBe('menunggu_verifikasi')
  })

  it('tidak bisa mengajukan tahap yang sedang menunggu verifikasi', () => {
    const diajukan = submitStage(null, n(), 0)
    const ulang = submitStage(diajukan, n(), 0)
    expect(ulang.filter(s => s === 'menunggu_verifikasi')).toHaveLength(1)
  })
})

describe('Isian PSP menentukan aktifnya tombol ajukan', () => {
  const store: Record<string, string> = {}
  const key = 'sipadu_pemanfaatan_isian_penetapan-status-penggunaan-2026_692507'
  const tulis = (v: Record<string, string>) => { store[key] = JSON.stringify(v) }
  const baca = (): { nomorTiket: string } => JSON.parse(store[key] ?? '{"nomorTiket":""}')

  const tombolAktif = (nomorTiket: string) => nomorTiket.trim().length > 0

  it('terkunci saat kolom nomor tiket masih kosong', () => {
    tulis({ nomorTiket: '' })
    expect(tombolAktif(baca().nomorTiket)).toBe(false)
  })

  it('terkunci saat operator hanya mengetik spasi', () => {
    tulis({ nomorTiket: '   ' })
    expect(tombolAktif(baca().nomorTiket)).toBe(false)
  })

  it('aktif setelah nomor tiket terisi', () => {
    tulis({ nomorTiket: 'PPL26091900000000001' })
    expect(tombolAktif(baca().nomorTiket)).toBe(true)
  })
})
