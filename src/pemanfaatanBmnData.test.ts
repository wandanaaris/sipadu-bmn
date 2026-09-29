import { describe, expect, it } from 'vitest'
import { ringkasanTiketPerSatker, tiketPemanfaatanBmn, statusTiketLabel } from './pemanfaatanBmnData'
import { taskPemanfaatanBmn, penugasanPemanfaatanBmn } from './dukmanTasks'
import { satkers } from './data'

const knownCodes = new Set(satkers.map(s => s.code))
const ids = new Set(tiketPemanfaatanBmn.map(t => t.nomor))

describe('Data monitoring Leveraging Pemanfaatan BMN', () => {
  const ringkasan = ringkasanTiketPerSatker()

  it('memuat 20 tiket pada 13 Satker', () => {
    expect(tiketPemanfaatanBmn).toHaveLength(20)
    expect(ringkasan).toHaveLength(13)
  })

  it('tidak ada nomor tiket yang sama terduplikasi', () => {
    expect(ids.size).toBe(20)
  })

  it('semua kode Satker dikenal portal', () => {
    expect(tiketPemanfaatanBmn.every(t => knownCodes.has(t.kodeSatker))).toBe(true)
  })

  it('mencatat Satker dengan lebih dari satu tiket', () => {
    const rengat = ringkasan.find(r => r.kodeSatker === '692312')!
    expect(rengat.jumlahTiket).toBe(3)
    const beranda = ringkasan.filter(r => r.jumlahTiket > 1)
    expect(beranda.length).toBeGreaterThanOrEqual(6)
  })

  it('total nilai penetapan sesuai rekap sumber', () => {
    const total = ringkasan.reduce((n, r) => n + r.totalNilaiPenetapan, 0)
    expect(total).toBe(110_704_000)
  })

  it('menyimpan status draf dan revisi sebagai proses berjalan', () => {
    const status = new Set(tiketPemanfaatanBmn.map(t => t.status))
    expect(status).toEqual(new Set(['selesai', 'revisi', 'draft']))
    expect(Object.keys(statusTiketLabel).sort()).toEqual(['draft', 'revisi', 'selesai'])
  })

  it('menghasilkan penugasan untuk setiap Satker yang punya tiket', () => {
    expect(penugasanPemanfaatanBmn).toHaveLength(13)
    expect(taskPemanfaatanBmn.assignments).toHaveLength(13)
    expect(penugasanPemanfaatanBmn.every(a => knownCodes.has(a.satker))).toBe(true)
  })

  it('kode Satker pada penugasan unik', () => {
    const codes = penugasanPemanfaatanBmn.map(a => a.satker)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('menyebutkan nomor tiket milik Satker pada isian kekurangan', () => {
    const rengat = penugasanPemanfaatanBmn.find(a => a.satker === '692312')!
    const catatan = rengat.missing.join(' ')
    expect(catatan).toContain('PPL26072915430212267')
    expect(catatan).toContain('PPL26040614415057621')
    expect(catatan).toContain('PPL26021308173433811')
  })
})
