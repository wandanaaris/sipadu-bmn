// Halaman Label Barcode BMN — Korwil, Kanwil Ditjenpas Riau (satker 692507).
// Menandai aset yang sudah ditempel label & discan, menetapkan ruang baru,
// dan menulis keterangan. Data pelaksanaan tersimpan di tabel terpisah
// sehingga tidak hilang saat master SIMAN diimpor ulang.
//
// Kunci aset adalah kode_register (bukan kode barang + NUP), sehingga aset
// yang kode barang + NUP-nya sama tetap tercatat terpisah.
import { useEffect, useMemo, useState } from 'react'
import { Barcode, Camera, CheckCircle2, CircleDot, ClipboardCheck, ClipboardList, MapPin, MessageSquare, RefreshCw, Save, Search, Tag, Trash2, Warehouse, X } from 'lucide-react'
import {
  badgeUntuk,
  daftarRuang,
  dariJsonb,
  fisikDiKanwil,
  kunciBaris,
  merkKosong,
  nupBergeser,
  persenSelesai,
  saringBaris,
  sudahSelesai,
  urutkanBaris,
  urutkanPencarian,
  type BarisLabel,
  type FilterLabel,
  type RekapSumber,
} from './labelBmn'
import { kompresFoto, formatUkuran } from './kompresFoto'

const SATKER = '692507'
const NAMA_SATKER = 'Kanwil Ditjenpas Riau'

/** Format nominal rupiah (disingkat untuk jutaan/miliaran). */
function formatRupiah(n: number | null): string {
  if (n == null || n === 0) return '—'
  const v = Math.round(n)
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 2 })} M`
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`
  return `Rp ${v.toLocaleString('id-ID')}`
}

type StatusFilter = NonNullable<FilterLabel['status']>
type Rekap = {
  total: number
  selesai: number
  belum: number
  merkKosong: number
  sudahFoto: number
  sudahKondisi: number
  perSumber: RekapSumber[]
}

const labelStatus: Record<StatusFilter, string> = {
  semua: 'Semua aset',
  belum: 'Belum',
  selesai: 'Selesai',
}

const PILIHAN_KONDISI = ['Baik', 'Rusak Ringan', 'Rusak Berat', 'Hilang']

const chipKelas = (aktif: boolean) => (aktif ? 'chip chip-on' : 'chip')

export function LabelBmnPage() {
  const [baris, setBaris] = useState<BarisLabel[]>([])
  const [rekap, setRekap] = useState<Rekap | null>(null)
  const [muat, setMuat] = useState(true)
  const [galat, setGalat] = useState('')
  const [pesan, setPesan] = useState('')

  const [cari, setCari] = useState('')
  const [sumber, setSumber] = useState('')
  const [ruang, setRuang] = useState('')
  const [status, setStatus] = useState<StatusFilter>('semua')

  // Baris yang sedang disunting: kunci = kodeBarang/nup
  const [sunting, setSunting] = useState<string | null>(null)
  const [draf, setDraf] = useState<Draf>(drafKosong())
  const [sibuk, setSibuk] = useState(false)
  const [memprosesFoto, setMemprosesFoto] = useState(false)
  const [galatFoto, setGalatFoto] = useState('')

  // Foto dikompres di peramban sebelum disimpan agar tidak membebani database.
  const ambilFoto = async (berkas: File | undefined) => {
    if (!berkas) return
    setMemprosesFoto(true); setGalatFoto('')
    try {
      const hasil = await kompresFoto(berkas)
      setDraf(d => ({ ...d, fotoUrl: hasil.dataUrl, fotoUkuran: hasil.ukuran }))
    } catch (e) {
      setGalatFoto(e instanceof Error ? e.message : 'Foto gagal dibaca.')
    }
    setMemprosesFoto(false)
  }

  const muatData = async () => {
    setMuat(true); setGalat('')
    try {
      const { supabase } = await import('./lib/supabase')
      if (!supabase) { setGalat('Koneksi database belum dikonfigurasi.'); setMuat(false); return }
      const [dRes, rRes] = await Promise.all([
        supabase.rpc('bmn_label_daftar', { p_satker: SATKER }),
        supabase.rpc('bmn_label_rekap', { p_satker: SATKER }),
      ])
      if (dRes.error) { setGalat(dRes.error.message); setMuat(false); return }
      if (rRes.error) { setGalat(rRes.error.message); setMuat(false); return }
      setBaris(urutkanBaris(((dRes.data ?? []) as unknown[]).map(dariJsonb)))
      const r = rRes.data as Rekap | null
      setRekap(r ? {
        total: Number(r.total),
        selesai: Number(r.selesai ?? 0),
        belum: Number(r.belum ?? 0),
        merkKosong: Number(r.merkKosong ?? 0),
        sudahFoto: Number(r.sudahFoto ?? 0),
        sudahKondisi: Number(r.sudahKondisi ?? 0),
        perSumber: (r.perSumber ?? []) as RekapSumber[],
      } : null)
    } catch (e) {
      setGalat(e instanceof Error ? e.message : 'Gagal memuat data.')
    }
    setMuat(false)
  }

  useEffect(() => { void muatData() }, [])

  const ruangTersedia = useMemo(() => daftarRuang(baris), [baris])
  const tersaring = useMemo(() => {
    const hasil = saringBaris(baris, { sumber: sumber || undefined, ruang: ruang || undefined, status, cari })
    // Saat mencari, tampilkan dari NUP terkecil supaya aset mudah ditemukan.
    return cari.trim() ? urutkanPencarian(hasil) : hasil
  }, [baris, sumber, ruang, status, cari])

  const totalMerkKosong = rekap?.merkKosong ?? 0
  const totalFoto = rekap?.sudahFoto ?? 0
  const totalKondisi = rekap?.sudahKondisi ?? 0
  const totalSelesai = rekap?.selesai ?? 0
  const totalBelum = rekap?.belum ?? 0

  const bukaSunting = (b: BarisLabel) => {
    setSunting(kunciBaris(b))
    // Ruang, Petugas, dan Tanggal tempel tidak lagi diisi lewat form, tetapi
    // nilai lamanya dibawa agar ikut tersimpan kembali (tidak ditimpa kosong).
    setDraf({
      merk: b.merk,
      kondisiReal: b.kondisiReal ?? '',
      fotoUrl: b.fotoUrl ?? '',
      fotoUkuran: b.fotoUkuran ?? 0,
      ruangBaru: b.ruangBaru ?? '',
      sudahDitempel: b.sudahDitempel,
      tanggalTempel: b.tanggalTempel ?? '',
      petugas: b.petugas ?? '',
      sudahDiscan: b.sudahDiscan,
      keterangan: b.keterangan ?? '',
      sumber: b.sumber,
    })
    setPesan('')
  }

  const tutupSunting = () => { setSunting(null); setDraf(drafKosong()) }

  const simpan = async (b: BarisLabel) => {
    setSibuk(true); setGalat(''); setPesan('')
    try {
      const { supabase } = await import('./lib/supabase')
      if (!supabase) { setGalat('Koneksi database belum dikonfigurasi.'); setSibuk(false); return }
      const { error } = await supabase.rpc('bmn_label_simpan', {
        p_satker: SATKER,
        p_kode_register: b.kodeRegister,
        p_kode_barang: b.kodeBarang,
        p_nup: b.nup,
        p_sumber_psp: draf.sumber,
        p_merk: draf.merk.trim() || null,
        // null = jangan ubah kolom ini; nilai lama di database tetap terjaga.
        p_ruang_baru: draf.ruangBaru.trim() || null,
        p_kondisi_real: draf.kondisiReal.trim() || null,
        p_foto_url: draf.fotoUrl.trim() || null,
        p_foto_ukuran: draf.fotoUkuran || null,
        p_sudah_ditempel: draf.sudahDitempel,
        p_tanggal_tempel: draf.tanggalTempel || null,
        p_petugas: draf.petugas.trim() || null,
        p_sudah_discan: draf.sudahDiscan,
        p_keterangan: draf.keterangan.trim() || null,
      })
      if (error) { setGalat(error.message); setSibuk(false); return }
      setPesan(`Tersimpan: ${b.namaBarang} (NUP ${b.nup})`)
      tutupSunting()
      await muatData()
    } catch (e) {
      setGalat(e instanceof Error ? e.message : 'Gagal menyimpan.')
    }
    setSibuk(false)
  }

  return (
    <section className="panel admin-page">
      <div className="panel-head">
        <div>
          <h2><Barcode size={18} /> Label Barcode BMN — {NAMA_SATKER}</h2>
          <p>Tandai aset yang sudah ditempel label dan discan, tetapkan ruang baru, dan tulis keterangan. Riwayat cetak label berasal dari batch SIMAN 10 Desember 2025.</p>
        </div>
        <div className="label-stat">
          <button type="button" className={`status status-proses ${status === 'semua' ? 'stat-on' : ''}`} onClick={() => setStatus('semua')}>
            {rekap?.total ?? baris.length} aset
          </button>
          {/* Stat memakai bentuk pil status portal (.status + warna --amber/--green),
              bukan chip abu versi lama, agar seragam dengan seluruh halaman portal. */}
          <button type="button" className={`status status-belum ${status === 'belum' ? 'stat-on' : ''}`} onClick={() => setStatus('belum')}>
            <CircleDot size={13} /> {totalBelum} belum
          </button>
          <button type="button" className={`status status-selesai ${status === 'selesai' ? 'stat-on' : ''}`} onClick={() => setStatus('selesai')}>
            <CheckCircle2 size={13} /> {totalSelesai} selesai
          </button>
          {totalFoto > 0 && (
            <span className="status status-proses" title="Aset yang sudah ada foto buktinya">
              <Camera size={13} /> {totalFoto} foto
            </span>
          )}
          {totalKondisi > 0 && (
            <span className="status status-proses" title="Aset yang sudah diisi kondisi real">
              <ClipboardCheck size={13} /> {totalKondisi} kondisi real
            </span>
          )}
          {totalMerkKosong > 0 && (
            <span className="status status-verifikasi" title="Merk belum ada di SIMAN dan belum diisi">
              <Tag size={13} /> {totalMerkKosong} merk belum ada
            </span>
          )}
          <button className="ghost" onClick={() => void muatData()} disabled={muat}>
            <RefreshCw size={14} /> {muat ? 'Memuat…' : 'Muat ulang'}
          </button>
        </div>
      </div>

      {galat && <div className="auth-message error">{galat}</div>}
      {pesan && <div className="auth-message ok">{pesan}</div>}

      {/* Rekap per sumber aset */}
      {rekap && rekap.perSumber.length > 0 && (
        <div className="label-rekap">
          {/* Pembungkus ini WAJIB: overflow-x hanya bekerja pada kotak blok,
              bukan pada <table>. Tanpa div ini tabel meluber dan kolom
              kiri (sumber aset) terpotong tak terbaca. */}
          <div className="table-wrap">
            <table>
            <thead>
              <tr>
                <th>Sumber aset (No PSP)</th>
                <th>Total</th>
                <th>Selesai</th>
                <th>Belum</th>
                <th>Label tercetak</th>
                <th>Berlokasi</th>
                <th>Merk kosong</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {rekap.perSumber.map((s: RekapSumber) => (
                <tr key={s.sumber}>
                  <td>{s.sumber}</td>
                  <td>{s.total}</td>
                  <td><span className="pill pill-ok">{s.selesai}</span></td>
                  <td><span className="pill pill-warn">{s.total - s.selesai}</span></td>
                  <td>{s.labelTercetak}</td>
                  <td>{s.berlokasi}</td>
                  <td>{s.merkKosong > 0 ? <span className="pill pill-warn">{s.merkKosong}</span> : '—'}</td>
                  <td>
                    <div className="progress-track"><i style={{ width: `${persenSelesai(s.total, s.selesai)}%` }} /></div>
                    <small>{persenSelesai(s.total, s.selesai)}%</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="label-filter">
        <label className="label-search">
          <Search size={14} />
          <input value={cari} onChange={e => setCari(e.target.value)} placeholder="Cari nama, merk, kode barang, ruang, keterangan…" />
          {cari && <button type="button" aria-label="Bersihkan pencarian" onClick={() => setCari('')}><X size={14} /></button>}
        </label>
        <select value={sumber} onChange={e => setSumber(e.target.value)}>
          <option value="">Semua sumber aset</option>
          {[...new Set(baris.map(b => b.sumber))].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={ruang} onChange={e => setRuang(e.target.value)}>
          <option value="">Semua ruang baru</option>
          {ruangTersedia.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <div className="chip-row">
          {(Object.keys(labelStatus) as StatusFilter[]).map(k => (
            <button key={k} type="button" className={chipKelas(status === k)} onClick={() => setStatus(k)}>
              {labelStatus[k]}
            </button>
          ))}
        </div>
      </div>

      <div className="label-hasil">
        <span>{tersaring.length} aset ditampilkan{muat ? ' · memuat…' : ''}</span>
        {(sumber || ruang || status !== 'semua' || cari) && (
          <button className="ghost" onClick={() => { setSumber(''); setRuang(''); setStatus('semua'); setCari('') }}>
            Bersihkan filter
          </button>
        )}
      </div>

      {/* Kartu aset — satu kartu per aset, dibawa tim ke lapangan */}
      {muat && baris.length === 0 && <div className="label-kosong">Memuat data aset…</div>}
      {!muat && tersaring.length === 0 && (
        <div className="label-kosong">Tidak ada aset yang cocok dengan filter.</div>
      )}
      <div className="label-kartu-grid">
        {tersaring.map(b => {
          const kunci = kunciBaris(b)
          const terbuka = sunting === kunci
          const badge = badgeUntuk(b.sumber)
          const selesai = sudahSelesai(b)
          return (
            <article key={kunci} className={`label-kartu ${terbuka ? 'kartu-terbuka' : ''} ${selesai ? 'kartu-selesai' : 'kartu-belum'}`}>
              <header className="kartu-head">
                <div className="kartu-judul">
                  <h3>{b.namaBarang}</h3>
                  <p>{b.kodeBarang} · NUP {b.nup}</p>
                </div>
                <span className={`asal-badge ${badge.kelas}`} title={`Asal: ${b.sumber}`}>
                  {badge.label}
                </span>
              </header>

              <div className="kartu-status">
                {selesai
                  ? <span className="status-badge status-selesai"><CheckCircle2 size={14} /> Selesai</span>
                  : <span className="status-badge status-belum"><CircleDot size={14} /> Belum</span>}
              </div>

              <div className="kartu-merk">
                {b.merk ? <span>{b.merk}</span> : <span className="merk-kosong">Merk belum ada</span>}
                {b.kondisi && <small>Kondisi SIMAN: {b.kondisi}</small>}
              </div>

              <div className="kartu-nilai">
                <span className="kartu-nilai-rp">Nilai: <strong>{formatRupiah(b.nilaiPerolehan)}</strong></span>
                {nupBergeser(b) && (
                  <span className="pill pill-nup-lama" title={`NUP di satker asal sebelum transfer ke Kanwil Ditjenpas: ${b.nupLama}. NUP sekarang di SIMAN: ${b.nup}.`}>
                    <Tag size={12} /> NUP lama: {b.nupLama}
                  </span>
                )}
              </div>

              {b.kondisiReal && (
                <div className="kartu-baris">
                  <ClipboardCheck size={12} />
                  <span>Kondisi real: <strong>{b.kondisiReal}</strong></span>
                </div>
              )}

              {b.fotoUrl && (
                <a className="kartu-foto" href={b.fotoUrl} target="_blank" rel="noreferrer">
                  <img src={b.fotoUrl} alt={`Foto ${b.namaBarang} NUP ${b.nup}`} loading="lazy" />
                  <small><Camera size={11} /> Lihat foto{b.fotoUkuran ? ` · ${formatUkuran(b.fotoUkuran)}` : ''}</small>
                </a>
              )}

              <div className="kartu-lokasi">
                <MapPin size={12} />
                <span>{b.ruangBaru || b.lokasiSimpan || 'Belum berlokasi'}</span>
              </div>

              <div className="kartu-tanda">
                {fisikDiKanwil(b) && <span className="pill pill-fisik"><Warehouse size={12} /> Fisik di Kanwil</span>}
                {merkKosong(b) && <span className="pill pill-warn">Merk kosong</span>}
              </div>

              {b.keterangan && (
                <p className={`kartu-ket ${fisikDiKanwil(b) ? 'kartu-ket-fisik' : ''}`}>
                  <MessageSquare size={12} /> {b.keterangan}
                </p>
              )}
              {b.petugas && <p className="kartu-petugas">Dicatat: {b.petugas}{b.tanggalTempel ? ` · ${b.tanggalTempel}` : ''}</p>}

              <footer className="kartu-aksi">
                <button className="primary" onClick={() => (terbuka ? tutupSunting() : bukaSunting(b))}>
                  <ClipboardList size={14} /> {terbuka ? 'Tutup' : 'Catat Pemasangan'}
                </button>
              </footer>

              {terbuka && (
                <div className="kartu-form">

                  <label>
                    Merk
                    <input value={draf.merk} onChange={e => setDraf({ ...draf, merk: e.target.value })} placeholder="cth. Brother, Olympic, Lokal" />
                    {merkKosong(b) && <small className="bantuan">Merk belum ada di SIMAN — isi di sini.</small>}
                  </label>
                  <label>
                    Kondisi real
                    <select value={draf.kondisiReal} onChange={e => setDraf({ ...draf, kondisiReal: e.target.value })}>
                      <option value="">— pilih kondisi —</option>
                      {PILIHAN_KONDISI.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </label>
                  {/* Ruang, Petugas, dan Tanggal tempel sengaja TIDAK ditampilkan:
                      kolomnya tetap ada di tabel bmn_label_pemasangan agar riwayat
                      lama utuh, tetapi ruang kini diisi oleh scan SIMAN Mobile dan
                      petugas/tanggal tidak lagi dikumpulkan manual di lapangan. */}

                  {/* Foto bukti — diambil dari kamera HP atau galeri, dikompres ≤ 500 KB */}
                  <div className="kartu-foto-form">
                    <span className="label-foto-judul">Foto bukti</span>
                    {draf.fotoUrl ? (
                      <div className="foto-pratinjau">
                        <img src={draf.fotoUrl} alt="Pratinjau foto bukti" />
                        <div className="foto-info">
                          <small>{draf.fotoUkuran ? formatUkuran(draf.fotoUkuran) : '—'}</small>
                          <button type="button" className="ghost" onClick={() => setDraf({ ...draf, fotoUrl: '', fotoUkuran: 0 })}>
                            <Trash2 size={13} /> Hapus foto
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="foto-ambil">
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={e => void ambilFoto(e.target.files?.[0])}
                        />
                        <Camera size={16} />
                        <span>{memprosesFoto ? 'Mengompres…' : 'Ambil foto / pilih dari galeri'}</span>
                      </label>
                    )}
                    {galatFoto && <small className="bantuan">{galatFoto}</small>}
                  </div>

                  <div className="kartu-cek">
                    <label>
                      <input type="checkbox" checked={draf.sudahDitempel} onChange={e => setDraf({ ...draf, sudahDitempel: e.target.checked })} />
                      Label sudah ditempel
                    </label>
                    <label>
                      <input type="checkbox" checked={draf.sudahDiscan} onChange={e => setDraf({ ...draf, sudahDiscan: e.target.checked })} />
                      Sudah discan di SIMAN Mobile
                    </label>
                  </div>

                  <label className="kartu-ket-form">
                    Keterangan
                    <textarea rows={3} value={draf.keterangan} onChange={e => setDraf({ ...draf, keterangan: e.target.value })} placeholder="Catatan penting: label rusak, aset tidak ditemukan, pindah ruang, perlu NUP baru…" />
                  </label>

                  <div className="kartu-simpan">
                    <button className="primary" onClick={() => void simpan(b)} disabled={sibuk}>
                      <Save size={14} /> {sibuk ? 'Menyimpan…' : 'Simpan'}
                    </button>
                    <button className="ghost" onClick={tutupSunting}>Batal</button>
                  </div>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

type Draf = {
  merk: string
  kondisiReal: string
  fotoUrl: string
  fotoUkuran: number
  ruangBaru: string
  sudahDitempel: boolean
  tanggalTempel: string
  petugas: string
  sudahDiscan: boolean
  keterangan: string
  sumber: string
}

const drafKosong = (): Draf => ({
  merk: '', kondisiReal: '', fotoUrl: '', fotoUkuran: 0,
  ruangBaru: '', sudahDitempel: false, tanggalTempel: '', petugas: '',
  sudahDiscan: false, keterangan: '', sumber: '',
})
