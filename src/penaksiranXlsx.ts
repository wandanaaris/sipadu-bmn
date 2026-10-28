// Pembuatan file .xlsx KERTAS KERJA penaksiran kendaraan dengan cara MENGISI
// template resmi ("Template Kertas Kerja.xlsx" → /template-kertas-kerja.xlsx)
// memakai exceljs — seluruh gaya, merge, dan lebar kolom template dipertahankan
// persis; hanya sel data yang diisi. Perhitungan tetap di penaksiranKendaraan.
import type {
  IdentitasPenaksiran,
  BarisLelang,
} from './penaksiranKendaraan';
import { hitungPenaksiran } from './penaksiranKendaraan';
import { normTeks } from './penaksiranLelang';

type HasilPenaksiran = ReturnType<typeof hitungPenaksiran>;
type WorkbookExcel = import('exceljs').Workbook

export const DASAR_PERATURAN: [string, string][] = [
  ['Peraturan Pemerintah Nomor 27 Tahun 2014 jo. Peraturan Pemerintah Nomor 28 Tahun 2020',
    'Pasal 51 ayat (1) dan (3): penilaian BMN selain tanah dan/atau bangunan dalam rangka pemanfaatan atau pemindahtanganan dilakukan oleh tim (panitia penaksir) dan menghasilkan nilai taksiran.'],
  ['Peraturan Menteri Keuangan Nomor 165/PMK.06/2021 jo. PMK Nomor 111/PMK.06/2016',
    'Tata cara pelaksanaan pemindahtanganan BMN; Pasal 33 tidak lagi mewajibkan keterlibatan Penilai Pemerintah untuk objek yang ditaksir panitia penaksir.'],
  ['Keputusan Menteri Keuangan Nomor 375 Tahun 2024',
    'Pedoman Penentuan Nilai Taksiran BMN selain tanah dan/atau bangunan berupa kendaraan bermotor oleh Panitia Penaksir (ditetapkan 23 September 2024, berlaku setelah 3 bulan).'],
];

/** Dokumen pedoman lengkap (PDF KMK 375/2024) yang dapat diunduh satker. */
export const KMK_375_PDF_URL =
  'https://drive.usercontent.google.com/download?id=1lQSGNZtQ5fh-FyS4Sf8pH43c29kuQBLY&export=download'
export const KMK_375_PDF_LABEL = 'KMK 375 2024 — Pedoman Penentuan Nilai Taksiran Kendaraan Bermotor (PDF)'

export const KETENTUAN_RINGKAS: string[] = [
  'Metode: perbandingan data harga penjualan lelang dari aplikasi Basis Data Harga Lelang Kendaraan Bermotor DJKN.',
  'Data pembanding minimal 3 dan maksimal 7, tahun transaksi lelang maksimal 3 tahun sebelum tahun penaksiran.',
  'Pencarian bertahap Tahap 1–10 (KMK 375 angka 4): diutamakan merek, tipe, dan tahun pembuatan sama pada wilayah kerja KPKNL; perluasan wilayah/tipe/merek mengikuti urutan; Batam dan Sabang tidak diperluas.',
  'Penyesuaian: waktu 2% per tahun; tahun pembuatan 5% (low-end) / 7% (middle) / 10% (high-end) per tahun; tipe 8% per kelas tipe; merek Fpm = (NJT − NJP) ÷ NJP; lokasi 5% per perbedaan kategori.',
  'Faktor kondisi lelang: 0,5 / 0,6 / 0,7 (kerusakan di atas 90% / 80–90% / s.d. 80%); harga jual tanpa lelang: 0,8 / 0,9 / 1,0; tanpa dokumen kepemilikan wajib 0,5.',
  'Nilai taksiran berlaku 6 bulan sejak kertas kerja ditandatangani (DIKTUM KETUJUH).',
  'Kategori lokasi ditetapkan Direktur Penilaian tiap Januari dan Juli; sumber resmi: aplikasi Basis Data Harga Lelang Kendaraan Bermotor DJKN.',
];

export interface DataXlsx {
  objek: IdentitasPenaksiran;
  rowsValid: BarisLelang[];
  hasil: HasilPenaksiran;
}

/** Tanda centang gaya kertas kerja: "v" bila opsi terpilih, kosong bila tidak. */
const v = (pilih: boolean): string => (pilih ? 'v' : '')

/** Bulan Indonesia untuk baris "Kota, Tanggal Penentuan Nilai Taksiran". */
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const tanggalIndo = (iso: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  return m ? `${Number(m[3])} ${BULAN[Number(m[2]) - 1]} ${m[1]}` : (iso || '-')
}

export const TEMPLATE_URL = '/template-kertas-kerja.xlsx'
const TEMPLATE_PATH_NODE = 'public/template-kertas-kerja.xlsx'

/** Muat template dari public/ (browser) atau disk (test node). */
async function muatTemplate(): Promise<WorkbookExcel> {
  const ExcelJS = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  if (typeof window !== 'undefined') {
    const res = await fetch(TEMPLATE_URL)
    if (!res.ok) throw new Error(`Template kertas kerja tidak dapat dimuat (${res.status})`)
    await wb.xlsx.load(await res.arrayBuffer())
  } else {
    await wb.xlsx.readFile(TEMPLATE_PATH_NODE)
  }
  return wb
}

/** Isi seluruh sel data pada sheet 'Simulasi' template tanpa mengubah gaya/merge. */
function isiTemplate(wb: WorkbookExcel, d: DataXlsx): void {
  const { objek: o, rowsValid: rows, hasil: h } = d
  const ws = wb.getWorksheet('Simulasi')
  if (!ws) throw new Error('Sheet "Simulasi" tidak ditemukan pada template')
  const sel = (alamat: string, nilai: string | number | null) => {
    if (nilai === null) return
    ws.getCell(alamat).value = nilai
  }

  // ── Kop ──
  sel('D4', o.pemilikDokumen || null)
  sel('D5', o.tujuan === 'lelang'
    ? 'TUJUAN PEMINDAHTANGANAN DENGAN PENJUALAN SECARA LELANG'
    : 'TUJUAN PEMINDAHTANGANAN DENGAN PENJUALAN (TANPA LELANG)')
  sel('E8', o.nomorKertasKerja || null)

  // ── 1 Identifikasi ──
  sel('E11', o.namaObjek || null)
  sel('L11', o.nup || null)
  sel('E12', o.rencanaLokasi || o.lokasiObjek || null)
  sel('L12', String(o.kategoriLokasiObjek))
  sel('E13', v(o.jenisKendaraan === 'roda2'))
  sel('I13', v(o.jenisKendaraan === 'roda4'))
  sel('E14', o.kapasitasCc > 0 ? o.kapasitasCc : null)
  sel('E15', o.merek || null)
  sel('E16', o.tipe || null)
  sel('E18', o.nomorPolisi || null)
  sel('E19', v(o.dokumenKepemilikan === 'BPKB'))
  sel('I19', v(o.dokumenKepemilikan === 'STNK'))
  sel('L19', v(o.dokumenKepemilikan === 'Lainnya'))
  sel('P19', v(o.dokumenKepemilikan === 'TidakAda'))
  sel('E20', o.pemilikDokumen || null)
  sel('E21', v(o.masaBerlaku === 'Masih Berlaku'))
  sel('I21', v(o.masaBerlaku === 'Habis Masa Berlaku'))
  sel('E23', o.penggunaan || null)
  sel('E24', o.keteranganLain || '-')

  // ── 2 Fisik Kendaraan ──
  sel('E27', o.warna || null)
  sel('M27', v(o.kondisi === 'rusak90'))
  sel('M28', v(o.kondisi === 'rusak80'))
  sel('M29', v(o.kondisi === 'rusak70'))
  sel('E28', o.tahunPembuatan > 0 ? o.tahunPembuatan : null)
  sel('E29', o.bahanBakar || null)

  // ── DATA HASIL LELANG (baris 32–38, bernomor 1–7 oleh template) ──
  for (let i = 0; i < 7; i++) {
    const r = 32 + i
    const b = rows[i]
    sel(`B${r}`, b?.merek || null)
    sel(`D${r}`, b?.kodeLelang || null)
    sel(`G${r}`, b?.tipe || null)
    sel(`I${r}`, b && b.hargaLelang > 0 ? Number(b.hargaLelang.toFixed(2)) : null)
    sel(`K${r}`, b && b.tahunLelang > 0 ? b.tahunLelang : null)
    sel(`N${r}`, b?.lokasiLelang || null)
    sel(`O${r}`, b ? b.kategoriLokasiLelang : null)
    sel(`P${r}`, b && b.tahunPembuatanLelang > 0 ? b.tahunPembuatanLelang : null)
  }

  // ── PENYESUAIAN (baris 41–47) — persen dalam satuan persen (2 = 2%) ──
  for (let i = 0; i < 7; i++) {
    const r = 41 + i
    const b = rows[i]
    const x = h.baris[i]
    sel(`B${r}`, b?.merek || null)
    if (!x) continue
    sel(`D${r}`, x.penyesuaianTipe)
    sel(`G${r}`, x.penyesuaianMerek)
    sel(`H${r}`, x.penyesuaianWaktu)
    sel(`I${r}`, x.penyesuaianLokasi)
    sel(`K${r}`, x.penyesuaianTahun)
    sel(`N${r}`, x.total)
    sel(`P${r}`, Number(x.nilaiTaksiran.toFixed(2)))
  }

  // ── Ringkasan ──
  sel('P48', Number(h.jumlahNilaiTaksiran.toFixed(2)))
  sel('P49', Number(h.rataRata.toFixed(2)))
  sel('O50', h.faktor)
  sel('P50', Number(h.limitLelang.toFixed(2)))
  sel('P51', h.pembulatan)
  sel('O53', `${o.kota || 'Pekanbaru'}, Tanggal Penentuan Nilai Taksiran ${tanggalIndo(o.tanggal)}`)

  // ── Nama panitia di bawah kolom ttd (Ketua + anggota dinamis) ──
  sel('C60', o.ketua.trim() || null)
  const anggota = o.anggota.map(a => a.trim()).filter(Boolean)
  if (anggota[0]) sel('H60', anggota[0])
  if (anggota[1]) sel('N60', anggota[1])
  anggota.slice(2).forEach((a, i) => sel(`N${61 + i}`, a))
}

/** Tambah sheet Lembar Kedua (Fpm) bila ada pembanding dengan merek berbeda. */
function tambahLembarKedua(wb: WorkbookExcel, o: IdentitasPenaksiran, rows: BarisLelang[]): void {
  const beda = rows.filter(r => r.merek && normTeks(r.merek) !== normTeks(o.merek))
  if (beda.length === 0) return
  const njt = Number(o.hargaBaruObjek || 0)
  const perMerek = new Map<string, BarisLelang>()
  for (const r of beda) if (!perMerek.has(normTeks(r.merek))) perMerek.set(normTeks(r.merek), r)
  const ws = wb.addWorksheet('Lembar Kedua (Fpm)')
  ws.addRow(['(LEMBAR KEDUA) PERHITUNGAN BESARAN PENYESUAIAN MEREK'])
  ws.addRow(['Rumusan', 'Fpm = (NJT - NJP) / NJP', 'NJT = harga baru objek; NJP = harga baru objek pembanding'])
  ws.addRow([])
  ws.addRow(['No', 'Merek', 'Harga Baru / Harga Jual Saat Ini (Rp)', 'Besaran Penyesuaian (Fpm)', 'Keterangan'])
  ws.addRow([1, o.merek, njt || '', '0%', 'Objek yang akan ditentukan nilai taksirannya (NJT)'])
  let no = 2
  for (const [, r] of perMerek) {
    const njp = Number(r.hargaBaru || 0)
    const fpm = njt && njp ? Math.round(((njt - njp) / njp) * 100) + '%' : ''
    ws.addRow([no, r.merek, njp || '', fpm, 'Objek dengan merek berbeda namun memiliki spesifikasi yang sama atau mendekati (NJP)'])
    no++
  }
  ws.getColumn(3).width = 34
  ws.getColumn(5).width = 60
}

/** Tambah sheet Dasar Peraturan + ketentuan ringkas + tautan dokumen pedoman. */
function tambahDasarPeraturan(wb: WorkbookExcel): void {
  const ws = wb.addWorksheet('Dasar Peraturan')
  ws.addRow(['DASAR PERATURAN'])
  ws.addRow(['Peraturan', 'Ketentuan'])
  for (const [peraturan, ketentuan] of DASAR_PERATURAN) ws.addRow([peraturan, ketentuan])
  ws.addRow(['KETENTUAN RINGKAS PENENTUAN NILAI TAKSIRAN'])
  for (const k of KETENTUAN_RINGKAS) ws.addRow(['•', k])
  ws.addRow(['Dokumen pedoman lengkap', { text: KMK_375_PDF_LABEL, hyperlink: KMK_375_PDF_URL }])
  ws.getColumn(1).width = 62
  ws.getColumn(2).width = 100
}

/** Bangun workbook kertas kerja terisi dari template. */
export async function buatKertasKerja(d: DataXlsx): Promise<WorkbookExcel> {
  const wb = await muatTemplate()
  isiTemplate(wb, d)
  tambahLembarKedua(wb, d.objek, d.rowsValid)
  tambahDasarPeraturan(wb)
  return wb
}

/** Unduh kertas kerja .xlsx hasil pengisian template (browser). */
export async function downloadXlsx(d: DataXlsx): Promise<void> {
  const wb = await buatKertasKerja(d)
  const buf = await wb.xlsx.writeBuffer()
  const base = (d.objek.nomorKertasKerja && d.objek.nomorKertasKerja.trim()) || 'penaksiran-kendaraan'
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Kertas-Kerja-${base.replace(/[^a-zA-Z0-9-_]/g, '_')}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
