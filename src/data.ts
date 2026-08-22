export type TaskMethod = 'spreadsheet' | 'portal' | 'upload'
export type TaskStatus = 'belum' | 'proses' | 'verifikasi' | 'persetujuan' | 'perbaikan' | 'selesai' | 'ditutup'

export type Satker = { code: string; name: string; slug: string }
export type Assignment = {
  satker: string
  progress: number
  status: TaskStatus
  missing: string[]
  updated: string
  submittedAt?: string
  completedAt?: string
  revisionCount: number
}
export type Task = {
  id: string
  title: string
  description: string
  method: TaskMethod
  due: string
  letter: string
  link?: string
  active: boolean
  priority: 'normal' | 'tinggi'
  requirements?: Array<{ key:string; label:string; track?:string; required?:boolean }>
  assignments: Assignment[]
}

export const satkers: Satker[] = [
  ['692307','Bapas Kelas I Pekanbaru','bapas-pekanbaru'],
  ['692308','Lapas Kelas IIA Pekanbaru','lapas-pekanbaru'],
  ['692309','Lapas Kelas IIA Bengkalis','lapas-bengkalis'],
  ['692310','Rutan Kelas IIB Siak Sri Indrapura','rutan-siak'],
  ['692311','Lapas Kelas IIA Bagansiapiapi','lapas-bagansiapiapi'],
  ['692312','Rutan Kelas IIB Rengat','rutan-rengat'],
  ['692313','Lapas Kelas IIA Tembilahan','lapas-tembilahan'],
  ['692314','Lapas Kelas IIB Teluk Kuantan','lapas-teluk-kuantan'],
  ['692315','Lapas Kelas IIB Selat Panjang','lapas-selat-panjang'],
  ['692316','Lapas Kelas IIA Bangkinang','lapas-bangkinang'],
  ['692317','Lapas Kelas IIB Pasir Pangarayan','lapas-pasir-pangarayan'],
  ['692484','Rutan Kelas IIB Dumai','rutan-dumai'],
  ['692507','Kanwil Ditjenpas Riau','kanwil-riau'],
  ['692519','LPKA Kelas II Pekanbaru','lpka-pekanbaru'],
  ['692537','Lapas Perempuan Kelas IIA Pekanbaru','lpp-pekanbaru'],
  ['692639','Lapas Narkotika Kelas IIB Rumbai','lapas-narkotika-rumbai'],
  ['692675','Rupbasan Kelas II Bengkalis','rupbasan-bengkalis'],
  ['692781','Rutan Kelas I Pekanbaru','rutan-pekanbaru'],
  ['692794','Lapas Terbuka Kelas III Rumbai','lapas-terbuka-rumbai'],
  ['694759','Bapas Kelas II Dumai','bapas-dumai'],
].map(([code,name,slug]) => ({ code,name,slug }))

const assignment = (satker: string, progress: number, status: TaskStatus, missing: string[] = [], revisionCount = 0): Assignment => ({
  satker, progress, status, missing, revisionCount, updated: '18 Agustus 2026, 10.20 WIB'
})

export const initialTasks: Task[] = [
  {
    id: 'master-aset', title: 'Kelengkapan Master Aset SIMAN',
    description: 'Melengkapi atribut lokasi, koordinat, dan foto master aset.',
    method: 'spreadsheet', due: '20 Agustus 2026', letter: 'Surat Undangan Percepatan Kelengkapan Data Master Aset SIMAN',
    link: 'https://docs.google.com/spreadsheets/d/1MRsmty5hgWFQh_uoX6LjQxVW2Kfjj1Yrg2yARQerlr0/edit?gid=0#gid=0', active: true, priority: 'tinggi',
    assignments: [
      assignment('692313', 100, 'verifikasi'), assignment('692312', 99, 'proses', ['1 aset belum memiliki Kelurahan/Desa']),
      assignment('692316', 82, 'perbaikan', ['Kode RT/RW', 'Kode pos', 'Koordinat']),
      ...satkers.filter(s => !['692313','692312','692316'].includes(s.code)).map((s,i) => assignment(s.code, 62 + (i*7)%39, i%4===0?'selesai':'proses', i%4===0?[]:['Atribut lokasi belum lengkap']))
    ]
  },
  {
    id: 'xray', title: 'Pendataan X-Ray dan Body Scanner',
    description: 'Pendataan merk, tipe, nomor seri, kondisi, dan dokumentasi alat.',
    method: 'spreadsheet', due: '19 Agustus 2026', letter: 'Surat Tindak Lanjut Status X-Ray dan Body Scanner Rusak Berat',
    link: 'https://docs.google.com/spreadsheets/d/1t3IIrahsooPjPGIb2IfCNDI1gm53XtYtY19oQm3_Ryk/edit?gid=0#gid=0', active: true, priority: 'tinggi',
    assignments: [
      assignment('692313', 100, 'selesai'), assignment('692316', 0, 'belum', ['Seluruh data belum diisi']),
      assignment('692311', 60, 'proses', ['Nomor serial tabung', 'Foto']), assignment('692309', 75, 'perbaikan', ['Nomor serial tidak sesuai kolom','Foto']),
      assignment('692308', 40, 'proses', ['Nomor serial rangka','Nomor serial tabung','Foto']),
      assignment('692317', 80, 'perbaikan', ['Nomor serial dan foto belum sesuai']),
      assignment('692639', 80, 'perbaikan', ['Identitas teknis belum sesuai']), assignment('692781', 80, 'perbaikan', ['Identitas teknis belum sesuai']),
      assignment('692310', 80, 'proses', ['Nomor serial perlu verifikasi'])
    ]
  },
  {
    id: 'pengamanan', title: 'Laporan Pengamanan Aset',
    description: 'Laporan perubahan plang pengamanan aset dan papan nama rumah negara.',
    method: 'portal', due: '25 Agustus 2026', letter: 'PAS-UM.04.02-271 tanggal 10 Agustus 2026', active: true, priority: 'normal',
    assignments: satkers.filter(s=>s.code!=='692507').map((s,i)=>assignment(s.code, i%5===0?100:i%3===0?50:0, i%5===0?'selesai':i%3===0?'proses':'belum', i%5===0?[]:['Laporan dan dokumentasi']))
  },
  {
    id: 'rumah-negara', title: 'Pemutakhiran Data Rumah Negara',
    description: 'Konfirmasi status, penghuni, papan nama, dan dokumentasi rumah negara.',
    method: 'portal', due: '28 Agustus 2026', letter: 'Penugasan internal Korwil BMN', active: true, priority: 'normal',
    assignments: satkers.slice(1,15).map((s,i)=>assignment(s.code, i%4===0?100:25, i%4===0?'selesai':'proses', i%4===0?[]:['Status penghuni','Dokumentasi papan nama']))
  },
  {
    id: 'rkbmn', title: 'Tindak Lanjut RKBMN Tahun 2027',
    description: 'Verifikasi hasil penelaahan revisi RKBMN Tahun 2027.',
    method: 'upload', due: '18 Agustus 2026', letter: 'Hasil Penelaahan Perubahan RKBMN SIMAN TA 2027', active: false, priority: 'normal',
    assignments: satkers.map(s=>assignment(s.code,100,'ditutup'))
  }
]

export const statusLabel: Record<TaskStatus,string> = {
  belum:'Belum dikerjakan', proses:'Dalam proses', verifikasi:'Menunggu verifikasi', persetujuan:'Menunggu persetujuan',
  perbaikan:'Perlu perbaikan', selesai:'Selesai', ditutup:'Ditutup'
}
