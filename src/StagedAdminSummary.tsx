// Ringkasan tahapan per Satker untuk pekerjaan berjenjang, lengkap dengan
// tombol verifikasi Korwil (Setujui / Perbaiki).
//
// Semula komponen ini berada di dalam panel geser "Detail pekerjaan". Panel itu
// dihapus karena menutupi daftar pekerjaan, jadi komponen ini dipindahkan ke
// berkas tersendiri agar dapat dipakai halaman detail pekerjaan biasa.
import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import type { Task } from './data'
import { satkers } from './data'
import { readStageStates } from './adminMetrics'
import { reviewStagedStage } from './lib/repository'
import { stageStatesSelaras } from './stageStates'

export function StagedAdminSummary({ task, assignment, onRefresh }: {
  task: Task
  assignment: Task['assignments'][number]
  onRefresh: () => Promise<void>
}) {
  const stages = task.stages ?? []
  // Baca status yang benar: dari DB bila bentuknya cocok, selain itu dari storage
  // pratinjau. Helper lama selalu mengembalikan status default sehingga semua
  // satker tampak sama walaupun progress-nya berbeda.
  const states = stageStatesSelaras(assignment.stageStates, stages.length)
    ?? readStageStates(task.id, assignment.satker, stages.length)
  const [busy, setBusy] = useState(false)
  const nama = satkers.find(s => s.code === assignment.satker)?.name ?? assignment.satker
  const adaMenunggu = states.some(s => s === 'menunggu_verifikasi')
  const berjalan = states.findIndex(s => s !== 'selesai' && s !== 'terkunci')
  const selesai = states.filter(s => s === 'selesai').length
  const persen = stages.length ? Math.round(selesai / stages.length * 100) : 0
  const [buka, setBuka] = useState(adaMenunggu)
  useEffect(() => { if (adaMenunggu) setBuka(true) }, [adaMenunggu])

  const act = async (action: 'verify' | 'return', index: number) => {
    if (busy) return
    setBusy(true)
    try {
      const result = await reviewStagedStage(task.id, assignment.satker, index, action)
      if (!(result as { ok: boolean }).ok) throw new Error((result as { error?: string }).error ?? 'Operasi gagal.')
      await onRefresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Operasi gagal.')
    } finally { setBusy(false) }
  }

  // Ringkas per Satker supaya daftar tidak memanjang bertumpuk.
  return <details className="sas" open={buka} onToggle={e => setBuka((e.target as HTMLDetailsElement).open)}>
    <summary>
      <span className="sas-nama">{nama}</span>
      <span className="sas-posisi">{selesai === stages.length ? 'Semua tahap selesai' : berjalan >= 0 ? stages[berjalan]?.label : 'Belum ada tahap berjalan'}</span>
      <span className="sas-persen" data-selesai={selesai} data-total={stages.length}>{persen}%</span>
    </summary>
    <div className="sas-tahap">
      {stages.map((stage, index) => {
        const state = states[index] ?? 'terkunci'
        return <div key={stage.id} className={`sas-baris sas-${state}`}>
          <span className="sas-nomor">{state === 'selesai' ? <Check size={13} /> : index + 1}</span>
          <span className="sas-label">{stage.label}</span>
          <b className={`stage-dot stage-dot-${state}`}>{state === 'selesai' ? 'Selesai' : state === 'menunggu_verifikasi' ? 'Menunggu verifikasi' : state === 'perbaikan' ? 'Perlu perbaikan' : state === 'terbuka' ? 'Sedang berjalan' : 'Terkunci'}</b>
          {state === 'menunggu_verifikasi' && <span className="sas-aksi">
            <button className="primary" disabled={busy} onClick={e => { e.preventDefault(); void act('verify', index) }}>Setujui</button>
            <button className="ghost" disabled={busy} onClick={e => { e.preventDefault(); void act('return', index) }}>Perbaiki</button>
          </span>}
        </div>
      })}
    </div>
  </details>
}
