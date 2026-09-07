import type { Assignment } from './data'

export const rusakBeratSource = {
  file: 'MONITORING_PENGUSULAN_BMN_RUSAK_BERAT_SIMAN.xlsx',
  totalAssets: 1501,
  totalSatkers: 11,
  hentiGuna: 882,
  belumHentiGuna: 619,
  snapshot: 'Snapshot workbook terbaru — progress dihitung dari Nomor Tiket SIMAN per kategori',
} as const

export const rusakBeratAssignments: Assignment[] = [
  {"satker":"692307","progress":0,"status":"belum","missing":["1 kategori belum memiliki Nomor Tiket SIMAN"],"revisionCount":0,"updated":"Snapshot workbook terbaru"},
  {"satker":"692309","progress":0,"status":"belum","missing":["2 kategori belum memiliki Nomor Tiket SIMAN"],"revisionCount":0,"updated":"Snapshot workbook terbaru"},
  {"satker":"692311","progress":0,"status":"belum","missing":["2 kategori belum memiliki Nomor Tiket SIMAN"],"revisionCount":0,"updated":"Snapshot workbook terbaru"},
  {"satker":"692314","progress":100,"status":"persetujuan","missing":["1 kategori masih menunggu Nomor Persetujuan","Catatan Korwil: tiket sudah dibuat tanggal 13 Februari 2026 namun belum ada menaikkan tiket"],"revisionCount":0,"updated":"Snapshot workbook terbaru"},
  {"satker":"692316","progress":0,"status":"belum","missing":["1 kategori belum memiliki Nomor Tiket SIMAN"],"revisionCount":0,"updated":"Snapshot workbook terbaru"},
  {"satker":"692317","progress":100,"status":"proses","missing":["Pengusulan tiket SIMAN per kategori tercatat lengkap pada snapshot ini; tahapan berikutnya tetap dipantau."],"revisionCount":0,"updated":"Snapshot workbook terbaru"},
  {"satker":"692484","progress":50,"status":"persetujuan","missing":["1 kategori belum memiliki Nomor Tiket SIMAN"],"revisionCount":0,"updated":"Snapshot workbook terbaru"},
  {"satker":"692507","progress":50,"status":"persetujuan","missing":["1 kategori belum memiliki Nomor Tiket SIMAN","Catatan Korwil: Aset merupakan eks Rupbassan Bangkinang dan barang masih terletak pada Rupbasan Bangkinang (Kab. Kampar) dan Belum ada Pengajuan pada Siman","Catatan Korwil: proses pengajuan pada portal lelang"],"revisionCount":0,"updated":"Snapshot workbook terbaru"},
  {"satker":"692519","progress":0,"status":"belum","missing":["2 kategori belum memiliki Nomor Tiket SIMAN"],"revisionCount":0,"updated":"Snapshot workbook terbaru"},
  {"satker":"692537","progress":0,"status":"belum","missing":["1 kategori belum memiliki Nomor Tiket SIMAN"],"revisionCount":0,"updated":"Snapshot workbook terbaru"},
  {"satker":"692781","progress":50,"status":"persetujuan","missing":["1 kategori belum memiliki Nomor Tiket SIMAN","Catatan Korwil: Proses Pengajuan Permohonan Lelang di Portal Lelang"],"revisionCount":0,"updated":"Snapshot workbook terbaru"},
]
