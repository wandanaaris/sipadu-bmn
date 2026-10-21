// Halaman publik /dampak-karhutla — pendataan dukungan bencana Karhutla.
// Pegawai memasukkan NIP, sistem menampilkan nama + satker dari tabel master
// pegawai, lalu pegawai mengunggah bukti (capture) pengisian Google Form Biro Umum.
// Tanpa login; data dukung unggah ke bucket privat submission-inbox/<NIP>/.
import { useState } from 'react'
import {
  ArrowLeft, Building2, Camera, CheckCircle2, CircleAlert, ExternalLink,
  FileImage, Loader2, Search, UploadCloud, User, ShieldCheck, X,
} from 'lucide-react'
import { satkers } from './data'
import { supabase } from './lib/supabase'
import sipaduLogo from './assets/sipadu-bmn-logo.png'
import { kompresFoto } from './kompresFoto'

const NIP_REGEX = /^\d{18}$/
const MAX_BYTE = 500 * 1024 // 500 KB

function namaSatker(code: string): string {
  return satkers.find(s => s.code === code)?.name ?? code
}

type DampakData = {
  nip: string
  nama: string
  satker: string
  status: string
  catatan?: string | null
  sudah_diajukan: boolean
}

function BrandHeader() {
  return (
    <header className="landing-header">
      <div className="brand">
        <div className="brand-logo-wrap"><img className="brand-logo" src={sipaduLogo} alt="SIPADU BMN" /></div>
        <div><strong>SIPADU BMN</strong><span>Ditjenpas Riau</span></div>
      </div>
      <div className="landing-header-actions">
        <span className="eyebrow">PENDATAAN DUKUNGAN BENCANA</span>
      </div>
    </header>
  )
}

export function DampakKarhutlaPage() {
  const [nip, setNip] = useState('')
  const [mencari, setMencari] = useState(false)
  const [cariError, setCariError] = useState('')
  const [data, setData] = useState<DampakData | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [memprosesFile, setMemprosesFile] = useState(false)
  const [kompresiLabel, setKompresiLabel] = useState('')
  const [mengunggah, setMengunggah] = useState(false)
  const [kirimError, setKirimError] = useState('')
  const [terkirim, setTerkirim] = useState(false)

  const cari = async () => {
    setCariError('')
    if (!NIP_REGEX.test(nip)) {
      setCariError('NIP harus 18 digit angka.')
      setData(null)
      return
    }
    setMencari(true)
    try {
      if (!supabase) { setCariError('Koneksi database belum tersedia.'); return }
      const { data: res, error } = await supabase.rpc('get_pegawai_by_nip', { p_nip: nip })
      if (error) throw new Error(error.message)
      if (!res) {
        setData(null)
        setCariError('NIP tidak ditemukan dalam data pegawai Kanwil Ditjenpas Riau. Periksa kembali NIP Anda.')
        return
      }
      setData({
        nip: res.nip,
        nama: res.nama,
        satker: res.satker,
        status: res.status,
        catatan: res.catatan,
        sudah_diajukan: ['menunggu_verifikasi', 'selesai'].includes(res.status),
      })
    } catch (e) {
      setData(null)
      setCariError(e instanceof Error ? e.message : 'Data pegawai belum dapat dimuat.')
    } finally {
      setMencari(false)
    }
  }

  const prosesFile = async (b: File | null) => {
    setKirimError('')
    setKompresiLabel('')
    if (!b) { setFile(null); return }
    // Non-gambar (PDF): tidak bisa dikompres di browser → wajib ≤ 500 KB.
    if (!b.type.startsWith('image/')) {
      if (b.size > MAX_BYTE) {
        setFile(null)
        setKirimError(`File ${b.name} berukuran ${(b.size / 1024 / 1024).toFixed(2)} MB melebihi batas 500 KB. PDF tidak dapat dikompres otomatis — gunakan file PDF di bawah 500 KB.`)
        return
      }
      setFile(b)
      return
    }
    // Gambar: kompres otomatis hingga di bawah 500 KB.
    setMemprosesFile(true)
    try {
      const hasil = await kompresFoto(b, MAX_BYTE)
      const ukuranAsli = b.size
      let finalFile: File
      if (hasil.ukuran <= MAX_BYTE) {
        const blob = await (await fetch(hasil.dataUrl)).blob()
        finalFile = new File([blob], b.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
      } else {
        finalFile = b
      }
      if (finalFile.size > MAX_BYTE) {
        setFile(null)
        setKompresiLabel('')
        setKirimError(`Hasil kompresi masih melebihi 500 KB. Gunakan gambar beresolusi lebih kecil.`)
        return
      }
      setFile(finalFile)
      setKompresiLabel(
        ukuranAsli > MAX_BYTE
          ? `Dikompres otomatis dari ${(ukuranAsli / 1024).toFixed(0)} KB → ${(finalFile.size / 1024).toFixed(0)} KB (≤ 500 KB).`
          : `Ukuran ${(finalFile.size / 1024).toFixed(0)} KB (≤ 500 KB).`
      )
    } catch (e) {
      setFile(null)
      setKompresiLabel('')
      setKirimError(e instanceof Error ? e.message : 'Gambar gagal dikompres.')
    } finally {
      setMemprosesFile(false)
    }
  }

  const kirim = async () => {
    setKirimError('')
    if (!data) return
    if (!file) { setKirimError('Pilih bukti (foto/screenshot) pengisian Google Form terlebih dahulu.'); return }
    setMengunggah(true)
    try {
      if (!supabase) { throw new Error('Koneksi database belum tersedia.') }
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
      const path = `${data.nip}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error: upErr } = await supabase.storage.from('submission-inbox').upload(path, file, { upsert: false, contentType: file.type })
      if (upErr) throw new Error(`Bukti belum terunggah: ${upErr.message}`)
      const { error: subErr } = await supabase.rpc('submit_dukungan_bencana', {
        p_nip: data.nip, p_capture_path: path, p_capture_size: file.size,
      })
      if (subErr) throw new Error(subErr.message)
      setTerkirim(true)
      setFile(null)
    } catch (e) {
      setKirimError(e instanceof Error ? e.message : 'Bukti belum dapat dikirim.')
    } finally {
      setMengunggah(false)
    }
  }

  return (
    <div className="dampak-page">
      <BrandHeader />
      <main className="dampak-main">
        <div className="dampak-hero">
          <div className="dampak-hero-icon"><ShieldCheck size={26} /></div>
          <div>
            <span className="eyebrow">PENDATAAN PEGAWAI TERDAMPAK</span>
            <h1>Pendataan Dukungan Bencana Kebakaran Hutan dan Lahan</h1>
            <p>
              Biro Umum Sekretariat Jenderal melakukan pendataan pegawai dan keluarga inti pegawai yang terdampak
              bencana kebakaran hutan dan lahan serta kekeringan. Data input diterima paling lambat{' '}
              <b>Kamis, 22 Oktober 2026 pukul 16.00 WIB</b>.
            </p>
          </div>
        </div>

        {terkirim ? (
          <section className="dampak-card dampak-sukses">
            <div className="dampak-sukses-ikon"><CheckCircle2 size={34} /></div>
            <h2>Bukti berhasil dikirim</h2>
            <p>
              Terima kasih, <b>{data?.nama}</b> ({data?.satker ? namaSatker(data.satker) : ''}).
              Bukti pengisian Anda telah masuk dan sedang menunggu verifikasi Korwil.
            </p>
            <button className="ghost" onClick={() => { setTerkirim(false); setData(null); setNip(''); }}>Input pegawai lain</button>
          </section>
        ) : (
          <>
            <section className="dampak-card">
              <div className="dampak-card-head">
                <User size={18} />
                <div><h2>Identitas pegawai</h2><p>Masukkan NIP Anda untuk memuat data otomatis.</p></div>
              </div>
              <div className="dampak-form">
                <div className="dampak-link-box">
                  <strong>Link Pengisian Google Form Biro Umum</strong>
                  <span>Buka form pendataan terdampak bencana sebelum mengunggah bukti.</span>
                  <a href="https://forms.gle/2UYBRjxMAkEbUKPF8" target="_blank" rel="noopener noreferrer">
                    <ExternalLink size={15} /> Buka Link Pengisian
                  </a>
                </div>
                <label className="dampak-nip-field">
                  <span>NIP</span>
                  <div className="dampak-nip-input">
                    <Search size={16} />
                    <input
                      value={nip}
                      onChange={e => setNip(e.target.value.replace(/\D/g, '').slice(0, 18))}
                      placeholder="18 digit NIP, contoh 197308141997031001"
                      inputMode="numeric"
                      autoComplete="off"
                    />
                    <button className="primary" onClick={() => void cari()} disabled={mencari || nip.length !== 18}>
                      {mencari ? <Loader2 className="spin" size={15} /> : 'Cari'}
                    </button>
                  </div>
                </label>
                {cariError && <div className="auth-message error"><CircleAlert size={14} />{cariError}</div>}

                {data && !data.sudah_diajukan && (
                  <div className="dampak-identitas">
                    <div><span>Nama</span><strong>{data.nama}</strong></div>
                    <div><span>Satker</span><strong><Building2 size={15} />{namaSatker(data.satker)}</strong></div>
                    <div><span>NIP</span><strong>{data.nip}</strong></div>
                  </div>
                )}
                {data && data.sudah_diajukan && (
                  <div className="auth-message ok">
                    <CheckCircle2 size={14} />
                    Data Anda ({data.nama}) sudah pernah diajukan dan {data.status === 'selesai' ? 'telah diverifikasi Korwil' : 'sedang menunggu verifikasi Korwil'}.{' '}
                    {data.status === 'perbaikan' && `Catatan: ${data.catatan ?? '-'}`}
                  </div>
                )}
              </div>
            </section>

            {data && !data.sudah_diajukan && (
              <section className="dampak-card">
                <div className="dampak-card-head">
                  <Camera size={18} />
                  <div><h2>Unggah bukti pengisian Google Form</h2><p>Foto/screenshot bukti sudah mengisi Google Form Biro Umum. Maksimal 500 KB — gambar di atasnya otomatis dikompres.</p></div>
                </div>
                <label className={`dampak-upload ${file ? 'has-file' : ''}`}>
                  <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" disabled={memprosesFile} onChange={e => void prosesFile(e.target.files?.[0] ?? null)} />
                  <UploadCloud size={22} />
                  <span className="dampak-upload-main">
                    {memprosesFile
                      ? <><b>Mengompres gambar…</b><small>menyesuaikan agar ≤ 500 KB</small></>
                      : file
                      ? <><b>{file.name}</b><small>{(file.size / 1024).toFixed(0)} KB</small></>
                      : <><b>Pilih file bukti</b><small>JPG, PNG, WebP, atau PDF · maks. 500 KB</small></>}
                  </span>
                  {file && !memprosesFile && <i className="dampak-file-clear" onClick={e => { e.preventDefault(); setFile(null); setKompresiLabel('') }}><X size={14} /></i>}
                </label>
                {kompresiLabel && <p className="dampak-note dampak-compress"><FileImage size={13} />{kompresiLabel}</p>}
                {kirimError && <div className="auth-message error"><CircleAlert size={14} />{kirimError}</div>}
                <button className="primary dampak-kirim" onClick={() => void kirim()} disabled={mengunggah || memprosesFile}>
                  {mengunggah ? <Loader2 className="spin" size={16} /> : 'Kirim Bukti'}
                </button>
                <p className="dampak-disclaimer">Dengan mengirim, Anda menyatakan bukti adalah milik Anda dan telah terisi sesuai data diri.</p>
              </section>
            )}
          </>
        )}

        <button className="dampak-back" onClick={() => window.history.length > 1 ? history.back() : (window.location.href = '/')}>
          <ArrowLeft size={15} /> Kembali ke beranda portal
        </button>
      </main>
    </div>
  )
}
