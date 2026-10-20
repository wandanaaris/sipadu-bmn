// Halaman "Cari Kode Barang" — bantuan kodefikasi aset & persediaan BMN.
// Mengetik nama barang (bebas, bahasa sehari-hari) -> disarankan kode teratas
// beserta alasan & keyakinan. Analisis dijalankan lokal di peramban (ranker
// deterministik), tidak ada data dikirim keluar, tanpa API eksternal.
// Keputusan kode final tetap ditentukan petugas.
import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Copy, Search, Sparkles, CircleAlert } from 'lucide-react'
import { rekomendasiKode, cekDilarang, type KandidatKode, type Hasil } from './kodeBarang'

const CONTOH = ['paracetamol', 'obat', 'kertas hvs', 'meja kerja', 'laptop', 'sepeda motor', 'toner printer', 'air conditioner']

const KINA: Record<KandidatKode['keyakinan'], string> = {
  'Sangat relevan': 'sangat-relevan',
  'Relevan': 'relevan',
  'Perlu ditinjau': 'perlu-ditinjau',
}

export function KodeBarangPage({ onBack }: { onBack: () => void }) {
  const [q, setQ] = useState('')
  const [hasil, setHasil] = useState<Hasil | null>(null)
  const [sudahCari, setSudahCari] = useState(false)
  const [salinMap, setSalinMap] = useState<Record<string, boolean>>({})

  const jalankan = (teks?: string) => {
    const nilai = (teks ?? q).trim()
    if (!nilai) return
    setQ(nilai)
    setSudahCari(true)
    setHasil(rekomendasiKode(nilai))
  }

  const salin = (k: KandidatKode) => {
    const teks = `${k.kode} · ${k.kodeTitik} — ${k.nama}`
    navigator.clipboard?.writeText(teks).then(() => {
      setSalinMap({ [k.kode]: true })
      setTimeout(() => setSalinMap({}), 1400)
    }).catch(() => undefined)
  }

  return (
    <div className="kode-page">
      <header className="kode-header">
        <button className="document-back" onClick={onBack}>
          <span className="document-back-icon"><ArrowLeft /></span>
          <span className="document-back-label"><small>Kembali</small><strong>Halaman Utama</strong></span>
        </button>
        <div className="kode-header-note"><Sparkles size={15} /> Analisis dijalankan lokal di peramban</div>
      </header>

      <main className="kode-main">
        <div className="kode-head">
          <span className="eyebrow">BANTUAN KODEFIKASI BMN</span>
          <h1>Cari Kode Barang</h1>
          <p>Tentukan kode persediaan maupun aset ketika bingung memilihnya. Ketik nama barang sehari-hari (mis. <em>paracetamol</em> atau <em>meja kerja</em>), sistem akan menyarankan kode teratas.</p>
        </div>

        <div className="kode-search">
          <div className="kode-search-bar">
            <Search size={20} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && jalankan()}
              placeholder="Ketik nama barang atau kode… (contoh: paracetamol)"
              aria-label="Nama barang atau kode"
            />
            <button onClick={() => jalankan()} disabled={!q.trim()}>Cari Kode</button>
          </div>
          <div className="kode-contoh">
            <span>Coba:</span>
            {CONTOH.map((c) => (
              <button key={c} className="kode-chip" onClick={() => { setQ(c); jalankan(c) }}>{c}</button>
            ))}
          </div>
        </div>

        {sudahCari && !hasil?.kandidat.length && hasil?.pesan && (
          <div className="kode-kosong">
            <CircleAlert size={22} />
            <p>{hasil.pesan}</p>
          </div>
        )}

        {hasil && hasil.kandidat.length > 0 && (
          <>
            <div className="kode-count">Menampilkan {hasil.kandidat.length} kode yang paling cocok — verifikasi sebelum digunakan.</div>
            <div className="kode-list">
              {hasil.kandidat.map((k, i) => {
                const larang = cekDilarang(k.kode)
                return (
                <article key={k.kode} className={`kode-card ${larang ? 'kode-card-dilarang' : ''}`}>
                  {larang && (
                    <div className="kode-dilarang-banner">
                      <CircleAlert size={17} />
                      <div>
                        <strong>Kode ini tidak boleh dipakai — {larang.nama}.</strong>
                        <span>{larang.pesan}</span>
                      </div>
                    </div>
                  )}
                  <div className="kode-card-top">
                    <span className="kode-rank">#{i + 1}</span>
                    <span className={`kode-kina kina-${KINA[k.keyakinan]}`}>{k.keyakinan}</span>
                    <div className="kode-spacer" />
                    <button className="kode-copy" onClick={() => salin(k)}>
                      {salinMap[k.kode] ? <><Check size={15} /> Tersalin</> : <><Copy size={15} /> Salin</>}
                    </button>
                  </div>

                  <div className="kode-kode">
                    <span className="kode-kode10">{k.kode}</span>
                    <span className="kode-kodetitik">{k.kodeTitik}</span>
                  </div>

                  <h3 className="kode-nama">{k.nama}</h3>

                  {/* Penjelasan singkat (terkurasi atau otomatis) */}
                  <p className="kode-deskripsi">{k.deskripsi}</p>

                  <div className="kode-jalur">
                    {k.jalur.map((bag, bi) => (
                      <span key={bi} className="kode-jalur-item">{bag}{bi < k.jalur.length - 1 && <ArrowRight />}</span>
                    ))}
                  </div>

                  <div className="kode-meta">
                    {k.satuan && <span>Satuan: <b>{k.satuan}</b></span>}
                    {k.jenis && <span>Jenis: <b>{k.jenis}</b></span>}
                    {k.dasar && <span>Dasar: <b>{k.dasar}</b></span>}
                  </div>

                  {k.alasan.length > 0 && (
                    <div className="kode-alasan">
                      <span className="kode-alasan-label">Mengapa cocok:</span>
                      <ul>
                        {k.alasan.slice(0, 4).map((a, ai) => <li key={ai}>{a}</li>)}
                      </ul>
                    </div>
                  )}
                  </article>
                )
              })}
            </div>
          </>
        )}

        <aside className="kode-disclaimer">
          <Sparkles size={16} />
          <p>Rekomendasi dibuat oleh mesin pencocokan <strong>lokal</strong> dan bersifat <em>bantuan</em>, bukan keputusan resmi. Kode final tetap ditentukan petugas pengelola BMN sesuai ketentuan yang berlaku. Data tidak dikirim ke layanan luar.</p>
        </aside>
      </main>
    </div>
  )
}
