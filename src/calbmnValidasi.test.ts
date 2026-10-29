import { describe, expect, it } from 'vitest'
import {
  KELOMPOK_CALBMN,
  barisKosongCalbmn,
  matriksLengkap,
  selisihBaris,
  validasiMatriks,
} from './calbmnValidasi'
import type { ItemSewa } from './PemanfaatanFields'

const isi = (over: Partial<ItemSewa>): ItemSewa => ({
  nama: 'Tanah', luas: '', nilai: '',
  saldoAwal: '', mutasiTambah: '', mutasiKurang: '', saldoAkhir: '',
  ...over,
})

describe('Validasi matriks CalBMN', () => {
  it('delapan kelompok sesuai urutan laporan CalBMN', () => {
    expect(KELOMPOK_CALBMN).toEqual([
      'Persediaan', 'Tanah', 'Peralatan dan Mesin', 'Gedung dan Bangunan',
      'Jalan, Irigasi, dan Jaringan', 'Aset Tetap Lainnya',
      'Konstruksi Dalam Pengerjaan', 'BMN Dihentikan Penggunaannya',
    ])
    expect(barisKosongCalbmn()).toHaveLength(8)
  })

  it('matriks kosong tidak menghalangi pengajuan (isian opsional fase 1)', () => {
    expect(matriksLengkap(barisKosongCalbmn())).toBe(true)
    expect(validasiMatriks(barisKosongCalbmn()).kosong).toBe(true)
  })

  it('rumus awal+tambah-kurang=akhir: seimbang dan tidak seimbang', () => {
    const seimbang = isi({ saldoAwilSafe: undefined, saldoAwal: '1000', mutasiTambah: '500', mutasiKurang: '200', saldoAkhir: '1300' } as Partial<ItemSewa>)
    expect(selisihBaris(seimbang)).toBe(0)
    const tidak = isi({ saldoAwal: '1000', mutasiTambah: '500', mutasiKurang: '200', saldoAkhir: '1200' })
    expect(selisihBaris(tidak)).toBe(100)
  })

  it('baris dengan selisih membuat matriks tidak lengkap walau semua terisi', () => {
    const items = barisKosongCalbmn().map(b =>
      b.nama === 'Tanah' ? isi({ ...b, saldoAwal: '10', saldoAkhir: '11' }) : b,
    )
    const hasil = validasiMatriks(items)
    expect(hasil.kosong).toBe(false)
    expect(hasil.seimbang).toBe(false)
    expect(hasil.lengkap).toBe(false)
    expect(matriksLengkap(items)).toBe(false)
  })

  it('matriks lengkap dan seimbang dinyatakan lengkap', () => {
    const items = barisKosongCalbmn().map(b => isi({ ...b, saldoAwal: '100', saldoAkhir: '100' }))
    const hasil = validasiMatriks(items)
    expect(hasil.seimbang).toBe(true)
    expect(hasil.lengkap).toBe(true)
    expect(matriksLengkap(items)).toBe(true)
  })

  it('format ribuan (titik) dibaca dengan benar', () => {
    const b = isi({ saldoAwal: '1.000.500', mutasiTambah: '500', saldoAkhir: '1.001.000' })
    expect(selisihBaris(b)).toBe(0)
  })
})
