// Register Penghapusan BMN — Opsi C: Korwil mencatat per kategori, bukan per barang.
// Satu Satker cukup tiga baris (A, B, C). Angka yang dicatat langsung mengurangi
// "sisa rusak berat" sehingga Skor Kondisi Aset naik dengan sendirinya.
import { useEffect, useState } from 'react'
import { ClipboardCheck } from 'lucide-react'
import { supabase } from './lib/supabase'

export type BarisKategori = {
  id: number
  satker_code: string
  kategori: 'A' | 'B' | 'C'
  jumlah_barang: number
  nilai_total: number
  nomor_tiket: string | null
  catatan: string | null
  tanggal: string | null
}

/** Berapa barang rusak berat kategori itu yang ada di data Master Aset. */
export type SisaPerKategori = { A: number; B: number; C: number }

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0)

export const ARTI_KATEGORI: Record<'A' | 'B' | 'C', string> = {
  A: 'BMN selain tanah dan bangunan, nilai di bawah Rp 100 juta',
  B: 'Kendaraan bermotor dan BMN bernilai di atas Rp 100 juta',
  C: 'Senjata Api',
}

const KATEGORI: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C']

export function susunPesanPenghapusan(namaSatker: string, kodeSatker: string, baris: BarisKategori[]): string {
  const isi = KATEGORI
    .map(k => {
      const b = baris.find(x => x.kategori === k)
      if (!b || b.jumlah_barang === 0) return null
      return `• Kategori ${k} (${ARTI_KATEGORI[k]}): ${b.jumlah_barang} barang senilai ${rupiah(b.nilai_total)}${b.nomor_tiket ? ` · Tiket ${b.nomor_tiket}` : ''}`
    })
    .filter(Boolean)
  return [
    `Yth. Operator ${namaSatker},`,
    '',
    'Korwil BMN Ditjenpas Riau mencatat bahwa penghapusan BMN berikut telah selesai dilaksanakan:',
    '',
    ...(isi.length ? isi : ['• Belum ada pengajuan penghapusan yang tercatat.']),
    '',
    'Data ini diperhitungkan pada skor Kondisi Aset unit Anda.',
    'Bila tidak sesuai, sampaikan kepada Korwil BMN untuk koreksi.',
    '',
    'Terima kasih.',
    '— Korwil BMN Ditjenpas Riau',
    `Kode Satker: ${kodeSatker}`,
  ].join('\n')
}

type Form = Record<'A' | 'B' | 'C', { jumlah: string; nilai: string; tiket: string }>

const formKosong = (): Form => ({
  A: { jumlah: '', nilai: '', tiket: '' },
  B: { jumlah: '', nilai: '', tiket: '' },
  C: { jumlah: '', nilai: '', tiket: '' },
})

export function RegisterPenghapusan({
  kodeSatker, namaSatker, sisa,
}: { kodeSatker: string; namaSatker: string; sisa: SisaPerKategori }) {
  const [baris, setBaris] = useState<BarisKategori[]>([])
  const [form, setForm] = useState<Form>(formKosong())
  const [muat, setMuat] = useState(true)
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<'' | 'ok' | 'gagal'>('')
  const [galat, setGalat] = useState('')

  const db = supabase

  const muatData = async () => {
    if (!db) { setMuat(false); return }
    setMuat(true)
    const { data, error } = await db.rpc('bmn_hapus_daftar', { p_satker: kodeSatker })
    if (error) setGalat(error.message)
    else {
      const daftar = (data ?? []) as BarisKategori[]
      setBaris(daftar)
      const f = formKosong()
      for (const b of daftar) {
        f[b.kategori] = { jumlah: String(b.jumlah_barang), nilai: String(Number(b.nilai_total || 0)), tiket: b.nomor_tiket ?? '' }
      }
      setForm(f)
    }
    setMuat(false)
  }
  useEffect(() => { void muatData() }, [kodeSatker])

  const simpan = async (k: 'A' | 'B' | 'C') => {
    if (!db) return
    const f = form[k]
    const jumlah = Number(f.jumlah || 0)
    const nilai = Number(f.nilai || 0)
    if (!Number.isFinite(jumlah) || jumlah < 0) { setGalat('Jumlah barang harus angka positif.'); return }
    if (!Number.isFinite(nilai) || nilai < 0) { setGalat('Nilai harus angka positif.'); return }
    if (jumlah > sisa[k]) {
      setGalat(`Kategori ${k}: jumlah ${jumlah} melebihi barang rusak berat yang tercatat (${sisa[k]}).`)
      return
    }
    setSibuk(true); setGalat('')
    const { error } = await db.rpc('bmn_hapus_simpan', {
      p_satker: kodeSatker, p_kategori: k, p_jumlah: jumlah,
      p_nilai: nilai, p_nomor_tiket: f.tiket,
    })
    if (error) setGalat(error.message)
    await muatData()
    setSibuk(false)
  }

  const kosongkan = async (k: 'A' | 'B' | 'C') => {
    if (!db) return
    setSibuk(true)
    const { error } = await db.rpc('bmn_hapus_kosongkan', { p_satker: kodeSatker, p_kategori: k })
    if (error) setGalat(error.message)
    await muatData()
    setSibuk(false)
  }

  const salinPesan = async () => {
    try { await navigator.clipboard.writeText(susunPesanPenghapusan(namaSatker, kodeSatker, baris)); setPesan('ok') }
    catch { setPesan('gagal') }
    setTimeout(() => setPesan(''), 2500)
  }

  const totalBarang = baris.reduce((n, b) => n + b.jumlah_barang, 0)
  const totalNilai = baris.reduce((n, b) => n + Number(b.nilai_total || 0), 0)

  return (
    <section className="panel admin-page info-panel rp">
      <div className="pa-tabel-head">
        <h3>Penghapusan BMN Rusak Berat <span className="pa-hitung">per kategori</span></h3>
        <button className="pa-tabel-export" onClick={() => void salinPesan()} disabled={!baris.length}>
          <ClipboardCheck size={13} /> Salin pesan
        </button>
      </div>
      <p className="rp-keterangan">
        Catat <b>jumlah barang</b> dan <b>nilai yang sudah dihapus</b> per kategori. Angka ini langsung mengurangi
        sisa rusak berat dan menaikkan Skor Kondisi Aset Satker — tanpa perlu mengisi NUP satu per satu.
      </p>

      {galat && <div className="imp-galat">{galat}</div>}
      {pesan === 'ok' && <div className="imp-sukses">Pesan tersalin.</div>}
      {pesan === 'gagal' && <div className="imp-galat">Gagal menyalin.</div>}

      {muat ? <p className="pa-loading">Memuat…</p> : (
        <div className="pa-tabel-wrap">
          <table className="pa-tabel">
            <thead>
              <tr>
                <th>Kategori</th><th>Arti</th><th>Sisa Rusak Berat</th>
                <th>Jumlah dihapus</th><th>Nilai dihapus (Rp)</th><th>Tiket</th><th />
              </tr>
            </thead>
            <tbody>
              {KATEGORI.map(k => {
                const f = form[k]
                const tersimpan = baris.find(b => b.kategori === k)
                return (
                  <tr key={k}>
                    <td><span className={`pt-kat kat-${k}`}>{k}</span></td>
                    <td className="pa-td-arti">{ARTI_KATEGORI[k]}</td>
                    <td className="pa-td-nilai">{sisa[k]}</td>
                    <td>
                      <input inputMode="numeric" className="rp-input" value={f.jumlah}
                        onChange={e => setForm(s => ({ ...s, [k]: { ...f, jumlah: e.target.value } }))} placeholder="0" />
                    </td>
                    <td>
                      <input inputMode="numeric" className="rp-input rp-input-lebar" value={f.nilai}
                        onChange={e => setForm(s => ({ ...s, [k]: { ...f, nilai: e.target.value } }))} placeholder="0" />
                    </td>
                    <td>
                      <input className="rp-input" value={f.tiket}
                        onChange={e => setForm(s => ({ ...s, [k]: { ...f, tiket: e.target.value } }))} placeholder="—" />
                    </td>
                    <td className="rp-aksi">
                      <button className="link-button" onClick={() => void simpan(k)} disabled={sibuk}>
                        {tersimpan ? 'Perbarui' : 'Simpan'}
                      </button>
                      {tersimpan && (
                        <button className="link-button rp-hapus" onClick={() => void kosongkan(k)} disabled={sibuk}>
                          Kosongkan
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={3}>Total tercatat</th>
                <th className="pa-td-nilai">{totalBarang} barang</th>
                <th className="pa-td-nilai">{rupiah(totalNilai)}</th>
                <th colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  )
}

// ── Register Lelang BMN ─────────────────────────────────────────────────────
// Penghapusan karena PENJUALAN (lelang), berbeda dari penghapusan karena
// barang rusak berat. Dicatat berdasarkan Surat Keputusan Menteri.

export type BarisLelang = {
  id: number
  satker_code: string
  nomor_sk: string
  tanggal_sk: string | null
  jumlah_barang: number
  nilai_perolehan: number
  nilai_limit: number
  nilai_penjualan: number
  dasar: string | null
  catatan: string | null
}

export function RegisterLelang({ kodeSatker, namaSatker }: { kodeSatker: string; namaSatker: string }) {
  const [baris, setBaris] = useState<BarisLelang[]>([])
  const [muat, setMuat] = useState(true)
  const [sibuk, setSibuk] = useState(false)
  const [galat, setGalat] = useState('')
  const [pesan, setPesan] = useState<'' | 'ok' | 'gagal'>('')
  const [form, setForm] = useState({ nomor_sk: '', tanggal_sk: '', jumlah_barang: '', nilai_perolehan: '', nilai_limit: '', nilai_penjualan: '' })

  const db = supabase

  const muatData = async () => {
    if (!db) { setMuat(false); return }
    setMuat(true)
    const { data, error } = await db.rpc('bmn_lelang_daftar', { p_satker: kodeSatker })
    if (error) setGalat(error.message)
    else setBaris((data ?? []) as BarisLelang[])
    setMuat(false)
  }
  useEffect(() => { void muatData() }, [kodeSatker])

  const simpan = async () => {
    if (!db) return
    if (!form.nomor_sk.trim()) { setGalat('Nomor SK wajib diisi.'); return }
    setSibuk(true); setGalat('')
    const { error } = await db.rpc('bmn_lelang_simpan', {
      p_satker: kodeSatker,
      p_nomor_sk: form.nomor_sk.trim(),
      p_tanggal_sk: form.tanggal_sk || null,
      p_jumlah: Number(form.jumlah_barang || 0),
      p_nilai_perolehan: Number(form.nilai_perolehan || 0),
      p_nilai_limit: form.nilai_limit ? Number(form.nilai_limit) : null,
      p_nilai_penjualan: form.nilai_penjualan ? Number(form.nilai_penjualan) : null,
    })
    if (error) setGalat(error.message)
    else {
      setForm({ nomor_sk: '', tanggal_sk: '', jumlah_barang: '', nilai_perolehan: '', nilai_limit: '', nilai_penjualan: '' })
      await muatData()
    }
    setSibuk(false)
  }

  const hapus = async (id: number) => {
    if (!db) return
    setSibuk(true)
    const { error } = await db.rpc('bmn_lelang_hapus', { p_id: id })
    if (error) setGalat(error.message)
    await muatData()
    setSibuk(false)
  }

  const salinPesan = async () => {
    const isi = baris.length
      ? baris.map(b => `• ${b.nomor_sk}${b.tanggal_sk ? ` (${b.tanggal_sk})` : ''}: ${b.jumlah_barang} barang, nilai perolehan ${rupiah(b.nilai_perolehan)}, terjual ${rupiah(b.nilai_penjualan)}`).join('\n')
      : '• Belum ada data lelang.'
    try {
      await navigator.clipboard.writeText([
        `Yth. Operator ${namaSatker},`, '',
        'Korwil BMN Ditjenpas Riau mencatat lelang BMN yang telah dilaksanakan unit Anda:', '',
        isi, '',
        'Keberhasilan lelang ini diperhitungkan pada skor Kondisi Aset unit Anda.',
        'Terima kasih.', '— Korwil BMN Ditjenpas Riau', `Kode Satker: ${kodeSatker}`,
      ].join('\n'))
      setPesan('ok')
    } catch { setPesan('gagal') }
    setTimeout(() => setPesan(''), 2500)
  }

  const totalBarang = baris.reduce((n, b) => n + b.jumlah_barang, 0)
  const totalPerolehan = baris.reduce((n, b) => n + Number(b.nilai_perolehan || 0), 0)
  const totalJual = baris.reduce((n, b) => n + Number(b.nilai_penjualan || 0), 0)

  return (
    <section className="panel admin-page info-panel rp">
      <div className="pa-tabel-head">
        <h3>Lelang BMN <span className="pa-hitung">penghapusan karena penjualan</span></h3>
        <button className="pa-tabel-export" onClick={() => void salinPesan()} disabled={!baris.length}>
          <ClipboardCheck size={13} /> Salin pesan
        </button>
      </div>
      <p className="rp-keterangan">
        Berbeda dengan penghapusan karena barang rusak. Lelang <b>menambah</b> skor Kondisi Aset:
        1 SK bernilai 70, 2 SK atau lebih bernilai 100.
      </p>

      {galat && <div className="imp-galat">{galat}</div>}
      {pesan === 'ok' && <div className="imp-sukses">Pesan tersalin.</div>}
      {pesan === 'gagal' && <div className="imp-galat">Gagal menyalin.</div>}

      <div className="rp-form rp-form-lelang">
        <input placeholder="Nomor SK *" value={form.nomor_sk} onChange={e => setForm(f => ({ ...f, nomor_sk: e.target.value }))} />
        <input type="date" value={form.tanggal_sk} onChange={e => setForm(f => ({ ...f, tanggal_sk: e.target.value }))} />
        <input placeholder="Jumlah barang" inputMode="numeric" value={form.jumlah_barang} onChange={e => setForm(f => ({ ...f, jumlah_barang: e.target.value }))} />
        <input placeholder="Nilai perolehan" inputMode="numeric" value={form.nilai_perolehan} onChange={e => setForm(f => ({ ...f, nilai_perolehan: e.target.value }))} />
        <input placeholder="Nilai limit" inputMode="numeric" value={form.nilai_limit} onChange={e => setForm(f => ({ ...f, nilai_limit: e.target.value }))} />
        <input placeholder="Nilai terjual" inputMode="numeric" value={form.nilai_penjualan} onChange={e => setForm(f => ({ ...f, nilai_penjualan: e.target.value }))} />
        <button className="primary" onClick={() => void simpan()} disabled={sibuk}>Tambah SK</button>
      </div>

      {muat ? <p className="pa-loading">Memuat…</p> : baris.length === 0
        ? <p className="pa-loading">Belum ada SK lelang yang tercatat.</p>
        : <div className="pa-tabel-wrap">
            <table className="pa-tabel">
              <thead>
                <tr><th>Nomor SK</th><th>Tanggal</th><th>Jumlah</th><th>Nilai Perolehan</th><th>Nilai Limit</th><th>Terjual</th><th /></tr>
              </thead>
              <tbody>
                {baris.map(b => (
                  <tr key={b.id}>
                    <td className="pa-td-nama">{b.nomor_sk}
                      {b.catatan && <span className="rp-kode">{b.catatan}</span>}</td>
                    <td>{b.tanggal_sk ?? '—'}</td>
                    <td className="pa-td-nilai">{b.jumlah_barang}</td>
                    <td className="pa-td-nilai">{rupiah(b.nilai_perolehan)}</td>
                    <td className="pa-td-nilai">{rupiah(b.nilai_limit)}</td>
                    <td className="pa-td-nilai">{rupiah(b.nilai_penjualan)}</td>
                    <td><button className="link-button rp-hapus" onClick={() => void hapus(b.id)} disabled={sibuk}>Hapus</button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan={2}>Total</th>
                  <th className="pa-td-nilai">{totalBarang} barang</th>
                  <th className="pa-td-nilai">{rupiah(totalPerolehan)}</th>
                  <th />
                  <th className="pa-td-nilai">{rupiah(totalJual)}</th>
                  <th />
                </tr>
              </tfoot>
            </table>
          </div>}
    </section>
  )
}
