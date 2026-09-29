// Analitik untuk Dashboard Korwil: ketepatan waktu per Satker, papan tindakan,
// ringkasan angkaBMN, dan filter pencarian.
import type { Task, TaskStatus } from './data'
import { belumPspSatker, totalBelumPsp, daftarSatkerBelumPsp } from './pspData'
import { asetSatker as rusakSatker, totalRusakBerat, daftarSatkerRusakBerat } from './rusakBeratData'


// Fungsi berikut disalin dari App.tsx agar modul analitik dapat dipakai
// Helper di bawah disalin dari App.tsx agar modul analitik dapat dipakai
// sumber data yang sama.
export type StageState = 'terkunci' | 'terbuka' | 'menunggu_verifikasi' | 'selesai' | 'perbaikan'

const stagedKey = (taskId: string, satker: string) => `sipadu_staged_workflow_${taskId}_${satker}`

export function readStageStates(taskId: string, satker: string, count: number): StageState[] {
  let saved: StageState[] | null = null
  try {
    const raw = JSON.parse(localStorage.getItem(stagedKey(taskId, satker)) ?? 'null')
    if (Array.isArray(raw) && raw.length === count) saved = raw as StageState[]
  } catch { /* abaikan */ }
  const states = saved ?? (Array.from({ length: count }, (_, i) => (i === 0 ? 'terbuka' : 'terkunci')) as StageState[])
  for (let i = 0; i < count - 1; i++) {
    if (states[i] === 'selesai' && states[i + 1] === 'terkunci') states[i + 1] = 'terbuka'
  }
  return states
}

export function progressForAssignment(task: Task, assignment: Task['assignments'][number]): number {
  const stages = task.stages ?? []
  if (!stages.length) return assignment.progress
  const usingDb = !!(assignment.stageStates && assignment.stageStates.length === stages.length)
  const states: StageState[] = (usingDb ? assignment.stageStates : readStageStates(task.id, assignment.satker, stages.length)) ?? []
  if (!states.length) return assignment.progress
  return Math.round((states.filter(s => s === 'selesai').length / states.length) * 100)
}

export function statusForAssignment(task: Task, assignment: Task['assignments'][number]): TaskStatus {
  const stages = task.stages ?? []
  if (!stages.length) return assignment.status
  const usingDb = !!(assignment.stageStates && assignment.stageStates.length === stages.length)
  const states: StageState[] = (usingDb ? assignment.stageStates : readStageStates(task.id, assignment.satker, stages.length)) ?? []
  if (!states.length) return assignment.status
  if (states.some(s => s === 'perbaikan')) return 'perbaikan'
  if (states.some(s => s === 'menunggu_verifikasi')) return 'verifikasi'
  if (states.every(s => s === 'selesai')) return 'selesai'
  if (states.some(s => s === 'selesai' || s === 'terbuka')) return 'proses'
  return 'belum'
}

export type BarisSatker = {
  kodeSatker: string
  namaSatker: string
  total: number
  selesai: number
  berjalan: number
  belumMulai: number
  perluPerbaikan: number
  menungguVerifikasi: number
  progressRata: number
  ketepatanWaktu: number
  status: 'baik' | 'berjalan' | 'terlambat'
}

// Kelompokkan pekerjaan menurut isu DUKMAN agar mudah difilter.
export const kategoriPekerjaan = [
  { key: 'semua', label: 'Semua Pekerjaan' },
  { key: 'tanah', label: 'Aset Tanah', cocok: (t: Task) => /tanah|sertifikasi-tanah|plang-rumah|\bhibah\b/i.test(`${t.id} ${t.title}`) },
  { key: 'rumah-negara', label: 'Rumah Negara', cocok: (t: Task) => /rumah\s*negara|\bsip\b|penghunian|pemanfaatan-rumah/i.test(`${t.id} ${t.title}`) },
  { key: 'psp', label: 'Penetapan Status Penggunaan', cocok: (t: Task) => /\bpsp\b|penetapan-status/i.test(`${t.id} ${t.title}`) },
  { key: 'rusak-berat', label: 'Penghapusan Rusak Berat', cocok: (t: Task) => /rusak-berat|rusak\s*berat/i.test(`${t.id} ${t.title}`) },
  { key: 'lainnya', label: 'Lainnya', cocok: (t: Task) => !/tanah|sertifikasi-tanah|plang-rumah|\bhibah\b|rumah\s*negara|\bsip\b|penghunian|pemanfaatan-rumah|\bpsp\b|penetapan-status|rusak-berat|rusak\s*berat/i.test(`${t.id} ${t.title}`) },
] as const

export type KategoriKey = typeof kategoriPekerjaan[number]['key']

export function filterTugas(tasks: Task[], kategori: KategoriKey): Task[] {
  if (kategori === 'semua') return tasks
  const def = kategoriPekerjaan.find(k => k.key === kategori)
  return def ? tasks.filter(t => (def as { cocok: (t: Task) => boolean }).cocok(t)) : tasks
}

export function barisSatker(tasks: Task[]): BarisSatker[] {
  const map = new Map<string, BarisSatker>()
  for (const task of tasks.filter(t => t.active)) {
    for (const a of task.assignments) {
      if (a.satker === '692507') continue // Kanwil tidak dihitung sebagai Satker penerima tugas
      const status = statusForAssignment(task, a)
      const row = map.get(a.satker) ?? {
        kodeSatker: a.satker,
        namaSatker: satkerNama(a.satker),
        total: 0, selesai: 0, berjalan: 0, belumMulai: 0,
        perluPerbaikan: 0, menungguVerifikasi: 0, progressRata: 0,
        ketepatanWaktu: 0, status: 'berjalan' as const,
      }
      row.total += 1
      if (status === 'selesai') row.selesai += 1
      else if (status === 'belum') row.belumMulai += 1
      else if (status === 'perbaikan') row.perluPerbaikan += 1
      else row.berjalan += 1
      if ((a.stageStates ?? []).includes('menunggu_verifikasi') || stageMenunggu(task, a)) {
        row.menungguVerifikasi += 1
      }
      row.progressRata += progressForAssignment(task, a)
      row.ketepatanWaktu += tepatWaktu(task, a) ? 1 : 0
      map.set(a.satker, row)
    }
  }
  return [...map.values()]
    .map(r => {
      const avg = r.total ? Math.round(r.progressRata / r.total) : 0
      const tepat = r.total ? Math.round((r.ketepatanWaktu / r.total) * 100) : 0
      return {
        ...r,
        progressRata: avg,
        ketepatanWaktu: tepat,
        status: tepat >= 80 ? 'baik' as const : tepat >= 50 ? 'berjalan' as const : 'terlambat' as const,
      }
    })
    .sort((a, b) => a.ketepatanWaktu - b.ketepatanWaktu || a.namaSatker.localeCompare(b.namaSatker, 'id'))
}

const stageMenunggu = (task: Task, a: Task['assignments'][number]): boolean => {
  const stages = task.stages ?? []
  if (!stages.length) return false
  const usingDb = !!(a.stageStates && a.stageStates.length === stages.length)
  const states = usingDb ? a.stageStates : readStageStates(task.id, a.satker, stages.length)
  return (states ?? []).some(s => s === 'menunggu_verifikasi')
}

const tepatWaktu = (task: Task, a: Task['assignments'][number]): boolean => {
  if (a.status === 'belum') return false
  if (!task.due || task.due === 'Belum ditentukan' || task.due.includes('Sesuai')) return true
  const selesai = ['selesai', 'ditutup'].includes(a.status)
  if (!selesai) return true
  const selesaiPada = a.completedAt ? new Date(a.completedAt) : null
  if (!selesaiPada) return true
  const due = new Date(task.due)
  return due.toString() === 'Invalid Date' ? true : selesaiPada <= due
}

export type Tindakan = {
  jenis: 'verifikasi' | 'perbaikan' | 'dimulai' | 'telat'
  prioritas: 1 | 2 | 3
  kodeSatker: string
  namaSatker: string
  taskId: string
  judul: string
  keterangan: string
  umurnya: number
}

const hariLalu = (iso?: string): number => {
  if (!iso) return 0
  const t = new Date(iso).getTime()
  return Number.isNaN(t) ? 0 : Math.floor((Date.now() - t) / 86_400_000)
}

export function papanTindakan(tasks: Task[], kodeSatker?: string): Tindakan[] {
  const hasil: Tindakan[] = []
  for (const task of tasks.filter(t => t.active)) {
    for (const a of task.assignments) {
      if (kodeSatker && a.satker !== kodeSatker) continue
      const nama = satkerNama(a.satker)
      const status = statusForAssignment(task, a)
      const umur = hariLalu(a.updated)
      if (stageMenunggu(task, a)) {
        hasil.push({ jenis: 'verifikasi', prioritas: 1, kodeSatker: a.satker, namaSatker: nama, taskId: task.id, judul: task.title, keterangan: 'Menunggu keputusan Korwil', umurnya: umur })
      } else if (status === 'perbaikan') {
        hasil.push({ jenis: 'perbaikan', prioritas: 2, kodeSatker: a.satker, namaSatker: nama, taskId: task.id, judul: task.title, keterangan: 'Perlu perbaikan dari Satker', umurnya: umur })
      } else if (status === 'belum' && umur >= 3) {
        hasil.push({ jenis: 'dimulai', prioritas: 2, kodeSatker: a.satker, namaSatker: nama, taskId: task.id, judul: task.title, keterangan: `Belum dimulai ${umur} hari`, umurnya: umur })
      } else if (telat(task, a)) {
        hasil.push({ jenis: 'telat', prioritas: 3, kodeSatker: a.satker, namaSatker: nama, taskId: task.id, judul: task.title, keterangan: 'Melewati batas waktu', umurnya: umur })
      }
    }
  }
  return hasil.sort((a, b) => a.prioritas - b.prioritas || b.umurnya - a.umurnya)
}

const telat = (task: Task, a: Task['assignments'][number]): boolean => {
  if (['selesai', 'ditutup'].includes(a.status)) return false
  if (!task.due || task.due.includes('Belum') || task.due.includes('Sesuai')) return false
  const due = new Date(task.due)
  return !Number.isNaN(due.getTime()) && due.getTime() < Date.now()
}

const namaCache = new Map<string, string>()
export function setNamaSatker(pairs: Array<[string, string]>): void {
  for (const [code, name] of pairs) namaCache.set(code, name)
}
const satkerNama = (code: string) => namaCache.get(code) ?? code

export type RingkasanAngka = {
  label: string
  nilai: string
  keterangan: string
}

export function ringkasanAngka(): RingkasanAngka[] {
  const psp = daftarSatkerBelumPsp()
  const rusak = daftarSatkerRusakBerat()
  return [
    { label: 'Aset belum PSP', nilai: totalBelumPsp.toLocaleString('id-ID'), keterangan: `${psp.length} Satker, dari data Master Aset` },
    { label: 'Aset rusak berat', nilai: totalRusakBerat.jumlah.toLocaleString('id-ID'), keterangan: `${rusak.length} Satker, nilai Rp ${(totalRusakBerat.nilai / 1_000_000_000).toFixed(2)} M` },
  ]
}

export type PrepMonev = {
  kodeSatker: string
  namaSatker: string
  baris: BarisSatker
  tugas: Array<{ task: Task; assignment: Task['assignments'][number]; progress: number; status: TaskStatus; tahap: string }>
  tindakan: Tindakan[]
}

// ── Jumlah aset per Satker (dari data master) ───────────────────────────────

// ── Jumlah aset per Satker (dari data master) ───────────────────────────────
export type AsetSatker = {
  belumPsp: number
  rusakBerat: number
  rusakNilai: number
}

// Rekap aset per Satker: belum PSP dan rusak berat per kategori.
export function rekapAsetSatker(kode: string): AsetSatker {
  const belumPsp = belumPspSatker(kode) ?? 0
  const a = rusakSatker(kode, 'A'), b = rusakSatker(kode, 'B'), c = rusakSatker(kode, 'C')
  return {
    belumPsp,
    rusakBerat: a.jumlah + b.jumlah + c.jumlah,
    rusakNilai: a.nilai + b.nilai + c.nilai,
  }
}
