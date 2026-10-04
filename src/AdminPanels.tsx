import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Building2, Car, CircleAlert, ClipboardList, Database, Upload, Clock3, Cog, Crosshair, HardHat, Home, LandPlot, Monitor, Package, Printer, Route, Search, TrendingUp, UserCheck, Wrench, X } from 'lucide-react'
import type { Task } from './data'
import type { KategoriRusak } from './rusakBeratData'
import { useUptScores } from './uptScore'
import { RegisterPenghapusan } from './RegisterPenghapusan'
import { bacaFileAset, type HasilBaca, type HasilBanding } from './imporAset'
import { satkers, statusLabel, type TaskStatus } from './data'
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
  const skorUpt = useUptScores()
  const cariAktif = cari.trim().toLowerCase()
  const hasil = baris.filter(b => `${b.namaSatker} ${b.kodeSatker}`.toLowerCase().includes(cariAktif))

  return (
    <section className="panel admin-page">
      <div className="panel-head">
        <div>
          <h2>Monitoring Satker</h2>
          <p>{cariAktif ? `${hasil.length} dari ${baris.length} Satker cocok dengan "${cari.trim()}"` : `${baris.length} Satker. Klik kartu untuk melihat infografis Satker.`}</p>
        </div>
        <label className="filter-cari">
          <Search size={15} />
          <input
            value={cari}
            onChange={e => setCari(e.target.value)}
            placeholder="Cari nama atau kode Satker…"
            aria-label="Cari Satker"
          />
          {cari && (
            <button type="button" className="filter-cari-x" onClick={() => setCari('')} aria-label="Bersihkan pencarian">
              <X size={13} />
            </button>
          )}
        </label>
      </div>
      <div className="ms-grid">
        {hasil.map(b => {
          // Angka utama = Skor UPT, sumbernya sama dengan menu Kinerja UPT.
          const upt = skorUpt.get(b.kodeSatker)
          const skor = upt?.score ?? 0
          const tone = skor >= 80 ? 'hijau' : skor >= 50 ? 'kuning' : 'merah'
          return (
            <button className="ms-kartu" key={b.kodeSatker} onClick={() => onPilih(b.kodeSatker)}>
              <div className="ms-ikon"><Building2 size={18} /></div>
              <div className="ms-teks">
                <span className="ms-kode">{b.kodeSatker}</span>
                <strong className="ms-nama">{b.namaSatker}</strong>
                <div className="ms-bar"><i style={{ width: `${upt?.penyelesaian ?? 0}%` }} /></div>
              </div>
              <div className={`ms-skor ${tone}`}>
                <b>{skor}</b>
                <span>skor UPT</span>
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

function persenNilai(nilai: number, total: number): string {
  if (!total) return '0'
  const p = (nilai / total) * 100
  return p >= 10 ? p.toFixed(0) : p.toFixed(1)
}

/** Teks pengingat untuk Satker — dipakai tombol "Salin pesan". */
export function susunPesanReminder(namaSatker: string, items: Array<{ title: string; status: TaskStatus; progress: number }>): string {
  const baris = items.map(i => `• ${i.title} — ${statusTeks[i.status] ?? i.status} (${i.progress}%)`)
  return [
    `Yth. Operator ${namaSatker},`,
    '',
    'Kami dari Korwil BMN Ditjenpas Riau ingin mengingatkan pekerjaan SIPADU BMN berikut yang masih perlu ditindaklanjuti:',
    '',
    baris.length ? baris.join('\n') : '• Tidak ada pekerjaan yang masih perlu ditindaklanjuti.',
    '',
    'Mohon segera dikerjakan dan diunggah melalui portal SIPADU BMN (https://sipadu-bmn.vercel.app). Jika ada kendala, silakan hubungi Korwil BMN.',
    '',
    'Terima kasih.',
    '— Korwil BMN Ditjenpas Riau',
  ].join('\n')
}

function InfografisSatker({ tasks, kodeSatker, onKembali }: { tasks: Task[]; kodeSatker: string; onKembali: () => void }) {
  const petaSkor = useUptScores()
  const uptSkor = petaSkor.get(kodeSatker)
  const satker = satkers.find(s => s.code === kodeSatker)
  const nama = satker?.name ?? kodeSatker
  const baris = useMemo(() => barisSatker(tasks).find(b => b.kodeSatker === kodeSatker), [tasks, kodeSatker])
  const aset = useMemo(() => rekapAsetSatker(kodeSatker), [kodeSatker])
  // Rekap rusak berat dibaca dari database (kondisi = 'Rusak Berat' pada bmn_assets)
  const [rusakRekap, setRusakRekap] = useState<{ A: number; B: number; C: number; total: number; nilai: number }>({ A: 0, B: 0, C: 0, total: 0, nilai: 0 })
  useEffect(() => {
    let mounted = true
    import('./lib/supabase').then(async ({ supabase }) => {
      if (!supabase) return
      const { data } = await supabase.rpc('get_bmn_rusak_rekap', { p_satker: kodeSatker })
      const row = (Array.isArray(data) ? data[0] : data) as typeof rusakRekap | null
      if (mounted && row) setRusakRekap(row)
    }).catch(() => { /* biarkan nol bila gagal */ })
    return () => { mounted = false }
  }, [kodeSatker])
  const rusakA = rusakRekap.A, rusakB = rusakRekap.B, rusakC = rusakRekap.C

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

  // ── Reminder: susun pesan singkat per pekerjaan atau sekali jalan ────────
  const [salin, setSalin] = useState<'idle' | 'ok' | 'gagal'>('idle')
  const tulisClipboard = async (teks: string) => {
    try { await navigator.clipboard.writeText(teks); setSalin('ok') }
    catch { setSalin('gagal') }
    setTimeout(() => setSalin('idle'), 2500)
  }
  const salinPesan = async (task: Task, status: string, tahap: string, progress: number) => {
    await tulisClipboard(susunPesanReminder(nama, [
      { title: `${task.title} — ${tahap}`, status: status as TaskStatus, progress },
    ]))
  }
  const salinSemua = async () => {
    const teksBelum = belum.length
      ? belum.map(t => ({ title: `${t.task.title} — ${t.tahap}`, status: t.status as TaskStatus, progress: t.progress }))
      : belum.length === 0 && selesai.length === 0
        ? [{ title: 'Belum ada pekerjaan yang ditugaskan.', status: 'belum' as TaskStatus, progress: 0 }]
        : []
    const akhir = belum.length === 0
      ? '\n\nSeluruh pekerjaan yang ditugaskan sudah selesai. Terima kasih atas kerja samanya.'
      : ''
    await tulisClipboard(susunPesanReminder(nama, teksBelum) + akhir)
  }

  // ── Profil Satker: rekap jenis BMN dari tabel bmn_assets ─────────────────
  const [jenisAset, setJenisAset] = useState<Array<{ jenis: string; jumlah: number; nilai: number; tanpa_psp: number; luas: number }>>([])
  useEffect(() => {
    let mounted = true
    import('./lib/supabase').then(async ({ supabase }) => {
      if (!supabase) return
      const { data } = await supabase.rpc('get_bmn_rekap_jenis', { p_satker: kodeSatker })
      if (mounted && Array.isArray(data)) setJenisAset(data as typeof jenisAset)
    }).catch(() => { /* biarkan kosong bila gagal */ })
    return () => { mounted = false }
  }, [kodeSatker])

  const kartuAset = useMemo(() => jenisAset
    .filter(j => jenisBmnMeta[j.jenis])
    .map(j => ({ ...j, ...jenisBmnMeta[j.jenis] })), [jenisAset])
  const totalAset = kartuAset.reduce((n, k) => n + k.jumlah, 0)
  const totalNilaiAset = kartuAset.reduce((n, k) => n + k.nilai, 0)

  // ── Klik kartu jenis aset -> tampilkan tabel detail-nya di tempat ──────
  const [kategoriAktif, setKategoriAktif] = useState<string | null>(null)
  const [detailAset, setDetailAset] = useState<AsetRow[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  useEffect(() => {
    if (!kategoriAktif) { setDetailAset([]); return }
    let mounted = true
    setDetailLoading(true)
    import('./lib/supabase').then(async ({ supabase }) => {
      if (!supabase) { if (mounted) setDetailLoading(false); return }
      const { data } = await supabase.rpc('get_bmn_aset_satker', { p_satker: kodeSatker })
      if (mounted && Array.isArray(data)) setDetailAset(data as AsetRow[])
      if (mounted) setDetailLoading(false)
    }).catch(() => { if (mounted) setDetailLoading(false) })
    return () => { mounted = false }
  }, [kategoriAktif, kodeSatker])

  const kategoriTerpilih = kartuAset.find(k => k.jenis === kategoriAktif)
  const barisDetail = kategoriAktif ? detailAset.filter(r => r.jenis_bmn === kategoriAktif) : []
  const kolomDetail = kategoriAktif ? kolomUntukJenis(kategoriAktif) : []

  // ── Aset yang perlu perhatian: klik untuk melihat daftar barangnya ────────
  const [perhatian, setPerhatian] = useState<'psp' | 'rusak' | null>(null)
  const [isiPerhatian, setIsiPerhatian] = useState<any[]>([])
  const [perhatianLoading, setPerhatianLoading] = useState(false)
  const [filterRusak, setFilterRusak] = useState<KategoriRusak | 'semua'>('semua')
  useEffect(() => {
    if (!perhatian) { setIsiPerhatian([]); return }
    let mounted = true
    setPerhatianLoading(true)
    import('./lib/supabase').then(async ({ supabase }) => {
      if (!supabase) { if (mounted) setPerhatianLoading(false); return }
      const { data } = await supabase.rpc('get_bmn_perhatian', { p_satker: kodeSatker, p_jenis: perhatian })
      if (mounted && Array.isArray(data)) setIsiPerhatian(data as any[])
      if (mounted) setPerhatianLoading(false)
    }).catch(() => { if (mounted) setPerhatianLoading(false) })
    return () => { mounted = false }
  }, [perhatian, kodeSatker])

  const barisRusak = useMemo(() => filterRusak === 'semua'
    ? isiPerhatian
    : isiPerhatian.filter(r => r.kategori === filterRusak), [isiPerhatian, filterRusak])


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
    <div className="pa-halaman">
      {/* Hero & kartu aset — sama persis dengan halaman Profil Aset Satker */}
      <section className="pa-hero">
        <button className="pa-hero-back" onClick={onKembali}><ArrowLeft size={13} /> Kembali ke daftar Satker</button>
        <div className="pa-hero-baris">
          <div className="pa-hero-ikon"><Building2 size={26} /></div>
          <div className="pa-hero-teks">
            <h2>{nama}</h2>
            <p>Kode {kodeSatker} · Data SIMAN snapshot 30 September 2026</p>
          </div>
        </div>
        <div className="pa-hero-stats">
          <div className="pa-stat"><b>{totalAset.toLocaleString('id-ID')}</b><span>Total aset</span></div>
          <div className="pa-stat"><b>{formatRupiah(totalNilaiAset)}</b><span>Total nilai perolehan</span></div>
          <div className="pa-stat"><b>{kartuAset.reduce((n, k) => n + k.tanpa_psp, 0)}</b><span>Belum PSP</span></div>
        </div>
      </section>
      {salin !== 'idle' && (
        <div className={`info-toast ${salin}`} role="status">
          {salin === 'ok' ? 'Pesan tersalin — siap ditempel di WhatsApp.' : 'Gagal menyalin. Pilih teksnya secara manual.'}
        </div>
      )}

      {/* Kartu jenis aset — kelas yang sama dengan halaman Profil Aset Satker */}
      {kartuAset.length === 0
        ? <p className="pa-loading">Memuat data aset…</p>
        : <div className="pa-kategori-grid">
            {kartuAset.map((k, idx) => {
              const Ikon = k.Ikon
              const isAktif = kategoriAktif === k.jenis
              return (
                <button
                  key={k.jenis}
                  className={`pa-kategori ${kategoriAktif === k.jenis ? 'pa-kategori-aktif' : ''}`}
                  style={{ animationDelay: `${idx * 70}ms`, ['--pa-warna' as never]: k.warna }}
                  onClick={() => setKategoriAktif(isAktif ? null : k.jenis)}
                >
                  <i className="pa-kategori-bar" />
                  <div className="pa-kategori-atas">
                    <div className="pa-kategori-ikon"><Ikon size={20} /></div>
                    {k.tanpa_psp > 0 && <span className="pa-badge-merah">{k.tanpa_psp} tanpa PSP</span>}
                  </div>
                  <strong className="pa-kategori-label">{k.label}</strong>
                  <b className="pa-kategori-jumlah">{k.jumlah.toLocaleString('id-ID')}<span> aset</span></b>
                  <div className="pa-kategori-rinci">
                    <span>{k.luas > 0 ? formatLuas(k.luas) : '—'}</span>
                    <span className="pa-kategori-nilai">{k.nilai > 0 ? formatRupiah(k.nilai) : '—'}</span>
                  </div>
                </button>
              )
            })}
          </div>}

      {/* Tabel detail aset — muncul di bawah grid saat kartu diklik */}
      {kategoriAktif && (
        <section className="pa-tabel-panel">
          <div className="pa-tabel-head">
            <h3>{kategoriTerpilih?.label} <span className="pa-hitung">{barisDetail.length} aset</span></h3>
            <button className="pa-tabel-export" onClick={() => setKategoriAktif(null)}>Tutup tabel</button>
          </div>
          {detailLoading
            ? <p className="pa-loading">Memuat data aset…</p>
            : barisDetail.length === 0
              ? <p className="pa-loading">Belum ada data untuk kategori ini.</p>
              : <div className="pa-tabel-wrap">
                  <table className="pa-tabel">
                    <thead>
                      <tr><th>No</th>{kolomDetail.map(c => <th key={c.label}>{c.label}</th>)}</tr>
                    </thead>
                    <tbody>
                      {barisDetail.map((r, i) => (
                        <tr key={`${i}-${r.nup}`}>
                          <td className="pa-td-no">{i + 1}</td>
                          {kolomDetail.map(c => (
                            <td key={c.label} className={`${c.mono ? 'pa-td-kode ' : ''}${c.kanan ? 'pa-td-nilai' : ''}`}>{c.ambil(r)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>}
        </section>
      )}

      {/* 2. Kinerja Satker + komposisi status pekerjaan */}
      <div className="info-dua">
        <section className="panel admin-page info-panel">
          <div className="info-panel-head">
            <h3>Kinerja Satker</h3>
            {uptSkor && <span className="info-panel-ket">Skor UPT — sama dengan menu Kinerja UPT</span>}
          </div>
          <div className="info-rings">
            <Cincin persen={uptSkor?.score ?? 0} label="Skor UPT" sub={`${uptSkor?.selesai ?? 0} dari ${uptSkor?.total ?? 0} tugas selesai`} dari="#6366f1" ke="#8b5cf6" />
            <Cincin persen={uptSkor?.penyelesaian ?? 0} label="Tingkat selesai" sub="70% bobot skor" dari="#0ea5e9" ke="#38bdf8" />
            <Cincin persen={uptSkor?.kualitas ?? 0} label="Skor revisi" sub={`${uptSkor?.revisi ?? 0} revisi · 30% bobot`} dari="#10b981" ke="#34d399" />
          </div>
          <div className="info-keterangan">
            <div><b>Ketepatan waktu</b><span>{persen}%</span><i>{baris?.ketepatanWaktuTepat ?? 0} dari {baris?.total ?? 0} tugas selesai tepat sebelum batas waktu</i></div>
            <div><b>Progres rata-rata</b><span>{baris?.progressRata ?? 0}%</span><i>Rata-rata progres seluruh pekerjaan aktif Satker ini</i></div>
            <div><b>Dalam perbaikan</b><span>{baris?.perluPerbaikan ?? 0}</span><i>Pekerjaan yang dikembalikan Korwil untuk diperbaiki</i></div>
          </div>
        </section>
        <section className="panel admin-page info-panel">
          <h3>Komposisi status pekerjaan</h3>
          <DonatStatus items={statusGrafik} />
          <h3 className="mt">Aset yang perlu perhatian</h3>
          <div className="pt-grid">
            {([
              { id: 'psp', label: 'Belum PSP', n: aset.belumPsp, warna: '#f59e0b' },
              { id: 'rusak', label: 'Rusak Berat A', n: rusakA, warna: '#ef4444' },
              { id: 'rusak', label: 'Rusak Berat B', n: rusakB, warna: '#dc2626' },
              { id: 'rusak', label: 'Rusak Berat C', n: rusakC, warna: '#b91c1c' },
            ] as const).map(t => {
              const aktif = perhatian === t.id && (t.id === 'psp' || filterRusak === 'semua' || t.label.endsWith(filterRusak))
              return (
                <button
                  key={t.label}
                  className={`pt-kartu ${aktif ? 'aktif' : ''} ${t.n === 0 ? 'nol' : ''}`}
                  style={{ ['--pt-warna' as never]: t.warna }}
                  disabled={t.n === 0}
                  onClick={() => {
                    if (aktif) { setPerhatian(null); return }
                    setPerhatian(t.id)
                    setFilterRusak(t.id === 'psp' ? 'semua' : (t.label.slice(-1) as KategoriRusak))
                  }}
                >
                  <b>{t.n.toLocaleString('id-ID')}</b>
                  <span>{t.label}</span>
                  <i>{t.n === 0 ? 'tidak ada' : 'klik untuk lihat barang'}</i>
                </button>
              )
            })}
          </div>

          {perhatian && (
            <div className="pt-daftar">
              <div className="pt-daftar-head">
                <strong>{perhatian === 'psp' ? 'Daftar aset belum PSP' : `Daftar aset rusak berat${filterRusak === 'semua' ? '' : ` kategori ${filterRusak}`}`}</strong>
                <div className="filter-tab">
                  {(['semua', 'A', 'B', 'C'] as const).filter(k => k === 'semua' || perhatian === 'rusak').map(k => (
                    <button key={k} className={filterRusak === k ? 'aktif' : ''} onClick={() => setFilterRusak(k as never)}>
                      {k === 'semua' ? 'Semua' : `Kategori ${k}`}
                    </button>
                  ))}
                  <button onClick={() => setPerhatian(null)}>Tutup</button>
                </div>
              </div>
              {perhatianLoading
                ? <p className="pa-loading">Memuat…</p>
                : barisRusak.length === 0
                  ? <p className="pa-loading">Tidak ada aset pada kategori ini.</p>
                  : <div className="pa-tabel-wrap">
                      <table className="pa-tabel">
                        <thead>
                          <tr><th>No</th><th>Nama Barang</th><th>Jenis BMN</th>{perhatian === 'rusak' && <th>Kategori</th>}<th>Kondisi</th>{perhatian === 'rusak' && <th>Merk / Tipe</th>}<th>Nilai Perolehan</th></tr>
                        </thead>
                        <tbody>
                          {barisRusak.map((r, i) => (
                            <tr key={`${i}-${r.nup}-${r.nama_barang}`}>
                              <td className="pa-td-no">{i + 1}</td>
                              <td className="pa-td-nama">{r.nama_barang}</td>
                              <td>{jenisBmnMeta[r.jenis_bmn]?.label ?? r.jenis_bmn}</td>
                              {perhatian === 'rusak' && <td><span className={`pt-kat kat-${r.kategori}`}>{r.kategori}</span></td>}
                              <td>{r.kondisi || '—'}</td>
                              {perhatian === 'rusak' && <td>{[r.merk, r.tipe].filter(Boolean).join(' · ') || '—'}</td>}
                              <td className="pa-td-nilai">{r.nilai_perolehan ? r.nilai_perolehan.toLocaleString('id-ID') : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>}
              {barisRusak.length >= 500 && <p className="pa-keterangan">Menampilkan 500 baris pertama. Gunakan pencarian di tabel aset untuk rincian lengkap.</p>}
            </div>
          )}
        </section>
      </div>

      <section className="panel admin-page info-panel">
        <div className="info-panel-head">
          <h3>Pekerjaan belum selesai <span className="hitung">{belum.length}</span></h3>
          <button className="info-salin-semua" onClick={() => void salinSemua()}>Salin pesan</button>
        </div>
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
                  <button className="info-list-salin" onClick={() => void salinPesan(t.task, t.status, t.tahap, t.progress)}>Salin pesan</button>
                </div>
              </li>))}</ul>}
      </section>

      <section className="panel admin-page info-panel">
        <div className="info-panel-head">
          <h3>Pekerjaan selesai <span className="hitung">{selesai.length}</span></h3>
          <button className="info-salin-semua" onClick={() => void salinSemua()}>Salin pesan</button>
        </div>
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

      {/* Register Penghapusan — dicatat Korwil */}
      <RegisterPenghapusan
        kodeSatker={kodeSatker}
        namaSatker={nama}
        sisa={{ A: uptSkor?.sisa_a ?? 0, B: uptSkor?.sisa_b ?? 0, C: uptSkor?.sisa_c ?? 0 }}
      />
      </section>
    </div>
  )
}

// ── Daftar seluruh pekerjaan ────────────────────────────────────────────────
export function TaskListPage({ tasks, setDetail }: { tasks: Task[]; setDetail: (id: string) => void }) {
  const [cari, setCari] = useState('')
  const [status, setStatus] = useState<'semua' | 'aktif' | 'ditutup'>('semua')
  const q = cari.trim().toLowerCase()
  const hasil = tasks.filter(t => {
    if (status === 'aktif' && !t.active) return false
    if (status === 'ditutup' && t.active) return false
    if (!q) return true
    const namaSatker = t.assignments
      .map(a => satkers.find(s => s.code === a.satker)?.name ?? '')
      .join(' ')
    return `${t.title} ${t.description} ${t.letter} ${t.method} ${namaSatker}`.toLowerCase().includes(q)
  })

  return (
    <section className="panel admin-page">
      <div className="panel-head">
        <div>
          <h2>Seluruh Pekerjaan</h2>
          <p>{q || status !== 'semua' ? `${hasil.length} dari ${tasks.length} pekerjaan cocok.` : 'Klik pekerjaan untuk melihat Satker yang sudah dan belum selesai, lalu salin ringkasannya ke grup WhatsApp.'}</p>
        </div>
        <div className="panel-head-alat">
          <div className="filter-tab" role="group" aria-label="Saring status pekerjaan">
            {([['semua', 'Semua'], ['aktif', 'Aktif'], ['ditutup', 'Ditutup']] as const).map(([k, l]) => (
              <button
                key={k}
                className={status === k ? 'aktif' : ''}
                onClick={() => setStatus(k)}
                aria-pressed={status === k}
              >
                {l}
              </button>
            ))}
          </div>
          <label className="filter-cari">
            <Search size={15} />
            <input
              value={cari}
              onChange={e => setCari(e.target.value)}
              placeholder="Cari pekerjaan, dasar, atau nama Satker…"
              aria-label="Cari pekerjaan"
            />
            {cari && (
              <button type="button" className="filter-cari-x" onClick={() => setCari('')} aria-label="Bersihkan pencarian">
                <X size={13} />
              </button>
            )}
          </label>
        </div>
      </div>
      <div className="task-daftar">
        {hasil.map(task => {
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
      {hasil.length === 0 && <p className="kosong">Tidak ada pekerjaan yang cocok dengan pencarian Anda.</p>}
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
  merk: string | null
  tipe: string | null
  no_polisi: string | null
  no_identitas: string | null
}

type RekapSatker = {
  satker_code: string
  tanah: number
  rumah_negara: number
  gedung: number
  total_aset: number
  jumlah_jenis: number
  total_nilai: number
}

// Metadata semua jenis BMN yang ada di database (tabel bmn_assets).
const jenisBmnMeta: Record<string, { label: string; Ikon: typeof Building2; warna: string }> = {
  'TANAH': { label: 'Tanah', Ikon: LandPlot, warna: '#16a34a' },
  'RUMAH NEGARA': { label: 'Rumah Negara', Ikon: Home, warna: '#6366f1' },
  'BANGUNAN DAN GEDUNG': { label: 'Gedung & Bangunan', Ikon: Building2, warna: '#0ea5e9' },
  'JALAN DAN JEMBATAN': { label: 'Jalan & Jembatan', Ikon: Route, warna: '#f59e0b' },
  'KONSTRUKSI DALAM PENGERJAAN (KDP)': { label: 'KDP', Ikon: HardHat, warna: '#a855f7' },
  'ALAT ANGKUTAN BERMOTOR': { label: 'Kendaraan Bermotor', Ikon: Car, warna: '#ef4444' },
  'ALAT BESAR': { label: 'Alat Besar', Ikon: Cog, warna: '#64748b' },
  'ALAT PERSENJATAAN': { label: 'Alat Persenjataan', Ikon: Crosshair, warna: '#78350f' },
  'MESIN PERALATAN NON TIK': { label: 'Mesin & Peralatan Non-TIK', Ikon: Wrench, warna: '#475569' },
  'MESIN PERALATAN KHUSUS TIK': { label: 'Peralatan TIK', Ikon: Monitor, warna: '#0891b2' },
  'ASET TETAP LAINNYA': { label: 'Aset Tetap Lainnya', Ikon: Package, warna: '#71717a' },
}

// Kolom tabel disesuaikan dengan jenis BMN.
type KolomTabel = { label: string; ambil: (r: AsetRow) => string; kanan?: boolean; mono?: boolean; lebarPdf?: number }

function kolomUntukJenis(jenis: string): KolomTabel[] {
  const dasar: KolomTabel[] = [
    { label: 'Kode Barang', ambil: r => r.kode_barang ?? '—', mono: true, lebarPdf: 22 },
    { label: 'NUP', ambil: r => r.nup ?? '—', lebarPdf: 9 },
    { label: 'Nama Barang', ambil: r => r.nama_barang, lebarPdf: 36 },
    { label: 'Kondisi', ambil: r => r.kondisi ?? '—', lebarPdf: 13 },
    { label: 'Tahun', ambil: r => tahunDari(r.tanggal_perolehan), lebarPdf: 12 },
    { label: 'Nilai Perolehan', ambil: r => r.nilai_perolehan?.toLocaleString('id-ID') ?? '—', kanan: true, lebarPdf: 24 },
  ]
  const kendaraan: KolomTabel[] = [
    { label: 'Merk', ambil: r => r.merk ?? '—', lebarPdf: 22 },
    { label: 'Tipe', ambil: r => r.tipe ?? '—', lebarPdf: 28 },
    { label: 'No Polisi', ambil: r => r.no_polisi ?? '—', lebarPdf: 18 },
    { label: 'Pengguna', ambil: r => r.pengguna ?? '—', lebarPdf: 24 },
  ]
  const mesin: KolomTabel[] = [
    { label: 'Merk', ambil: r => r.merk ?? '—', lebarPdf: 26 },
    { label: 'Tipe', ambil: r => r.tipe ?? '—', lebarPdf: 34 },
    { label: 'Pengguna', ambil: r => r.pengguna ?? '—', lebarPdf: 26 },
  ]
  const properti: KolomTabel[] = [
    { label: 'Alamat Lengkap', ambil: r => alamatLengkap(r), lebarPdf: 58 },
  ]
  switch (jenis) {
    case 'TANAH':
      return [...dasar,
        { label: 'Luas Tanah (m²)', ambil: r => formatLuas(r.luas_tanah_seluruhnya), kanan: true, lebarPdf: 20 },
        { label: 'No Sertifikat', ambil: r => r.no_sertifikat ?? '—', lebarPdf: 22 },
        { label: 'Status Sertifikasi', ambil: r => r.status_sertifikasi ?? '—', lebarPdf: 26 },
        ...properti]
    case 'RUMAH NEGARA':
      return [...dasar,
        { label: 'Luas Bangunan (m²)', ambil: r => formatLuas(r.luas_bangunan), kanan: true, lebarPdf: 22 },
        { label: 'Penghuni', ambil: r => r.penghuni ?? '—', lebarPdf: 20 },
        ...properti]
    case 'BANGUNAN DAN GEDUNG':
      return [...dasar,
        { label: 'Luas Bangunan (m²)', ambil: r => formatLuas(r.luas_bangunan), kanan: true, lebarPdf: 22 },
        { label: 'Luas Tapak (m²)', ambil: r => formatLuas(r.luas_tapak_bangunan), kanan: true, lebarPdf: 20 },
        { label: 'Lantai', ambil: r => r.jumlah_lantai ? String(r.jumlah_lantai) : '—', lebarPdf: 12 },
        ...properti]
    case 'ALAT ANGKUTAN BERMOTOR':
      return [...dasar, ...kendaraan]
    case 'MESIN PERALATAN NON TIK':
    case 'MESIN PERALATAN KHUSUS TIK':
    case 'ALAT BESAR':
    case 'ALAT PERSENJATAAN':
    case 'ASET TETAP LAINNYA':
      return [...dasar, ...mesin]
    default:
      return [...dasar, ...properti]
  }
}

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
  const [loading, setLoading] = useState(true)
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
          <p>{daftar.length} Satker. Klik kartu untuk melihat data aset BMN.</p>
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
              const tone = asetTerkait >= 25 ? 'hijau' : asetTerkait >= 10 ? 'kuning' : 'merah'
              return (
                <button className="pa2-item" key={s.code} onClick={() => onPilih(s.code)}>
                  <div className="pa2-ikon"><Building2 size={18} /></div>
                  <div className="pa2-teks">
                    <span className="pa2-kode">{s.code}</span>
                    <strong className="pa2-nama">{s.name}</strong>
                  </div>
                  <div className={`pa2-badge ${tone}`}>
                    <b>{asetTerkait}</b>
                    <span>aset</span>
                  </div>
                </button>
              )
            })}
          </div>}
      {!loading && daftar.length === 0 && <p className="kosong">Satker tidak ditemukan.</p>}
    </section>
  )
}

export function ProfilAsetDetail({ kodeSatker, onKembali }: { kodeSatker: string; onKembali: () => void }) {
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

  // Kartu kategori dibangun dari jenis BMN yang benar-benar ada di data satker ini,
  // urut dari jumlah aset terbanyak, hanya jenis yang terdaftar di jenisBmnMeta.
  const rekap = useMemo(() => {
    const perJenis = new Map<string, AsetRow[]>()
    for (const r of data) {
      if (!jenisBmnMeta[r.jenis_bmn]) continue
      const list = perJenis.get(r.jenis_bmn) ?? []
      list.push(r)
      perJenis.set(r.jenis_bmn, list)
    }
    return [...perJenis.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([key, rows]) => ({
        key,
        ...jenisBmnMeta[key],
        jumlah: rows.length,
        totalLuas: key === 'TANAH'
          ? rows.reduce((n, r) => n + (r.luas_tanah_seluruhnya ?? 0), 0)
          : rows.reduce((n, r) => n + (r.luas_bangunan ?? 0), 0),
        totalNilai: rows.reduce((n, r) => n + (r.nilai_perolehan ?? 0), 0),
        tanpaPsp: rows.filter(r => !r.no_psp).length,
      }))
  }, [data])

  const kategoriAktif = rekap.find(r => r.key === aktif)
  const tabelRows = aktif ? data.filter(r => r.jenis_bmn === aktif) : []
  const kolom = aktif ? kolomUntukJenis(aktif) : []
  const totalNilaiSemua = data.reduce((n, r) => n + (r.nilai_perolehan ?? 0), 0)

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

    // Tabel — kolom mengikuti jenis BMN yang aktif
    const kolomPdf = kolomUntukJenis(kategoriAktif?.key ?? '')
    const head = [['No', ...kolomPdf.map(k => k.label)]]
    const body = tabelRows.map((r, i) => [String(i + 1), ...kolomPdf.map(k => k.ambil(r))])
    const columnStyles: Record<number, { halign?: 'right'; cellWidth?: number }> = { 0: { cellWidth: 9 } }
    kolomPdf.forEach((k, idx) => {
      columnStyles[idx + 1] = { ...(k.kanan ? { halign: 'right' as const } : {}), ...(k.lebarPdf ? { cellWidth: k.lebarPdf } : {}) }
    })

    autoTable(doc, {
      head,
      body,
      startY: 32,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], fontSize: 6.5, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles,
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
            <div className="pa-stat"><b>{data.length}</b><span>Total aset</span></div>
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
                  {kolom.map(k => <th key={k.label}>{k.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {tabelRows.map((r, i) => (
                  <tr key={`${i}-${r.nup}`}>
                    <td className="pa-td-no">{i + 1}</td>
                    {kolom.map(k => (
                      <td key={k.label} className={`${k.mono ? 'pa-td-kode ' : ''}${k.kanan ? 'pa-td-nilai' : ''}`}>{k.ambil(r)}</td>
                    ))}
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

// ── Data Center BMN: rekap seluruh Riau ──────────────────────────────────────
type RekapWilayah = {
  snapshot_date: string
  source_file: string
  total_aset: number
  total_nilai: number
  jumlah_satker: number
  jumlah_jenis: number
  tanpa_psp: number
  per_jenis: Array<{ jenis: string; jumlah: number; nilai: number }>
  per_satker: Array<{ kode: string; nama: string; jumlah: number; nilai: number; tanpa_psp: number }>
  top_aset: Array<{ nama_barang: string; jenis_bmn: string; satker_code: string; nama_satker: string; nilai: number }>
}

export function DataCenterBmnPage({ onBukaSatker }: { onBukaSatker: (kode: string) => void }) {
  const [data, setData] = useState<RekapWilayah | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    import('./lib/supabase').then(async ({ supabase }) => {
      if (!supabase) { if (mounted) setError('Koneksi database tidak tersedia.'); if (mounted) setLoading(false); return }
      const { data: rows, error: err } = await supabase.rpc('get_bmn_rekap_wilayah')
      if (!mounted) return
      if (err) setError(err.message)
      else setData((Array.isArray(rows) ? rows[0] : rows) as RekapWilayah)
      setLoading(false)
    }).catch(e => { if (mounted) { setError(e instanceof Error ? e.message : 'Data belum dapat dimuat.'); setLoading(false) } })
    return () => { mounted = false }
  }, [])

  // Klik tombol jenis BMN -> ambil seluruh detail aset jenis itu di Riau
  const [jenisAktif, setJenisAktif] = useState<string | null>(null)
  const [detailWilayah, setDetailWilayah] = useState<{ jumlah: number; nilai: number; satker: number; baris: AsetRow[] } | null>(null)
  const [detailWilayahLoading, setDetailWilayahLoading] = useState(false)

  useEffect(() => {
    if (!jenisAktif) { setDetailWilayah(null); return }
    let hidup = true
    setDetailWilayahLoading(true)
    import('./lib/supabase').then(async ({ supabase }) => {
      if (!supabase) { if (hidup) setDetailWilayahLoading(false); return }
      const { data: rows, error } = await supabase.rpc('get_bmn_aset_wilayah', { p_jenis: jenisAktif, p_limit: 500 })
      if (!hidup) return
      if (error) setDetailWilayah({ jumlah: 0, nilai: 0, satker: 0, baris: [] })
      else {
        const r = (Array.isArray(rows) ? rows[0] : rows) as { jumlah: number; nilai: number; satker: number; baris: AsetRow[] }
        setDetailWilayah({ jumlah: r.jumlah, nilai: r.nilai, satker: r.satker, baris: r.baris ?? [] })
      }
      if (hidup) setDetailWilayahLoading(false)
    }).catch(() => { if (hidup) setDetailWilayahLoading(false) })
    return () => { hidup = false }
  }, [jenisAktif])

  const bukaJenis = async (jenis: string | null) => { setJenisAktif(jenis) }

  const barisWilayah = detailWilayah?.baris ?? []
  const kolomWilayah = jenisAktif ? kolomUntukJenis(jenisAktif) : []

  const exportPdf = async () => {
    if (!data) return
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
    doc.setFontSize(14); doc.setFont('helvetica', 'bold')
    doc.text('Data Center BMN — Kanwil Ditjenpas Riau', 14, 15)
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100)
    doc.text(`Snapshot ${data.snapshot_date} · ${data.total_aset.toLocaleString('id-ID')} aset · ${data.jumlah_satker} Satker · Total ${data.total_nilai.toLocaleString('id-ID')}`, 14, 21)
    doc.setTextColor(0)

    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text('Rekap per Jenis BMN', 14, 30)
    autoTable(doc, {
      head: [['Jenis BMN', 'Jumlah Aset', 'Nilai Perolehan']],
      body: data.per_jenis.map(j => [jenisBmnMeta[j.jenis]?.label ?? j.jenis, j.jumlah.toLocaleString('id-ID'), j.nilai.toLocaleString('id-ID')]),
      startY: 34, styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246] }, alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } }, margin: { left: 14, right: 14 },
    })

    const y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 34
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text('Rekap per Satker', 14, y + 8)
    autoTable(doc, {
      head: [['Satker', 'Kode', 'Jumlah Aset', 'Tanpa PSP', 'Nilai Perolehan']],
      body: data.per_satker.map(r => [r.nama, r.kode, r.jumlah.toLocaleString('id-ID'), r.tanpa_psp.toLocaleString('id-ID'), r.nilai.toLocaleString('id-ID')]),
      startY: y + 12, styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [16, 185, 129] }, alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    })
    doc.save('Data-Center-BMN-Kanwil-Riau.pdf')
  }

  if (loading) return <section className="panel admin-page"><p className="kosong">Memuat data aset…</p></section>
  if (error || !data) return <section className="panel admin-page"><p className="kosong">{error || 'Data belum tersedia.'}</p></section>

  return (
    <div className="pa-halaman">
      <section className="pa-hero">
        <div className="pa-hero-baris">
          <div className="pa-hero-ikon"><Database size={26} /></div>
          <div className="pa-hero-teks">
            <h2>Data Center BMN</h2>
            <p>Rekap seluruh BMN Kanwil Ditjenpas Riau · snapshot {data.snapshot_date}</p>
          </div>
          <button className="pa-hero-export" onClick={() => void exportPdf()}><Printer size={14} /> Export PDF</button>
        </div>
        <div className="pa-hero-stats">
          <div className="pa-stat"><b>{data.total_aset.toLocaleString('id-ID')}</b><span>Total aset</span></div>
          <div className="pa-stat"><b>{formatRupiah(data.total_nilai)}</b><span>Total nilai perolehan</span></div>
          <div className="pa-stat"><b>{data.jumlah_satker}</b><span>Satker</span></div>
          <div className="pa-stat"><b>{data.jumlah_jenis}</b><span>Jenis BMN</span></div>
          <div className="pa-stat"><b>{data.tanpa_psp}</b><span>Belum PSP</span></div>
        </div>
      </section>

      {/* Tombol per jenis BMN — klik untuk melihat seluruh detail asetnya */}
      <div className="pa-kategori-grid">
        {data.per_jenis.map((j, idx) => {
          const meta = jenisBmnMeta[j.jenis]
          const Ikon = meta?.Ikon ?? Package
          const warna = meta?.warna ?? '#94a3b8'
          return (
            <button
              key={j.jenis}
              className={`pa-kategori ${jenisAktif === j.jenis ? 'pa-kategori-aktif' : ''}`}
              style={{ animationDelay: `${idx * 70}ms`, ['--pa-warna' as never]: warna }}
              onClick={() => void bukaJenis(jenisAktif === j.jenis ? null : j.jenis)}
            >
              <i className="pa-kategori-bar" />
              <div className="pa-kategori-atas">
                <div className="pa-kategori-ikon"><Ikon size={20} /></div>
              </div>
              <strong className="pa-kategori-label">{meta?.label ?? j.jenis}</strong>
              <b className="pa-kategori-jumlah">{j.jumlah.toLocaleString('id-ID')}<span> aset</span></b>
              <div className="pa-kategori-rinci">
                <span>{formatRupiah(j.nilai)}</span>
                <span className="pa-kategori-nilai">{persenNilai(j.nilai, data.total_nilai)}%</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Tabel detail seluruh Riau untuk jenis yang dipilih */}
      {jenisAktif && (
        <section className="pa-tabel-panel">
          <div className="pa-tabel-head">
            <h3>{jenisBmnMeta[jenisAktif]?.label ?? jenisAktif}{' '}
              <span className="pa-hitung">{detailWilayah?.jumlah ?? 0} aset · {detailWilayah?.satker ?? 0} Satker</span>
            </h3>
            <button className="pa-tabel-export" onClick={() => setJenisAktif(null)}>Tutup tabel</button>
          </div>
          {detailWilayahLoading
            ? <p className="pa-loading">Memuat detail aset…</p>
            : barisWilayah.length === 0
              ? <p className="pa-loading">Belum ada data untuk jenis ini.</p>
              : <>
                  <div className="pa-tabel-wrap">
                    <table className="pa-tabel">
                      <thead>
                        <tr><th>No</th><th>Satker</th>{kolomWilayah.map(c => <th key={c.label}>{c.label}</th>)}</tr>
                      </thead>
                      <tbody>
                        {barisWilayah.map((r, i) => (
                          <tr key={`${i}-${r.nup}-${r.nama_barang}`}>
                            <td className="pa-td-no">{i + 1}</td>
                            <td className="pa-td-nama">{r.nama_satker}</td>
                            {kolomWilayah.map(c => (
                              <td key={c.label} className={`${c.mono ? 'pa-td-kode ' : ''}${c.kanan ? 'pa-td-nilai' : ''}`}>{c.ambil(r)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {detailWilayah && barisWilayah.length < detailWilayah.jumlah && (
                    <p className="pa-keterangan">
                      Menampilkan {barisWilayah.length} dari {detailWilayah.jumlah} aset, diurutkan dari nilai perolehan tertinggi.
                    </p>
                  )}
                </>}
        </section>
      )}

      <section className="panel admin-page info-panel">
        <div className="pa-tabel-head">
          <h3>Rekap per Satker <span className="pa-hitung">{data.jumlah_satker} Satker</span></h3>
        </div>
        <div className="pa-tabel-wrap">
          <table className="pa-tabel">
            <thead>
              <tr><th>Satker</th><th>Kode</th><th>Jumlah Aset</th><th>Tanpa PSP</th><th>Nilai Perolehan</th><th /></tr>
            </thead>
            <tbody>
              {data.per_satker.map(r => (
                <tr key={r.kode}>
                  <td className="pa-td-nama">{r.nama}</td>
                  <td className="pa-td-kode">{r.kode}</td>
                  <td className="pa-td-nilai">{r.jumlah.toLocaleString('id-ID')}</td>
                  <td>{r.tanpa_psp > 0 ? <span className="pa-badge-merah">{r.tanpa_psp}</span> : '0'}</td>
                  <td className="pa-td-nilai">{r.nilai.toLocaleString('id-ID')}</td>
                  <td><button className="link-button" onClick={() => onBukaSatker(r.kode)}>Profil →</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel admin-page info-panel">
        <div className="pa-tabel-head">
          <h3>20 aset bernilai tertinggi</h3>
        </div>
        <div className="pa-tabel-wrap">
          <table className="pa-tabel">
            <thead>
              <tr><th>No</th><th>Nama Barang</th><th>Jenis BMN</th><th>Satker</th><th>Nilai Perolehan</th></tr>
            </thead>
            <tbody>
              {data.top_aset.map((a, i) => (
                <tr key={`${a.satker_code}-${i}`}>
                  <td className="pa-td-no">{i + 1}</td>
                  <td className="pa-td-nama">{a.nama_barang}</td>
                  <td>{jenisBmnMeta[a.jenis_bmn]?.label ?? a.jenis_bmn}</td>
                  <td>{a.nama_satker}</td>
                  <td className="pa-td-nilai">{a.nilai.toLocaleString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

// ── Impor Data Aset (export SIMAN) ─────────────────────────────────────────
type SnapshotInfo = {
  id: number
  snapshot_date: string
  source_file: string
  status: 'draft' | 'active' | 'arsip'
  total_baris: number | null
  total_nilai: number | null
  jumlah_satker: number | null
  jumlah_jenis: number | null
  catatan: string | null
  created_at: string
  umur_hari: number
}

const labelUmur = (n: number): string =>
  n <= 0 ? 'hari ini'
    : n === 1 ? 'kemarin'
    : n < 31 ? `${n} hari lalu`
    : n < 365 ? `${Math.floor(n / 30)} bulan lalu`
    : `${Math.floor(n / 365)} tahun lalu`

export function ImporAsetPage() {
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([])
  const [memuat, setMemuat] = useState(true)
  const [tahap, setTahap] = useState<'pilih' | 'pratinjau'>('pilih')
  const [hasil, setHasil] = useState<HasilBaca | null>(null)
  const [namaBerkas, setNamaBerkas] = useState('')
  const [tanggal, setTanggal] = useState('')
  const [banding, setBanding] = useState<HasilBanding | null>(null)
  const [kesalahan, setKesalahan] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const [sukses, setSukses] = useState('')
  const inputBerkas = useRef<HTMLInputElement>(null)

  const muatSnapshot = async () => {
    setMemuat(true)
    try {
      const { supabase } = await import('./lib/supabase')
      if (!supabase) { setKesalahan('Koneksi database tidak tersedia.'); return }
      const { data } = await supabase.rpc('bmn_daftar_snapshot')
      if (Array.isArray(data)) setSnapshots(data as SnapshotInfo[])
    } catch { setKesalahan('Daftar snapshot belum dapat dimuat.') }
    finally { setMemuat(false) }
  }
  useEffect(() => { void muatSnapshot() }, [])

  const aktif = snapshots.find(s => s.status === 'active')

  const pilihBerkas = async (berkas: File) => {
    setKesalahan(''); setSukses('')
    setNamaBerkas(berkas.name)
    const baca = await bacaFileAset(berkas)
    setHasil(baca)
    if (!baca.ok) { setKesalahan('Berkas tidak dapat dibaca sebagai export Master Aset.'); setTahap('pilih'); return }
    setTanggal(baca.snapshotDate ?? new Date().toISOString().slice(0, 10))
    setTahap('pratinjau')

    const { supabase } = await import('./lib/supabase')
    if (!supabase) { setKesalahan('Koneksi database tidak tersedia.'); return }
    const { data, error } = await supabase.rpc('bmn_banding', { p_baru: baca.baris as never })
    if (error) setBanding(null)
    else setBanding((Array.isArray(data) ? data[0] : data) as HasilBanding)
  }

  const simpanDanAktifkan = async () => {
    if (!hasil) return
    setSibuk(true); setKesalahan(''); setSukses('')
    try {
      const { supabase } = await import('./lib/supabase')
      if (!supabase) throw new Error('Koneksi database tidak tersedia.')
      const db = supabase
      const { data, error } = await db.rpc('bmn_simpan_snapshot', {
        p_snapshot_date: tanggal,
        p_source_file: namaBerkas,
        p_baris: hasil.baris as never,
        p_catatan: `Diimpor melalui portal oleh Korwil`,
      })
      if (error) throw new Error(error.message)
      const baru = (Array.isArray(data) ? data[0] : data) as { id: number; total: number }
      const { error: e2 } = await supabase.rpc('bmn_aktifkan_snapshot', { p_id: baru.id })
      if (e2) throw new Error(e2.message)
      setSukses(`Snapshot ${tanggal} aktif. ${baru.total.toLocaleString('id-ID')} aset tersimpan.`)
      setTahap('pilih'); setHasil(null); setBanding(null)
      await muatSnapshot()
    } catch (e) {
      setKesalahan(e instanceof Error ? e.message : 'Penyimpanan gagal.')
    } finally { setSibuk(false) }
  }

  const aktifkanLama = async (id: number) => {
    setSibuk(true); setKesalahan(''); setSukses('')
    try {
      const { supabase } = await import('./lib/supabase')
      if (!supabase) throw new Error('Koneksi database tidak tersedia.')
      const { error } = await supabase.rpc('bmn_aktifkan_snapshot', { p_id: id })
      if (error) throw new Error(error.message)
      setSukses('Snapshot aktif berhasil dipindahkan.')
      await muatSnapshot()
    } catch (e) { setKesalahan(e instanceof Error ? e.message : 'Gagal.') }
    finally { setSibuk(false) }
  }

  const mulaiUlang = () => { setTahap('pilih'); setHasil(null); setBanding(null); setKesalahan(''); setSukses(''); if (inputBerkas.current) inputBerkas.current.value = '' }

  return (
    <div className="pa-halaman">
      <section className="pa-hero">
        <div className="pa-hero-baris">
          <div className="pa-hero-ikon"><Database size={26} /></div>
          <div className="pa-hero-teks">
            <h2>Impor Data Aset</h2>
            <p>Unggah hasil export Master Aset dari SIMAN. Data menjadi snapshot baru — snapshot lama tetap tersimpan dan dapat diaktifkan kembali.</p>
          </div>
        </div>
        {aktif && (
          <div className="pa-hero-stats">
            <div className="pa-stat"><b>{aktif.total_baris?.toLocaleString('id-ID') ?? '—'}</b><span>Aset aktif</span></div>
            <div className="pa-stat"><b>{aktif.snapshot_date}</b><span>Snapshot terakhir</span></div>
            <div className="pa-stat"><b>{aktif.umur_hari <= 0 ? 'hari ini' : aktif.umur_hari < 31 ? aktif.umur_hari + ' hari' : Math.floor(aktif.umur_hari / 30) + ' bulan'}</b><span>Umur data</span></div>
          </div>
        )}
      </section>

      {sukses && <div className="imp-sukses" role="status">{sukses}</div>}
      {kesalahan && <div className="imp-galat" role="alert">{kesalahan}</div>}

      {tahap === 'pilih' && (
        <section className="panel admin-page info-panel">
          <div className="pa-tabel-head"><h3>Langkah 1 — Pilih berkas</h3></div>
          <label className="imp-zona">
            <Upload size={22} />
            <strong>Pilih berkas .xlsx hasil export SIMAN</strong>
            <span>Berkas tetap berada di komputer Anda — hanya isinya yang dikirim ke portal.</span>
            <input
              ref={inputBerkas}
              type="file"
              accept=".xlsx,.xls"
              onChange={e => { const f = e.target.files?.[0]; if (f) void pilihBerkas(f) }}
            />
          </label>
          {hasil && !hasil.ok && (
            <div className="imp-galat">
              <p>Kolom wajib yang tidak ditemukan: <b>{hasil.kurangKolom.join(', ')}</b></p>
              <p>Kolom yang terbaca: {hasil.kolom.slice(0, 12).join(', ')}{hasil.kolom.length > 12 ? ' …' : ''}</p>
            </div>
          )}
          {hasil && hasil.jumlahDitolak > 0 && hasil.ok && (
            <div className="imp-catatan">
              <p><b>{hasil.jumlahDitolak} baris dilewati</b> karena tidak terbaca atau kuncinya ganda.</p>
              <ul>{hasil.masalah.map((m, i) => <li key={i}>Baris {m.baris}: {m.alasan}</li>)}</ul>
            </div>
          )}
        </section>
      )}

      {tahap === 'pratinjau' && hasil && (
        <section className="panel admin-page info-panel">
          <div className="pa-tabel-head">
            <h3>Langkah 2 — Periksa dulu sebelum disimpan</h3>
            <button className="pa-tabel-export" onClick={mulaiUlang}>Ganti berkas</button>
          </div>

          <div className="imp-ringkas">
            <div><b>{hasil.baris.length.toLocaleString('id-ID')}</b><span>baris terbaca</span></div>
            <div><b>{hasil.namaSheet}</b><span>nama sheet</span></div>
            {hasil.jumlahDitolak > 0 && <div className="imp-kuning"><b>{hasil.jumlahDitolak}</b><span>baris dilewati</span></div>}
          </div>

          {banding && (
            <>
              <h3 className="imp-subjudul">Perubahan terhadap snapshot aktif</h3>
              <div className="imp-band">
                <div className="imp-band-kotak baru"><b>+{banding.aset_baru}</b><span>aset baru</span></div>
                <div className="imp-band-kotak ubah"><b>{banding.berubah}</b><span>berubah</span></div>
                <div className="imp-band-kotak sama"><b>{banding.sama}</b><span>tetap sama</span></div>
                <div className="imp-band-kotak hilang"><b>−{banding.hilang}</b><span>tidak ada di berkas baru</span></div>
              </div>
              <div className="imp-band-total">
                <div><span>Aset dalam berkas baru</span><b>{banding.total_baru.toLocaleString('id-ID')}</b></div>
                <div><span>Aset pada snapshot aktif</span><b>{banding.baris_lama.toLocaleString('id-ID')}</b></div>
                <div><span>Nilai perolehan berkas baru</span><b>{formatRupiah(banding.nilai_baru)}</b></div>
                <div><span>Nilai perolehan snapshot aktif</span><b>{formatRupiah(banding.nilai_lama)}</b></div>
              </div>
              {banding.hilang > 0 && (
                <div className="imp-catatan imp-kuning-bg">
                  <p><b>{banding.hilang} aset</b> ada di snapshot aktif tetapi tidak ada di berkas baru. Snapshot lama tetap tersimpan, jadi tidak ada data yang hilang permanen.</p>
                </div>
              )}
            </>
          )}

          <label className="imp-tanggal">
            Tanggal snapshot
            <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} />
          </label>

          <div className="imp-aksi">
            <button className="ghost" onClick={mulaiUlang} disabled={sibuk}>Batal</button>
            <button className="primary" onClick={() => void simpanDanAktifkan()} disabled={sibuk || !hasil.baris.length}>
              {sibuk ? 'Menyimpan…' : 'Simpan & jadikan aktif'}
            </button>
          </div>
        </section>
      )}

      <section className="panel admin-page info-panel">
        <div className="pa-tabel-head">
          <h3>Riwayat snapshot <span className="pa-hitung">{snapshots.length}</span></h3>
        </div>
        {memuat
          ? <p className="pa-loading">Memuat riwayat…</p>
          : snapshots.length === 0
            ? <p className="pa-loading">Belum ada snapshot.</p>
            : <div className="pa-tabel-wrap">
                <table className="pa-tabel">
                  <thead>
                    <tr><th>Status</th><th>Tanggal</th><th>Berkas</th><th>Aset</th><th>Nilai</th><th>Satker</th><th>Umur</th><th /></tr>
                  </thead>
                  <tbody>
                    {snapshots.map(s => (
                      <tr key={s.id}>
                        <td>
                          <span className={`imp-status ${s.status}`}>
                            {s.status === 'active' ? 'Aktif' : s.status === 'draft' ? 'Draf' : 'Arsip'}
                          </span>
                        </td>
                        <td className="pa-td-nilai">{s.snapshot_date}</td>
                        <td className="pa-td-nama">{s.source_file}</td>
                        <td>{s.total_baris?.toLocaleString('id-ID') ?? '—'}</td>
                        <td className="pa-td-nilai">{formatRupiah(s.total_nilai)}</td>
                        <td>{s.jumlah_satker ?? '—'}</td>
                        <td>{labelUmur(s.umur_hari)}</td>
                        <td>
                          {s.status !== 'active' && (
                            <button className="link-button" onClick={() => void aktifkanLama(s.id)} disabled={sibuk}>
                              Aktifkan
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>}
        <p className="pa-keterangan">
          Portal selalu membaca snapshot berstatus <b>Aktif</b>. Mengaktifkan kembali snapshot lama berguna bila ada unggahan yang ternyata keliru.
        </p>
      </section>
    </div>
  )
}
