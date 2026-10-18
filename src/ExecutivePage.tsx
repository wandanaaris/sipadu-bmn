// Ringkasan Pimpinan — redesign total.
// Satu halaman eksekutif: nav lengket, hero dengan KPI, dan section berjenjang.
import { useEffect, useState } from 'react'
import { RefreshCw, TrendingUp } from 'lucide-react'
import { loadBmnOverview, type BmnOverview } from './lib/bmnAssets'
import { loadPersediaan, type PersediaanBaris } from './lib/persediaan'
import { loadRupbasan, type RupbasanBaris } from './lib/rupbasan'
import { useUptScores } from './uptScore'
import type { Task } from './data'

export function ExecutiveView({ tasks, onRefresh, onBukaSatker }: { tasks: Task[]; onRefresh: () => Promise<void>; onBukaSatker?: (kode: string) => void }) {
  const [overview, setOverview] = useState<BmnOverview | null>(null)
  const [persediaan, setPersediaan] = useState<PersediaanBaris[]>([])
  const [rupbasan, setRupbasan] = useState<RupbasanBaris[]>([])
  const [rupbasanBuka, setRupbasanBuka] = useState<string | null>(null)
  const [rupbasanFilter, setRupbasanFilter] = useState('')
  useEffect(() => { let mounted = true; void loadBmnOverview().then(o => { if (mounted) setOverview(o) }); return () => { mounted = false } }, [])
  useEffect(() => { let mounted = true; void loadPersediaan().then(p => { if (mounted) setPersediaan(p ?? []) }); return () => { mounted = false } }, [])
  useEffect(() => { let mounted = true; void loadRupbasan().then(r => { if (mounted) setRupbasan(r ?? []) }); return () => { mounted = false } }, [])
  const skorMap = useUptScores()
  const skorList = [...skorMap.values()].sort((a, b) => b.score - a.score)
  const fmtNum = (n: number) => Math.round(n).toLocaleString('id-ID')
  const tanggalIndo = (iso: string) => { const d = new Date(`${iso}T00:00:00`); return isNaN(d.getTime()) ? iso : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) }
  const sisaRB = skorList.reduce((s, x) => s + (x.rb_sisa || 0), 0)
  const lelangBarang = skorList.reduce((s, x) => s + (x.lelang_barang || 0), 0)
  const lelangNilai = skorList.reduce((s, x) => s + (x.lelang_nilai || 0), 0)
  const lelangJual = skorList.reduce((s, x) => s + (x.lelang_jual || 0), 0)
  // Dasar tetap: master aset sudah tidak lagi mencantumkan barang yang dihapus,
  // jadi selisih sisa terhadap total master selalu 0. Angka penghapusan diambil
  // dari register lelang, lalu total rusak berat = sisa sekarang + sudah dihapus.
  const rbDihapus = lelangBarang
  const totalRB = sisaRB + rbDihapus
  const pctDihapus = totalRB > 0 ? Math.min(100, Math.round((rbDihapus / totalRB) * 100)) : 0
  const rbPerSatker = skorList.filter(x => x.rb_total > 0).sort((a, b) => b.rb_sisa - a.rb_sisa)
  const lelangPerSatker = skorList.filter(x => x.lelang_barang > 0).sort((a, b) => b.lelang_barang - a.lelang_barang)
  // Persediaan usang & rusak per Satker, diambil dari tabel bmn_persediaan.
  const petaPersediaan = new Map<string, { satker: string; nama: string; amunisi?: PersediaanBaris; nonamunisi?: PersediaanBaris; rusak?: PersediaanBaris }>()
  for (const p of persediaan) {
    const ent = petaPersediaan.get(p.satker_code) ?? { satker: p.satker_code, nama: p.satker_nama }
    if (p.kategori === 'amunisi') ent.amunisi = p
    else if (p.kategori === 'non-amunisi') ent.nonamunisi = p
    else if (p.kategori === 'rusak') ent.rusak = p
    petaPersediaan.set(p.satker_code, ent)
  }
  const tabelPersediaan = [...petaPersediaan.values()].sort((a, b) =>
    (b.amunisi?.nilai ?? 0) + (b.nonamunisi?.nilai ?? 0) + (b.rusak?.nilai ?? 0)
    - ((a.amunisi?.nilai ?? 0) + (a.nonamunisi?.nilai ?? 0) + (a.rusak?.nilai ?? 0)))
  const ringkasPersediaan = (kategori: string) => {
    const daftar = persediaan.filter(p => p.kategori === kategori)
    return { item: daftar.reduce((s, p) => s + p.jumlah, 0), nilai: daftar.reduce((s, p) => s + p.nilai, 0), satker: daftar.length }
  }
  const amunisi = ringkasPersediaan('amunisi')
  const nonamunisi = ringkasPersediaan('non-amunisi')
  const rusak = ringkasPersediaan('rusak')
  const totalPersediaanItem = persediaan.reduce((s, p) => s + p.jumlah, 0)
  const totalPersediaanNilai = persediaan.reduce((s, p) => s + p.nilai, 0)
  // Progres dari pekerjaan Tindak Lanjut Pemusnahan Persediaan Usang.
  const statusPersediaan = (id: string, kode: string) => {
    const task = tasks.find(t => t.id === id)
    const a = task?.assignments.find(x => x.satker === kode)
    return a ? a.status : null
  }
  const labelStatusPersediaan = (status: string) => {
    switch (status) {
      case 'belum': return 'belum ditindaklanjuti'
      case 'proses': return 'dalam proses'
      case 'verifikasi': return 'menunggu verifikasi'
      case 'persetujuan': return 'menunggu persetujuan'
      case 'perbaikan': return 'perlu perbaikan'
      case 'selesai': return 'selesai'
      default: return status
    }
  }
  // Data aset eks-Rupbasan yang tidak di-ASP per lokasi (Rengat & Bengkalis).
  const rupbasanPerSumber = new Map<string, RupbasanBaris[]>()
  for (const r of rupbasan) {
    const arr = rupbasanPerSumber.get(r.sumber) ?? []
    arr.push(r)
    rupbasanPerSumber.set(r.sumber, arr)
  }
  const rupbasanNamaSumber = ['Bangkinang', 'Rengat', 'Bengkalis']
  const bukaSumber = rupbasanNamaSumber.find(s => s.toLowerCase() === (rupbasanBuka ?? '').toLowerCase())
  const rupbasanSumberData = bukaSumber ? (rupbasanPerSumber.get(bukaSumber) ?? []) : []
  const kegunaanList = [...new Set(rupbasanSumberData.map(x => x.penggunaan).filter(Boolean))].sort()
  const rupbasanDetail = rupbasanFilter ? rupbasanSumberData.filter(x => x.penggunaan === rupbasanFilter) : rupbasanSumberData
  // Status pekerjaan Penghapusan BMN per Satker, per kategori A/B/C.
  const statusHapus = (kode: string) => {
    const hasil: Record<string, string | null> = {}
    for (const k of ['a', 'b', 'c'] as const) {
      const task = tasks.find(t => t.id === `penghapusan-bmn-rusak-berat-${k}-2026`)
      const a = task?.assignments.find(x => x.satker === kode)
      hasil[k.toUpperCase()] = a ? a.status : null
    }
    return hasil
  }
  const labelStatusHapus = (status: string) => {
    switch (status) {
      case 'belum': return 'belum ditindaklanjuti'
      case 'proses': return 'dalam proses'
      case 'verifikasi': return 'menunggu verifikasi'
      case 'persetujuan': return 'menunggu persetujuan'
      case 'perbaikan': return 'perlu perbaikan'
      case 'selesai': return 'selesai'
      default: return status
    }
  }
  const active = tasks.filter(t => t.active)
  const allAssignments = active.flatMap(t => t.assignments.map(a => ({ ...a, task: t })))
  const total = allAssignments.length
  const done = allAssignments.filter(a => ['selesai', 'ditutup'].includes(a.status)).length
  const notStarted = allAssignments.filter(a => a.status === 'belum').length
  const inRevision = allAssignments.filter(a => a.status === 'perbaikan').length
  const pendingVerify = allAssignments.filter(a => a.status === 'verifikasi' || a.status === 'persetujuan').length
  const avg = Math.round(allAssignments.reduce((s, a) => s + a.progress, 0) / (total || 1))
  const today = new Date()
  const parseDue = (t: Task): Date | null => { if (t.dueDate) return new Date(`${t.dueDate}T23:59:59+07:00`); return null }
  const withDue = active.filter(t => parseDue(t) !== null).map(t => ({ task: t, due: parseDue(t)! }))
  const noDue = active.filter(t => parseDue(t) === null)
  const daysLeft = (d: Date) => Math.ceil((d.getTime() - today.getTime()) / 86400000)
  const taskStats = (t: Task) => {
    const doneCount = t.assignments.filter(a => ['selesai', 'ditutup'].includes(a.status)).length
    const avgTask = Math.round(t.assignments.reduce((s, a) => s + a.progress, 0) / (t.assignments.length || 1))
    return { doneCount, avgTask }
  }
  const riskTasks = [...withDue].sort((a, b) => a.due.getTime() - b.due.getTime()).filter(({ task, due }) => {
    const { avgTask } = taskStats(task)
    return daysLeft(due) < 14 && avgTask < 100
  })
  const refresh = () => { void onRefresh(); void loadBmnOverview().then(setOverview) }

  const ringkasan = [
    { label: 'Pekerjaan Aktif', nilai: active.length, sub: `di ${total} penugasan satker`, warna: 'var(--blue)' },
    { label: 'Selesai', nilai: done, sub: `dari ${total} penugasan`, warna: 'var(--green)' },
    { label: 'Belum Dikerjakan', nilai: notStarted, sub: 'perlu ditindaklanjuti satker', warna: 'var(--amber)' },
    { label: 'Perlu Perbaikan', nilai: inRevision, sub: 'dikembalikan oleh Korwil', warna: 'var(--red)' },
    { label: 'Menunggu Verifikasi', nilai: pendingVerify, sub: 'antrean pemeriksaan Korwil', warna: '#0ea5e9' },
    { label: 'Progress Keseluruhan', nilai: `${avg}%`, sub: 'rata-rata seluruh penugasan', warna: 'var(--navy)' },
  ]
  const komposisi = [
    { label: 'Selesai', nilai: done, warna: '#10b981' },
    { label: 'Menunggu verifikasi', nilai: pendingVerify, warna: '#0ea5e9' },
    { label: 'Belum dikerjakan', nilai: notStarted, warna: '#f59e0b' },
    { label: 'Perlu perbaikan', nilai: inRevision, warna: '#ef4444' },
  ]

  return <section className="ex2">
    <header className="ex2-top">
      <div className="ex2-brand"><TrendingUp size={18} /><span>Ringkasan Pimpinan</span></div>
      <nav className="ex2-nav">
        <a href="#ex-ringkasan">Ringkasan</a>
        <a href="#ex-posisi">Posisi BMN</a>
        <a href="#ex-penghapusan">Penghapusan</a>
        <a href="#ex-persediaan">Persediaan</a>
        <a href="#ex-rupbasan">Eks-Rupbasan</a>
        <a href="#ex-prioritas">Prioritas</a>
        <a href="#ex-pekerjaan">Pekerjaan</a>
        <a href="#ex-satker">Satker</a>
      </nav>
      <button className="ex2-btn" onClick={refresh}><RefreshCw size={14} /> Muat ulang</button>
    </header>

    <div className="ex2-hero">
      <div className="ex2-hero-text">
        <span className="ex2-kicker">SIPADU BMN · KANWIL DITJENPAS RIAU</span>
        <h1>Progress Pekerjaan BMN <em>2026</em></h1>
        <p>Ringkasan capaian pengelolaan Barang Milik Negara seluruh Unit Pelaksana Teknis Pemasyarakatan di Riau — data langsung dari portal, diperbarui otomatis.</p>
      </div>
      <div className="ex2-hero-kpi">
        <div><span>Pekerjaan Aktif</span><b>{active.length}</b></div>
        <div><span>Progress Keseluruhan</span><b>{avg}%</b></div>
        <div><span>Penugasan Selesai</span><b>{done}</b></div>
        <div><span>Total Penugasan</span><b>{total}</b></div>
      </div>
    </div>

    <main className="ex2-body">
      <section id="ex-ringkasan" className="ex2-sec">
        <header className="ex2-sec-head"><span className="ex2-kicker">Ringkasan</span><h2>Capaian Saat Ini</h2></header>
        <div className="ex2-grid ex2-grid-3">
          {ringkasan.map(k => <div className="ex2-card" key={k.label}><span>{k.label}</span><b style={{ color: k.warna }}>{k.nilai}</b><small>{k.sub}</small></div>)}
        </div>
        <div className="ex2-compose">
          <div className="ex2-compose-head"><span>Komposisi status penugasan</span><b>{total} penugasan</b></div>
          <div className="ex2-compose-bar">
            {komposisi.map(k => total > 0 && k.nilai > 0 && <i key={k.label} style={{ width: `${(k.nilai / total) * 100}%`, background: k.warna }} />)}
          </div>
          <div className="ex2-compose-leg">
            {komposisi.map(k => <span key={k.label}><i style={{ background: k.warna }} />{k.label} {k.nilai}</span>)}
          </div>
        </div>
      </section>

      <section id="ex-posisi" className="ex2-sec">
        <header className="ex2-sec-head"><span className="ex2-kicker">Posisi Keseluruhan BMN</span><h2>Data Master Aset</h2><p>{overview ? `Posisi ${tanggalIndo(overview.snapshotDate)} · Sumber: ${overview.sourceFile}` : 'Memuat data master aset…'}</p></header>
        <div className="ex2-posisi">
          <div className="ex2-table-wrap">
            {overview ? <table className="ex2-table">
              <thead><tr><th>No</th><th>Jenis BMN</th><th className="num">Jumlah</th><th className="num">Nilai (Rp)</th></tr></thead>
              <tbody>
                {[...overview.perJenis].sort((a, b) => b.nilai - a.nilai).map((j, i) => <tr key={j.jenis}><td>{i + 1}</td><td>{j.jenis}</td><td className="num">{fmtNum(j.jumlah)}</td><td className="num">{fmtNum(j.nilai)}</td></tr>)}
              </tbody>
              <tfoot><tr><th colSpan={2}>TOTAL</th><th className="num">{fmtNum(overview.totalAset)}</th><th className="num">{fmtNum(overview.totalNilai)}</th></tr></tfoot>
            </table> : <p className="ex2-empty">Data master aset sedang dimuat…</p>}
          </div>
          {overview && <div className="ex2-posisi-side">
            <div className="ex2-stat"><span>Total BMN</span><b>{fmtNum(overview.totalAset)} unit</b><small>{overview.jumlahJenis} jenis · {overview.jumlahSatker} Satker</small></div>
            <div className="ex2-stat"><span>Belum PSP</span><b>{fmtNum(overview.tanpaPsp)} unit</b><small>{((overview.tanpaPsp / (overview.totalAset || 1)) * 100).toFixed(1).replace('.', ',')}% dari total</small></div>
          </div>}
        </div>
      </section>

      <section id="ex-penghapusan" className="ex2-sec">
        <header className="ex2-sec-head"><span className="ex2-kicker">Tindak Lanjut Penghapusan</span><h2>BMN Rusak Berat</h2><p>Dihitung dari data Master Aset dan register Penghapusan BMN di database</p></header>
        <div className="ex2-grid ex2-grid-3">
          <div className="ex2-card"><span>Total Rusak Berat</span><b>{fmtNum(totalRB)}</b><small>unit · sisa + sudah dihapus</small></div>
          <div className="ex2-card good"><span>Sudah Dihapus</span><b>{fmtNum(rbDihapus)}</b><small>unit · {pctDihapus}%</small></div>
          <div className="ex2-card bad"><span>Belum Dihapus</span><b>{fmtNum(sisaRB)}</b><small>unit tersisa</small></div>
        </div>
        <div className="ex2-bigbar">
          <div className="ex2-bigbar-row"><span>Sudah dihapus</span><div className="ex2-track"><i style={{ width: `${pctDihapus}%` }} /></div><b>{pctDihapus}%</b></div>
          <div className="ex2-bigbar-row"><span>Belum dihapus</span><div className="ex2-track belum"><i style={{ width: `${100 - pctDihapus}%` }} /></div><b>{100 - pctDihapus}%</b></div>
        </div>
        {rbPerSatker.length > 0 && <><h3 className="ex2-subhead">Rusak Berat per Satker</h3>
          <div className="ex2-table-wrap"><table className="ex2-table compact">
            <thead><tr><th>No</th><th>Satker</th><th className="num">Total Rusak Berat</th><th className="num">Sudah Dihapus</th><th className="num">Sisa Belum Dihapus</th><th>Progres Pekerjaan</th></tr></thead>
            <tbody>{rbPerSatker.map((x, i) => {
              const st = statusHapus(x.satker)
              return <tr key={x.satker}>
                <td>{i + 1}</td>
                <td><button type="button" className="ex2-link" onClick={() => onBukaSatker?.(x.satker)}>{x.nama}</button></td>
                <td className="num">{fmtNum(x.rb_sisa + (x.lelang_barang || 0))} unit</td>
                <td className="num">{fmtNum(x.lelang_barang || 0)} unit</td>
                <td className="num"><strong>{fmtNum(x.rb_sisa)} unit</strong></td>
                <td>{['A', 'B', 'C'].map(k => st[k] ? <span className={`ex2-chip ${st[k]}`} key={k}>{k} · {labelStatusHapus(st[k])}</span> : null)}</td>
              </tr>
            })}</tbody>
            <tfoot><tr><th></th><th>Total Wilayah</th><th className="num"><strong>{fmtNum(totalRB)} unit</strong></th><th className="num"><strong>{fmtNum(rbDihapus)} unit</strong></th><th className="num"><strong>{fmtNum(sisaRB)} unit</strong></th><th>Klik nama Satker untuk melihat pekerjaan</th></tr></tfoot>
          </table></div></>}
        {lelangPerSatker.length > 0 && <><h3 className="ex2-subhead">Penghapusan Terjual Lelang (per Satker)</h3>
          <div className="ex2-table-wrap"><table className="ex2-table compact">
            <thead><tr><th>Satker</th><th className="num">Barang</th><th className="num">Nilai Perolehan</th><th className="num">Hasil Jual</th><th>Dasar</th></tr></thead>
            <tbody>{lelangPerSatker.map(x => <tr key={x.satker}><td>{x.nama}</td><td className="num">{fmtNum(x.lelang_barang)} unit</td><td className="num">Rp {fmtNum(x.lelang_nilai)}</td><td className="num">Rp {fmtNum(x.lelang_jual)}</td><td>{x.lelang_sk}</td></tr>)}</tbody>
            <tfoot><tr><th>Total</th><th className="num">{fmtNum(lelangBarang)} unit</th><th className="num">Rp {fmtNum(lelangNilai)}</th><th className="num">Rp {fmtNum(lelangJual)}</th><th></th></tr></tfoot>
          </table></div></>}
      </section>

      <section id="ex-persediaan" className="ex2-sec">
        <header className="ex2-sec-head"><span className="ex2-kicker">Persediaan Usang &amp; Rusak</span><h2>Persediaan Usang &amp; Rusak per Satker</h2><p>Persediaan yang sudah disetujui pemusnahan atau diusulkan penjualan</p></header>
        <div className="ex2-grid ex2-grid-4">
          <div className="ex2-card"><span>Amunisi</span><b>Rp {fmtNum(amunisi.nilai)}</b><small>{fmtNum(amunisi.item)} item · {amunisi.satker} Satker</small></div>
          <div className="ex2-card"><span>Non-Amunisi</span><b>Rp {fmtNum(nonamunisi.nilai)}</b><small>{fmtNum(nonamunisi.item)} item · {nonamunisi.satker} Satker</small></div>
          <div className="ex2-card bad"><span>Persediaan Rusak</span><b>Rp {fmtNum(rusak.nilai)}</b><small>{fmtNum(rusak.item)} item · {rusak.satker} Satker</small></div>
          <div className="ex2-card ex2-card-big"><span>Total Persediaan</span><b>Rp {fmtNum(totalPersediaanNilai)}</b><small>{fmtNum(totalPersediaanItem)} item</small></div>
        </div>
        {tabelPersediaan.length > 0 && <><h3 className="ex2-subhead">Persediaan per Satker</h3>
          <div className="ex2-table-wrap"><table className="ex2-table compact">
            <thead><tr><th>No</th><th>Satker</th><th className="num">Amunisi</th><th className="num">Non-Amunisi</th><th className="num">Rusak</th><th className="num">Nilai Total</th><th>Progres Pekerjaan</th></tr></thead>
            <tbody>{tabelPersediaan.map((x, i) => {
              const stAmunisi = x.amunisi ? statusPersediaan('persediaan-usang-amunisi-2026', x.satker) : null
              const stNon = x.nonamunisi ? statusPersediaan('persediaan-usang-non-amunisi-2026', x.satker) : null
              const total = (x.amunisi?.nilai ?? 0) + (x.nonamunisi?.nilai ?? 0) + (x.rusak?.nilai ?? 0)
              return <tr key={x.satker}>
                <td>{i + 1}</td>
                <td><button type="button" className="ex2-link" onClick={() => onBukaSatker?.(x.satker)}>{x.nama}</button></td>
                <td className="num">{x.amunisi ? <><b>{fmtNum(x.amunisi.jumlah)} unit</b><br /><small>Rp {fmtNum(x.amunisi.nilai)}</small></> : '—'}</td>
                <td className="num">{x.nonamunisi ? <><b>{fmtNum(x.nonamunisi.jumlah)} unit</b><br /><small>Rp {fmtNum(x.nonamunisi.nilai)}</small></> : '—'}</td>
                <td className="num">{x.rusak ? <><b>{fmtNum(x.rusak.jumlah)} unit</b><br /><small>Rp {fmtNum(x.rusak.nilai)}</small></> : '—'}</td>
                <td className="num"><strong>Rp {fmtNum(total)}</strong></td>
                <td>{stAmunisi ? <span className={`ex2-chip ${stAmunisi}`}>Amunisi · {labelStatusPersediaan(stAmunisi)}</span> : null}{stNon ? <span className={`ex2-chip ${stNon}`}>Non-amunisi · {labelStatusPersediaan(stNon)}</span> : null}</td>
              </tr>
            })}</tbody>
            <tfoot><tr><th></th><th>Total Wilayah</th><th className="num"><strong>{fmtNum(amunisi.item)} unit</strong></th><th className="num"><strong>{fmtNum(nonamunisi.item)} unit</strong></th><th className="num"><strong>{fmtNum(rusak.item)} unit</strong></th><th className="num"><strong>Rp {fmtNum(totalPersediaanNilai)}</strong></th><th>Klik nama Satker untuk melihat pekerjaan</th></tr></tfoot>
          </table></div></>}
      </section>

      <section id="ex-rupbasan" className="ex2-sec">
        <header className="ex2-sec-head"><span className="ex2-kicker">Alih Status Rupbasan</span><h2>Aset Eks-Rupbasan Tidak Di-ASP ke Kejaksaan</h2><p>Aset yang tidak di-ASP digunakan oleh Kanwil Ditjenpas Riau</p></header>
        <div className="ex2-grid ex2-grid-3">
          {[
            { kunci: 'Bangkinang', nama: 'Rupbasan Bangkinang', total: 162, asp: 97, asal: 'Kejari Kampar' },
            { kunci: 'Rengat', nama: 'Rupbasan Rengat', total: 172, asp: 61, asal: 'Kejari Inhu' },
            { kunci: 'Bengkalis', nama: 'Rupbasan Bengkalis', total: 109, asp: 28, asal: 'Kejari Bengkalis' },
          ].map(r => {
            const terbuka = rupbasanBuka?.toLowerCase() === r.kunci.toLowerCase()
            const adaDetail = ['Bangkinang', 'Rengat', 'Bengkalis'].includes(r.kunci)
            return (
              <button key={r.kunci} type="button" className={`ex2-rupbasan ${terbuka ? 'terbuka' : ''} ${adaDetail ? 'klik' : ''}`} onClick={adaDetail ? () => setRupbasanBuka(terbuka ? null : r.kunci) : undefined}>
                <span>{r.nama}{adaDetail && <em className="ex2-buka">{terbuka ? 'tutup rincian' : 'klik rincian'}</em>}</span>
                <b>{r.total - r.asp}<em> tidak di-ASP</em></b>
                <div className="ex2-rupbasan-bar"><i style={{ width: `${(r.asp / r.total) * 100}%` }} /></div>
                <small>{r.asp} unit di-ASP ke {r.asal} · total {r.total} unit</small>
              </button>
            )
          })}
        </div>
        <div className="ex2-total">Total eks-Rupbasan <b>443 unit</b> · di-ASP <b>186 unit</b> · tidak di-ASP <b className="bad">257 unit</b></div>
        {rupbasanSumberData.length > 0 && (
          <div className="ex2-rupbasan-detail">
            <div className="ex2-rupbasan-head">
              <h3 className="ex2-subhead">{bukaSumber} — {rupbasanFilter ? rupbasanDetail.length : rupbasanSumberData.length} aset eks-Rupbasan</h3>
              {kegunaanList.length > 1 && (
                <div className="ex2-filter">
                  <button type="button" className={!rupbasanFilter ? 'aktif' : ''} onClick={() => setRupbasanFilter('')}>Semua</button>
                  {kegunaanList.map(u => (
                    <button key={u} type="button" className={rupbasanFilter === u ? 'aktif' : ''} onClick={() => setRupbasanFilter(rupbasanFilter === u ? '' : u)}>{u}</button>
                  ))}
                </div>
              )}
            </div>
            <div className="ex2-table-wrap"><table className="ex2-table compact">
              <thead><tr><th>No</th><th>Nama Barang</th><th>Kode Barang</th><th>NUP</th><th className="num">Tahun</th><th className="num">Nilai Perolehan</th><th>Penggunaan</th></tr></thead>
              <tbody>{rupbasanDetail.map((x, i) => (
                <tr key={`${x.kode_barang}-${x.nup}-${i}`}>
                  <td>{i + 1}</td>
                  <td className="ex2-td-nama">{x.nama_barang}</td>
                  <td className="ex2-td-kode">{x.kode_barang}</td>
                  <td>{x.nup}</td>
                  <td className="num">{x.tahun_perolehan ?? '—'}</td>
                  <td className="num">Rp {fmtNum(x.nilai_perolehan)}</td>
                  <td>{x.penggunaan || '—'}</td>
                </tr>
              ))}</tbody>
              <tfoot><tr><th></th><th>Total {rupbasanDetail.length} aset</th><th></th><th></th><th></th><th className="num">Rp {fmtNum(rupbasanDetail.reduce((s, x) => s + x.nilai_perolehan, 0))}</th><th></th></tr></tfoot>
            </table></div>
          </div>
        )}
      </section>

      <section id="ex-prioritas" className="ex2-sec">
        <header className="ex2-sec-head"><span className="ex2-kicker">Prioritas</span><h2>Tenggat Dekat &amp; Terlambat</h2></header>
        {riskTasks.length === 0 && <p className="ex2-empty">Tidak ada pekerjaan dengan tenggat kurang dari 2 minggu yang belum selesai.</p>}
        {riskTasks.length > 0 && <div className="ex2-risk-list">{riskTasks.map(({ task, due }) => {
          const { avgTask } = taskStats(task)
          const dl = daysLeft(due)
          const label = dl < 0 ? `Lewat ${Math.abs(dl)} hari` : dl === 0 ? 'Hari ini' : `${dl} hari lagi`
          return <div className={`ex2-risk ${dl < 0 ? 'overdue' : dl <= 7 ? 'urgent' : 'soon'}`} key={task.id}>
            <div className="ex2-risk-title"><strong>{task.title}</strong><span>{task.assignments.length} satker · {taskStats(task).doneCount} selesai</span></div>
            <div className="ex2-risk-due"><b>{label}</b><small>{task.due}</small></div>
            <div className="ex2-risk-bar"><i style={{ width: `${avgTask}%` }} /></div>
          </div>
        })}</div>}
      </section>

      <section id="ex-pekerjaan" className="ex2-sec">
        <header className="ex2-sec-head"><span className="ex2-kicker">Pekerjaan</span><h2>Wajib Selesai Sebelum Akhir 2026</h2></header>
        <div className="ex2-cards">
          {withDue.sort((a, b) => a.due.getTime() - b.due.getTime()).map(({ task }) => {
            const { doneCount, avgTask } = taskStats(task)
            const dl = daysLeft(parseDue(task)!)
            return <article className={`ex2-work ${dl < 0 && avgTask < 100 ? 'overdue' : ''}`} key={task.id}>
              <div className="ex2-work-top"><strong>{task.title}</strong><span className="ex2-work-due">{task.due}</span></div>
              <div className="ex2-track"><i style={{ width: `${avgTask}%` }} /><span>{avgTask}%</span></div>
              <div className="ex2-work-meta"><span>{doneCount}/{task.assignments.length} satker selesai</span>{dl >= 0 ? <small>{dl} hari lagi</small> : <small className="overdue-text">lewat {Math.abs(dl)} hari</small>}</div>
            </article>
          })}
          {noDue.map(task => {
            const { doneCount, avgTask } = taskStats(task)
            return <article className="ex2-work nodue" key={task.id}>
              <div className="ex2-work-top"><strong>{task.title}</strong><span className="ex2-work-due">{task.due}</span></div>
              <div className="ex2-track"><i style={{ width: `${avgTask}%` }} /><span>{avgTask}%</span></div>
              <div className="ex2-work-meta"><span>{doneCount}/{task.assignments.length} satker selesai</span><small>tanpa tenggat pasti</small></div>
            </article>
          })}
        </div>
      </section>

      <section id="ex-satker" className="ex2-sec">
        <header className="ex2-sec-head"><span className="ex2-kicker">Satker</span><h2>Peringkat Penyelesaian</h2></header>
        <div className="ex2-rank">
          {skorList.map((x, i) => <div className="ex2-rank-item" key={x.satker}>
            <span className={`ex2-rank-num ${i < 3 ? 'top' : ''}`}>{i + 1}</span>
            <div className="ex2-rank-copy"><strong>{x.nama}</strong><span>{x.selesai}/{x.total} pekerjaan selesai · Kinerja {Math.round(x.skorKinerja)} · Kondisi {Math.round(x.skorKondisi)}</span></div>
            <div className="ex2-track"><i style={{ width: `${x.score}%` }} /><span>{Math.round(x.score)}</span></div>
          </div>)}
        </div>
      </section>
    </main>
    <footer className="ex2-foot">
      <p>Sumber data: database Portal SIPADU BMN Kanwil Ditjenpas Riau{overview ? ` — Master Aset posisi ${tanggalIndo(overview.snapshotDate)}` : ''}. Angka diperbarui otomatis setiap impor aset, pengisian register, atau verifikasi pekerjaan.</p>
    </footer>
  </section>
}
