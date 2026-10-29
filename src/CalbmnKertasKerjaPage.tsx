import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, CircleAlert, FileText, Printer, RotateCcw } from 'lucide-react'
import { KELOMPOK_CALBMN, barisKosongCalbmn, validasiMatriks } from './calbmnValidasi'
import type { ItemSewa } from './PemanfaatanFields'

// ============================================================
// KERTAS KERJA CALBMN — HALAMAN PUBLIK (fitur umum)
// Alat bantu penyusunan CalBMN yang terbuka tanpa login: pengguna
// mengisi saldo awal/tambah/kurang per kelompok, halaman memeriksa
// rumus awal+tambah−kurang=akhir secara langsung, lalu menyusun
// draf narasi per kelompok dengan terbilang.
// Tidak ada pengajuan/verifikasi Korwil — draf diekspor (salin/cetak)
// dan disimpan hanya di browser pengguna (localStorage).
// ============================================================

const STORAGE_KEY = 'sipadu_calbmn_kertas_kerja_v1'

type BarisKertas = ItemSewa

type KertasKerja = {
  satkerNama: string
  periode: string
  tanggalPosisi: string
  baris: BarisKertas[]
}

const kertasKosong = (): KertasKerja => ({
  satkerNama: '',
  periode: 'Semester I Tahun 2027',
  tanggalPosisi: '',
  baris: barisKosongCalbmn(),
})

function muat(): KertasKerja {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return kertasKosong()
    const parsed = JSON.parse(raw) as KertasKerja
    if (!Array.isArray(parsed.baris) || !parsed.baris.length) return kertasKosong()
    // Baris kelompok terkunci: selaraskan dengan daftar resmi saat memuat.
    const baris = KELOMPOK_CALBMN.map((nama, i) => ({ ...parsed.baris[i], nama }))
    return { ...kertasKosong(), ...parsed, baris }
  } catch {
    return kertasKosong()
  }
}

const angka = (raw: string | undefined): number => {
  const digits = (raw ?? '').replace(/\D/g, '')
  return digits ? Number(digits) : 0
}

// Terbilang rupiah (Indonesia) — cukup hingga triliun untuk kebutuhan CalBMN.
export function terbilang(n: number): string {
  if (n === 0) return 'Nol rupiah'
  if (n >= 1_000_000_000_000_000) return 'Angka di luar jangkauan terbilang'
  const satuan = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas']
  const keTeks = (x: number): string => {
    if (x < 12) return satuan[x]
    if (x < 20) return keTeks(x - 10) + ' belas'
    if (x < 100) return keTeks(Math.floor(x / 10)) + ' puluh ' + keTeks(x % 10)
    if (x < 200) return 'seratus ' + keTeks(x - 100)
    if (x < 1000) return keTeks(Math.floor(x / 100)) + ' ratus ' + keTeks(x % 100)
    if (x < 2000) return 'seribu ' + keTeks(x - 1000)
    if (x < 1_000_000) return keTeks(Math.floor(x / 1000)) + ' ribu ' + keTeks(x % 1000)
    if (x < 1_000_000_000) return keTeks(Math.floor(x / 1_000_000)) + ' juta ' + keTeks(x % 1_000_000)
    if (x < 1_000_000_000_000) return keTeks(Math.floor(x / 1_000_000_000)) + ' miliar ' + keTeks(x % 1_000_000_000)
    return keTeks(Math.floor(x / 1_000_000_000_000)) + ' triliun ' + keTeks(x % 1_000_000_000_000)
  }
  const teks = keTeks(n).replace(/\s+/g, ' ').trim()
  return teks.charAt(0).toUpperCase() + teks.slice(1) + ' rupiah'
}

const fmtRupiah = (n: number): string => 'Rp ' + n.toLocaleString('id-ID') + ',-'

export function CalbmnKertasKerjaPage({ onBack }: { onBack?: () => void }) {
  const [kertas, setKertas] = useState<KertasKerja>(muat)
  const [resetModal, setResetModal] = useState(false)

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(kertas)) } catch { /* penuh: abaikan */ }
  }, [kertas])

  const ubahBaris = (index: number, kolom: 'saldoAwal' | 'mutasiTambah' | 'mutasiKurang' | 'saldoAkhir', raw: string) => {
    setKertas(k => ({
      ...k,
      baris: k.baris.map((b, i) => (i === index ? { ...b, [kolom]: raw.replace(/\D/g, '') } : b)),
    }))
  }

  const hasil = useMemo(() => validasiMatriks(kertas.baris), [kertas.baris])
  const total = useMemo(() => kertas.baris.reduce((acc, b) => ({
    awal: acc.awal + angka(b.saldoAwal),
    tambah: acc.tambah + angka(b.mutasiTambah),
    kurang: acc.kurang + angka(b.mutasiKurang),
    akhir: acc.akhir + angka(b.saldoAkhir),
  }), { awal: 0, tambah: 0, kurang: 0, akhir: 0 }), [kertas.baris])

  const narasiKelompok = (b: BarisKertas): string => {
    const awal = angka(b.saldoAwal), tambah = angka(b.mutasiTambah), kurang = angka(b.mutasiKurang), akhir = angka(b.saldoAkhir)
    const tgl = kertas.tanggalPosisi || '…'
    return `Saldo per ${tgl} sebesar ${fmtRupiah(akhir)} (${terbilang(akhir)}). Jumlah tersebut terdiri atas saldo awal dengan nilai sebesar ${fmtRupiah(awal)} (${terbilang(awal)}), mutasi tambah dengan nilai sebesar ${fmtRupiah(tambah)} (${terbilang(tambah)}), dan mutasi kurang dengan nilai sebesar ${fmtRupiah(kurang)} (${terbilang(kurang)}).`
  }

  const teksSalin = (): string => {
    const judul = `KERTAS KERJA CALBMN — ${kertas.satkerNama || '…'} — ${kertas.periode}`
    const kepala = `Tanggal posisi: ${kertas.tanggalPosisi || '…'}`
    const tabel = kertas.baris.map((b, i) => {
      const s = validasiMatriks([b]).baris[0]
      const tanda = s.selisih === 0 ? 'OK' : `SELISIH ${s.selisih.toLocaleString('id-ID')}`
      return `${i + 1}. ${b.nama}: awal ${angka(b.saldoAwal).toLocaleString('id-ID')} · tambah ${angka(b.mutasiTambah).toLocaleString('id-ID')} · kurang ${angka(b.mutasiKurang).toLocaleString('id-ID')} · akhir ${angka(b.saldoAkhir).toLocaleString('id-ID')} [${tanda}]`
    }).join('\n')
    const rekap = `TOTAL: awal ${total.awal.toLocaleString('id-ID')} · tambah ${total.tambah.toLocaleString('id-ID')} · kurang ${total.kurang.toLocaleString('id-ID')} · akhir ${total.akhir.toLocaleString('id-ID')}`
    const narasi = kertas.baris.map((b, i) => `${i + 1}) ${b.nama}; ${narasiKelompok(b)}`).join('\n\n')
    return [judul, kepala, '', tabel, '', rekap, '', 'NARASI PER KELOMPOK', narasi].join('\n')
  }

  const [tersalin, setTersalin] = useState(false)
  const salin = async () => {
    try {
      await navigator.clipboard.writeText(teksSalin())
      setTersalin(true)
      setTimeout(() => setTersalin(false), 2000)
    } catch { /* clipboard ditolak browser */ }
  }

  return (
    <div className="calbmn-page">
      <header className="calbmn-head">
        {onBack && <button className="penk-tombol ghost" onClick={onBack}><ArrowLeft size={15} />Kembali</button>}
        <div>
          <h1>Kertas Kerja CalBMN</h1>
          <p>Alat bantu penyusunan Catatan atas Laporan BMN — terbuka untuk umum, tanpa login. Isi angka kunci per kelompok dari Laporan Barang SAKTI; halaman memeriksa rumus rekonsiliasi dan menyusun draf narasi dengan terbilang. Data tersimpan hanya di browser Anda.</p>
        </div>
        <div className="calbmn-head-actions">
          <button className="penk-tombol ghost" onClick={salin}>{tersalin ? <Check size={15} /> : <FileText size={15} />}{tersalin ? 'Tersalin' : 'Salin draf'}</button>
          <button className="penk-tombol ghost" onClick={() => window.print()}><Printer size={15} />Cetak</button>
          <button className="penk-tombol ghost" onClick={() => setResetModal(true)}><RotateCcw size={15} />Kosongkan</button>
        </div>
      </header>

      <section className="calbmn-identitas">
        <label><span>Nama Satker / Entitas</span><input value={kertas.satkerNama} onChange={e => setKertas(k => ({ ...k, satkerNama: e.target.value }))} placeholder="Contoh: Lapas Kelas IIA Pekanbaru" /></label>
        <label><span>Periode</span><input value={kertas.periode} onChange={e => setKertas(k => ({ ...k, periode: e.target.value }))} placeholder="Semester I Tahun 2027" /></label>
        <label><span>Tanggal posisi</span><input type="date" value={kertas.tanggalPosisi} onChange={e => setKertas(k => ({ ...k, tanggalPosisi: e.target.value }))} /></label>
      </section>

      <section className="calbmn-matriks">
        <table>
          <thead>
            <tr>
              <th>Kelompok</th>
              <th className="num">Saldo awal (Rp)</th>
              <th className="num">Mutasi tambah (Rp)</th>
              <th className="num">Mutasi kurang (Rp)</th>
              <th className="num">Saldo akhir (Rp)</th>
              <th className="num">Status</th>
            </tr>
          </thead>
          <tbody>
            {kertas.baris.map((b, i) => {
              const selisih = validasiMatriks([b]).baris[0]
              const diisi = angka(b.saldoAwal) || angka(b.mutasiTambah) || angka(b.mutasiKurang) || angka(b.saldoAkhir)
              return (
                <tr key={b.nama} className={diisi ? (selisih.selisih === 0 ? 'ok' : 'beda') : undefined}>
                  <td>{b.nama}</td>
                  {(['saldoAwal', 'mutasiTambah', 'mutasiKurang', 'saldoAkhir'] as const).map(kolom => (
                    <td key={kolom} className="num">
                      <input
                        inputMode="numeric"
                        value={b[kolom] ? Number(b[kolom]).toLocaleString('id-ID') : ''}
                        onChange={e => ubahBaris(i, kolom, e.target.value)}
                        placeholder="0"
                      />
                    </td>
                  ))}
                  <td className="num status-cell">
                    {!diisi ? <span className="calbmn-st kosong">Kosong</span>
                      : selisih.selisih === 0 ? <span className="calbmn-st ok"><Check size={13} /> Seimbang</span>
                      : <span className="calbmn-st beda"><CircleAlert size={13} /> Selisih {selisih.selisih.toLocaleString('id-ID')}</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>TOTAL</td>
              <td className="num">{total.awal.toLocaleString('id-ID')}</td>
              <td className="num">{total.tambah.toLocaleString('id-ID')}</td>
              <td className="num">{total.kurang.toLocaleString('id-ID')}</td>
              <td className="num">{total.akhir.toLocaleString('id-ID')}</td>
              <td className="num">{hasil.kosong ? '—' : hasil.seimbang ? 'Seimbang' : 'Periksa'}</td>
            </tr>
          </tfoot>
        </table>
        {!hasil.kosong && !hasil.seimbang && (
          <div className="missing-box"><CircleAlert size={16} /><div><strong>Matriks belum seimbang</strong><ul>{hasil.baris.filter(x => x.diisi && x.selisih !== 0).map(x => <li key={x.nama}>{x.nama}: selisih {x.selisih.toLocaleString('id-ID')}</li>)}</ul></div></div>
        )}
        {!hasil.kosong && hasil.seimbang && <p className="penk-hint penk-ok">Seluruh kelompok yang diisi seimbang: saldo awal + tambah − kurang = saldo akhir.</p>}
      </section>

      <section className="calbmn-narasi">
        <h2>Draf narasi per kelompok</h2>
        <p className="penk-hint">Narasi mengikuti pola CalBMN Kanwil Ditjenpas Riau. Periksa setiap angka terhadap cetakan SAKTI sebelum dipakai.</p>
        {kertas.baris.map((b, i) => {
          const diisi = angka(b.saldoAwal) || angka(b.mutasiTambah) || angka(b.mutasiKurang) || angka(b.saldoAkhir)
          if (!diisi) return null
          return <p key={b.nama} className="calbmn-narasi-item"><strong>{i + 1}) {b.nama};</strong> {narasiKelompok(b)}</p>
        })}
        {!hasil.kosong && <p className="calbmn-narasi-total"><strong>Total keseluruhan saldo akhir {fmtRupiah(total.akhir)} ({terbilang(total.akhir)}).</strong></p>}
        {!hasil.kosong && <p className="penk-hint">Total gabungan di atas adalah penjumlahan seluruh kelompok yang diisi — untuk Neraca, gunakan bruto intrakomptabel dikurangi akumulasi penyusutan intrakomptabel, bukan gabungan intra+ekstra.</p>}
      </section>

      {resetModal && (
        <div className="drawer-backdrop" onClick={() => setResetModal(false)}>
          <section className="create-modal" onClick={e => e.stopPropagation()}>
            <div className="drawer-head"><button onClick={() => setResetModal(false)}>×</button><span>Kosongkan kertas kerja</span></div>
            <p>Semua isian pada halaman ini akan dihapus dari browser ini. Lanjutkan?</p>
            <div className="create-actions">
              <button type="button" className="ghost" onClick={() => setResetModal(false)}>Batal</button>
              <button type="button" className="primary" onClick={() => { setKertas(kertasKosong()); setResetModal(false) }}>Ya, kosongkan</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
