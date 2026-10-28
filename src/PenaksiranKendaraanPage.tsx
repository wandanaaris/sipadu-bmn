import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Calculator, Database, Download, ExternalLink, FileSpreadsheet, FileText, Lock, Plus, RotateCcw, Scale, Sparkles, Trash2, X } from 'lucide-react'
import {
  formatRp, hitungPenaksiran, klasifikasiKendaraan, faktorTahunPembuatan, faktorKondisi,
  type BarisLelang, type IdentitasPenaksiran,
} from './penaksiranKendaraan'
import {
  daftarKpknl, daftarMerek, daftarTipe, generateBarisPembanding, kategoriDariJenis,
  kategoriPerKpknl, keteranganPembanding, kunciKpknl, namaLokasi, normTeks,
  type HasilGenerate, type KandidatLelang,
} from './penaksiranLelang'
import { downloadXlsx, DASAR_PERATURAN, KETENTUAN_RINGKAS, KMK_375_PDF_URL } from './penaksiranXlsx'
import { InputAngka } from './penk-kontrol'
import './penaksiran-kendaraan.css'

// Dasbor "Basis Data Harga Lelang Kendaraan Bermotor" DJKN (Publish to Web).
export const BASIS_DATA_LELANG_URL =
  'https://app.powerbi.com/view?r=eyJrIjoiNDMzZDFiMmQtN2Y5YS00OGEzLWJlNTgtNDc1YmZhMjlkODRlIiwidCI6ImVkNmZiMzY2LTgzMjItNDZmMy05MTVlLWM0ZDAzN2E0NTRhOSIsImMiOjEwfQ%3D%3D'

const objekKosong: IdentitasPenaksiran = {
  nomorKertasKerja: '', namaObjek: '', kodeBarang: '', nup: '', lokasiObjek: '', rencanaLokasi: '', kategoriLokasiObjek: 2,
  jenisKendaraan: 'roda4', kapasitasCc: 0, merek: '', tipe: '', nomorPolisi: '',
  dokumenKepemilikan: 'BPKB', pemilikDokumen: 'Kementerian Imigrasi dan Pemasyarakatan',
  masaBerlaku: 'Masih Berlaku', keteranganLain: '', warna: '',
  tahunPembuatan: 0, bahanBakar: 'Bensin', penggunaan: 'Kendaraan Dinas',
  kondisi: 'rusak70', tujuan: 'lelang', tahunTaksiran: new Date().getFullYear(),
  kota: 'Pekanbaru', tanggal: new Date().toISOString().slice(0, 10), ketua: '', anggota: ['', ''],
}

const barisKosong = (): BarisLelang => ({
  merek: '', kodeLelang: '', tipe: '', hargaLelang: 0, tahunLelang: 0,
  lokasiLelang: '', kategoriLokasiLelang: 2, tahunPembuatanLelang: 0,
  penyesuaianTipe: 0, penyesuaianMerek: 0, hargaBaru: 0,
})

/** Contoh Simulasi I KMK 375/2024 (Corolla Altis) untuk mencoba alur. */
const contohRows: BarisLelang[] = [
  { merek: 'Toyota', kodeLelang: 'BCTT0N', tipe: 'Corolla Altis 1.8', hargaLelang: 55_583_000, tahunLelang: 2023, lokasiLelang: 'Jakarta', kategoriLokasiLelang: 2, tahunPembuatanLelang: 2004, penyesuaianTipe: 0, penyesuaianMerek: 0 },
  { merek: 'Toyota', kodeLelang: 'CK47MN', tipe: 'Corolla Altis 1.8', hargaLelang: 55_583_000, tahunLelang: 2023, lokasiLelang: 'Jakarta', kategoriLokasiLelang: 2, tahunPembuatanLelang: 2004, penyesuaianTipe: 0, penyesuaianMerek: 0 },
  { merek: 'Toyota', kodeLelang: 'TZ4FD1', tipe: 'Corolla Altis 1.8', hargaLelang: 44_803_000, tahunLelang: 2023, lokasiLelang: 'Jakarta', kategoriLokasiLelang: 2, tahunPembuatanLelang: 2004, penyesuaianTipe: 0, penyesuaianMerek: 0 },
  { merek: 'Toyota', kodeLelang: 'UCXOUN', tipe: 'Corolla Altis 1.8', hargaLelang: 63_533_000, tahunLelang: 2023, lokasiLelang: 'Jakarta', kategoriLokasiLelang: 2, tahunPembuatanLelang: 2004, penyesuaianTipe: 0, penyesuaianMerek: 0 },
  { merek: 'Toyota', kodeLelang: 'MG4ZLQ', tipe: 'Corolla Altis 1.8', hargaLelang: 46_000_000, tahunLelang: 2022, lokasiLelang: 'Jakarta', kategoriLokasiLelang: 2, tahunPembuatanLelang: 2006, penyesuaianTipe: 0, penyesuaianMerek: 0 },
  { merek: 'Toyota', kodeLelang: 'U6PQHA', tipe: 'Corolla Altis 1.8', hargaLelang: 63_666_900, tahunLelang: 2022, lokasiLelang: 'Jakarta', kategoriLokasiLelang: 2, tahunPembuatanLelang: 2006, penyesuaianTipe: 0, penyesuaianMerek: 0 },
]
const contohObjek: IdentitasPenaksiran = {
  ...objekKosong, namaObjek: 'Toyota New Corolla Altis 1.800 cc', kodeBarang: '302013', nup: '00001234',
  lokasiObjek: 'Jakarta IV', rencanaLokasi: 'Jakarta', kategoriLokasiObjek: 2, jenisKendaraan: 'roda4', kapasitasCc: 1800,
  merek: 'Toyota', tipe: 'New Corolla Altis', nomorPolisi: 'XX XXXX XX', dokumenKepemilikan: 'BPKB',
  tahunPembuatan: 2005, anggota: ['Ahmad Yani', 'Siti Rahma'],
}

/** Field wajib Bagian 1 — keterangan lain sengaja tidak ada (opsional). */
const WAJIB_1: { key: keyof IdentitasPenaksiran; label: string }[] = [
  { key: 'nomorKertasKerja', label: 'Nomor kertas kerja' },
  { key: 'namaObjek', label: 'Nama objek' },
  { key: 'kodeBarang', label: 'Kode barang' },
  { key: 'nup', label: 'NUP' },
  { key: 'lokasiObjek', label: 'Lokasi KPKNL' },
  { key: 'rencanaLokasi', label: 'Rencana lokasi lelang' },
  { key: 'jenisKendaraan', label: 'Jenis kendaraan' },
  { key: 'kapasitasCc', label: 'Kapasitas silinder (cc)' },
  { key: 'merek', label: 'Merek' },
  { key: 'tipe', label: 'Tipe' },
  { key: 'nomorPolisi', label: 'Nomor polisi' },
  { key: 'dokumenKepemilikan', label: 'Dokumen kepemilikan' },
  { key: 'pemilikDokumen', label: 'Pemilik dokumen' },
  { key: 'masaBerlaku', label: 'Masa berlaku' },
]
const WAJIB_2: { key: keyof IdentitasPenaksiran; label: string }[] = [
  { key: 'warna', label: 'Warna' },
  { key: 'tahunPembuatan', label: 'Tahun pembuatan' },
  { key: 'bahanBakar', label: 'Bahan bakar' },
  { key: 'penggunaan', label: 'Penggunaan' },
  { key: 'tujuan', label: 'Tujuan penjualan' },
  { key: 'kondisi', label: 'Kondisi kerusakan' },
  { key: 'tahunTaksiran', label: 'Tahun taksiran' },
]

const terisi = (v: unknown): boolean =>
  typeof v === 'number' ? v > 0 : String(v ?? '').trim() !== ''

const LANGKAH_LABEL = ['Identifikasi objek', 'Fisik kendaraan', 'Data hasil lelang', 'Penyesuaian & rata-rata', 'Panitia & tanda tangan'] as const

/** Label wajib (*) inline — tanpa memakan baris sendiri. */
function Field({ label, wajib, ket, opsional, lebar2, anak }: {
  label: string
  wajib?: boolean
  ket?: string
  opsional?: boolean
  lebar2?: boolean
  anak: React.ReactNode
}) {
  return <label className={`penk-field${lebar2 ? ' penk-2' : ''}`}>
    <span className="penk-label">
      {label}
      {wajib && <em className="penk-req" title="Wajib diisi">*</em>}
      {opsional && <em className="penk-opsi">opsional</em>}
    </span>
    {anak}
    {ket && <small>{ket}</small>}
  </label>
}

export function PenaksiranKendaraanPage({ onBack }: { onBack?: () => void }) {
  // Halaman selalu mulai kosong setiap dibuka/di-refresh — tidak ada draf tersimpan.
  const [objek, setObjek] = useState<IdentitasPenaksiran>(objekKosong)
  const [rows, setRows] = useState<BarisLelang[]>([])
  const [pbiOpen, setPbiOpen] = useState(false)
  const [langkah, setLangkah] = useState<number | null>(null)
  const [clearModal, setClearModal] = useState(false)
  const [db, setDb] = useState<{ rows: KandidatLelang[]; sumber: string; count: number; gagal: boolean }>({ rows: [], sumber: '', count: 0, gagal: false })
  const [hasilGen, setHasilGen] = useState<HasilGenerate | null>(null)

  // Basis data lelang lokal: hanya untuk autosuggest & Generate.
  useEffect(() => {
    let cancelled = false
    fetch('/api/local/lelang')
      .then(res => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: { rows?: unknown[]; sumber?: string; count?: number }) => {
        if (cancelled || !Array.isArray(data.rows)) return
        const kandidat: KandidatLelang[] = (data.rows as Record<string, unknown>[]).map(r => ({
          kode: String(r.kode ?? ''),
          kategoriObjek: String(r.kategori_objek ?? ''),
          kpknl: String(r.kpknl ?? ''),
          tahunLelang: Number(r.tahun_lelang) || 0,
          katLokasi: r.kat_lokasi == null ? null : Number(r.kat_lokasi),
          sumberKat: String(r.kat_lokasi_sumber ?? ''),
          merek: String(r.merek ?? ''),
          tipe: String(r.tipe ?? ''),
          tahunPembuatan: Number(r.tahun_pembuatan) || 0,
          warna: String(r.warna ?? ''),
          harga: Number(r.m0) || 0,
        })).filter(k => k.kode && k.kpknl)
        setDb({ rows: kandidat, sumber: String(data.sumber ?? ''), count: kandidat.length, gagal: false })
      })
      .catch(() => { if (!cancelled) setDb(d => ({ ...d, gagal: true })) })
    return () => { cancelled = true }
  }, [])

  // Opsi lokasi cukup nama kota tanpa prefiks "KPKNL" (Pekanbaru, Jambi, …).
  const opsiKpknl = useMemo(() => daftarKpknl(db.rows).map(k => ({ nama: namaLokasi(k.nama), kat: k.kat })), [db.rows])
  const opsiMerek = useMemo(() => daftarMerek(db.rows), [db.rows])
  const opsiTipe = useMemo(() => daftarTipe(db.rows, objek.merek), [db.rows, objek.merek])
  const katKpknl = useMemo(() => kategoriPerKpknl(db.rows), [db.rows])
  const katTerpilih = katKpknl.get(kunciKpknl(objek.lokasiObjek))

  const rowsValid = useMemo(() => rows.filter(r => r.hargaLelang > 0), [rows])

  // Fpm (KMK 375 angka 5.c.2 & Lembar Kedua): bila harga baru objek (NJT) dan
  // harga baru pembanding (NJP) terisi, penyesuaian merek terhitung otomatis.
  const rowsHitung = useMemo(() => rowsValid.map(r => {
    const njt = objek.hargaBaruObjek
    if (!njt || !r.hargaBaru) return r
    return { ...r, penyesuaianMerek: Math.round(((njt - r.hargaBaru) / r.hargaBaru) * 100) }
  }), [rowsValid, objek.hargaBaruObjek])

  const hasil = useMemo(() => hitungPenaksiran(rowsHitung, objek), [rowsHitung, objek])
  const kelas = klasifikasiKendaraan(objek.jenisKendaraan, objek.kapasitasCc)
  const faktorTahun = faktorTahunPembuatan(kelas)
  const faktor = faktorKondisi(objek)

  const kurang1 = WAJIB_1.filter(f => !terisi(objek[f.key]))
  const kurang2 = WAJIB_2.filter(f => !terisi(objek[f.key]))
  const kurangAnggota = objek.anggota.filter(a => !a.trim()).length
  const bisaGenerate = db.rows.length > 0 && terisi(objek.lokasiObjek) && terisi(objek.merek)
    && terisi(objek.tipe) && terisi(objek.tahunPembuatan) && terisi(objek.tahunTaksiran)
  const bisaUnduh = kurang1.length === 0 && kurang2.length === 0 && rowsValid.length >= 3
    && rowsValid.length <= 7 && objek.ketua.trim() !== ''

  const oF = (key: keyof IdentitasPenaksiran) => (v: string) =>
    setObjek(o => ({ ...o, [key]: v }))
  const angkaObjek = (key: 'kapasitasCc' | 'tahunPembuatan' | 'tahunTaksiran' | 'hargaBaruObjek') => (n: number) =>
    setObjek(o => ({ ...o, [key]: n }))
  const rF = (i: number, key: 'merek' | 'kodeLelang' | 'tipe' | 'lokasiLelang') => (v: string) =>
    setRows(cur => cur.map((r, idx) => (idx === i ? { ...r, [key]: v } : r)))
  const angkaBaris = (i: number, key: 'hargaLelang' | 'tahunLelang' | 'tahunPembuatanLelang' | 'penyesuaianTipe' | 'penyesuaianMerek' | 'hargaBaru') => (n: number) =>
    setRows(cur => cur.map((r, idx) => (idx === i ? { ...r, [key]: n } : r)))

  const setAnggota = (i: number, v: string) =>
    setObjek(o => ({ ...o, anggota: o.anggota.map((x, idx) => (idx === i ? v : x)) }))
  const tambahAnggota = () => setObjek(o => ({ ...o, anggota: [...o.anggota, ''] }))
  const hapusAnggota = (i: number) =>
    setObjek(o => ({ ...o, anggota: o.anggota.filter((_, idx) => idx !== i) }))

  const pilihKpknl = (v: string) => {
    const kat = katKpknl.get(kunciKpknl(v))?.kat
    const kategori = kat && kat >= 1 && kat <= 4
      ? (kat as IdentitasPenaksiran['kategoriLokasiObjek'])
      : null
    setObjek(o => ({ ...o, lokasiObjek: v, kategoriLokasiObjek: kategori ?? o.kategoriLokasiObjek }))
  }

  // Tipe adalah turunan merek: ganti merek → tipe direset bila tidak lagi ada
  // dalam daftar tipe merek tersebut (KMK 375: tipe objek dieksplorasi per merek).
  const pilihMerek = (v: string) => {
    setObjek(o => {
      const saran = daftarTipe(db.rows, v)
      const cocok = saran.some(t => normTeks(t) === normTeks(o.tipe))
      const tipe = !v.trim() ? '' : (saran.length > 0 && !cocok ? '' : o.tipe)
      return { ...o, merek: v, tipe }
    })
  }

  const bukaLangkah = (i: number) => {
    setLangkah(langkah === i ? null : i)
    window.setTimeout(() => {
      document.querySelector(`[data-langkah="${i}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 0)
  }

  const generateBarisLelang = () => {
    const hasilTahap = generateBarisPembanding(db.rows, {
      kpknl: objek.lokasiObjek,
      kategoriObjek: kategoriDariJenis(objek.jenisKendaraan),
      merek: objek.merek,
      tipe: objek.tipe,
      tahunPembuatan: objek.tahunPembuatan,
      tahunTaksiran: objek.tahunTaksiran,
    })
    setHasilGen(hasilTahap)
    if (hasilTahap.baris.length) {
      setRows(hasilTahap.baris)
      window.setTimeout(() => {
        document.querySelector('[data-langkah="2"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 60)
    }
  }

  const unduhKertasKerja = () => {
    downloadXlsx({ objek, rowsValid: rowsHitung, hasil }).catch(err => {
      console.error(err)
      window.alert('Kertas kerja gagal dibuat: ' + (err instanceof Error ? err.message : err))
    })
  }

  const selesaiLangkah = (i: number): boolean => {
    switch (i) {
      case 0: return kurang1.length === 0
      case 1: return kurang2.length === 0
      case 2: return rowsValid.length >= 3
      case 3: return rowsValid.length >= 3
      case 4: return objek.ketua.trim() !== ''
      default: return false
    }
  }

  const labelKondisi: Record<IdentitasPenaksiran['kondisi'], string> = {
    rusak90: '0,5 — kerusakan di atas 90%',
    rusak80: '0,6 — kerusakan di atas 80% s.d. 90%',
    rusak70: '0,7 — kerusakan sampai dengan 80%',
  }
  const katObjekSumber = katTerpilih?.sumber || db.sumber

  return <div className="penk-page">
    <header className="penk-header">
      <div className="penk-brand"><Calculator /><div><span>SATKER · KMK 375/2024</span><h1>Panitia Penaksir — Kendaraan Bermotor</h1></div></div>
      <div className="penk-header-aksi">
        <button className="penk-tombol ghost" onClick={() => setPbiOpen(p => !p)}>{pbiOpen ? <X /> : <Database />}Basis Data Lelang</button>
        <button className="penk-tombol ghost" onClick={() => { setObjek({ ...contohObjek }); setRows(contohRows.map(r => ({ ...r }))) }}><FileText />Muat contoh</button>
        {onBack && <button className="penk-tombol ghost" onClick={onBack}><ArrowLeft />Kembali</button>}
      </div>
    </header>

    {pbiOpen && <section className="penk-pbi">
      <div className="penk-pbi-head"><div><strong>Basis Data Harga Lelang Kendaraan Bermotor (DJKN)</strong><span>Baris pembanding digenerate otomatis dari basis data lokal; dasbor ini sebagai rujukan visual.</span></div><a className="penk-tombol ghost" href={BASIS_DATA_LELANG_URL} target="_blank" rel="noopener noreferrer">Buka tab baru <ExternalLink /></a></div>
      {db.count > 0
        ? <p className="penk-hint" style={{ padding: '0 16px' }}>Basis data lokal: <strong>{db.count.toLocaleString('id-ID')}</strong> baris lelang · kategori lokasi dari <strong>{db.sumber || '—'}</strong></p>
        : <p className="penk-hint penk-error" style={{ padding: '0 16px' }}>Basis data lokal belum termuat — fitur Generate hanya tersedia melalui localhost.</p>}
      <iframe src={BASIS_DATA_LELANG_URL} title="Basis Data Harga Lelang Kendaraan Bermotor" allow="fullscreen" />
    </section>}

    <div className="penk-grid">
      <section className="penk-form">
        <div className="penk-steps">
          <div className="penk-steps-row">
            {([0, 1, 2, 3, 4] as const).map(i => (
              <button key={i} type="button"
                className={`penk-step ${langkah === i ? 'aktif' : selesaiLangkah(i) ? 'selesai' : ''}`}
                onClick={() => bukaLangkah(i)}
                aria-label={`Buka ${LANGKAH_LABEL[i]}`}>
                <span className="penk-step-no">{selesaiLangkah(i) ? '✓' : i + 1}</span>
                <span className="penk-step-txt">{LANGKAH_LABEL[i]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Dasar peraturan ── */}
        <details className="penk-blok penk-dasar">
          <summary>
            <span className="penk-blok-no"><Scale size={14} /></span> Dasar peraturan &amp; ketentuan ringkas
            <small className="penk-blok-meta">KMK 375/2024</small>
          </summary>
          <div className="penk-dasar-isi">
            <div className="penk-dasar-unduh">
              <div>
                <strong>Dokumen pedoman lengkap</strong>
                <small>Unduh KMK 375/2024 (PDF) sebagai pegangan panitia penaksir.</small>
              </div>
              <a className="penk-tombol ghost" href={KMK_375_PDF_URL} target="_blank" rel="noopener noreferrer"><Download size={15} />Unduh PDF</a>
            </div>
            <ol className="penk-dasar-lista">
              {DASAR_PERATURAN.map(([peraturan, ketentuan]) => <li key={peraturan}><strong>{peraturan}</strong><span>{ketentuan}</span></li>)}
            </ol>
            <div className="penk-dasar-ketentuan">
              <strong>Ketentuan ringkas penentuan nilai taksiran</strong>
              {KETENTUAN_RINGKAS.map((k, i) => <p key={i}>{k}</p>)}
            </div>
          </div>
        </details>

        {/* ── 1. Identifikasi ── */}
        <details open={langkah === null ? true : langkah === 0} className="penk-blok" data-langkah={0}>
          <summary onClick={(e) => { e.preventDefault(); bukaLangkah(0) }}>
            <span className="penk-blok-no">1</span> Identifikasi objek
            <small className="penk-blok-meta">{WAJIB_1.length - kurang1.length}/{WAJIB_1.length} wajib terisi</small>
          </summary>
          <div className="penk-fields">
            <Field label="Nomor kertas kerja" wajib anak={<input value={objek.nomorKertasKerja} onChange={e => oF('nomorKertasKerja')(e.target.value)} placeholder="WP4............." />} />
            <Field label="Nama objek" wajib lebar2 anak={<input value={objek.namaObjek} onChange={e => oF('namaObjek')(e.target.value)} placeholder="Toyota New Corolla Altis 1.800 cc" />} />
            <Field label="Jenis kendaraan" wajib anak={
              <select value={objek.jenisKendaraan} onChange={e => oF('jenisKendaraan')(e.target.value)}>
                <option value="roda2">Roda 2 atau 3</option>
                <option value="roda4">Roda 4 atau lebih</option>
              </select>} />
            <Field label="Kode barang" wajib anak={<InputAngka nilai={Number(objek.kodeBarang) || 0} ubah={n => setObjek(o => ({ ...o, kodeBarang: n ? String(n) : '' }))} pemisah={false} maksDigit={10} placeholder="303013" labelAria="Kode barang" />} />
            <Field label="NUP" wajib anak={<input value={objek.nup} onChange={e => oF('nup')(e.target.value)} placeholder="00001234" />} />
            <Field label="Lokasi KPKNL" wajib ket={katTerpilih ? `Kategori lokasi otomatis ${katTerpilih.kat} — PKPN DJKN ${katObjekSumber}` : 'Menentukan kategori lokasi otomatis & lingkup pencarian pembanding'}
              anak={<input value={objek.lokasiObjek} onChange={e => pilihKpknl(e.target.value)} placeholder="Pekanbaru" list="dl-kpknl" />} />
            <Field label="Rencana lokasi lelang" wajib anak={<input value={objek.rencanaLokasi} onChange={e => oF('rencanaLokasi')(e.target.value)} placeholder="Pekanbaru, Riau" />} />
            <Field label="Kategori lokasi objek" ket="Terisi otomatis dari PKPN DJKN (1 tertinggi · 4 terendah) — tidak dapat diubah"
              anak={<div className="penk-kat-baca"><Lock size={13} /><b>{objek.kategoriLokasiObjek}</b><span>PKPN DJKN {katObjekSumber || 'menunggu lokasi'}</span></div>} />
            <datalist id="dl-kpknl">
              {opsiKpknl.map(k => <option key={k.nama} value={k.nama}>{k.kat ? `Kategori ${k.kat}` : ''}</option>)}
            </datalist>
            <Field label="Kapasitas silinder" wajib ket="menentukan kelas: low / middle / high"
              anak={<InputAngka nilai={objek.kapasitasCc} ubah={angkaObjek('kapasitasCc')} maksDigit={5} placeholder="1.800" labelAria="Kapasitas silinder cc" />} />
            <Field label="Merek" wajib anak={<input value={objek.merek} onChange={e => pilihMerek(e.target.value)} list="dl-merek-db" placeholder="Toyota" />} />
            <Field label="Tipe" wajib ket={objek.merek.trim() ? undefined : 'Tipe adalah turunan merek — pilih/ketik merek terlebih dahulu'}
              anak={<input value={objek.tipe} onChange={e => oF('tipe')(e.target.value)} list="dl-tipe-db" placeholder="Innova G" disabled={!objek.merek.trim()} />} />
            <datalist id="dl-merek-db">{opsiMerek.map(m => <option key={m} value={m} />)}</datalist>
            <datalist id="dl-tipe-db">{opsiTipe.map(t => <option key={t} value={t} />)}</datalist>
            <Field label="Nomor polisi" wajib anak={<input value={objek.nomorPolisi} onChange={e => oF('nomorPolisi')(e.target.value)} placeholder="BM 1234 AB" />} />
            <Field label="Dokumen kepemilikan" wajib anak={
              <select value={objek.dokumenKepemilikan} onChange={e => oF('dokumenKepemilikan')(e.target.value)}>
                <option value="BPKB">BPKB</option>
                <option value="STNK">STNK</option>
                <option value="Lainnya">Lainnya</option>
                <option value="TidakAda">Tidak ada (faktor 0,5)</option>
              </select>} />
            <Field label="Pemilik dokumen" wajib anak={<input value={objek.pemilikDokumen} onChange={e => oF('pemilikDokumen')(e.target.value)} />} />
            <Field label="Masa berlaku" wajib anak={
              <select value={objek.masaBerlaku} onChange={e => oF('masaBerlaku')(e.target.value)}>
                <option>Masih Berlaku</option>
                <option>Habis Masa Berlaku</option>
              </select>} />
            <Field label="Keterangan lain" opsional lebar2 anak={<input value={objek.keteranganLain} onChange={e => oF('keteranganLain')(e.target.value)} />} />
          </div>
          {kurang1.length > 0 && <p className="penk-hint penk-error">Belum lengkap: {kurang1.map(f => f.label).join(', ')}.</p>}
          <p className="penk-hint">Kelas objek: <strong>{kelas === 'low' ? 'low-end' : kelas === 'middle' ? 'middle' : 'high-end'}</strong> — penyesuaian tahun pembuatan <strong>{faktorTahun}%/tahun</strong> (KMK 375 angka C.2.b).</p>
        </details>

        {/* ── 2. Fisik kendaraan ── */}
        <details open={langkah === null ? true : langkah === 1} className="penk-blok" data-langkah={1}>
          <summary onClick={(e) => { e.preventDefault(); bukaLangkah(1) }}>
            <span className="penk-blok-no">2</span> Fisik kendaraan
            <small className="penk-blok-meta">{WAJIB_2.length - kurang2.length}/{WAJIB_2.length} wajib terisi</small>
          </summary>
          <div className="penk-fields">
            <Field label="Warna" wajib anak={<input value={objek.warna} onChange={e => oF('warna')(e.target.value)} placeholder="Hitam" />} />
            <Field label="Tahun pembuatan" wajib anak={<InputAngka nilai={objek.tahunPembuatan} ubah={angkaObjek('tahunPembuatan')} pemisah={false} maksDigit={4} placeholder="2011" labelAria="Tahun pembuatan" />} />
            <Field label="Bahan bakar" wajib anak={<input value={objek.bahanBakar} onChange={e => oF('bahanBakar')(e.target.value)} />} />
            <Field label="Penggunaan" wajib anak={<input value={objek.penggunaan} onChange={e => oF('penggunaan')(e.target.value)} />} />
            <Field label="Tujuan penjualan" wajib anak={
              <select value={objek.tujuan} onChange={e => oF('tujuan')(e.target.value)}>
                <option value="lelang">Penjualan secara lelang (faktor 0,5 / 0,6 / 0,7)</option>
                <option value="harga-jual">Harga jual tanpa lelang (faktor 0,8 / 0,9 / 1,0)</option>
              </select>} />
            <Field label="Kondisi kerusakan" wajib anak={
              <select value={objek.kondisi} onChange={e => oF('kondisi')(e.target.value)}>
                {(Object.keys(labelKondisi) as (keyof typeof labelKondisi)[]).map(k => <option key={k} value={k}>{labelKondisi[k]}</option>)}
              </select>} />
            <Field label="Tahun taksiran" wajib ket="umumnya tahun berjalan"
              anak={<InputAngka nilai={objek.tahunTaksiran} ubah={angkaObjek('tahunTaksiran')} pemisah={false} maksDigit={4} labelAria="Tahun taksiran" />} />
          </div>
          {kurang2.length > 0 && <p className="penk-hint penk-error">Belum lengkap: {kurang2.map(f => f.label).join(', ')}.</p>}
          <p className="penk-hint">Faktor kondisi: <strong>× {faktor.toLocaleString('id-ID')}</strong>{objek.dokumenKepemilikan === 'TidakAda' && ' — wajib 0,5 karena tanpa dokumen kepemilikan (KMK 375 angka C.2.h)'}.</p>
        </details>

        {/* ── 3. Data lelang ── */}
        <details open={langkah === null ? true : langkah === 2} className="penk-blok" data-langkah={2}>
          <summary onClick={(e) => { e.preventDefault(); bukaLangkah(2) }}>
            <span className="penk-blok-no">3</span> Data hasil lelang DJKN
            <small className="penk-blok-meta">{rowsValid.length}/3–7 baris</small>
          </summary>
          <div className="penk-gen">
            <div className="penk-gen-teks">
              <strong>Generate baris pembanding otomatis</strong>
              <small>Mengikuti Tahap 1–10 KMK 375 angka 4: diutamakan <b>merek, tipe, dan tahun pembuatan yang sama</b> di wilayah kerja KPKNL yang sama, diperluas wilayah/tipe bertahap bila kurang dari 3 data.</small>
            </div>
            <button type="button" className="penk-tombol primary" onClick={generateBarisLelang} disabled={!bisaGenerate}>
              <Sparkles size={15} />Generate
            </button>
          </div>
          {!db.rows.length && <p className="penk-hint penk-error">{db.gagal ? 'Basis data lelang lokal tidak tersedia (bukan localhost / belum di-seed).' : 'Memuat basis data lelang lokal…'}</p>}
          {db.rows.length > 0 && !bisaGenerate && <p className="penk-hint">Lengkapi Lokasi KPKNL, merek, tipe, tahun pembuatan, dan tahun taksiran pada Bagian 1–2 terlebih dahulu.</p>}
          {hasilGen && hasilGen.baris.length > 0 && <div className="penk-gen-hasil">
            <strong>{hasilGen.baris.length} baris ditemukan:</strong>
            {hasilGen.ringkasanTahap.map(t => <span key={t.tahap} className="penk-chip">Tahap {t.tahap} · {t.jumlah} data</span>)}
          </div>}
          {hasilGen?.catatan.map((c, i) => <p key={i} className="penk-hint penk-error">{c}</p>)}
          <TabelLelang rows={rows} objek={objek} onTeks={rF} onAngka={angkaBaris} onHapus={i => setRows(cur => cur.filter((_, idx) => idx !== i))} />
          <div className="penk-aksi-baris">
            <button type="button" className="penk-tombol ghost" disabled={rows.length >= 7} onClick={() => setRows(cur => [...cur, barisKosong()])}><Plus size={15} />Tambah baris pembanding</button>
            <span className="penk-hint">Minimal 3, maksimal 7 data (KMK 375 angka 3) · baris tanpa harga tidak ikut dihitung.</span>
          </div>
        </details>

        {/* ── 4. Penyesuaian ── */}
        <details open={langkah === null ? true : langkah === 3} className="penk-blok" data-langkah={3}>
          <summary onClick={(e) => { e.preventDefault(); bukaLangkah(3) }}>
            <span className="penk-blok-no">4</span> Penyesuaian pembanding
            <small className="penk-blok-meta">waktu · lokasi · tahun otomatis</small>
          </summary>
          <div className="penk-fpm">
            <Field label="Harga baru / harga jual saat ini OBJEK (NJT)" opsional lebar2
              ket="Digunakan untuk penyesuaian merek Fpm = (NJT − NJP) ÷ NJP (Lembar Kedua KMK 375) bila ada pembanding dengan merek berbeda."
              anak={<InputAngka nilai={objek.hargaBaruObjek ?? 0} ubah={angkaObjek('hargaBaruObjek')} placeholder="250.000.000" labelAria="Harga baru objek NJT" />} />
          </div>
          <TabelPenyesuaian rows={rows} hasil={hasil} objek={objek} onAngka={angkaBaris} />
          <dl className="penk-jumlah">
            <div><dt>Jumlah nilai taksiran</dt><dd>{formatRp(hasil.jumlahNilaiTaksiran)}</dd></div>
            <div><dt>Rata-rata nilai taksiran</dt><dd>{formatRp(hasil.rataRata)}</dd></div>
            <div><dt>Taksiran nilai {objek.tujuan === 'lelang' ? 'limit lelang' : 'harga jual'} × {faktor.toLocaleString('id-ID')}</dt><dd>{formatRp(hasil.limitLelang)}</dd></div>
            <div className="penk-jumlah-akhir"><dt>Pembulatan (ribuan)</dt><dd>{formatRp(hasil.pembulatan)}</dd></div>
          </dl>
        </details>

        {/* ── 5. Panitia ── */}
        <details open={langkah === null ? true : langkah === 4} className="penk-blok" data-langkah={4}>
          <summary onClick={(e) => { e.preventDefault(); bukaLangkah(4) }}>
            <span className="penk-blok-no">5</span> Panitia Penaksir &amp; penandatanganan
          </summary>
          <div className="penk-fields">
            <Field label="Kota" anak={<input value={objek.kota} onChange={e => oF('kota')(e.target.value)} />} />
            <Field label="Tanggal penentuan nilai taksiran" anak={<input type="date" value={objek.tanggal} onChange={e => oF('tanggal')(e.target.value)} />} />
            <Field label="Ketua (merangkap anggota)" wajib lebar2 anak={<input value={objek.ketua} onChange={e => oF('ketua')(e.target.value)} placeholder="Nama ketua" />} />
            {objek.anggota.map((a, i) => <Field key={i} label={`Anggota ${i + 1}`}
              anak={<span className="penk-baris-anggota">
                <input value={a} onChange={e => setAnggota(i, e.target.value)} />
                <button type="button" className="penk-hapus" title={`Hapus anggota ${i + 1}`} aria-label={`Hapus anggota ${i + 1}`} onClick={() => hapusAnggota(i)}><Trash2 size={14} /></button>
              </span>} />)}
            <div className="penk-anggota-tambah">
              <button type="button" className="penk-tombol ghost" disabled={objek.anggota.length >= 5} onClick={tambahAnggota}><Plus size={15} />Tambah anggota</button>
            </div>
          </div>
          {kurangAnggota > 0 && <p className="penk-hint penk-error">{kurangAnggota} baris anggota masih kosong — isi atau hapus.</p>}
          <p className="penk-hint">Nilai taksiran berlaku <strong>6 bulan</strong> sejak tanggal ditandatangani (KMK 375 DIKTUM KETUJUH). Tanda tangan diisi manual setelah kertas kerja dicetak.</p>
        </details>
      </section>

      {/* ── Ringkasan & tombol ── */}
      <aside className="penk-side">
        <div className="penk-ringkas">
          <h2>Kesimpulan penilaian</h2>
          <dl>
            <div><dt>Data pembanding</dt><dd>{rowsValid.length} baris</dd></div>
            <div><dt>Jumlah nilai taksiran</dt><dd>{formatRp(hasil.jumlahNilaiTaksiran)}</dd></div>
            <div><dt>Rata-rata nilai taksiran</dt><dd>{formatRp(hasil.rataRata)}</dd></div>
            <div><dt>Faktor kondisi</dt><dd>× {faktor.toLocaleString('id-ID')}</dd></div>
            <div><dt>{objek.tujuan === 'lelang' ? 'Taksiran nilai limit lelang' : 'Usulan harga jual'}</dt><dd>{formatRp(hasil.limitLelang)}</dd></div>
            <div className="penk-akhir"><dt>Pembulatan (ribuan)</dt><dd>{formatRp(hasil.pembulatan)}</dd></div>
          </dl>
          <p className="penk-catatan">Kertas kerja diunduh sebagai file .xlsx sesuai format Lampiran KMK 375/2024 (termasuk Lembar Kedua penyesuaian merek bila ada pembanding merek berbeda).</p>
          <p className={`penk-hint ${!bisaUnduh ? 'penk-error' : ''}`}>{bisaUnduh
            ? 'Seluruh rangkaian data penaksiran siap diunduh.'
            : 'Lengkapi Bagian 1–2 (tanda *), 3–7 data lelang, dan nama ketua.'}</p>
          <div className="penk-panel-aksi">
            <button className="penk-tombol primary penk-unduh" onClick={() => { if (!bisaUnduh) return; unduhKertasKerja() }} disabled={!bisaUnduh}><FileSpreadsheet size={16} />Unduh Kertas Kerja (.xlsx)</button>
            <button className="penk-tombol ghost" onClick={() => setClearModal(true)}><RotateCcw size={15} />Kosongkan isian</button>
          </div>
        </div>
        <div className="penk-manual">
          <h3>Isi kertas kerja secara manual</h3>
          <p>Penaksiran dilakukan di luar aplikasi? Gunakan spreadsheet kertas kerja resmi berikut — data pembanding dapat disalin dari Basis Data Lelang DJKN.</p>
          <div className="penk-manual-aksi">
            <a className="penk-tombol ghost" href="https://docs.google.com/spreadsheets/d/1nOfvBuC1ipf6NCGf2JPvyfmNx6Fs5RmY/edit?usp=sharing&ouid=114001219248527397686&rtpof=true&sd=true" target="_blank" rel="noopener noreferrer"><FileSpreadsheet size={15} />Kertas Kerja (Google Sheets)</a>
            <a className="penk-tombol ghost" href={BASIS_DATA_LELANG_URL} target="_blank" rel="noopener noreferrer"><Database size={15} />Basis Data Lelang DJKN</a>
          </div>
        </div>
      </aside>
    </div>

    {clearModal && (
      <div className="penk-modal-overlay" onClick={() => setClearModal(false)}>
        <div className="penk-modal" onClick={e => e.stopPropagation()}>
          <div className="penk-modal-head"><h3>Kosongkan seluruh isian?</h3><button className="penk-tombol ghost" onClick={() => setClearModal(false)}><X size={16} /></button></div>
          <p className="penk-modal-body">Semua data yang sudah diisi akan dihapus. Ini tidak dapat dibatalkan.</p>
          <div className="penk-modal-actions"><button className="penk-tombol ghost" onClick={() => setClearModal(false)}>Batal</button><button className="penk-tombol primary" onClick={() => { setObjek(objekKosong); setRows([]); setHasilGen(null); setClearModal(false) }}>Hapus</button></div>
        </div>
      </div>
    )}
  </div>
}

/** Tabel Bagian 3 — data hasil lelang dengan badge tahapan + keterangan pintar per baris. */
function TabelLelang({ rows, objek, onTeks, onAngka, onHapus }: {
  rows: BarisLelang[]
  objek: IdentitasPenaksiran
  onTeks: (i: number, key: 'merek' | 'kodeLelang' | 'tipe' | 'lokasiLelang') => (v: string) => void
  onAngka: (i: number, key: 'hargaLelang' | 'tahunLelang' | 'tahunPembuatanLelang') => (n: number) => void
  onHapus: (i: number) => void
}) {
  if (rows.length === 0) {
    return <div className="penk-kosong">
      <Sparkles size={18} />
      <p><strong>Belum ada data pembanding.</strong></p>
      <p>Lengkapi Bagian 1–2 lalu klik <strong>Generate</strong>, atau tambahkan baris secara manual.</p>
    </div>
  }
  return <div className="penk-tabel-bungkus">
    <table className="penk-tabel">
      <thead><tr>
        <th>No</th><th>Merek</th><th>Kode Lelang</th><th>Tipe</th><th>Harga Lelang (Rp)</th>
        <th>Th Lelang</th><th>Lokasi</th><th>Kat.</th><th>Th Pembuatan</th><th>Tahap</th><th></th>
      </tr></thead>
      <tbody>{rows.map((r, i) => {
        const ket = keteranganPembanding(r, objek)
        return <tr key={i}>
          <td className="penk-no">{i + 1}</td>
          <td><input value={r.merek} onChange={e => onTeks(i, 'merek')(e.target.value)} /></td>
          <td><input value={r.kodeLelang} onChange={e => onTeks(i, 'kodeLelang')(e.target.value)} /></td>
          <td><input value={r.tipe} onChange={e => onTeks(i, 'tipe')(e.target.value)} /><small className="penk-ket-baris" title={ket}>{ket}</small></td>
          <td><InputAngka nilai={r.hargaLelang} ubah={onAngka(i, 'hargaLelang')} placeholder="0" labelAria={`Harga lelang baris ${i + 1}`} /></td>
          <td><InputAngka nilai={r.tahunLelang} ubah={onAngka(i, 'tahunLelang')} pemisah={false} maksDigit={4} labelAria={`Tahun lelang baris ${i + 1}`} /></td>
          <td><input value={r.lokasiLelang} onChange={e => onTeks(i, 'lokasiLelang')(e.target.value)} /></td>
          <td><span className={`penk-badge kat${r.kategoriLokasiLelang}`}>{r.kategoriLokasiLelang}</span></td>
          <td><InputAngka nilai={r.tahunPembuatanLelang} ubah={onAngka(i, 'tahunPembuatanLelang')} pemisah={false} maksDigit={4} labelAria={`Tahun pembuatan pembanding baris ${i + 1}`} /></td>
          <td>{r.tahap ? <span className="penk-chip tahap" title={ket}>T{r.tahap}</span> : <span className="penk-tanda">—</span>}</td>
          <td><button type="button" className="penk-hapus" title="Hapus baris" aria-label={`Hapus baris ${i + 1}`} onClick={() => onHapus(i)}><Trash2 size={15} /></button></td>
        </tr>
      })}</tbody>
    </table>
  </div>
}

/** Tabel Bagian 4 — selalu sejajar dengan Bagian 3; baris tanpa harga ditandai. */
function TabelPenyesuaian({ rows, hasil, objek, onAngka }: {
  rows: BarisLelang[]
  hasil: ReturnType<typeof hitungPenaksiran>
  objek: IdentitasPenaksiran
  onAngka: (i: number, key: 'penyesuaianTipe' | 'penyesuaianMerek' | 'hargaBaru') => (n: number) => void
}) {
  if (rows.length === 0) {
    return <div className="penk-kosong"><p>Belum ada data pembanding — penyesuaian muncul setelah Bagian 3 terisi.</p></div>
  }
  let idxValid = -1
  return <div className="penk-tabel-bungkus">
    <table className="penk-tabel penk-tabel-sesuai">
      <thead><tr>
        <th>No</th><th>Data Hasil Lelang</th><th>Tipe %</th><th>Harga Baru NJP (Rp)</th><th>Merek %</th>
        <th>Waktu</th><th>Lokasi</th><th>Tahun</th><th>Total</th><th>Nilai Taksiran</th>
      </tr></thead>
      <tbody>{rows.map((r, i) => {
        const sah = r.hargaLelang > 0
        if (sah) idxValid++
        const h = sah ? hasil.baris[idxValid] : undefined
        const fpmOtomatis = !!(objek.hargaBaruObjek && r.hargaBaru)
        const kelasPositif = h && h.total > 0 ? 'penk-positif' : h && h.total < 0 ? 'penk-negatif' : undefined
        return <tr key={i} className={sah ? undefined : 'penk-baris-skip'}>
          <td className="penk-no">{i + 1}</td>
          <td className="penk-sel-data"><strong>{r.merek || '—'}</strong><small>{r.tipe}</small></td>
          <td><InputAngka nilai={r.penyesuaianTipe} ubah={onAngka(i, 'penyesuaianTipe')} pemisah={false} negatif maksDigit={3} placeholder="0" labelAria={`Penyesuaian tipe baris ${i + 1}`} /></td>
          <td><InputAngka nilai={r.hargaBaru ?? 0} ubah={onAngka(i, 'hargaBaru')} placeholder="opsional" labelAria={`Harga baru pembanding baris ${i + 1}`} /></td>
          <td>{fpmOtomatis
            ? <span className="penk-otomatis" title="Terhitung otomatis dari Fpm = (NJT − NJP) ÷ NJP">{r.penyesuaianMerek}%</span>
            : <InputAngka nilai={r.penyesuaianMerek} ubah={onAngka(i, 'penyesuaianMerek')} pemisah={false} negatif maksDigit={3} placeholder="0" labelAria={`Penyesuaian merek baris ${i + 1}`} />}</td>
          <td className={h?.penyesuaianWaktu ? 'penk-positif' : undefined}>{h ? h.penyesuaianWaktu + '%' : '—'}</td>
          <td className={h?.penyesuaianLokasi ? 'penk-positif' : undefined}>{h ? h.penyesuaianLokasi + '%' : '—'}</td>
          <td className={h?.penyesuaianTahun ? 'penk-positif' : undefined}>{h ? h.penyesuaianTahun + '%' : '—'}</td>
          <td className={`penk-total ${kelasPositif ?? ''}`}><b>{h ? h.total + '%' : '—'}</b></td>
          <td className="penk-rupiah">{h ? formatRp(h.nilaiTaksiran) : '—'}</td>
        </tr>
      })}</tbody>
    </table>
  </div>
}
