// Menu Korwil — Monitoring pendataan dukungan bencana (Karhutla/Kekeringan).
// Rekap per satker: total pegawai, sudah mengisi, belum. Klik satker → daftar
// pegawai per satker dengan status, dan Korwil dapat menerima / minta perbaikan.
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft, Building2, CheckCircle2, CircleAlert, Copy, ExternalLink,
  Loader2, RefreshCw, Search, ShieldCheck, Users,
} from 'lucide-react'
import { satkers } from './data'
import { supabase } from './lib/supabase'

type Rekap = { satker: string; nama: string; total: number; selesai: number; belum: number; menunggu: number }
type Detail = {
  nip: string; nama: string; jabatan: string | null; status: string | null;
  catatan: string | null; submitted_at: string | null
}
const FORM_URL = 'https://forms.gle/2UYBRjxMAkEbUKPF8'

function nf(n: number): number { return Number(n) || 0 }

function fmtTgl(v: string | null): string {
  if (!v) return '—'
  const d = new Date(v)
  if (isNaN(d.getTime())) return '—'
  return `${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}`
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  belum: { label: 'Belum mengisi', cls: 'dampak-st-belum' },
  menunggu_verifikasi: { label: 'Menunggu verifikasi', cls: 'dampak-st-menunggu' },
  selesai: { label: 'Sudah / selesai', cls: 'dampak-st-selesai' },
  perbaikan: { label: 'Butuh perbaikan', cls: 'dampak-st-perbaikan' },
}

function StatusPill({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status.replaceAll('_', ' '), cls: 'dampak-st-belum' }
  return <span className={`dampak-st ${m.cls}`}><i />{m.label}</span>
}

export function DampakMonitoringPage() {
  const [rekap, setRekap] = useState<Rekap[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pilih, setPilih] = useState<string | null>(null) // satker aktif
  const [detail, setDetail] = useState<Detail[] | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [filter, setFilter] = useState<'semua' | 'belum' | 'menunggu' | 'selesai'>('semua')
  const [cari, setCari] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [catatan, setCatatan] = useState<Record<string, string>>({})
  const [pesan, setPesan] = useState('')

  const muat = async () => {
    setLoading(true); setError(''); setPesan('')
    try {
      if (!supabase) { setError('Koneksi database belum tersedia.'); return }
      const { data, error: e } = await supabase.rpc('get_dukungan_bencana_rekap')
      if (e) throw new Error(e.message)
      setRekap((data ?? []) as Rekap[])
    } catch (err) { setError(err instanceof Error ? err.message : 'Data belum dapat dimuat.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void muat() }, [])

  // Susun pesan ringkasan pengisian per satker untuk dibagikan/reminder WA.
  const susunPesanWa = (): string => {
    const header = `*Monitoring Dukungan Bencana — Kanwil Ditjenpas Riau*\nPengisian bukti pendataan pegawai terdampak bencana (Karhutla/Kekeringan), per ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}:\n\n`
    const daftar = rekap
      .slice()
      .sort((a, b) => (a.nama ?? '').localeCompare(b.nama ?? ''))
      .map(r => {
        const pct = r.total ? Math.round((nf(r.selesai) / nf(r.total)) * 100) : 0
        return `• ${r.nama} — ${pct}% (${nf(r.selesai)}/${nf(r.total)}${nf(r.menunggu) ? `, ${nf(r.menunggu)} menunggu verifikasi` : ''})`
      })
      .join('\n')
    return header + (daftar || 'Belum ada data satker.')
  }

  const salinWa = async () => {
    try {
      const teks = susunPesanWa()
      await navigator.clipboard.writeText(teks)
      setPesan('Pesan WhatsApp disalin. Tempel (paste) di aplikasi WhatsApp untuk mengirim.')
    } catch {
      setError('Pesan belum dapat disalin. Salin manual dari isi halaman.')
    }
  }

  const muatDetail = async (code: string) => {
    setPilih(code); setDetail(null); setDetailLoading(true); setError(''); setCari(''); setFilter('semua'); setCatatan({})
    try {
      if (!supabase) return
      const { data, error: e } = await supabase.rpc('get_dukungan_bencana_detail', { p_satker: code })
      if (e) throw new Error(e.message)
      setDetail((data ?? []) as Detail[])
    } catch (err) { setError(err instanceof Error ? err.message : 'Detail belum dapat dimuat.') }
    finally { setDetailLoading(false) }
  }

  const review = async (nip: string, status: 'selesai' | 'perbaikan') => {
    setBusy(nip); setError(''); setPesan('')
    try {
      if (!supabase) return
      const note = status === 'perbaikan' ? (catatan[nip] ?? '') : undefined
      const { error: e } = await supabase.rpc('review_dukungan_bencana', { p_nip: nip, p_status: status, p_catatan: note ?? null })
      if (e) throw new Error(e.message)
      setPesan(status === 'selesai' ? 'Data diterima dan ditandai selesai.' : 'Data dikembalikan untuk perbaikan.')
      await muat()          // segarkan rekap
      await muatDetail(pilih!) // segarkan detail
    } catch (err) { setError(err instanceof Error ? err.message : 'Keputusan belum dapat disimpan.') }
    finally { setBusy(null) }
  }

  const totalPegawai = rekap.reduce((s, r) => s + nf(r.total), 0)
  const totalSelesai = rekap.reduce((s, r) => s + nf(r.selesai), 0)
  const totalMenunggu = rekap.reduce((s, r) => s + nf(r.menunggu), 0)
  const totalBelum = totalPegawai - totalSelesai

  const detailFiltered = useMemo(() => {
    if (!detail) return []
    const q = cari.trim().toLowerCase()
    return detail.filter(d => {
      if (filter === 'belum' && d.status !== 'belum') return false
      if (filter === 'menunggu' && d.status !== 'menunggu_verifikasi') return false
      if (filter === 'selesai' && d.status !== 'selesai') return false
      if (q && !`${d.nama} ${d.nip}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [detail, filter, cari])

  if (pilih) {
    const st = satkers.find(s => s.code === pilih)
    return (
      <section className="panel admin-page dampak-mon">
        <button className="dampak-mon-back" onClick={() => setPilih(null)}><ArrowLeft size={15} /> Kembali ke rekap</button>
        <div className="dampak-mon-head">
          <div className="dampak-mon-head-icon"><Building2 size={22} /></div>
          <div>
            <span className="eyebrow">MONITORING DUKUNGAN BENCANA</span>
            <h2>{st?.name ?? pilih}</h2>
            <p>Perincian status pengisian per pegawai {st?.name ?? ''}.</p>
          </div>
        </div>

        <div className="dampak-mon-tools">
          <label className="filter-cari"><Search size={14} /><input value={cari} onChange={e => setCari(e.target.value)} placeholder="Cari nama / NIP" /></label>
          <div className="dampak-mon-filter">
            {(['semua', 'belum', 'menunggu', 'selesai'] as const).map(f => (
              <button key={f} className={`chip ${filter === f ? 'chip-on' : ''}`} onClick={() => setFilter(f)}>
                {f === 'semua' ? 'Semua' : f === 'menunggu' ? STATUS_META['menunggu_verifikasi'].label : STATUS_META[f].label}
              </button>
            ))}
          </div>
        </div>

        {pesan && <div className="auth-message ok"><CheckCircle2 size={14} />{pesan}</div>}
        {error && <div className="auth-message error"><CircleAlert size={14} />{error}</div>}

        {detailLoading ? <div className="empty-state"><Loader2 className="spin" /><p>Memuat data pegawai…</p></div> :
          detailFiltered.length === 0 ? <Empty text="Tidak ada pegawai pada filter ini." /> :
          <div className="table-wrap"><table className="data-table dampak-mon-table">
            <thead><tr><th>Nama</th><th>NIP</th><th>Jabatan</th><th>Status</th><th>Diajukan</th><th></th></tr></thead>
            <tbody>
              {detailFiltered.map(d => (
                <tr key={d.nip}>
                  <td><strong>{d.nama}</strong></td>
                  <td className="num">{d.nip}</td>
                  <td><small>{d.jabatan || '—'}</small></td>
                  <td><StatusPill status={d.status ?? 'belum'} /></td>
                  <td><small>{fmtTgl(d.submitted_at)}</small></td>
                  <td>
                    {d.status === 'menunggu_verifikasi' && (
                      <div className="dampak-mon-act">
                        <input
                          value={catatan[d.nip] ?? ''}
                          onChange={e => setCatatan(c => ({ ...c, [d.nip]: e.target.value }))}
                          placeholder="Catatan (untuk perbaikan)"
                        />
                        <button className="primary" disabled={busy === d.nip} onClick={() => void review(d.nip, 'selesai')}>
                          {busy === d.nip ? <Loader2 className="spin" size={13} /> : <CheckCircle2 size={13} />}Terima
                        </button>
                        <button className="ghost" disabled={busy === d.nip} onClick={() => void review(d.nip, 'perbaikan')}>Minta Perbaikan</button>
                      </div>
                    )}
                    {d.status === 'perbaikan' && d.catatan && <small className="dampak-mon-note"><CircleAlert size={12} />{d.catatan}</small>}
                    {d.status === 'selesai' && <span className="dampak-mon-ok"><CheckCircle2 size={13} />Terverifikasi</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>}
      </section>
    )
  }

  return (
    <section className="panel admin-page dampak-mon">
      <div className="dampak-mon-head">
        <div className="dampak-mon-head-icon"><ShieldCheck size={24} /></div>
        <div>
          <span className="eyebrow">MONITORING DUKUNGAN BENCANA</span>
          <h2>Pendataan Pegawai Terdampak Bencana</h2>
          <p>Rekap pengisian per satker. Klik satker untuk melihat per pegawai siapa yang sudah &amp; belum.</p>
        </div>
        <div className="dampak-mon-actions">
          <button className="primary dampak-mon-wa" onClick={() => void salinWa()}><Copy size={15} /> Salin untuk WhatsApp</button>
          <button className="icon-button" onClick={() => void muat()} title="Muat ulang"><RefreshCw size={16} /></button>
        </div>
      </div>

      {pesan && <div className="auth-message ok"><CheckCircle2 size={14} />{pesan}</div>}
      {error && <div className="auth-message error"><CircleAlert size={14} />{error}</div>}

      <div className="dampak-mon-stat">
        <div><span>Total pegawai</span><strong>{totalPegawai.toLocaleString('id-ID')}</strong></div>
        <div className="ok"><span>Sudah mengisi</span><strong>{totalSelesai.toLocaleString('id-ID')}</strong></div>
        <div className="wait"><span>Menunggu verifikasi</span><strong>{totalMenunggu.toLocaleString('id-ID')}</strong></div>
        <div className="warn"><span>Belum mengisi</span><strong>{totalBelum.toLocaleString('id-ID')}</strong></div>
      </div>

      <div className="dampak-mon-formnote">
        <ExternalLink size={14} />
        <span>Form pengisian pegawai: <a href={FORM_URL} target="_blank" rel="noopener noreferrer">https://forms.gle/2UYBRjxMAkEbUKPF8</a></span>
      </div>

      {loading ? <div className="empty-state"><Loader2 className="spin" /><p>Memuat rekap…</p></div> :
        rekap.length === 0 ? <Empty text="Belum ada data satker." /> :
        <div className="dampak-mon-grid">
          {rekap.map(r => {
            const pct = r.total ? Math.round((nf(r.selesai) / nf(r.total)) * 100) : 0
            return (
              <button key={r.satker} className="dampak-mon-card" onClick={() => void muatDetail(r.satker)}>
                <div className="dampak-mon-card-top">
                  <div className="dampak-mon-card-ic"><Building2 size={18} /></div>
                  <div className="dampak-mon-card-tx">
                    <span>{r.satker}</span>
                    <strong>{r.nama}</strong>
                  </div>
                  <div className="dampak-mon-card-pct"><b>{pct}%</b></div>
                </div>
                <div className="dampak-mon-card-bar"><i style={{ width: `${pct}%` }} /></div>
                <div className="dampak-mon-card-stats">
                  <span><b>{nf(r.total)}</b> pegawai</span>
                  <span className="ok"><b>{nf(r.selesai)}</b> sudah</span>
                  {nf(r.menunggu) > 0 && <span className="wait"><b>{nf(r.menunggu)}</b> menunggu</span>}
                  <span className="warn"><b>{nf(r.belum)}</b> belum</span>
                </div>
              </button>
            )
          })}
        </div>}
    </section>
  )
}

function Empty({ text }: { text: string }) {
  return <div className="empty-state"><Users size={26} /><h3>Kosong</h3><p>{text}</p></div>
}
