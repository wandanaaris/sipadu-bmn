import type { ItemSewa } from './PemanfaatanFields'

// ============================================================
// VALIDASI MATRIKS CALBMN
// Matriks angka kunci per kelompok barang pada pekerjaan CalBMN.
// Isian sengaja OPSIONAL (fase 1): satker yang mengisi mendapat kontrol
// aritmetika otomatis dari skill CalBMN —
//   saldo awal + mutasi tambah − mutasi kurang = saldo akhir.
// Matriks kosong tidak menghalangi pengajuan tahap.
// ============================================================

export const KELOMPOK_CALBMN = [
  'Persediaan',
  'Tanah',
  'Peralatan dan Mesin',
  'Gedung dan Bangunan',
  'Jalan, Irigasi, dan Jaringan',
  'Aset Tetap Lainnya',
  'Konstruksi Dalam Pengerjaan',
  'BMN Dihentikan Penggunaannya',
] as const

// Delapan baris kelompok siap isi — nama kelompok terkunci agar konsisten
// dengan urutan laporan CalBMN dan tidak bergantung operator mengetik ulang.
export const barisKosongCalbmn = (): ItemSewa[] =>
  KELOMPOK_CALBMN.map(nama => ({
    nama,
    luas: '',
    nilai: '',
    saldoAwal: '',
    mutasiTambah: '',
    mutasiKurang: '',
    saldoAkhir: '',
  }))

const angka = (raw: string | undefined): number => {
  const digits = (raw ?? '').replace(/\D/g, '')
  return digits ? Number(digits) : 0
}

// Baris dianggap diisi bila salah satu angkanya tidak nol.
const barisDiisi = (b: ItemSewa): boolean =>
  Boolean(angka(b.saldoAwal) || angka(b.mutasiTambah) || angka(b.mutasiKurang) || angka(b.saldoAkhir))

export const selisihBaris = (b: ItemSewa): number =>
  angka(b.saldoAwal) + angka(b.mutasiTambah) - angka(b.mutasiKurang) - angka(b.saldoAkhir)

export type BarisMatriks = { nama: string; diisi: boolean; selisih: number }

export type HasilMatriks = {
  kosong: boolean
  seimbang: boolean
  lengkap: boolean
  baris: BarisMatriks[]
}

export function validasiMatriks(items: ItemSewa[]): HasilMatriks {
  const baris = items.map(b => ({ nama: b.nama ?? '', diisi: barisDiisi(b), selisih: selisihBaris(b) }))
  const kosong = !baris.some(b => b.diisi)
  const seimbang = baris.every(b => !b.diisi || b.selisih === 0)
  // Lengkap = semua kelompok terisi dan setiap baris seimbang.
  const lengkap = baris.length === KELOMPOK_CALBMN.length && baris.every(b => b.diisi && b.selisih === 0)
  return { kosong, seimbang, lengkap, baris }
}

// Penjaga kelengkapan tahap: matriks kosong TIDAK menghalangi pengajuan
// (opsional), tetapi bila sudah mulai diisi harus lengkap dan seimbang.
export function matriksLengkap(items: ItemSewa[]): boolean {
  const hasil = validasiMatriks(items)
  return hasil.kosong ? true : hasil.lengkap
}
