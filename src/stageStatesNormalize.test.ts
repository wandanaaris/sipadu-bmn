import { describe, expect, it } from 'vitest'
import type { Task } from './data'

// Bentuk persis yang dikembalikan get_active_portal untuk tahap workflow:
// stage_states masih berupa string JSON, bukan array.
const dbTask = (stageStates: unknown): Task => ({
  id: 'persediaan-usang-amunisi-2026',
  title: 'Tindak Lanjut Pemusnahan Persediaan Usang Amunisi',
  description: '',
  method: 'spreadsheet',
  due: 'Sesuai batas waktu',
  letter: '',
  active: true,
  priority: 'tinggi',
  workflow: 'staged-destruction',
  stages: [
    { id: 'a', label: 'Tahap I', description: '', requirements: [] },
    { id: 'b', label: 'Tahap II', description: '', requirements: [] },
    { id: 'c', label: 'Tahap III', description: '', requirements: [] },
  ],
  assignments: [
    {
      satker: '692308', progress: 0, status: 'belum', missing: [], updated: '', revisionCount: 0,
      stageStates: stageStates as Task['assignments'][number]['stageStates'],
    },
  ],
})

// Salinan logika normalisasi yang dipakai repository.ts
function normalizeStageStates(assignment: Task['assignments'][number]): Task['assignments'][number] {
  const raw = assignment.stageStates as unknown
  if (typeof raw !== 'string') return assignment
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return assignment
    return { ...assignment, stageStates: parsed as Task['assignments'][number]['stageStates'] }
  } catch {
    return assignment
  }
}

const usingDb = (t: Task) => {
  const a = t.assignments[0]
  return !!(a.stageStates && a.stageStates.length === (t.stages?.length ?? 0))
}

describe('Normalisasi stage_states dari database', () => {
  it('menyperbaiki string JSON menjadi array sehingga tahap terbaca', () => {
    const task = dbTask('["selesai", "terbuka", "terkunci"]')
    const before = usingDb(task)
    const a = normalizeStageStates(task.assignments[0])
    const after = usingDb({ ...task, assignments: [a] })
    expect(before).toBe(false)   // inilah penyebab bug
    expect(after).toBe(true)
  })

  it('status tahap kembali utuh setelah diurai', () => {
    const a = normalizeStageStates(dbTask('["selesai", "terbuka", "terkunci"]').assignments[0])
    expect(a.stageStates).toEqual(['selesai', 'terbuka', 'terkunci'])
  })

  it('membaca progres dengan benar: 1 dari 3 tahap selesai', () => {
    const task = dbTask('["selesai", "terbuka", "terkunci"]')
    const a = normalizeStageStates(task.assignments[0])
    const done = a.stageStates!.filter(s => s === 'selesai').length
    expect(done).toBe(1)
    expect(Math.round(done / 3 * 100)).toBe(33)
  })

  it('tidak merusak nilai yang sudah berupa array', () => {
    const asli = ['menunggu_verifikasi', 'terkunci', 'terkunci'] as Task['assignments'][number]['stageStates']
    const a = normalizeStageStates({ ...dbTask(asli).assignments[0], stageStates: asli })
    expect(a.stageStates).toEqual(asli)
  })

  it('menangani string rusak tanpa membuat halaman kosong', () => {
    const a = normalizeStageStates(dbTask('{bukan json').assignments[0])
    expect(a.stageStates).toBe('{bukan json')
  })

  it('menangani stage_states kosong tanpa error', () => {
    const a = normalizeStageStates(dbTask(null).assignments[0])
    expect(a.stageStates).toBeNull()
  })

  it('membuka tahap berikutnya setelah tahap sebelumnya selesai', () => {
    const a = normalizeStageStates(dbTask('["selesai", "terkunci", "terkunci"]').assignments[0])
    const states: string[] = [...a.stageStates!]
    for (let i = 0; i < states.length - 1; i++) {
      if (states[i] === 'selesai' && states[i + 1] === 'terkunci') states[i + 1] = 'terbuka'
    }
    expect(states).toEqual(['selesai', 'terbuka', 'terkunci'])
  })
})
