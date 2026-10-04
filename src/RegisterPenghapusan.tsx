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
