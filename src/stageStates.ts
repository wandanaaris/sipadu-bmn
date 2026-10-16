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
