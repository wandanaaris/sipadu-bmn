// Klasifikasi aset rusak berat per kategori tiket penghapusan BMN (DUKMAN ISU-06).
// Sumber: Master Aset\RUSAK BERAT.xlsx, TA 2026.
// Gedung dan bangunan dikecualikan dari seluruh kategori.
import { satkers } from './data'

export type KategoriRusak = 'A' | 'B' | 'C'

export const kategoriLabel: Record<KategoriRusak, string> = {
  A: 'BMN selain tanah dan bangunan, nilai perolehan di bawah 100 juta',
  B: 'BMN kendaraan bermotor dan BMN dengan nilai perolehan di atas 100 juta',
  C: 'BMN Senjata Api',
}

export type AsetPerKategori = { jumlah: number; nilai: number }

export type RingkasanRusakSatker = {
  kodeSatker: string
  namaSatker: string
  kategori: Record<KategoriRusak, AsetPerKategori>
}

// [kode, jumlahA, nilaiA, jumlahB, nilaiB, jumlahC, nilaiC]
const baris: Array<[string, number, number, number, number, number, number]> = [
  ['692307', 207, 403257992, 0, 0, 0, 0],
  ['692309', 7, 172744185, 0, 0, 0, 0],
  ['692311', 183, 220469248, 1, 159500000, 2, 6000000],
  ['692314', 174, 301277121, 0, 0, 0, 0],
  ['692316', 173, 577810075, 0, 0, 0, 0],
  ['692317', 162, 737032157, 0, 0, 0, 0],
  ['692484', 223, 152772892, 1, 387514000, 0, 0],
  ['692507', 67, 175271800, 3, 332707740, 0, 0],
  ['692519', 2, 93561600, 3, 90200000, 0, 0],
  ['692639', 67, 242799385, 1, 174300000, 0, 0],
  ['692781', 290, 986861964, 1, 266132800, 0, 0],
]

const namaResmi = new Map(satkers.map(s => [s.code, s.name]))

const kosong: AsetPerKategori = { jumlah: 0, nilai: 0 }

export function daftarSatkerRusakBerat(): RingkasanRusakSatker[] {
  return baris
    .map(([kodeSatker, jumlahA, nilaiA, jumlahB, nilaiB, jumlahC, nilaiC]) => ({
      kodeSatker,
      namaSatker: namaResmi.get(kodeSatker) ?? kodeSatker,
      kategori: {
        A: { jumlah: jumlahA, nilai: nilaiA },
        B: { jumlah: jumlahB, nilai: nilaiB },
        C: { jumlah: jumlahC, nilai: nilaiC },
      },
    }))
    .sort((a, b) => jumlahTotal(b) - jumlahTotal(a))
}

const jumlahTotal = (r: RingkasanRusakSatker) => r.kategori.A.jumlah + r.kategori.B.jumlah + r.kategori.C.jumlah

export function asetSatker(kodeSatker: string, kategori: KategoriRusak): AsetPerKategori {
  const row = daftarSatkerRusakBerat().find(r => r.kodeSatker === kodeSatker)
  return row?.kategori[kategori] ?? kosong
}

export function satkerPerKategori(kategori: KategoriRusak): RingkasanRusakSatker[] {
  return daftarSatkerRusakBerat().filter(r => r.kategori[kategori].jumlah > 0)
}

export const totalRusakBerat = {
  jumlah: daftarSatkerRusakBerat().reduce((n, r) => n + jumlahTotal(r), 0),
  nilai: daftarSatkerRusakBerat().reduce((n, r) => n + r.kategori.A.nilai + r.kategori.B.nilai + r.kategori.C.nilai, 0),
}

// Jumlah pengajuan lelang maksimum sebelum kembali ke Tahap I.
export const maksPengajuanLelang = 3