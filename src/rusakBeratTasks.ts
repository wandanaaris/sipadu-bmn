// Pekerjaan Penghapusan BMN Rusak Berat (DUKMAN TA 2026 - Isu Strategis 06).
// Satu pekerjaan per kategori tiket:
//   A - BMN selain tanah/bangunan, nilai perolehan di bawah 100 juta
//   B - BMN kendaraan bermotor dan BMN di atas 100 juta
//   C - BMN Senjata Api (jalur pemusnahan, bukan lelang)
import type { Assignment, StageField, Task } from './data'
import { maksPengajuanLelang, satkerPerKategori, type KategoriRusak } from './rusakBeratData'

export const folderLelang =
  'https://drive.google.com/drive/folders/1gQfCWctAYDz0f1sH9vVu4lWQ31EXgWZC?usp=sharing'
export const folderSenjataApi =
  'https://drive.google.com/drive/folders/1aOxcubydxAKKeV8zwn8UPaMNapuXA5yR?usp=sharing'

// ── Kategori A dan B: jalur lelang ───────────────────────────────────────────
const lelangStages = [
  {
    id: 'tiket-jual',
    label: 'Tahap I · Nomor Tiket Penjualan',
    description:
      'Satker membuat tiket penjualan sesuai kategorinya pada aplikasi SIMAN, lalu mencatat nomor tiketnya. Jumlah aset yang dimiliki Satker ditampilkan sebagai acuan.',
    requirements: [],
    fields: [{ key: 'nomorTiket', label: 'Nomor tiket penjualan SIMAN', type: 'text' } as StageField],
  },
  {
    id: 'persetujuan',
    label: 'Tahap II · Persetujuan Penjualan',
    description:
      'Satker mencatat nomor persetujuan, jumlah aset yang diusulkan, serta nilai limit yang telah disetujui.',
    requirements: [],
    fields: [
      { key: 'nomorPersetujuan', label: 'Nomor persetujuan', type: 'text' } as StageField,
      { key: 'jumlahAset', label: 'Jumlah aset yang diusulkan', type: 'number' } as StageField,
      { key: 'nilaiLimit', label: 'Jumlah nilai limit yang disetujui (Rp)', type: 'number' } as StageField,
    ],
  },
  {
    id: 'permohonan-lelang',
    label: 'Tahap III · Pengajuan Lelang',
    description:
      'Satker mengajukan lelang dan mencatat nomor serta tanggal permohonan lelang, lalu mengunggah bukti pengajuannya.',
    requirements: ['Bukti permohonan lelang'],
    fields: [
      { key: 'nomorPermohonanLelang', label: 'Nomor permohonan lelang', type: 'text' } as StageField,
      { key: 'tanggalPermohonanLelang', label: 'Tanggal permohonan lelang', type: 'date' } as StageField,
    ],
  },
  {
    id: 'hasil-lelang',
    label: 'Tahap IV · Hasil Lelang',
    description:
      'Satker memilih hasil lelang. Bila lelang tidak laku, proses kembali ke Tahap III untuk pengajuan lelang berikutnya. Setelah tiga kali pengajuan tanpa/laku, proses kembali ke Tahap I dengan tiket baru.',
    requirements: [],
    fields: [
      {
        key: 'hasilLelang',
        label: 'Hasil lelang',
        type: 'pilihan',
        choices: [
          { value: 'laku', label: 'Laku' },
          { value: 'tidak-laku', label: 'Tidak laku' },
        ],
      } as StageField,
      { key: 'nominalLaku', label: 'Jumlah nominal lelang (Rp)', type: 'number' } as StageField,
    ],
  },
  {
    id: 'pelaporan-lelang',
    label: 'Tahap V · Pelaporan Lelang',
    description:
      'Satker mengunggah laporan lelang yang ditujukan kepada Kepala Biro BMN dengan tembusan Direktur Jenderal Pemasyarakatan dan Kepala Kantor Wilayah Ditjenpas Riau, serta capture aplikasi SRIKANDI sebagai bukti pengiriman.',
    requirements: [
      'Laporan lelang kepada Kepala Biro BMN, tembusan Direktur Jenderal Pemasyarakatan dan Kepala Kantor Wilayah Ditjenpas Riau',
      'Capture aplikasi SRIKANDI',
    ],
    fields: [],
  },
]

// ── Kategori C: Senjata Api, jalur pemusnahan ───────────────────────────────
const senjataApiStages = [
  {
    id: 'tiket-pemusnahan',
    label: 'Tahap I · Nomor Tiket Pemusnahan',
    description:
      'Satker membuat tiket pemusnahan BMN Senjata Api pada aplikasi SIMAN, lalu mencatat nomor tiketnya. Jumlah aset yang dimiliki Satker ditampilkan sebagai acuan.',
    requirements: [],
    fields: [{ key: 'nomorTiket', label: 'Nomor tiket pemusnahan SIMAN', type: 'text' } as StageField],
  },
  {
    id: 'persetujuan-pemusnahan',
    label: 'Tahap II · Persetujuan Pemusnahan',
    description: 'Satker mencatat nomor dan tanggal persetujuan yang telah terbit.',
    requirements: [],
    fields: [
      { key: 'nomorPersetujuan', label: 'Nomor persetujuan', type: 'text' } as StageField,
      { key: 'tanggalPersetujuan', label: 'Tanggal persetujuan', type: 'date' } as StageField,
    ],
  },
  {
    id: 'rekomendasi-polri',
    label: 'Tahap III · Pengajuan Rekomendasi ke Polri',
    description: 'Satker mengajukan rekomendasi pemusnahan ke Polri dan mengunggah surat permohonannya.',
    requirements: ['Surat permohonan rekomendasi pemusnahan'],
    fields: [],
  },
  {
    id: 'persetujuan-polri',
    label: 'Tahap IV · Persetujuan dari Polri',
    description: 'Satker mengunggah surat rekomendasi atau persetujuan yang diterima dari Polri.',
    requirements: ['Surat persetujuan/rekomendasi dari Polri'],
    fields: [],
  },
  {
    id: 'pelaksanaan-pemusnahan',
    label: 'Tahap V · Pelaksanaan Pemusnahan',
    description: 'Satker mengunggah berita acara pemusnahan dan SK Penghapusan BMN karena Pemusnahan.',
    requirements: ['Berita acara pemusnahan', 'SK Penghapusan BMN karena Pemusnahan'],
    fields: [],
  },
  {
    id: 'tindak-lanjut',
    label: 'Tahap VI · Tindak Lanjut Tiket',
    description:
      'Satker menindaklanjuti tiket di SIMAN, lalu mengunggah capture penyelesaian pada SIMAN dan cetakan transaksi Penghapusan dari SAKTI.',
    requirements: ['Capture penyelesaian pada SIMAN', 'Cetakan transaksi Penghapusan SAKTI'],
    fields: [],
  },
]

const tugas = (kodeSatker: string, jumlah: number): Assignment => ({
  satker: kodeSatker,
  progress: 0,
  status: 'belum' as const,
  missing: [`Nomor tiket (${jumlah} aset rusak berat dalam kategori ini)`],
  updated: 'Belum ada penugasan di database',
  revisionCount: 0,
})

export function buatPekerjaanRusak(kategori: KategoriRusak): Task {
  const isSenjataApi = kategori === 'C'
  const stages = isSenjataApi ? senjataApiStages : lelangStages
  const satkers = satkerPerKategori(kategori)
  return {
    id: `penghapusan-bmn-rusak-berat-${kategori.toLowerCase()}-2026`,
    title: isSenjataApi
      ? 'Penghapusan BMN Rusak Berat - Kategori C (Senjata Api)'
      : `Penghapusan BMN Rusak Berat - Kategori ${kategori}`,
    description: isSenjataApi
      ? 'Satker membuat tiket pemusnahan BMN Senjata Api, mengikuti persetujuan dan rekomendasi ke Polri, lalu melaksanakan pemusnahan dan menindaklanjuti tiket di SIMAN.'
      : 'Satker membuat tiket penjualan sesuai kategorinya, mengikuti persetujuan dan pengajuan lelang, lalu melaporkan hasilnya kepada Kepala Biro BMN melalui SRIKANDI.',
    method: 'portal',
    due: 'Sesuai batas waktu yang ditentukan',
    letter: `Penghapusan BMN Rusak Berat Kategori ${kategori} (DUKMAN TA 2026 - Isu Strategis 06)`,
    uploadLink: isSenjataApi ? folderSenjataApi : folderLelang,
    active: true,
    priority: 'tinggi',
    workflow: 'staged-destruction',
    stages,
    assignments: satkers.map(s => tugas(s.kodeSatker, s.kategori[kategori].jumlah)),
  }
}

export const taskRusakBeratA = buatPekerjaanRusak('A')
export const taskRusakBeratB = buatPekerjaanRusak('B')
export const taskRusakBeratC = buatPekerjaanRusak('C')

export const taskRusakBerat: Task[] = [taskRusakBeratA, taskRusakBeratB, taskRusakBeratC]

export { maksPengajuanLelang }
