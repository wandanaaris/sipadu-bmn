import { type Assignment, type StageField, type Task } from './data'
import { ringkasanTiketPerSatker } from './pemanfaatanBmnData'
import { daftarSatkerBelumPsp } from './pspData'
import { taskRusakBerat } from './rusakBeratTasks'

// ============================================================
// PEKERJAAN LOKAL (PRATINJAU, belum tersimpan di database)
// Berasal dari DUKMAN TA 2026 bagian Umum dan BMN.
// Hanya tampil pada mode pengembangan (npm run dev).
// ============================================================

// ---------- 1. ASET TANAH (ISU-01) ----------
// Pekerjaan ini sudah ada di database dengan nama task_key
// 'sertifikasi-tanah-bagansiapiapi-2026' dan hanya ditugaskan ke
// Lapas Kelas IIA Bagansiapiapi. Versi lokal ini menambah 14 Satker
// lain yang memiliki aset tanah di wilayah Riau.
const asetTanahSatkers = [
  '692307', // Bapas Kelas I Pekanbaru
  '692308', // Lapas Kelas IIA Pekanbaru
  '692309', // Lapas Kelas IIA Bengkalis
  '692310', // Rutan Kelas IIB Siak Sri Indrapura
  '692311', // Lapas Kelas IIA Bagansiapiapi
  '692312', // Rutan Kelas IIB Rengat
  '692313', // Lapas Kelas IIA Tembilahan
  '692314', // Lapas Kelas IIB Teluk Kuantan
  '692315', // Lapas Kelas IIB Selat Panjang
  '692316', // Lapas Kelas IIA Bangkinang
  '692317', // Lapas Kelas IIB Pasir Pangarayan
  '692484', // Rutan Kelas IIB Dumai
  '692781', // Rutan Kelas I Pekanbaru
  '692794', // Lapas Terbuka Kelas III Rumbai
  '694759', // Bapas Kelas II Dumai
]

const asetTanahRequirements = [
  'Laporan progress persertifikatan tanah dan permasalahan yang dihadapi',
  'Capture aplikasi SRIKANDI pengiriman laporan',
]

// Prioritas: penugasan Satker yang SUDAH ada di database memakai data prod apa adanya
// (progress, status, tanggal pembaruan). Hanya Satker baru yang memakai nilai awal lokal.
const blankTanahAssignment = (satker: string): Assignment => ({
  satker,
  progress: 0,
  status: 'belum' as const,
  missing: asetTanahRequirements,
  updated: 'Belum ada penugasan di database',
  revisionCount: 0,
})

export const taskSertifikasiTanah: Task = {
  id: 'sertifikasi-tanah-bagansiapiapi-2026',
  title: 'Progress Target Sertifikasi Tanah',
  description:
    'Menyampaikan laporan progress persertifikatan tanah beserta permasalahan yang dihadapi melalui SRIKANDI, serta capture aplikasi SRIKANDI sebagai bukti pengiriman laporan.',
  method: 'spreadsheet',
  due: 'Sesuai batas waktu yang ditentukan',
  letter: 'Monitoring progress target sertifikasi tanah',
  uploadLink: 'https://drive.google.com/drive/folders/1sCyKsMT_H8Db0KpeB-gO5GxNJvupXq1C?usp=drive_link',
  active: true,
  priority: 'tinggi',
  requirements: [
    { key: 'laporan_progress', label: asetTanahRequirements[0], track: 'Data Dukung', required: true },
    { key: 'capture_srikandi', label: asetTanahRequirements[1], track: 'Data Dukung', required: true },
  ],
  assignments: asetTanahSatkers.map(blankTanahAssignment),
}

// ---------- 2. PEMANFAATAN RUMAH NEGARA (ISU-02) ----------
// Pekerjaan baru, workflow bertahap:
// Tahap I   -> operator mengisi data pada spreadsheet rumah negara
// Tahap II  -> unggah satu dokumen wajib, yaitu Surat Izin Penghunian (SIP)
// Tahap III -> konfirmasi pembaruan detail rumah negara (aset + SIP)
const rumahNegaraStages = [
  {
    id: 'spreadsheet',
    label: 'Tahap I · Pengisian Data Rumah Negara pada Spreadsheet',
    description:
      'Operator BMN mengisi data rumah negara Satker pada spreadsheet yang telah ditentukan, kemudian melaporkan kesiapan pengisian kepada Korwil.',
    requirements: [
      'Data rumah negara Satker telah diisi lengkap pada spreadsheet',
    ],
    link: 'https://docs.google.com/spreadsheets/d/1N1S0kwQwXxRf4qRoZoSeEVwww9C0KGt2/edit?usp=sharing&ouid=114001219248527397686&rtpof=true&sd=true',
  },
  {
    id: 'sip',
    label: 'Tahap II · Unggah Surat Izin Penghunian (SIP)',
    description:
      'Satker mengunggah Surat Izin Penghunian (SIP) rumah negara ke folder Google Drive pekerjaan ini sebagai satu-satunya dokumen wajib pada tahap ini.',
    requirements: [
      'Surat Izin Penghunian (SIP) rumah negara',
    ],
  },
  {
    id: 'siman',
    label: 'Tahap III · Konfirmasi Pembaruan Detail Rumah Negara',
    description:
      'Satker memastikan detail aset rumah negara pada SIMAN sudah diperbarui dan SIP sudah diunggah pada detail aset tersebut. Tidak ada dokumen yang diunggah; cukup konfirmasi.',
    requirements: [],
    confirmOnly: true,
    confirmLabel: 'Saya sudah update detail dan upload SIP pada web SIMAN',
  },
]

const rumahNegaraSatkers = [
  '692307', '692308', '692309', '692310', '692311', '692312', '692313', '692314',
  '692315', '692316', '692317', '692484', '692519', '692537', '692639', '692781',
  '692794', '694759',
]

export const taskPemanfaatanRumahNegara: Task = {
  id: 'pemanfaatan-rumah-negara-2026',
  title: 'Pemutakhiran Surat Izin Penghunian (SIP) Rumah Negara',
  description:
    'Operator mengisi data rumah negara pada spreadsheet, mengunggah Surat Izin Penghunian (SIP) rumah negara, lalu mengonfirmasi pembaruan detail aset rumah negara pada SIMAN beserta SIP.',
  method: 'spreadsheet',
  due: 'Belum ditentukan',
  letter: 'Pendataan dan Pemutakhiran SIP Rumah Negara (DUKMAN TA 2026 - Isu Strategis 02)',
  link: 'https://docs.google.com/spreadsheets/d/1N1S0kwQwXxRf4qRoZoSeEVwww9C0KGt2/edit?usp=sharing&ouid=114001219248527397686&rtpof=true&sd=true',
  uploadLink: 'https://drive.google.com/drive/folders/1D6BvJs7LKQwrwfpRsY8Dfz3iFlGRfCHu?usp=drive_link',
  active: true,
  priority: 'tinggi',
  workflow: 'staged-destruction',
  stages: rumahNegaraStages,
  assignments: rumahNegaraSatkers.map((satker) => ({
    satker,
    progress: 0,
    status: 'belum' as const,
    missing: ['Data rumah negara pada spreadsheet belum diisi'],
    updated: 'Sinkronisasi 22 September 2026',
    revisionCount: 0,
  })),
}

// ---------- 3. PEMANFAATAN BMN: KANTIN, SAE, WARTELSUSPAS, DAN LAINNYA (ISU-03) ----------
// Satu Satker dapat memiliki lebih dari satu tiket PEMMANFAATAN di SIMAN.
// Satu tiket dapat memuat beberapa jenis pemanfaatan sekaligus.
// Satu daftar dipakai sejak awal: kolom Nama Item, Luas, dan Nilai Sewa diisi bertahap.

const tahapIPemanfaatanFields: StageField[] = [
  { key: 'nomorTiket', label: 'Nomor tiket SIMAN', type: 'text' },
  { key: 'periode', label: 'Periode sewa', type: 'text' },
  { key: 'items', label: 'Item yang disewakan dan luas (m2)', type: 'item-luas-table' },
]

const tahapIIPemanfaatanFields: StageField[] = [
  { key: 'nomorPersetujuan', label: 'Nomor Surat Persetujuan Sewa', type: 'text' },
  { key: 'nilaiSewa', label: 'Nilai persetujuan sewa per item (Rp)', type: 'item-nilai-table' },
]

const pemanfaatanStages = [
  {
    id: 'cetak-dan-item',
    label: 'Tahap I · Cetakan SIMAN dan Daftar Item yang Disewakan',
    description:
      'Satker mengunggah cetakan dari web SIMAN. Pada cetakan hanya tercantum nomor tiket dan nama Satker, sehingga Satker tetap perlu mengisi sendiri nama item yang disewakan dan luasnya. Satu Satker boleh memiliki lebih dari satu tiket.',
    requirements: [
      'Cetakan dari web SIMAN terkait sewa (memuat nomor tiket dan nama Satker)',
    ],
    fields: tahapIPemanfaatanFields,
  },
  {
    id: 'persetujuan',
    label: 'Tahap II · Surat Persetujuan Sewa dan Nilai Persetujuan',
    description:
      'Satker mengunggah Surat Persetujuan Sewa dari KPKNL, lalu mengisi nilai persetujuan sewa per item. Daftar item dan luas tetap memakai isian Tahap I, sehingga yang ditambahkan hanya kolom nilai.',
    requirements: [
      'Surat Persetujuan Sewa dari KPKNL beserta nomornya',
    ],
    fields: tahapIIPemanfaatanFields,
  },
  {
    id: 'tindak-lanjut',
    label: 'Tahap III · Konfirmasi Tindak Lanjut dari Tiket SIMAN',
    description:
      'Satker menindaklanjuti tiket yang telah dibuat di SIMAN dengan SK Penetapan, Pembayaran PNBP, dan Perjanjian Sewa, lalu mengonfirmasi tindak lanjut tersebut kepada Korwil. Tidak ada dokumen yang diunggah ke portal.',
    requirements: [],
    confirmOnly: true,
    confirmLabel: 'Saya sudah upload SK Penetapan, Pembayaran PNBP, dan Perjanjian Sewa pada SIMAN',
  },
]

// Contoh isi untuk Satker dengan lebih dari satu tiket, dipakai sebagai pedoman
// tampilan di portal. Angka mengikuti contoh Tiket Rutan Dumai.
export const contohPemanfaatan = [
  {
    satker: '692484',
    namaSatker: 'Rutan Kelas IIB Dumai',
    tiket: [
      {
        nomorTiket: 'PPL26081908155728114',
        nomorPersetujuan: 'S-83/MK/KNL.0305/2026',
        periode: 'Tahun 2026',
        items: [
          { nama: 'Wartelsuspas Blok A', luas: 2, nilai: 750_000 },
          { nama: 'Wartelsuspas Blok B', luas: 8, nilai: 2_411_000 },
          { nama: 'Kios Laundry', luas: 12, nilai: 3_597_000 },
          { nama: 'Kios Pangkas Rambut', luas: 6, nilai: 1_813_000 },
          { nama: 'Dapur Produksi Kue', luas: 18, nilai: 10_886_000 },
          { nama: 'Kios Cafe', luas: 55, nilai: 7_844_000 },
        ],
      },
    ],
  },
]

// Penugasan otomatis dari data monitoring: setiap Satker yang punya tiket
// PEMMANFAATAN BMN (Sewa) pada TA 2026. Satker dengan lebih dari satu tiket
// tetap satu penugasan, dengan catatan jumlah tiket pada isian kekurangan.
export const penugasanPemanfaatanBmn: Assignment[] = ringkasanTiketPerSatker().map(r => ({
  satker: r.kodeSatker,
  progress: 0,
  status: 'belum' as const,
  missing: [
    'Cetakan dari web SIMAN: ' + r.tiket.map(t => t.nomor).join(', '),
    'Daftar item yang disewakan beserta luas dalam m2',
  ],
  updated: 'Belum ada penugasan di database',
  revisionCount: 0,
}))

// Status: belum tampil. Data dan definisinya tetap disimpan agar bisa dilanjutkan.
export const taskPemanfaatanBmn: Task = {
  id: 'pemanfaatan-bmn-kantin-sae-wartelsuspas-2026',
  title: 'Pemanfaatan BMN: Kantin, SAE, Wartelsuspas, dan Pemanfaatan Lainnya',
  description:
    'Satker membuat tiket PEMMANFAATAN BMN pada SIMAN, mendaftarkan rencana pemanfaatan per item beserta luasnya, mencatat Surat Persetujuan Sewa beserta nilai sewa, lalu menindaklanjuti tiket di SIMAN dengan SK Penetapan, Pembayaran PNBP, dan Perjanjian Sewa, lalu mengonfirmasi tindak lanjut kepada Korwil. Satu Satker dapat memiliki lebih dari satu tiket.',
  method: 'portal',
  due: 'Sesuai batas waktu yang ditentukan',
  letter: 'Monitoring Pemanfaatan BMN (DUKMAN TA 2026 - Isu Strategis 03)',
  uploadLink: 'https://drive.google.com/drive/folders/1D6BvJs7LKQwrwfpRsY8Dfz3iFlGRfCHu?usp=drive_link',
  active: true,
  priority: 'tinggi',
  workflow: 'staged-destruction',
  stages: pemanfaatanStages,
  assignments: penugasanPemanfaatanBmn,
}

// ---------- 4. PENETAPAN STATUS PENGGUNAAN (PSP) / SARPRAS KEAMANAN (ISU-04) ---------
// Satu isian saja: nomor tiket SIMAN. Jumlah aset yang belum PSP ditampilkan
// sebagai data acuan dari Master Aset, tidak diketik operator.
const pspFields: StageField[] = [
  { key: 'nomorTiket', label: 'Nomor tiket SIMAN', type: 'text' },
]

const pspStages = [
  {
    id: 'tiket-sim',
    label: 'Tahap I · Nomor Tiket SIMAN',
    description:
      'Satker membuat tiket di aplikasi SIMAN untuk penetapan status penggunaan, lalu mencatat nomor tiketnya di sini. Jumlah aset yang belum PSP ditampilkan sebagai data acuan.',
    requirements: [],
    fields: pspFields,
  },
  {
    id: 'sk-psp',
    label: 'Tahap II · Konfirmasi SK Penetapan Status Penggunaan',
    description:
      'Setelah proses di SIMAN selesai, Satker memastikan SK Penetapan Status Penggunaan sudah terbit atas tiket yang dibuat pada Tahap I, lalu mengonfirmasi kepada Korwil.',
    requirements: [],
    confirmOnly: true,
    confirmLabel: 'Saya sudah memastikan SK Penetapan Status Penggunaan telah terbit',
  },
]

export const penugasanPsp: Assignment[] = daftarSatkerBelumPsp().map(r => ({
  satker: r.kodeSatker,
  progress: 0,
  status: 'belum' as const,
  missing: [`Nomor tiket SIMAN (${r.belumPsp} aset belum PSP)`],
  updated: 'Belum ada penugasan di database',
  revisionCount: 0,
}))

export const taskPenetapanStatusPenggunaan: Task = {
  id: 'penetapan-status-penggunaan-2026',
  title: 'Penetapan Status Penggunaan',
  description:
    'Satker membuat tiket penetapan status penggunaan pada aplikasi SIMAN dan mencatat nomor tiketnya. Data aset yang belum memiliki PSP ditampilkan sebagai acuan jumlah aset Satker.',
  method: 'portal',
  due: 'Sesuai batas waktu yang ditentukan',
  letter: 'Penetapan Status Penggunaan (DUKMAN TA 2026 - Isu Strategis 04)',
  active: true,
  priority: 'tinggi',
  workflow: 'staged-destruction',
  stages: pspStages,
  assignments: penugasanPsp,
}

// Leveraging BMN (pemanfaatan-bmn) sengaja tidak ditampilkan sementara
// undergoes revisi. Kode dan datanya tetap disimpan untuk dilanjutkan.
export const dukmanLocalPreviewTasks: Task[] = [taskSertifikasiTanah, taskPemanfaatanRumahNegara, taskPenetapanStatusPenggunaan, ...taskRusakBerat]

// Gabungkan penugasan database (prod) dengan Satker tambahan dari versi lokal.
// Aturan: data prod menang untuk Satker yang sudah punya penugasan;
// Satker baru memakai nilai awal lokal. Daftar Satker mengikuti versi lokal.
export function mergePreviewAssignments(local: Task, fromDb: Task): Task {
  const dbByCode = new Map(fromDb.assignments.map(a => [a.satker, a]))
  const assignments = local.assignments.map(a => dbByCode.get(a.satker) ?? a)
  return { ...local, assignments }
}

export const localPreviewTaskIds = dukmanLocalPreviewTasks.map(t => t.id)

// Task id yang versi database-nya digantikan oleh versi lokal di atas
// selama masih mode pengembangan.
export const localReplacedTaskIds = new Set(['sertifikasi-tanah-bagansiapiapi-2026'])
