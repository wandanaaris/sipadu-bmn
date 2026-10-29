import { describe, expect, it } from 'vitest'
import { terbilang } from './CalbmnKertasKerjaPage'
import { KELOMPOK_CALBMN, barisKosongCalbmn, selisihBaris, validasiMatriks } from './calbmnValidasi'
import type { ItemSewa } from './PemanfaatanFields'

const isi = (over: Partial<ItemSewa>): ItemSewa => ({
  nama: 'Tanah', luas: '', nilai: '',
  saldoAwal: '', mutasiTambah: '', mutasiKurang: '', saldoAkhir: '',
  ...over,
})

describe('Kertas Kerja CalBMN (halaman publik)', () => {
  it('terbilang: nol, ribuan, jutaan, miliar, dengan kapital dan akhiran rupiah', () => {
    expect(terbilang(0)).toBe('Nol rupiah')
    expect(terbilang(1000)).toBe('Seribu rupiah')
    expect(terbilang(31_571_138)).toBe('Tiga puluh satu juta lima ratus tujuh puluh satu ribu seratus tiga puluh delapan rupiah')
    expect(terbilang(826_483_575_186)).toBe('Delapan ratus dua puluh enam miliar empat ratus delapan puluh tiga juta lima ratus tujuh puluh lima ribu seratus delapan puluh enam rupiah')
    expect(terbilang(1_000_000_000_000_000)).toBe('Angka di luar jangkauan terbilang')
  })

  it('delapan kelompok terkunci sesuai urutan laporan CalBMN', () => {
    expect(barisKosongCalbmn()).toHaveLength(8)
    expect(KELOMPOK_CALBMN[0]).toBe('Persediaan')
    expect(KELOMPOK_CALBMN[7]).toBe('BMN Dihentikan Penggunaannya')
  })

  it('rumus awal+tambah-kurang=akhir divalidasi per baris', () => {
    expect(selisihBaris(isi({ saldoAwal: '1.000', mutasiTambah: '500', mutasiKurang: '200', saldoAkhir: '1.300' }))).toBe(0)
    expect(selisihBaris(isi({ saldoAwal: '1.000', saldoAkhir: '999' }))).toBe(1)
    const hasil = validasiMatriks(barisKosongCalbmn())
    expect(hasil.kosong).toBe(true)
  })
})
