// Penyelarasan status tahap pekerjaan berjenjang.
//
// Nilai stage_states datang dari kolom jsonb di database. Dua hal bisa membuat
// panjangnya tidak sama dengan jumlah tahap pekerjaan:
//   1. get_active_portal mengembalikannya sebagai string JSON, bukan array;
//   2. fungsi verifikasi lama menulis ke indeks tahap berikutnya walaupun tahap
//      itu tidak ada — jsonb_set menambahkan entri null di ujung larik.
//
// Panjang yang tidak sama membuat setiap pembacaan tahap jatuh ke penyimpanan
// lokal dan seluruh Satker tampak 0%. Karena itu larik diselaraskan di satu
// tempat ini, lalu dipakai bersama oleh repository dan halaman-halaman lain.
import type { StageState, Task } from './data'

export function normalizeStageStates(
  assignment: Task['assignments'][number],
  jumlahTahap = 0,
): Task['assignments'][number] {
  const raw = assignment.stageStates as unknown
  let larik: unknown = raw
  if (typeof raw === 'string') {
    try {
      larik = JSON.parse(raw)
    } catch {
      return assignment
    }
  }
  if (!Array.isArray(larik)) return assignment
  if (!jumlahTahap) {
    return { ...assignment, stageStates: larik as Task['assignments'][number]['stageStates'] }
  }
  // Entri berlebih dibuang, kekurangan ditambal "terkunci" (tahap yang belum
  // dimulai). Entri null diperlakukan sebagai tahap yang belum berjalan.
  const states = larik.slice(0, jumlahTahap).map(s => (s ?? 'terkunci') as StageState)
  while (states.length < jumlahTahap) states.push('terkunci')
  return { ...assignment, stageStates: states as Task['assignments'][number]['stageStates'] }
}

/** Larik tahap yang sudah pasti panjangnya sama dengan jumlah tahap pekerjaan. */
export function stageStatesSelaras(states: unknown, jumlahTahap: number): StageState[] | null {
  if (!Array.isArray(states) || states.length === 0) return null
  const hasil = states.slice(0, jumlahTahap).map(s => (s ?? 'terkunci') as StageState)
  while (hasil.length < jumlahTahap) hasil.push('terkunci')
  return hasil
}

/** Label tahap tanpa awalan "Tahap I · ", mis. "Tahap II · Pelaporan" -> "Pelaporan". */
export function namaTahapSingkat(label: string): string {
  const bersih = label.replace(/^Tahap\s+[IVXLC\d]+\s*[·:.-]\s*/i, '').trim()
  return bersih || label.trim()
}

/**
 * Keterangan singkat pekerjaan berjenjang yang belum selesai, dipakai pada
 * ringkasan WhatsApp. Menyebut tahap yang sedang dikerjakan, bukan sekadar
 * "Dalam proses", supaya penerima pesan tahu apa yang masih tertunggak.
 *
 * Mengembalikan null bila pekerjaan tidak berjenjang atau tidak ada tahap
 * yang belum selesai — pemanggil memakai keterangan status biasa.
 */
export function keteranganTahap(task: Task, assignment: Task['assignments'][number]): string | null {
  const stages = task.stages ?? []
  if (!stages.length) return null
  const states = stageStatesSelaras(assignment.stageStates, stages.length)
  if (!states) return null
  if (states.some(s => s === 'perbaikan')) return 'Perlu perbaikan'
  if (states.some(s => s === 'menunggu_verifikasi')) return 'Menunggu verifikasi'
  const berjalan = states.findIndex(s => s !== 'selesai')
  if (berjalan < 0) return null
  const tahap = stages[berjalan]
  if (!tahap) return null
  const sudah = states.filter(s => s === 'selesai').length
  if (sudah === 0) return 'Belum dikerjakan'
  return `Lanjut ${namaTahapSingkat(tahap.label)}`
}
