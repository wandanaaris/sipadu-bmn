// Register Penghapusan BMN — dicatat Korwil di halaman Monitoring Satker.
// Berkas SIMAN hanya memberi tahu barang itu rusak; tidak ada catatan barang
// mana yang sudah diputus untuk dihapus. Skor Kondisi Aset memakai tabel ini:
// "sisa rusak berat" = barang rusak SIMAN − barang yang sudah berstatus 'selesai'.
import { useEffect, useState } from 'react'
import { ClipboardCheck, Trash2 } from 'lucide-react'
import { supabase } from './lib/supabase'

export type BarisPenghapusan = {
  id: number
  satker_code: string
  kode_barang: string
  nup: string
  nama_barang: string
  jenis_bmn: string | null
  kategori: 'A' | 'B' | 'C'
  nilai_perolehan: number | null
  status: 'usulan' | 'diverifikasi' | 'selesai' | 'ditolak'
  nomor_tiket: string | null
  bukti_url: string | null
  catatan: string | null
  tanggal_usulan: string | null
  tanggal_selesai: string | null
  updated_at: string
}

const STATUS_TEKS: Record<BarisPenghapusan['status'], string> = {
  usulan: 'Usulan', diverifikasi: 'Diverifikasi', selesai: 'Selesai dihapus', ditolak: 'Ditolak',
}

const rupiah = (n: number | null) =>
  n ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n) : '—'

const kategoriArti = (k: 'A' | 'B' | 'C') =>
  k === 'C' ? 'C — Senjata Api' : k === 'B' ? 'B — Kendaraan / di atas Rp 100 juta' : 'A — Selain itu'

export function susunPesanPenghapusan(namaSatker: string, kodeSatker: string, baris: BarisPenghapusan[]): string {
  const menunggu = baris.filter(b => b.status !== 'selesai' && b.status !== 'ditolak')
  const isi = menunggu.length
    ? menunggu.map(b => `• ${b.nama_barang} (${b.kategori}) — ${STATUS_TEKS[b.status]}${b.nomor_tiket ? ` · Tiket ${b.nomor_tiket}` : ''}`).join('\n')
    : '• Tidak ada pengajuan yang menunggu.'
  return [
    `Yth. Operator ${namaSatker},`,
    '',
    'Korwil BMN Ditjenpas Riau mencatat pengajuan penghapusan BMN berikut untuk unit Anda:',
    '',
    isi,
    '',
    'Mohon lengkapi berkas dan proceed through portal SIPADU BMN (https://sipadu-bmn.vercel.app).',
    'Bila terdapat keberatan, sampaikan kepada Korwil BMN sebelum proses dilanjutkan.',
    '',
    'Terima kasih.',
    '— Korwil BMN Ditjenpas Riau',
    `Kode Satker: ${kodeSatker}`,
  ].join('\n')
}

export function RegisterPenghapusan({ kodeSatker, namaSatker }: { kodeSatker: string; namaSatker: string }) {
  const [baris, setBaris] = useState<BarisPenghapusan[]>([])
  const [muat, setMuat] = useState(true)
  const [sibuk, setSibuk] = useState(false)
  const [pesan, setPesan] = useState<'' | 'ok' | 'gagal'>('')
  const [galat, setGalat] = useState('')
  const [form, setForm] = useState({ kode_barang: '', nup: '', nama_barang: '', nilai_perolehan: '' })

  const db = supabase
  const muatData = async () => {
    if (!db) { setMuat(false); return }
    setMuat(true)
    const { data, error } = await db.rpc('bmn_penghapusan_daftar', { p_satker: kodeSatker })
    if (error) setGalat(error.message)
    else setBaris((data ?? []) as BarisPenghapusan[])
    setMuat(false)
  }
  useEffect(() => { void muatData() }, [kodeSatker])

  const simpan = async () => {
    if (!form.nama_barang.trim()) { setGalat('Nama barang wajib diisi.'); return }
    if (!db) { setSibuk(false); return }
    setSibuk(true); setGalat('')
    const { data, error } = await db.rpc('bmn_penghapusan_simpan', {
      p_satker: kodeSatker,
      p_kode_barang: form.kode_barang.trim(),
      p_nup: form.nup.trim(),
      p_nama_barang: form.nama_barang.trim(),
      p_nilai: form.nilai_perolehan ? Number(form.nilai_perolehan) : null,
    })
    if (error) setGalat(error.message)
    else {
      const kategori = (data as { kategori?: 'A' | 'B' | 'C' } | null)?.kategori
      setPesan('ok')
      setTimeout(() => setPesan(''), 2500)
      setForm({ kode_barang: '', nup: '', nama_barang: '', nilai_perolehan: '' })
      void kategori
      await muatData()
    }
    setSibuk(false)
  }

  const ubahStatus = async (id: number, status: BarisPenghapusan['status']) => {
    if (!db) { setSibuk(false); return }
    setSibuk(true); setGalat('')
    const { error } = await db.rpc('bmn_penghapusan_ubah_status', { p_id: id, p_status: status })
    if (error) setGalat(error.message)
    await muatData()
    setSibuk(false)
  }

  const hapus = async (id: number) => {
    if (!db) { setSibuk(false); return }
    setSibuk(true)
    const { error } = await db.rpc('bmn_penghapusan_hapus', { p_id: id })
    if (error) setGalat(error.message)
    await muatData()
    setSibuk(false)
  }

  const salinPesan = async () => {
    const teks = susunPesanPenghapusan(namaSatker, kodeSatker, baris)
    try { await navigator.clipboard.writeText(teks); setPesan('ok') }
    catch { setPesan('gagal') }
    setTimeout(() => setPesan(''), 2500)
  }

  const menunggu = baris.filter(b => b.status !== 'selesai' && b.status !== 'ditolak').length
  const selesai = baris.filter(b => b.status === 'selesai')

  return (
    <section className="panel admin-page info-panel rp">
      <div className="pa-tabel-head">
        <h3>Register Penghapusan BMN <span className="pa-hitung">{baris.length} barang</span></h3>
        <button className="pa-tabel-export" onClick={() => void salinPesan()} disabled={!baris.length}>
          <ClipboardCheck size={13} /> Salin pesan
        </button>
      </div>
      <p className="rp-keterangan">
        Dicatat Korwil. Barang yang berstatus <b>Selesai dihapus</b> otomatis mengurangi sisa rusak berat dan menaikkan
        skor Kondisi Aset Satker. Kategori A/B/C dihitung otomatis dari jenis dan nilai perolehan.
      </p>

      {galat && <div className="imp-galat">{galat}</div>}
      {pesan === 'ok' && <div className="imp-sukses">Pesan tersalin.</div>}
      {pesan === 'gagal' && <div className="imp-galat">Gagal menyalin.</div>}

      <div className="rp-form">
        <input placeholder="Kode Barang" value={form.kode_barang}
          onChange={e => setForm(f => ({ ...f, kode_barang: e.target.value }))} />
        <input placeholder="NUP" value={form.nup}
          onChange={e => setForm(f => ({ ...f, nup: e.target.value }))} />
        <input placeholder="Nama barang *" value={form.nama_barang}
          onChange={e => setForm(f => ({ ...f, nama_barang: e.target.value }))} />
        <input placeholder="Nilai perolehan" inputMode="numeric" value={form.nilai_perolehan}
          onChange={e => setForm(f => ({ ...f, nilai_perolehan: e.target.value }))} />
        <button className="primary" onClick={() => void simpan()} disabled={sibuk}>Tambah</button>
      </div>

      {muat
        ? <p className="pa-loading">Memuat register…</p>
        : baris.length === 0
          ? <p className="pa-loading">Belum ada barang yang dicatat untuk penghapusan.</p>
          : <div className="pa-tabel-wrap">
              <table className="pa-tabel">
                <thead>
                  <tr><th>Barang</th><th>Kategori</th><th>Nilai</th><th>Tiket</th><th>Status</th><th>Aksi</th></tr>
                </thead>
                <tbody>
                  {baris.map(b => (
                    <tr key={b.id}>
                      <td className="pa-td-nama">{b.nama_barang}
                        {b.kode_barang && <span className="rp-kode">{b.kode_barang}{b.nup ? ` / NUP ${b.nup}` : ''}</span>}
                      </td>
                      <td><span className={`pt-kat kat-${b.kategori}`} title={kategoriArti(b.kategori)}>{b.kategori}</span></td>
                      <td className="pa-td-nilai">{rupiah(b.nilai_perolehan)}</td>
                      <td>{b.nomor_tiket || '—'}</td>
                      <td>
                        <select value={b.status} disabled={sibuk}
                          onChange={e => void ubahStatus(b.id, e.target.value as BarisPenghapusan['status'])}>
                          <option value="usulan">Usulan</option>
                          <option value="diverifikasi">Diverifikasi</option>
                          <option value="selesai">Selesai dihapus</option>
                          <option value="ditolak">Ditolak</option>
                        </select>
                      </td>
                      <td><button className="link-button" onClick={() => void hapus(b.id)} disabled={sibuk}
                        aria-label="Hapus"><Trash2 size={13} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}

      <p className="pa-keterangan">
        Menunggu tindak lanjut: <b>{menunggu}</b> · Sudah selesai dihapus: <b>{selesai.length}</b>
      </p>
    </section>
  )
}
