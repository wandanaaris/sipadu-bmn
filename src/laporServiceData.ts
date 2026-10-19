import { satkers, type Assignment, type StageField, type Task } from './data'

// ============================================================
// LAPOR SERVICE BMN — PEKERJAAN LOKAL (PRATINJAU)
// Alur pemeliharaan/service aset BMN berjenjang:
//   I   Satker mendata aset yang perlu service (tabel per aset)
//   II  Satker mengajukan usulan pemeliharaan berjenjang
//       (Satker → Kanwil → Ditjenpas), nomor surat dicatat
//   III Satker mencatat surat persetujuan pemeliharaan
//   IV  Pelaksanaan service + pembaruan kondisi aset di SIMAN
// Isian murni data di portal (tanpa unggah dokumen), sehingga
// folder Drive belum dipasang sampai pengguna menentukannya.
// ============================================================

const laporanServiceFields: StageField[] = [
  {
    key: 'items',
    label: 'Daftar aset yang memerlukan service',
    type: 'item-table',
    columns: [
      { key: 'nama', label: 'Nama aset' },
      { key: 'kategori', label: 'Kategori aset (kendaraan, gedung/bangunan, X-ray, inventaris, dll.)' },
      { key: 'keluhan', label: 'Kondisi / keluhan' },
      { key: 'layanan', label: 'Jenis layanan (service rutin / perbaikan / kalibrasi)' },
      { key: 'biaya', label: 'Estimasi biaya (Rp)', numeric: true },
    ],
  },
]

const usulanFields: StageField[] = [
  { key: 'nomorSuratUsulan', label: 'Nomor surat usulan pemeliharaan', type: 'text' },
  { key: 'tanggalUsulan', label: 'Tanggal surat usulan', type: 'date' },
]

const persetujuanFields: StageField[] = [
  { key: 'nomorPersetujuan', label: 'Nomor surat persetujuan pemeliharaan (Ditjenpas)', type: 'text' },
  { key: 'tanggalPersetujuan', label: 'Tanggal surat persetujuan', type: 'date' },
]

const laporServiceStages = [
  {
    id: 'laporan-kebutuhan',
    label: 'Tahap I · Laporan Kebutuhan Service',
    description:
      'Satker mencatat seluruh aset BMN yang memerlukan service atau pemeliharaan beserta kategori, kondisi/keluhan, jenis layanan, dan estimasi biayanya. Satu baris untuk satu aset; satu Satker boleh melaporkan banyak aset sekaligus.',
    requirements: [],
    fields: laporanServiceFields,
  },
  {
    id: 'usulan-berjenjang',
    label: 'Tahap II · Usulan Pemeliharaan Berjenjang',
    description:
      'Satker menerbitkan surat usulan pemeliharaan yang diajukan berjenjang Satker → Kanwil → Ditjenpas, lalu mencatat nomor dan tanggal suratnya. Tidak ada dokumen yang diunggah ke portal pada tahap ini.',
    requirements: [],
    fields: usulanFields,
  },
  {
    id: 'persetujuan-pemeliharaan',
    label: 'Tahap III · Pencatatan Persetujuan Pemeliharaan',
    description:
      'Setelah usulan disetujui, Satker mencatat nomor dan tanggal surat persetujuan pemeliharaan dari Ditjenpas sebagai dasar pelaksanaan service.',
    requirements: [],
    fields: persetujuanFields,
  },
  {
    id: 'pelaksanaan',
    label: 'Tahap IV · Pelaksanaan Service dan Pembaruan SIMAN',
    description:
      'Satker melaksanakan service, menyimpan kwitansi dan Berita Acara di Satker, lalu memperbarui kondisi aset pada SIMAN dan mengonfirmasi penyelesaian kepada Korwil.',
    requirements: [],
    confirmOnly: true,
    confirmLabel: 'Service selesai, bukti tersimpan di Satker, dan kondisi aset sudah diperbarui di SIMAN',
  },
]

// Seluruh Satker (termasuk Kanwil) menanggung jalur lapor service yang sama,
// karena semua kategori aset BMN bisa memerlukan pemeliharaan.
export const laporServiceAssignments: Assignment[] = satkers.map(s => ({
  satker: s.code,
  progress: 0,
  status: 'belum' as const,
  missing: ['Daftar aset yang perlu service belum dilaporkan'],
  updated: 'Belum ada penugasan di database',
  revisionCount: 0,
}))

export const taskLaporServiceBmn: Task = {
  id: 'lapor-service-bmn-2026',
  title: 'Lapor Service BMN',
  description:
    'Satker melaporkan aset BMN yang memerlukan service atau pemeliharaan, mengajukan usulan pemeliharaan berjenjang (Satker → Kanwil → Ditjenpas), mencatat surat persetujuan pemeliharaan, lalu melaksanakan service dan memperbarui kondisi aset pada SIMAN. Satu laporan mencakup banyak aset sekaligus.',
  method: 'portal',
  due: 'Terbuka sepanjang tahun',
  letter: 'Laporan kebutuhan pemeliharaan/service aset BMN',
  active: true,
  priority: 'tinggi',
  workflow: 'staged-destruction',
  stages: laporServiceStages,
  assignments: laporServiceAssignments,
}

export const laporServiceTasks: Task[] = [taskLaporServiceBmn]
