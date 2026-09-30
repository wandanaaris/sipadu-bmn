import { useEffect, useId, useMemo, useState } from 'react'
import { ArrowLeft, Building2, CircleAlert, ClipboardList, Clock3, Home, LandPlot, Printer, Search, TrendingUp, UserCheck } from 'lucide-react'
import type { Task } from './data'
import { asetSatker as rusakSatker } from './rusakBeratData'
import { satkers, statusLabel } from './data'
import {
  barisSatker,
  filterTugas,
  kategoriPekerjaan,
  papanTindakan,
  progressForAssignment,
  rekapAsetSatker,
  readStageStates,
  ringkasanAngka,
  setNamaSatker,
  statusForAssignment,
  type KategoriKey,
  type Tindakan,
} from './adminMetrics'

setNamaSatker(satkers.map(s => [s.code, s.name] as [string, string]))

const iconTindakan: Record<Tindakan['jenis'], typeof Clock3> = {
  verifikasi: UserCheck,
  perbaikan: CircleAlert,
  dimulai: ClipboardList,
  telat: Clock3,
}

const labelTindakan: Record<Tindakan['jenis'], string> = {
  verifikasi: 'Verifikasi',
  perbaikan: 'Perbaikan',
  dimulai: 'Belum dimulai',
  telat: 'Lewat tenggat',
}

// ── 1. Papan Ketepatan Waktu per Satker ─────────────────────────────────────
export function PapanKetepatanWaktu({ tasks, onPilih }: { tasks: Task[]; onPilih: (kode: string) => void }) {
  const baris = useMemo(() => barisSatker(tasks), [tasks])
  const total = baris.length
  const baik = baris.filter(b => b.status === 'baik').length
  const terlambat = baris.filter(b => b.status === 'terlambat').length

  return (
    <section className="panel admin-page">
      <div className="panel-head">
        <div>
          <h2>Ketepatan Waktu per Satker</h2>
          <p>Diurutkan dari yang paling tertinggal. Klik Satker untuk membuka catatan monev.</p>
        </div>
        <div className="chip-row">
          <span className="chip chip-ok">{baik} tepat waktu</span>
          <span className="chip chip-late">{terlambat} perlu perhatian</span>
          <span className="chip">{total} Satker</span>
        </div>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Satker</th>
              <th className="num">Ketepatan</th>
              <th className="num">Progress</th>
              <th className="num">Selesai</th>
              <th className="num">Berjalan</th>
              <th className="num">Belum</th>
              <th className="num">Perbaikan</th>
              <th className="num">Menunggu</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {baris.map(b => (
              <tr key={b.kodeSatker}>
                <td>
                  <strong>{b.namaSatker}</strong>
                  <span>{b.kodeSatker}</span>
                </td>
                <td className="num">
                  <span className={`skor ${b.status}`}>{b.ketepatanWaktu}%</span>
                </td>
                <td className="num">{b.progressRata}%</td>
                <td className="num">{b.selesai}</td>
                <td className="num">{b.berjalan}</td>
                <td className="num">{b.belumMulai}</td>
                <td className="num">{b.perluPerbaikan}</td>
                <td className="num">{b.menungguVerifikasi}</td>
                <td>
                  <button className="link-button" onClick={() => onPilih(b.kodeSatker)}>Catatan</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ── 2. Papan Tindakan: yang menunggu Korwil ──────────────────────────────────
export function PapanTindakanPanel({ tasks, kodeSatker, onPilih }: {
  tasks: Task[]
  kodeSatker?: string
  onPilih: (kode: string) => void
}) {
  const daftar = useMemo(() => papanTindakan(tasks, kodeSatker), [tasks, kodeSatker])
  const grup: Record<Tindakan['jenis'], Tindakan[]> = {
    verifikasi: [], perbaikan: [], dimulai: [], telat: [],
  }
  for (const t of daftar) grup[t.jenis].push(t)

  return (
    <section className="panel admin-page">
      <div className="panel-head">
        <div>
          <h2>Perlu Tindakan Korwil</h2>
          <p>Verifikasi yang belum diputus, perbaikan, Satker yang belum mulai, dan pekerjaan lewat tenggat.</p>
        </div>
        <span className="chip">{daftar.length} item</span>
      </div>
      {daftar.length === 0 ? (
        <p className="kosong">Tidak ada yang menunggu tindakan Korwil.</p>
      ) : (
        <div className="tindakan-list">
          {(Object.keys(grup) as Array<Tindakan['jenis']>)
            .filter(k => grup[k].length)
            .map(k => (
              <div className="tindakan-grup" key={k}>
                <h3>{labelTindakan[k]} <span>{grup[k].length}</span></h3>
                <ul>
                  {grup[k].slice(0, 8).map(t => {
                    const Icon = iconTindakan[t.jenis]
                    return (
                      <li key={`${t.taskId}-${t.kodeSatker}-${k}`}>
                        <Icon size={15} />
                        <div>
                          <strong>{t.judul}</strong>
                          <span>{t.namaSatker} · {t.keterangan}{t.umurnya > 0 && ` · ${t.umurnya} hari`}</span>
                        </div>
                        <button className="link-button" onClick={() => onPilih(t.kodeSatker)}>Buka</button>
                      </li>
                    )
                  })}
                </ul>
                {grup[k].length > 8 && <p className="sisanya">dan {grup[k].length - 8} lainnya</p>}
              </div>
            ))}
        </div>
      )}
    </section>
  )
}

// ── 3. Ringkasan Angka BMN ───────────────────────────────────────────────────
export function RingkasanAngkaPanel() {
  const angka = useMemo(() => ringkasanAngka(), [])
  return (
    <section className="panel admin-page">
      <div className="panel-head">
        <div>
          <h2>Ringkasan Angka BMN</h2>
          <p>Angka dasar dari Master Aset SIMAN untuk bahan paparan.</p>
        </div>
      </div>
      <div className="angka-list">
        {angka.map(a => (
          <div className="angka" key={a.label}>
            <TrendingUp size={16} />
            <div>
              <strong>{a.nilai}</strong>
              <span>{a.label}</span>
              <em>{a.keterangan}</em>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── 4. Filter dan pencarian ───────────────────────────────────────────────────
export function FilterPekerjaanBar({ tasks, kategori, onUbahKategori, cari, onUbahCari }: {
  tasks: Task[]
  kategori: KategoriKey
  onUbahKategori: (k: KategoriKey) => void
  cari: string
  onUbahCari: (v: string) => void
}) {
  const jumlah = (k: KategoriKey) => filterTugas(tasks, k).length
  return (
    <div className="filter-bar">
      <div className="filter-chip">
        {kategoriPekerjaan.map(k => (
          <button
            key={k.key}
            className={k.key === kategori ? 'active' : ''}
            onClick={() => onUbahKategori(k.key)}
          >
            {k.label} <span>{jumlah(k.key)}</span>
          </button>
        ))}
      </div>
      <label className="filter-cari">
        <Search size={15} />
        <input value={cari} onChange={e => onUbahCari(e.target.value)} placeholder="Cari nama atau kode Satker" />
      </label>
    </div>
  )
}

// ── Prep Monev: ringkasan satu Satker siap dicetak ────────────────────────────
export function PrepMonevPanel({ tasks, kodeSatker, onTutup }: {
  tasks: Task[]
  kodeSatker: string
  onTutup: () => void
}) {
  const satker = satkers.find(s => s.code === kodeSatker)
  const baris = barisSatker(tasks).find(b => b.kodeSatker === kodeSatker)
  const tugas = tasks
    .filter(t => t.active && t.assignments.some(a => a.satker === kodeSatker))
    .map(task => {
      const a = task.assignments.find(x => x.satker === kodeSatker)!
      const stages = task.stages ?? []
      const states = stages.length
        ? (a.stageStates?.length === stages.length ? a.stageStates : readStageStates(task.id, kodeSatker, stages.length))
        : []
      const berjalan = states.findIndex(s => s !== 'selesai')
      return {
        task,
        assignment: a,
        progress: progressForAssignment(task, a),
        status: statusForAssignment(task, a),
        tahap: stages.length
          ? (berjalan === -1 ? 'Selesai' : `Tahap ${berjalan + 1} · ${stages[berjalan]?.label ?? ''}`)
          : statusLabel[a.status],
      }
    })

  const catatan = useMemo(() => papanTindakan(tasks, kodeSatker), [tasks, kodeSatker])
  const butir = [
    'Data di lapangan sudah sesuai dengan data di aplikasi SIMAN',
    'Bukti dukung (foto, laporan, capture SRIKANDI) sudah lengkap',
    'Nomor tiket pada SIMAN sudah tercatat dan sesuai',
    'Sertifikat / persetujuan yang sudah terbit sudah diunggah',
    'Tindak lanjut atas temuan monev sebelumnya sudah diselesaikan',
  ]

  return (
    <section className="panel admin-page prep-monev">
      <div className="panel-head">
        <div>
          <h2>Catatan Monev — {satker?.name ?? kodeSatker}</h2>
          <p>{kodeSatker} · {tugas.length} pekerjaan aktif · {baris?.ketepatanWaktu ?? 0}% ketepatan waktu</p>
        </div>
        <button className="link-button" onClick={onTutup}>Tutup</button>
      </div>

      <div className="prep-monev-body">
        <div className="prep-kiri">
          <h3>Checklist monev</h3>
          <ul className="prep-check">
            {butir.map(b => <li key={b}><label><input type="checkbox" /> <span>{b}</span></label></li>)}
          </ul>
          <h3>Temuan</h3>
          <textarea className="prep-temuan" rows={5} placeholder="Tulis temuan monev di sini..." />
          <h3>Tindak lanjut</h3>
          <textarea className="prep-tindak" rows={4} placeholder="Tulis tindak lanjut yang diperlukan..." />
        </div>

        <div className="prep-kanan">
          <h3>Posisi pekerjaan saat ini</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Pekerjaan</th><th className="num">Progress</th><th>Posisi</th><th>Status</th></tr>
              </thead>
              <tbody>
                {tugas.map(t => (
                  <tr key={t.task.id}>
                    <td><strong>{t.task.title}</strong></td>
                    <td className="num">{t.progress}%</td>
                    <td>{t.tahap}</td>
                    <td><StatusPillMini status={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {catatan.length > 0 && (
            <>
              <h3>Perlu ditanyakan saat monev</h3>
              <ul className="prep-tanya">
                {catatan.map(c => <li key={`${c.taskId}-${c.jenis}`}>{c.judul} — {c.keterangan}</li>)}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

const StatusPillMini = ({ status }: { status: string }) => (
  <span className={`skor ${status}`}>{statusLabel[status as keyof typeof statusLabel] ?? status}</span>
)

// ── Monitoring Satker: kartu → infografis modern ──────────────────────────
export function MonitoringSatkerPage({ tasks, kodeAwal }: { tasks: Task[]; kodeAwal?: string | null }) {
  const [kode, setKode] = useState<string | null>(kodeAwal ?? null)
  useEffect(() => { if (kodeAwal) setKode(kodeAwal) }, [kodeAwal])

  if (kode) return <InfografisSatker tasks={tasks} kodeSatker={kode} onKembali={() => setKode(null)} />
  return <DaftarSatker tasks={tasks} onPilih={setKode} />
}

function DaftarSatker({ tasks, onPilih }: { tasks: Task[]; onPilih: (kode: string) => void }) {
  const [cari, setCari] = useState('')
  const baris = useMemo(() => barisSatker(tasks), [tasks])
  const cariAktif = cari.trim().toLowerCase()
  const hasil = baris.filter(b => `${b.namaSatker} ${b.kodeSatker}`.toLowerCase().includes(cariAktif))

  return (
    <section className="panel admin-page">
      <div className="panel-head">
        <div>
          <h2>Monitoring Satker</h2>
          <p>{baris.length} Satker. Klik kartu untuk melihat infografis Satker.</p>
        </div>
        <label className="filter-cari">
          <Search size={15} />
          <input value={cari} onChange={e => setCari(e.target.value)} placeholder="Cari nama atau kode Satker" />
        </label>
      </div>
      <div className="ms-grid">
        {hasil.map(b => {
          const skor = b.ketepatanWaktu
          const tone = skor >= 80 ? 'hijau' : skor >= 50 ? 'kuning' : 'merah'
          return (
            <button className="ms-kartu" key={b.kodeSatker} onClick={() => onPilih(b.kodeSatker)}>
              <div className="ms-ikon"><Building2 size={18} /></div>
              <div className="ms-teks">
                <span className="ms-kode">{b.kodeSatker}</span>
                <strong className="ms-nama">{b.namaSatker}</strong>
                <div className="ms-bar"><i style={{ width: `${b.progressRata}%` }} /></div>
              </div>
              <div className={`ms-skor ${tone}`}>
                <b>{skor}</b>
                <span>skor</span>
              </div>
            </button>
          )
        })}
      </div>
      {hasil.length === 0 && <p className="kosong">Satker tidak ditemukan.</p>}
    </section>
  )
}

function pakaiAnimasi() {
  const [aktif, setAktif] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setAktif(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return aktif
}

function Cincin({ persen, label, sub, dari, ke }: { persen: number; label: string; sub: string; dari: string; ke: string }) {
  const aktif = pakaiAnimasi()
  const id = 'grad' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const r = 56, keliling = 2 * Math.PI * r
  const isi = Math.max(0, Math.min(100, Math.round(persen)))
  const offset = aktif ? keliling * (1 - isi / 100) : keliling
  return (
    <div className="cincin">
      <svg viewBox="0 0 140 140">
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={dari} />
            <stop offset="100%" stopColor={ke} />
          </linearGradient>
        </defs>
        <circle cx="70" cy="70" r={r} fill="none" className="cincin-rel" strokeWidth="11" />
        <circle cx="70" cy="70" r={r} fill="none" stroke={`url(#${id})`} strokeWidth="11" strokeLinecap="round"
          strokeDasharray={keliling} strokeDashoffset={offset} transform="rotate(-90 70 70)" className="cincin-isi" />
        <text x="70" y="68" textAnchor="middle" className="cincin-angka">{isi}%</text>
        <text x="70" y="88" textAnchor="middle" className="cincin-sub">{sub}</text>
      </svg>
      <strong>{label}</strong>
    </div>
  )
}

function DonatStatus({ items }: { items: Array<{ label: string; nilai: number; warna: string }> }) {
  const aktif = pakaiAnimasi()
  const total = items.reduce((n, i) => n + i.nilai, 0)
  const r = 52, keliling = 2 * Math.PI * r
  let geser = 0
  return (
    <div className="donat-bungkus">
      <div className="donat">
        <svg viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={r} fill="none" className="cincin-rel" strokeWidth="16" />
          {total > 0 && items.filter(i => i.nilai > 0).map(i => {
            const panjang = (i.nilai / total) * keliling
            const el = (
              <circle key={i.label} cx="70" cy="70" r={r} fill="none" stroke={i.warna} strokeWidth="16"
                strokeDasharray={`${aktif ? panjang : 0} ${keliling}`} strokeDashoffset={-geser}
                transform="rotate(-90 70 70)" className="donat-segmen" />
            )
            geser += panjang
            return el
          })}
          <text x="70" y="68" textAnchor="middle" className="cincin-angka">{total}</text>
          <text x="70" y="88" textAnchor="middle" className="cincin-sub">pekerjaan</text>
        </svg>
      </div>
      <ul className="donat-legenda">
        {items.map(i => (
          <li key={i.label}>
            <span className="titik" style={{ background: i.warna }} />
            <span className="donat-label">{i.label}</span>
            <b>{i.nilai}</b>
          </li>
        ))}
      </ul>
    </div>
  )
}

function BarisAset({ items }: { items: Array<{ label: string; nilai: number; warna: string }> }) {
  const aktif = pakaiAnimasi()
  const puncak = Math.max(1, ...items.map(i => i.nilai))
  return (
    <div className="baris-aset">
      {items.map(i => (
        <div className="baris-aset-item" key={i.label}>
          <span className="baris-aset-label">{i.label}</span>
          <div className="baris-aset-track"><i style={{ width: aktif ? `${(i.nilai / puncak) * 100}%` : '0%', background: i.warna }} /></div>
          <b>{i.nilai}</b>
        </div>
      ))}
    </div>
  )
}

function InfografisSatker({ tasks, kodeSatker, onKembali }: { tasks: Task[]; kodeSatker: string; onKembali: () => void }) {
  const satker = satkers.find(s => s.code === kodeSatker)
  const nama = satker?.name ?? kodeSatker
  const baris = useMemo(() => barisSatker(tasks).find(b => b.kodeSatker === kodeSatker), [tasks, kodeSatker])
  const aset = useMemo(() => rekapAsetSatker(kodeSatker), [kodeSatker])
  const [rusakA, rusakB, rusakC] = useMemo(() => {
    const a = rusakSatker(kodeSatker, 'A'), b = rusakSatker(kodeSatker, 'B'), c = rusakSatker(kodeSatker, 'C')
    return [a.jumlah, b.jumlah, c.jumlah]
  }, [kodeSatker])

  const tugas = useMemo(() => tasks
    .filter(t => t.active && t.assignments.some(a => a.satker === kodeSatker))
    .map(task => {
      const a = task.assignments.find(x => x.satker === kodeSatker)!
      const stages = task.stages ?? []
      const db = a.stageStates && a.stageStates.length === stages.length ? a.stageStates : null
      const states = stages.length ? (db ?? readStageStates(task.id, kodeSatker, stages.length)) : []
      const berjalan = states.findIndex(x => x !== 'selesai')
      return {
        task,
        progress: progressForAssignment(task, a),
        status: statusForAssignment(task, a),
        tahap: stages.length
          ? (berjalan === -1 ? 'Selesai' : `Tahap ${berjalan + 1} · ${stages[berjalan]?.label ?? ''}`)
          : statusLabel[a.status],
      }
    })
    .sort((a, b) => b.progress - a.progress), [tasks, kodeSatker])

  const selesai = tugas.filter(t => t.status === 'selesai')
  const belum = tugas.filter(t => t.status !== 'selesai')
  const persen = baris?.ketepatanWaktu ?? 0

  const statusGrafik = [
    { label: 'Selesai', nilai: selesai.length, warna: '#10b981' },
    { label: 'Berjalan', nilai: baris?.berjalan ?? 0, warna: '#6366f1' },
    { label: 'Belum', nilai: baris?.belumMulai ?? 0, warna: '#f59e0b' },
    { label: 'Perbaikan', nilai: baris?.perluPerbaikan ?? 0, warna: '#ef4444' },
    { label: 'Verifikasi', nilai: baris?.menungguVerifikasi ?? 0, warna: '#0ea5e9' },
  ]

  return (
    <div className="info-halaman">
      <section className="panel admin-page info-hero">
        <button className="link-button" onClick={onKembali}><ArrowLeft size={13} /> Kembali ke daftar Satker</button>
        <div className="info-hero-baris">
          <div className="info-hero-ikon"><Building2 size={22} /></div>
          <div className="info-hero-teks">
            <h2>{nama}</h2>
            <p>Kode {kodeSatker} · {tugas.length} pekerjaan aktif</p>
          </div>
          <div className="info-hero-chip">
            <span><b>{aset.belumPsp}</b> belum PSP</span>
            <span><b>{aset.rusakBerat}</b> rusak berat</span>
          </div>
        </div>
      </section>

      <div className="info-dua">
        <section className="panel admin-page info-panel">
          <h3>Kinerja Satker</h3>
          <div className="info-rings">
            <Cincin persen={persen} label="Ketepatan waktu" sub={`${baris?.total ?? 0} pekerjaan`} dari="#6366f1" ke="#8b5cf6" />
            <Cincin persen={baris?.progressRata ?? 0} label="Progres rata-rata" sub={`${selesai.length} dari ${tugas.length} selesai`} dari="#10b981" ke="#34d399" />
            <Cincin persen={tugas.length ? (selesai.length / tugas.length) * 100 : 0} label="Pekerjaan selesai" sub={`${selesai.length} tuntas`} dari="#0ea5e9" ke="#38bdf8" />
          </div>
        </section>
        <section className="panel admin-page info-panel">
          <h3>Komposisi status pekerjaan</h3>
          <DonatStatus items={statusGrafik} />
          <h3 className="mt">Aset yang perlu perhatian</h3>
          <BarisAset items={[
            { label: 'Belum PSP', nilai: aset.belumPsp, warna: '#f59e0b' },
            { label: 'Rusak berat A', nilai: rusakA, warna: '#ef4444' },
            { label: 'Rusak berat B', nilai: rusakB, warna: '#dc2626' },
            { label: 'Rusak berat C', nilai: rusakC, warna: '#b91c1c' },
          ]} />
        </section>
      </div>

      <section className="panel admin-page info-panel">
        <h3>Pekerjaan belum selesai <span className="hitung">{belum.length}</span></h3>
        {belum.length === 0
          ? <p className="catatan-aman">Seluruh pekerjaan Satker ini sudah selesai.</p>
          : <ul className="info-list">{belum.map(t => (
              <li key={t.task.id}>
                <div className="info-list-teks">
                  <strong>{t.task.title}</strong>
                  <span>{t.tahap}</span>
                </div>
                <div className="info-list-meter">
                  <div className="info-list-track"><i style={{ width: `${t.progress}%` }} /></div>
                  <b className={`skor ${t.status}`}>{t.progress}%</b>
                </div>
              </li>))}</ul>}
      </section>

      <section className="panel admin-page info-panel">
        <h3>Pekerjaan selesai <span className="hitung">{selesai.length}</span></h3>
        {selesai.length === 0
          ? <p className="catatan-aman">Belum ada pekerjaan yang selesai.</p>
          : <ul className="info-list">{selesai.map(t => (
              <li key={t.task.id}>
                <div className="info-list-teks">
                  <strong>{t.task.title}</strong>
                  <span>{t.tahap}</span>
                </div>
                <div className="info-list-meter"><b className="skor selesai">100%</b></div>
              </li>))}</ul>}
      </section>
    </div>
  )
}

// ── Daftar seluruh pekerjaan ────────────────────────────────────────────────
export function TaskListPage({ tasks, setDetail }: { tasks: Task[]; setDetail: (id: string) => void }) {
  return (
    <section className="panel admin-page">
      <div className="panel-head">
        <div>
          <h2>Seluruh Pekerjaan</h2>
          <p>Klik pekerjaan untuk melihat Satker yang sudah dan belum selesai, lalu salin ringkasannya ke grup WhatsApp.</p>
        </div>
      </div>
      <div className="task-daftar">
        {tasks.map(task => {
          const avg = task.assignments.length
            ? Math.round(task.assignments.reduce((n, a) => n + progressForAssignment(task, a), 0) / task.assignments.length)
            : 0
          const selesai = task.assignments.filter(a => statusForAssignment(task, a) === 'selesai').length
          return (
            <button className={`task-daftar-baris ${!task.active ? 'archived' : ''}`} key={task.id} onClick={() => setDetail(task.id)}>
              <div className="tdb-judul">
                <strong>{task.title}</strong>
                <span>{task.due} · {task.assignments.length} Satker</span>
              </div>
              <div className="tdb-meter">
                <div className="tdb-track"><i style={{ width: `${avg}%` }} /></div>
                <span>{avg}%</span>
              </div>
              <div className="tdu-total">{selesai} / {task.assignments.length} selesai</div>
              <span className={`visibility ${task.active ? 'open' : 'closed'}`}>{task.active ? 'Aktif' : 'Ditutup'}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

// ── Ringkasan pekerjaan untuk WhatsApp ─────────────────────────────────────
const statusTeks: Record<string, string> = {
  selesai: 'Selesai', proses: 'Dalam proses', belum: 'Belum dikerjakan',
  verifikasi: 'Menunggu verifikasi', perbaikan: 'Perlu perbaikan',
  persetujuan: 'Menunggu persetujuan', ditutup: 'Ditutup',
}

export function susunRingkasanWA(task: Task): string {
  const baris = task.assignments
    .map(a => ({ nama: satkers.find(x => x.code === a.satker)?.name ?? a.satker, a, status: statusForAssignment(task, a), progress: progressForAssignment(task, a) }))
  const blok = (judul: string, list: typeof baris) =>
    list.length
      ? `${judul} (${list.length})\n` + list
          .sort((x, y) => x.nama.localeCompare(y.nama, 'id'))
          .map(x => `- ${x.nama} | ${statusTeks[x.status] ?? x.a.status} | ${x.progress}%`)
          .join('\n')
      : `${judul}: tidak ada\n`

  return [
    `*${task.title}*`,
    `Batas waktu: ${task.due}`,
    task.letter ? `Dasar: ${task.letter}` : '',
    '',
    blok('SUDAH SELESAI', baris.filter(x => x.status === 'selesai')),
    '',
    blok('BELUM SELESAI', baris.filter(x => x.status !== 'selesai')),
  ].filter(Boolean).join('\n')
}

// ── Detail pekerjaan: sudah / belum, dengan salin ──────────────────────────
export function DetailPekerjaanPanel({ task, onTutup, onBukaPekerjaan }: {
  task: Task
  onTutup: () => void
  onBukaPekerjaan: (kode: string) => void
}) {
  const [salin, setSalin] = useState<'idle' | 'ok' | 'gagal'>('idle')

  const baris = task.assignments
    .map(a => ({
      kode: a.satker,
      nama: satkers.find(s => s.code === a.satker)?.name ?? a.satker,
      status: statusForAssignment(task, a),
      progress: progressForAssignment(task, a),
      kurang: a.missing ?? [],
    }))
    .sort((x, y) => (x.status === 'selesai' ? 1 : 0) - (y.status === 'selesai' ? 1 : 0) || x.nama.localeCompare(y.nama, 'id'))

  const sudah = baris.filter(b => b.status === 'selesai')
  const belum = baris.filter(b => b.status !== 'selesai')
  const ringkasan = useMemo(() => susunRingkasanWA(task), [task])

  const salinKeClipboard = async () => {
    try {
      await navigator.clipboard.writeText(ringkasan)
      setSalin('ok')
    } catch {
      setSalin('gagal')
    }
    setTimeout(() => setSalin('idle'), 2500)
  }

  return (
    <section className="panel admin-page">
      <div className="panel-head">
        <div>
          <button className="link-button" onClick={onTutup}>← Kembali ke daftar pekerjaan</button>
          <h2>{task.title}</h2>
          <div className="chip-row" style={{ marginTop: 7 }}>
            <span className="chip">{task.due}</span>
            <span className="chip">{task.assignments.length} Satker</span>
            <span className="chip">Selesai {sudah.length}</span>
            <span className="chip">Belum {belum.length}</span>
          </div>
        </div>
        <button className="primary" onClick={() => void salinKeClipboard()}>
          {salin === 'ok' ? 'Tersalin' : salin === 'gagal' ? 'Gagal — salin manual' : 'Salin untuk WhatsApp'}
        </button>
      </div>

      <div className="detail-pekerjaan">
        <div className="detail-bloc aktif">
          <h3>Belum selesai <span>{belum.length}</span></h3>
          {belum.length === 0
            ? <p className="catatan-aman">Seluruh Satker sudah selesai.</p>
            : <ul className="daftar-satker">
                {belum.map(b => (
                  <li key={b.kode}>
                    <div className="ds-kiri">
                      <strong>{b.nama}</strong>
                      <span>{b.kurang.length ? b.kurang.slice(0, 2).join(' · ') : statusTeks[b.status] ?? b.status}</span>
                    </div>
                    <div className="ds-kanan">
                      <span className={`skor ${b.status}`}>{b.progress}%</span>
                      <button className="link-button" onClick={() => onBukaPekerjaan(b.kode)}>Lihat</button>
                    </div>
                  </li>
                ))}
              </ul>}
        </div>

        <div className="detail-bloc">
          <h3>Sudah selesai <span>{sudah.length}</span></h3>
          {sudah.length === 0
            ? <p className="catatan-aman">Belum ada Satker yang selesai.</p>
            : <ul className="daftar-satker">
                {sudah.map(b => (
                  <li key={b.kode}>
                    <div className="ds-kiri"><strong>{b.nama}</strong><span>100% selesai</span></div>
                    <div className="ds-kanan"><span className="skor selesai">100%</span></div>
                  </li>
                ))}
              </ul>}
        </div>
      </div>

      <details className="teks-wa" open={salin === 'gagal'}>
        <summary>Teks ringkasan untuk disalin manual</summary>
        <pre>{ringkasan}</pre>
      </details>
    </section>
  )
}

// ── Profil Aset Satker (data sidak BMN) ─────────────────────────────────────
type AsetRow = {
  no: number
  jenis_bmn: string
  satker_code: string
  nama_satker: string
  kode_barang: string | null
  nup: string | null
  nama_barang: string
  kondisi: string | null
  status_bmn: string | null
  nilai_perolehan: number | null
  nilai_buku: number | null
  tanggal_perolehan: string | null
  luas_tanah_seluruhnya: number | null
  luas_bangunan: number | null
  luas_tapak_bangunan: number | null
  luas_pemanfaatan: number | null
  jumlah_lantai: number | null
  no_psp: string | null
  tanggal_psp: string | null
  status_sertifikasi: string | null
  no_sertifikat: string | null
  alamat: string | null
  rt_rw: string | null
  kelurahan: string | null
  kecamatan: string | null
  kab_kota: string | null
  provinsi: string | null
  kode_pos: string | null
  penghuni: string | null
  pengguna: string | null
}

type RekapSatker = {
  satker_code: string
  tanah: number
  rumah_negara: number
  gedung: number
  total_aset: number
  total_nilai: number
}

const jenisAset = [
  { key: 'TANAH', label: 'Tanah', Ikon: LandPlot, warna: '#16a34a' },
  { key: 'RUMAH NEGARA', label: 'Rumah Negara', Ikon: Home, warna: '#6366f1' },
  { key: 'BANGUNAN DAN GEDUNG', label: 'Gedung & Bangunan', Ikon: Building2, warna: '#0ea5e9' },
] as const

function formatRupiah(n: number | null): string {
  if (n == null || n === 0) return '—'
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`
  return `Rp ${n.toLocaleString('id-ID')}`
}

function formatLuas(n: number | null): string {
  if (n == null || n === 0) return '—'
  return `${n.toLocaleString('id-ID')} m²`
}

function tahunDari(tanggal: string | null): string {
  if (!tanggal) return '—'
  const m = tanggal.match(/(\d{4})/)
  return m ? m[1] : '—'
}

function alamatLengkap(r: AsetRow): string {
  return [r.alamat, r.rt_rw ? `RT/RW ${r.rt_rw}` : '', r.kelurahan, r.kecamatan, r.kab_kota, r.provinsi, r.kode_pos].filter(Boolean).join(', ')
}

export function ProfilAsetPage() {
  const [kode, setKode] = useState<string | null>(null)
  if (kode) return <ProfilAsetDetail kodeSatker={kode} onKembali={() => setKode(null)} />
  return <ProfilAsetGrid onPilih={setKode} />
}

function ProfilAsetGrid({ onPilih }: { onPilih: (kode: string) => void }) {
  const [cari, setCari] = useState('')
  const [rekap, setRekap] = useState<RekapSatker[]>([])
  const cariAktif = cari.trim().toLowerCase()
  const daftar = satkers.filter(s => s.code !== '692507' && `${s.name} ${s.code}`.toLowerCase().includes(cariAktif))

  useEffect(() => {
    let mounted = true
    import('./lib/supabase').then(async ({ supabase }) => {
      if (!supabase) { setLoading(false); return }
      const { data } = await supabase.rpc('get_bmn_rekap_satker')
      if (mounted && Array.isArray(data)) setRekap(data as RekapSatker[])
      if (mounted) setLoading(false)
    }).catch(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  return (
    <section className="panel admin-page">
      <div className="panel-head">
        <div>
          <h2>Profil Aset Satker</h2>
          <p>Data BMN per Satker untuk keperluan sidak dan monitoring aset.</p>
        </div>
        <label className="filter-cari">
          <Search size={15} />
          <input value={cari} onChange={e => setCari(e.target.value)} placeholder="Cari nama atau kode Satker" />
        </label>
      </div>
      {loading
        ? <p style={{ opacity: .6, padding: '20px 0' }}>Memuat data…</p>
        : <div className="pa2-grid">
            {daftar.map(s => {
              const rk = rekap.find(r => r.satker_code === s.code)
              const asetTerkait = (rk?.tanah ?? 0) + (rk?.rumah_negara ?? 0) + (rk?.gedung ?? 0)
              return (
                <button className="pa2-kartu" key={s.code} onClick={() => onPilih(s.code)}>
                  <div className="pa2-ikon"><Building2 size={18} /></div>
                  <div className="pa2-teks">
                    <span className="pa2-kode">{s.code}</span>
                    <strong className="pa2-nama">{s.name}</strong>
                    <span className="pa2-sub">{asetTerkait} aset terkait · {formatRupiah(rk?.total_nilai ?? 0)}</span>
                  </div>
                  <div className="pa2-angka">
                    <b>{asetTerkait}</b>
                    <span>ASET</span>
                  </div>
                </button>
              )
            })}
          </div>}
      {!loading && daftar.length === 0 && <p className="kosong">Satker tidak ditemukan.</p>}
    </section>
  )
}

function ProfilAsetDetail({ kodeSatker, onKembali }: { kodeSatker: string; onKembali: () => void }) {
  const [data, setData] = useState<AsetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [aktif, setAktif] = useState<string | null>(null)
  const satker = satkers.find(s => s.code === kodeSatker)
  const nama = satker?.name ?? kodeSatker

  useEffect(() => {
    let mounted = true
    setLoading(true)
    import('./lib/supabase').then(async ({ supabase }) => {
      if (!supabase) { setLoading(false); return }
      const { data: rows } = await supabase.rpc('get_bmn_aset_satker', { p_satker: kodeSatker })
      if (mounted && Array.isArray(rows)) setData(rows as AsetRow[])
      if (mounted) setLoading(false)
    }).catch(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [kodeSatker])

  const rekap = useMemo(() => jenisAset.map(j => {
    const rows = data.filter(r => r.jenis_bmn === j.key)
    return {
      ...j,
      jumlah: rows.length,
      totalLuas: rows.reduce((n, r) => n + (j.key === 'TANAH' ? (r.luas_tanah_seluruhnya ?? 0) : (r.luas_bangunan ?? 0)), 0),
      totalNilai: rows.reduce((n, r) => n + (r.nilai_perolehan ?? 0), 0),
      tanpaPsp: rows.filter(r => !r.no_psp).length,
    }
  }), [data])

  const kategoriAktif = rekap.find(r => r.key === aktif)
  const tabelRows = aktif ? data.filter(r => r.jenis_bmn === aktif) : []
  const semuaAsetTerkait = data.filter(r => jenisAset.some(j => j.key === r.jenis_bmn))
  const totalNilaiSemua = semuaAsetTerkait.reduce((n, r) => n + (r.nilai_perolehan ?? 0), 0)

  const exportPdf = async () => {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

    // Header
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(`Profil Aset Satker — ${nama}`, 14, 15)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100)
    doc.text(`Kode: ${kodeSatker}  ·  Data SIMAN snapshot 30 September 2026`, 14, 21)
    doc.text(`Kategori: ${kategoriAktif?.label ?? 'Semua'}  ·  ${tabelRows.length} aset`, 14, 26)
    doc.setTextColor(0)

    // Tabel
    const head = [['No', 'Kode Barang', 'NUP', 'Nama Barang', 'Kondisi', 'Tahun', 'Nilai Perolehan', 'Luas Tanah (m²)', 'Luas Bangunan (m²)', 'Penghuni', 'Alamat Lengkap']]
    const body = tabelRows.map(r => [
      String(r.no),
      r.kode_barang ?? '—',
      r.nup ?? '—',
      r.nama_barang,
      r.kondisi ?? '—',
      tahunDari(r.tanggal_perolehan),
      r.nilai_perolehan?.toLocaleString('id-ID') ?? '—',
      r.luas_tanah_seluruhnya?.toLocaleString('id-ID') ?? '—',
      r.luas_bangunan?.toLocaleString('id-ID') ?? '—',
      r.penghuni ?? '—',
      alamatLengkap(r),
    ])

    autoTable(doc, {
      head,
      body,
      startY: 32,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], fontSize: 6.5, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 22 },
        2: { cellWidth: 10 },
        3: { cellWidth: 40 },
        6: { halign: 'right', cellWidth: 25 },
        7: { halign: 'right', cellWidth: 20 },
        8: { halign: 'right', cellWidth: 22 },
        10: { cellWidth: 55 },
      },
      margin: { left: 14, right: 14 },
    })

    doc.save(`Profil-Aset-${kodeSatker}-${kategoriAktif?.label?.replace(/\\s+/g, '-') ?? 'semua'}.pdf`)
  }

  return (
    <div className="pa-halaman">
      {/* Hero gradien */}
      <section className="pa-hero">
        <button className="pa-hero-back" onClick={onKembali}><ArrowLeft size={13} /> Kembali ke daftar Satker</button>
        <div className="pa-hero-baris">
          <div className="pa-hero-ikon"><Building2 size={26} /></div>
          <div className="pa-hero-teks">
            <h2>{nama}</h2>
            <p>Kode {kodeSatker} · Data SIMAN snapshot 30 September 2026</p>
          </div>
          {kategoriAktif && (
            <button className="pa-hero-export" onClick={() => void exportPdf()}>
              <Printer size={14} /> Export PDF
            </button>
          )}
        </div>
        {!loading && (
          <div className="pa-hero-stats">
            <div className="pa-stat"><b>{semuaAsetTerkait.length}</b><span>Aset terkait</span></div>
            <div className="pa-stat"><b>{formatRupiah(totalNilaiSemua)}</b><span>Total nilai perolehan</span></div>
            <div className="pa-stat"><b>{rekap.reduce((n, k) => n + k.tanpaPsp, 0)}</b><span>Belum PSP</span></div>
          </div>
        )}
      </section>

      {/* Kartu kategori */}
      {loading
        ? <p className="pa-loading">Memuat data aset…</p>
        : <div className="pa-kategori-grid">
            {rekap.map((k, idx) => {
              const IkonKat = k.Ikon
              const isAktif = aktif === k.key
              return (
                <button
                  key={k.key}
                  className={`pa-kategori ${isAktif ? 'pa-kategori-aktif' : ''}`}
                  style={{ animationDelay: `${idx * 70}ms`, ['--pa-warna' as never]: k.warna }}
                  onClick={() => setAktif(isAktif ? null : k.key)}
                >
                  <i className="pa-kategori-bar" />
                  <div className="pa-kategori-atas">
                    <div className="pa-kategori-ikon"><IkonKat size={20} /></div>
                    {k.tanpaPsp > 0 && <span className="pa-badge-merah">{k.tanpaPsp} tanpa PSP</span>}
                  </div>
                  <strong className="pa-kategori-label">{k.label}</strong>
                  <b className="pa-kategori-jumlah">{k.jumlah}<span> aset</span></b>
                  <div className="pa-kategori-rinci">
                    <span>{formatLuas(k.totalLuas)}</span>
                    <span className="pa-kategori-nilai">{formatRupiah(k.totalNilai)}</span>
                  </div>
                </button>
              )
            })}
          </div>}

      {/* Tabel detail */}
      {!loading && kategoriAktif && (
        <section className="pa-tabel-panel">
          <div className="pa-tabel-head">
            <h3>{kategoriAktif.label} <span className="pa-hitung">{tabelRows.length} aset</span></h3>
            <button className="pa-tabel-export" onClick={() => void exportPdf()}><Printer size={13} /> Export PDF</button>
          </div>
          <div className="pa-tabel-wrap">
            <table className="pa-tabel">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Kode Barang</th>
                  <th>NUP</th>
                  <th>Nama Barang</th>
                  <th>Kondisi</th>
                  <th>Tahun</th>
                  <th>Nilai Perolehan</th>
                  <th>Luas Tanah (m²)</th>
                  <th>Luas Bangunan (m²)</th>
                  <th>Penghuni</th>
                  <th>Alamat Lengkap</th>
                </tr>
              </thead>
              <tbody>
                {tabelRows.map(r => (
                  <tr key={`${r.no}-${r.nup}`}>
                    <td className="pa-td-no">{r.no}</td>
                    <td className="pa-td-kode">{r.kode_barang ?? '—'}</td>
                    <td>{r.nup ?? '—'}</td>
                    <td className="pa-td-nama">{r.nama_barang}</td>
                    <td>{r.kondisi ?? '—'}</td>
                    <td>{tahunDari(r.tanggal_perolehan)}</td>
                    <td className="pa-td-nilai">{r.nilai_perolehan?.toLocaleString('id-ID') ?? '—'}</td>
                    <td>{formatLuas(r.luas_tanah_seluruhnya)}</td>
                    <td>{formatLuas(r.luas_bangunan)}</td>
                    <td>{r.penghuni ?? '—'}</td>
                    <td className="pa-td-alamat">{alamatLengkap(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
