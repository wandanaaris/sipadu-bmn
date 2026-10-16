import { describe, expect, it } from 'vitest'
import type { Task } from './data'
import { normalizeStageStates } from './stageStates'
import { progressForAssignment, statusForAssignment } from './adminMetrics'

// Bentuk persis yang dikembalikan get_active_portal untuk tahap workflow:
// stage_states masih berupa string JSON, bukan array.
const dbTask = (stageStates: unknown, jumlahTahap = 3): Task => ({
  id: 'persediaan-usang-amunisi-2026',
  title: 'Tindak Lanjut Pemusnahan Persediaan Usang Amunisi',
  description: '',
  method: 'spreadsheet',
  due: 'Sesuai batas waktu',
  letter: '',
  active: true,
  priority: 'tinggi',
  workflow: 'staged-destruction',
  stages: Array.from({ length: jumlahTahap }, (_, i) => ({
    id: `t${i + 1}`, label: `Tahap ${i + 1}`, description: '', requirements: [],
  })),
  assignments: [
    {
      satker: '692308', progress: 0, status: 'belum', missing: [], updated: '', revisionCount: 0,
      stageStates: stageStates as Task['assignments'][number]['stageStates'],
    },
  ],
})

// Tugas yang tahapnya sudah dinormalisasi, siap diuji lewat helper penilaian.
const siapkan = (stageStates: unknown, jumlahTahap = 3): Task => {
  const t = dbTask(stageStates, jumlahTahap)
  return { ...t, assignments: [normalizeStageStates(t.assignments[0], jumlahTahap)] }
}

const usingDb = (t: Task) => {
  const a = t.assignments[0]
  return !!(a.stageStates && a.stageStates.length === (t.stages?.length ?? 0))
}

describe('Normalisasi stage_states dari database', () => {
  it('menyperbaiki string JSON menjadi array sehingga tahap terbaca', () => {
    const task = dbTask('["selesai", "terbuka", "terkunci"]')
    const before = usingDb(task)
    const a = normalizeStageStates(task.assignments[0], 3)
    const after = usingDb({ ...task, assignments: [a] })
    expect(before).toBe(false)   // inilah penyebab bug
    expect(after).toBe(true)
  })

  it('status tahap kembali utuh setelah diurai', () => {
    const a = normalizeStageStates(dbTask('["selesai", "terbuka", "terkunci"]').assignments[0], 3)
    expect(a.stageStates).toEqual(['selesai', 'terbuka', 'terkunci'])
  })

  it('membaca progres dengan benar: 1 dari 3 tahap selesai', () => {
    const t = siapkan('["selesai", "terbuka", "terkunci"]')
    const done = t.assignments[0].stageStates!.filter(s => s === 'selesai').length
    expect(done).toBe(1)
    expect(progressForAssignment(t, t.assignments[0])).toBe(33)
  })

  it('tidak merusak nilai yang sudah berupa array', () => {
    const asli = ['menunggu_verifikasi', 'terkunci', 'terkunci'] as Task['assignments'][number]['stageStates']
    const a = normalizeStageStates({ ...dbTask(asli).assignments[0], stageStates: asli }, 3)
    expect(a.stageStates).toEqual(asli)
  })

  it('menangani string rusak tanpa membuat halaman kosong', () => {
    const a = normalizeStageStates(dbTask('{bukan json').assignments[0], 3)
    expect(a.stageStates).toBe('{bukan json')
  })

  it('menangani stage_states kosong tanpa error', () => {
    const a = normalizeStageStates(dbTask(null).assignments[0], 3)
    expect(a.stageStates).toBeNull()
  })

  it('membuka tahap berikutnya setelah tahap sebelumnya selesai', () => {
    const a = normalizeStageStates(dbTask('["selesai", "terkunci", "terkunci"]').assignments[0], 3)
    const states: string[] = [...a.stageStates!]
    for (let i = 0; i < states.length - 1; i++) {
      if (states[i] === 'selesai' && states[i + 1] === 'terkunci') states[i + 1] = 'terbuka'
    }
    expect(states).toEqual(['selesai', 'terbuka', 'terkunci'])
  })
})

// Kasus nyata di lapangan: fungsi verifikasi lama menulis ke indeks tahap
// berikutnya yang tidak ada, sehingga jsonb_set menambahkan entri null di ujung
// larik. Panjang yang tidak sama membuat semua tahap dianggap belum berjalan.
describe('Larik tahap yang menyimpan entri berlebih', () => {
  it('entri null di ujung dibuang sehingga tahap terakhir terbaca selesai', () => {
    // Pekerjaan 2 tahap, larik tersimpan 3 entri: ['selesai','selesai',null]
    const t = siapkan(['selesai', 'selesai', null], 2)
    expect(t.assignments[0].stageStates).toEqual(['selesai', 'selesai'])
    expect(progressForAssignment(t, t.assignments[0])).toBe(100)
    expect(statusForAssignment(t, t.assignments[0])).toBe('selesai')
  })

  it('berlaku juga untuk pekerjaan lima tahap', () => {
    const t = siapkan(['selesai', 'selesai', 'selesai', 'selesai', 'selesai', null], 5)
    expect(t.assignments[0].stageStates).toEqual(['selesai', 'selesai', 'selesai', 'selesai', 'selesai'])
    expect(statusForAssignment(t, t.assignments[0])).toBe('selesai')
  })

  it('sebelum diselaraskan statusnya salah: pekerjaan yang selesai tampak belum dikerjakan', () => {
    const t = dbTask(['selesai', 'selesai', null], 2)
    expect(statusForAssignment(t, t.assignments[0])).not.toBe('selesai')
    expect(progressForAssignment(t, t.assignments[0])).toBe(0)
  })

  it('larik yang lebih pendek ditambal terkunci, bukan dianggap kosong', () => {
    const t = siapkan(['selesai'], 3)
    expect(t.assignments[0].stageStates).toEqual(['selesai', 'terkunci', 'terkunci'])
    expect(progressForAssignment(t, t.assignments[0])).toBe(33)
  })
})
