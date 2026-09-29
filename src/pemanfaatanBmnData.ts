// Data monitoring Leveraging Pemanfaatan BMN (Sewa) per Satker.
// Sumber: export Monitoring Pengelolaan BMN SIMAN, 20 tiket, TA 2026.
// Kode Satker memakai kode satkers pada portal.

export type StatusTiket = 'selesai' | 'revisi' | 'draft'

export type TiketPemanfaatan = {
  nomor: string
  kodeSatker: string
  namaSatker: string
  status: StatusTiket
  tanggal: string
  nilaiPermohonan: number
  nilaiPenetapan: number
}

export const statusTiketLabel: Record<StatusTiket, string> = {
  selesai: 'Selesai Proses Penerbitan Persetujuan KPKNL',
  revisi: 'Revisi Permohonan Satker',
  draft: 'Draft Permohonan Satker',
}

export const tiketPemanfaatanBmn: TiketPemanfaatan[] = [
  { nomor: 'PPL26081908155728114', kodeSatker: '692484', namaSatker: 'Rutan Kelas IIB Dumai', status: 'selesai', tanggal: '2026-08-19', nilaiPermohonan: 8_750_000, nilaiPenetapan: 27_301_000 },
  { nomor: 'PPL26073009031072013', kodeSatker: '692639', namaSatker: 'Lapas Narkotika Kelas IIB Rumbai', status: 'revisi', tanggal: '2026-07-30', nilaiPermohonan: 0, nilaiPenetapan: 0 },
  { nomor: 'PPL26072915430212267', kodeSatker: '692312', namaSatker: 'Rutan Kelas IIB Rengat', status: 'selesai', tanggal: '2026-07-29', nilaiPermohonan: 0, nilaiPenetapan: 0 },
  { nomor: 'PPL26070210575545748', kodeSatker: '692781', namaSatker: 'Rutan Kelas I Pekanbaru', status: 'revisi', tanggal: '2026-07-02', nilaiPermohonan: 0, nilaiPenetapan: 0 },
  { nomor: 'PPL26042010301408310', kodeSatker: '692484', namaSatker: 'Rutan Kelas IIB Dumai', status: 'selesai', tanggal: '2026-04-20', nilaiPermohonan: 25_000_000, nilaiPenetapan: 35_181_000 },
  { nomor: 'PPL26040614415057621', kodeSatker: '692312', namaSatker: 'Rutan Kelas IIB Rengat', status: 'selesai', tanggal: '2026-04-06', nilaiPermohonan: 0, nilaiPenetapan: 0 },
  { nomor: 'PPL26032508265955274', kodeSatker: '692313', namaSatker: 'Lapas Kelas IIA Tembilahan', status: 'selesai', tanggal: '2026-03-25', nilaiPermohonan: 0, nilaiPenetapan: 0 },
  { nomor: 'PPL26031113540410143', kodeSatker: '692309', namaSatker: 'Lapas Kelas IIA Bengkalis', status: 'draft', tanggal: '2026-03-11', nilaiPermohonan: 12_210_000_000, nilaiPenetapan: 0 },
  { nomor: 'PPL26031112272044862', kodeSatker: '692537', namaSatker: 'Lapas Perempuan Kelas IIA Pekanbaru', status: 'selesai', tanggal: '2026-03-11', nilaiPermohonan: 0, nilaiPenetapan: 0 },
  { nomor: 'PPL26031112030348256', kodeSatker: '692313', namaSatker: 'Lapas Kelas IIA Tembilahan', status: 'selesai', tanggal: '2026-03-11', nilaiPermohonan: 0, nilaiPenetapan: 0 },
  { nomor: 'PPL26030308580840470', kodeSatker: '692316', namaSatker: 'Lapas Kelas IIA Bangkinang', status: 'selesai', tanggal: '2026-03-03', nilaiPermohonan: 0, nilaiPenetapan: 0 },
  { nomor: 'PPL26030209330118246', kodeSatker: '692317', namaSatker: 'Lapas Kelas IIB Pasir Pangarayan', status: 'selesai', tanggal: '2026-03-02', nilaiPermohonan: 500_000, nilaiPenetapan: 1_750_000 },
  { nomor: 'PPL26022711425437135', kodeSatker: '692310', namaSatker: 'Rutan Kelas IIB Siak Sri Indrapura', status: 'selesai', tanggal: '2026-02-27', nilaiPermohonan: 20_100_000, nilaiPenetapan: 46_472_000 },
  { nomor: 'PPL26021308173433811', kodeSatker: '692312', namaSatker: 'Rutan Kelas IIB Rengat', status: 'selesai', tanggal: '2026-02-13', nilaiPermohonan: 0, nilaiPenetapan: 0 },
  { nomor: 'PPL26021112084935616', kodeSatker: '692308', namaSatker: 'Lapas Kelas IIA Pekanbaru', status: 'draft', tanggal: '2026-02-11', nilaiPermohonan: 0, nilaiPenetapan: 0 },
  { nomor: 'PPL26021109343336015', kodeSatker: '692781', namaSatker: 'Rutan Kelas I Pekanbaru', status: 'selesai', tanggal: '2026-02-11', nilaiPermohonan: 0, nilaiPenetapan: 0 },
  { nomor: 'PPL26010211044748810', kodeSatker: '692519', namaSatker: 'Lembaga Pembinaan Khusus Anak Kelas II Pekanbaru', status: 'selesai', tanggal: '2026-01-02', nilaiPermohonan: 0, nilaiPenetapan: 0 },
  { nomor: 'PPL26010210485372021', kodeSatker: '692519', namaSatker: 'Lembaga Pembinaan Khusus Anak Kelas II Pekanbaru', status: 'selesai', tanggal: '2026-01-02', nilaiPermohonan: 0, nilaiPenetapan: 0 },
  { nomor: 'PPL25122310163175121', kodeSatker: '692315', namaSatker: 'Lapas Kelas IIB Selat Panjang', status: 'selesai', tanggal: '2025-12-23', nilaiPermohonan: 0, nilaiPenetapan: 0 },
  { nomor: 'PPL25122010210844161', kodeSatker: '692639', namaSatker: 'Lapas Narkotika Kelas IIB Rumbai', status: 'selesai', tanggal: '2025-12-20', nilaiPermohonan: 0, nilaiPenetapan: 0 },
]

export type RingkasanTiketSatker = {
  kodeSatker: string
  namaSatker: string
  jumlahTiket: number
  tiket: TiketPemanfaatan[]
  totalNilaiPenetapan: number
  totalNilaiPermohonan: number
}

export function ringkasanTiketPerSatker(tiket: TiketPemanfaatan[] = tiketPemanfaatanBmn): RingkasanTiketSatker[] {
  const map = new Map<string, TiketPemanfaatan[]>()
  for (const t of tiket) {
    const list = map.get(t.kodeSatker)
    if (list) list.push(t)
    else map.set(t.kodeSatker, [t])
  }
  return [...map.entries()]
    .map(([kodeSatker, list]) => ({
      kodeSatker,
      namaSatker: list[0].namaSatker,
      jumlahTiket: list.length,
      tiket: list,
      totalNilaiPenetapan: list.reduce((n, t) => n + t.nilaiPenetapan, 0),
      totalNilaiPermohonan: list.reduce((n, t) => n + t.nilaiPermohonan, 0),
    }))
    .sort((a, b) => b.jumlahTiket - a.jumlahTiket || a.namaSatker.localeCompare(b.namaSatker, 'id'))
}
