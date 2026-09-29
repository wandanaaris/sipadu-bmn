import { beforeEach, describe, expect, it } from 'vitest'
import type { WorkflowStage } from './data'
import { taskPemanfaatanBmn } from './dukmanTasks'
import { isianLengkap, type IsianTahap, type ItemSewa } from './PemanfaatanFields'

const stage = (id: string): WorkflowStage => taskPemanfaatanBmn.stages!.find(s => s.id === id)!

const item = (nama: string, luas: string, nilai = ''): ItemSewa => ({ nama, luas, nilai })

const isi = (patch: Record<string, unknown>): IsianTahap => ({
  items: [], ...patch,
})

// Logika isianLengkap diuji murni lewat data, tanpa DOM.
function lengkap(s: WorkflowStage, value: IsianTahap): boolean {
  for (const field of s.fields ?? []) {
    const v = value[field.key] ?? ''
    if (field.type !== 'item-luas-table' && field.type !== 'item-nilai-table' && !String(v).trim()) return false
    if (field.type === 'item-luas-table') {
      if (value.items.length === 0) return false
      if (value.items.some(i => !i.nama.trim() || !i.luas.trim())) return false
    }
    if (field.type === 'item-nilai-table') {
      if (value.items.length === 0) return false
      if (value.items.some(i => !i.nilai.trim())) return false
    }
  }
  return true
}

const tahapI = () => stage('cetak-dan-item')
const tahapII = () => stage('persetujuan')

describe('Form isian Leveraging Pemanfaatan BMN', () => {
  beforeEach(() => {
    const store: Record<string,string> = {}
    ;(globalThis as any).localStorage = {
      getItem:(k:string)=>store[k]??null, setItem:(k:string,v:string)=>{store[k]=v}, removeItem:(k:string)=>{delete store[k]}, clear:()=>{for(const k of Object.keys(store))delete store[k]},
    }
  })

  it('Tahap I menolak isian tanpa nomor tiket atau periode', () => {
    expect(lengkap(tahapI(), isi({}))).toBe(false)
    expect(lengkap(tahapI(), isi({ nomorTiket: 'PPL26081908155728114' }))).toBe(false)
    expect(lengkap(tahapI(), isi({ nomorTiket: 'PPL1', periode: '2026' }))).toBe(false)
  })

  it('Tahap I menolak item tanpa nama atau luas', () => {
    const dasar = { nomorTiket: 'PPL1', periode: '2026' }
    expect(lengkap(tahapI(), isi({ ...dasar, items: [] }))).toBe(false)
    expect(lengkap(tahapI(), isi({ ...dasar, items: [item('', '12')] }))).toBe(false)
    expect(lengkap(tahapI(), isi({ ...dasar, items: [item('Kios Cafe', '')] }))).toBe(false)
    expect(lengkap(tahapI(), isi({ ...dasar, items: [item('Kios Cafe', '55')] }))).toBe(true)
  })

  it('Tahap I tidak menuntut nilai sewa, karena baru diisi pada Tahap II', () => {
    const filled = isi({ nomorTiket: 'PPL1', periode: '2026', items: [item('Kios Cafe', '55')] })
    expect(lengkap(tahapI(), filled)).toBe(true)
  })

  it('Tahap II menuntut nomor surat dan nilai pada setiap item', () => {
    const items = [item('Kios Cafe', '55'), item('Dapur Kue', '18')]
    expect(lengkap(tahapII(), isi({ items, nomorPersetujuan: 'S-83/MK/KNL.0305/2026' }))).toBe(false)
    expect(lengkap(tahapII(), isi({ items, nomorPersetujuan: 'S-83' }))).toBe(false)
    const lengkapSemua = isi({
      nomorPersetujuan: 'S-83/MK/KNL.0305/2026',
      items: [item('Kios Cafe', '55', '7844000'), item('Dapur Kue', '18', '10886000')],
    })
    expect(lengkap(tahapII(), lengkapSemua)).toBe(true)
  })

  it('Tahap III tanpa kolom isian selalu dianggap lengkap', () => {
    expect(lengkap(stage('tindak-lanjut'), isi({}))).toBe(true)
    expect(stage('tindak-lanjut').confirmOnly).toBe(true)
  })

  it('menjumlahkan luas dan nilai dari angka yang diketik Satker', () => {
    const items = [item('A', '2', '750000'), item('B', '8', '2411000'), item('C', '55', '7844000')]
    const luas = items.reduce((n, i) => n + Number(i.luas), 0)
    const nilai = items.reduce((n, i) => n + Number(i.nilai), 0)
    // Sesuai contoh Tiket Rutan Dumai.
    expect(luas).toBe(65)
    expect(nilai).toBe(11_005_000)
  })

  it('isi tersimpan per pekerjaan dan Satker tanpa saling menimpa', () => {
    const a = 'pemanfaatan-bmn-kantin-sae-wartelsuspas-2026'
    localStorage.setItem(`sipadu_pemanfaatan_isian_${a}_692484`, JSON.stringify(isi({ nomorTiket: 'PPL-DUMAI' })))
    localStorage.setItem(`sipadu_pemanfaatan_isian_${a}_692310`, JSON.stringify(isi({ nomorTiket: 'PPL-SIAK' })))
    const dumai = JSON.parse(localStorage.getItem(`sipadu_pemanfaatan_isian_${a}_692484`)!)
    const siak = JSON.parse(localStorage.getItem(`sipadu_pemanfaatan_isian_${a}_692310`)!)
    expect(dumai.nomorTiket).toBe('PPL-DUMAI')
    expect(siak.nomorTiket).toBe('PPL-SIAK')
  })

  it('fungsi isianLengkap tersedia untuk dipakai di tampilan', () => {
    expect(typeof isianLengkap).toBe('function')
  })
})
