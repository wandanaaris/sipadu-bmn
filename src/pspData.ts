// Data aset yang belum memiliki Penetapan Status Penggunaan (PSP).
// Sumber: "Master Aset\aset belum psp.xlsx" — export SIMAN, 362 baris.
import { satkers } from './data'

export type RingkasanPsp = {
  kodeSatker: string
  namaSatker: string
  belumPsp: number
}

const namaResmi: Record<string, string> = Object.fromEntries(
  satkers.map(s => [s.code, s.name]),
)

const jumlahPerSatker: Record<string, number> = {
  '692507': 272,
  '692639': 28,
  '692311': 26,
  '692308': 20,
  '692794': 15,
  '692310': 1,
}

export const totalBelumPsp = Object.values(jumlahPerSatker).reduce((n, v) => n + v, 0)

export function daftarSatkerBelumPsp(): RingkasanPsp[] {
  return Object.entries(jumlahPerSatker)
    .map(([kodeSatker, belumPsp]) => ({
      kodeSatker,
      namaSatker: namaResmi[kodeSatker] ?? kodeSatker,
      belumPsp,
    }))
    .sort((a, b) => b.belumPsp - a.belumPsp)
}

export function belumPspSatker(kodeSatker: string): number {
  return jumlahPerSatker[kodeSatker] ?? 0
}

export const pspSatkers = daftarSatkerBelumPsp()
