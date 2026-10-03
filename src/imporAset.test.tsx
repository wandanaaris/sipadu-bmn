// @vitest-environment jsdom
/// <reference types="vitest" />
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import * as XLSX from 'xlsx'
// @ts-expect-error -- modul Node, dipakai khusus untuk menyusun berkas uji
import { deflateRawSync, crc32 } from 'node:zlib'
import { ImporAsetPage } from './AdminPanels'
import { bacaFileAset, perbaikiRefSheet, tebakSnapshotDate } from './imporAset'

// Bikin zip minimal supaya <dimension> bisa sengaja dirusak. SheetJS menulis zip-nya sendiri,
// jadi metadata central directory tidak bisa diubah tanpa merusak berkas.
function buatZip(entri: Array<{ nama: string; data: string }>): Uint8Array {
  const encoder = new TextEncoder()
  const potongan = entri.map(e => {
    const namaBytes = encoder.encode(e.nama)
    const dataBytes = encoder.encode(e.data)
    const terkompresi = deflateRawSync(dataBytes)
    return { namaBytes, dataBytes, terkompresi, crc: crc32(dataBytes) >>> 0, offset: 0 }
  })
  let posisi = 0
  const lokal: Uint8Array[] = []
  for (const c of potongan) {
    c.offset = posisi
    const header = new Uint8Array(30 + c.namaBytes.length)
    const dv = new DataView(header.buffer)
    dv.setUint32(0, 0x04034b50, true)
    dv.setUint16(4, 20, true); dv.setUint16(6, 0, true); dv.setUint16(8, 8, true)
    dv.setUint32(14, c.crc, true)
    dv.setUint32(18, c.terkompresi.length, true); dv.setUint32(22, c.dataBytes.length, true)
    dv.setUint16(26, c.namaBytes.length, true)
    header.set(c.namaBytes, 30)
    lokal.push(header, new Uint8Array(c.terkompresi))
    posisi += header.length + c.terkompresi.length
  }
  const sentralStart = posisi
  const sentral: Uint8Array[] = []
  for (const c of potongan) {
    const header = new Uint8Array(46 + c.namaBytes.length)
    const dv = new DataView(header.buffer)
    dv.setUint32(0, 0x02014b50, true)
    dv.setUint16(4, 20, true); dv.setUint16(6, 20, true)
    dv.setUint16(10, 8, true); dv.setUint32(16, c.crc, true)
    dv.setUint32(20, c.terkompresi.length, true); dv.setUint32(24, c.dataBytes.length, true)
    dv.setUint16(28, c.namaBytes.length, true)
    dv.setUint32(42, c.offset, true)
    header.set(c.namaBytes, 46)
    sentral.push(header)
  }
  const akhir = new Uint8Array(22)
  const dv = new DataView(akhir.buffer)
  dv.setUint32(0, 0x06054b50, true)
  dv.setUint16(8, potongan.length, true); dv.setUint16(10, potongan.length, true)
  dv.setUint32(12, sentral.reduce((n, b) => n + b.length, 0), true)
  dv.setUint32(16, sentralStart, true)
  const semua = [...lokal, ...sentral, akhir]
  const total = semua.reduce((n, b) => n + b.length, 0)
  const hasil = new Uint8Array(total)
  let o = 0
  for (const b of semua) { hasil.set(b, o); o += b.length }
  return hasil
}

// Bangun .xlsx dengan dimension yang salah, meniru export SIMAN.
function buatBerkasDimensionRusak(nilaiPerolehan = '3.266.200.000'): File {
  const header = ['No', 'Jenis BMN', 'Kode Satker', 'Nama Satker', 'Kode Barang', 'NUP', 'Nama Barang', 'Kondisi', 'Nilai Perolehan', 'No PSP']
  const isi = [
    ['1', 'TANAH', '137040900692307000KD', 'Bapas Kelas I Pekanbaru', '2010101001', '1', 'Tanah Kantor', 'Baik', nilaiPerolehan, ''],
    ['2', 'MESIN PERALATAN NON TIK', '137040900692307000KD', 'Bapas Kelas I Pekanbaru', '3010304003', '1', 'Mesin Ketik', 'Rusak Berat', '2.904.000', 'PSP/1/2026'],
  ]
  const aoa = [header, ...isi]
  const sel = aoa.map((baris, r) =>
    baris.map((v, c) => {
      const alamat = XLSX.utils.encode_cell({ r, c })
      return `<c r="${alamat}" t="inlineStr"><is><t>${v}</t></is></c>`
    }).join('')
  ).join('')
  const sheet = `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`
    + `<dimension ref="A1:F1"/>`
    + `<sheetData>${sel}</sheetData></worksheet>`
  const zip = buatZip([
    { nama: '[Content_Types].xml', data: '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>' },
    { nama: 'xl/workbook.xml', data: '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Master Aset" sheetId="1" r:id="rId1"/></sheets></workbook>' },
    { nama: 'xl/_rels/workbook.xml.rels', data: '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>' },
    { nama: 'xl/worksheets/sheet1.xml', data: sheet },
  ])
  return new File([zip.buffer as ArrayBuffer], 'Master aset 03 Oktober 2026.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

vi.mock('./lib/supabase', () => ({
  supabase: {
    rpc: async (fn: string) =>
      fn === 'bmn_daftar_snapshot'
        ? { data: [{
            id: 1, snapshot_date: '2026-09-30',
            source_file: 'Master aset 30 september 2026.xlsx',
            status: 'active', total_baris: 11856, total_nilai: 986366876381,
            jumlah_satker: 19, jumlah_jenis: 11, catatan: null,
            created_at: '', umur_hari: 3,
          }] }
        : { data: [] },
  },
}))

describe('Pemrosesan angka gaya Indonesia', () => {
  const baca = async (teks: string) => {
    const f = buatBerkasDimensionRusak(teks)
    return bacaFileAset(f)
  }

  it('membaca angka ribuan bertitik, koma, dan desimal', async () => {
    const h = await baca('3.266.200.000')
    expect(h.baris[0].nilai_perolehan).toBe(3266200000)
    expect((await baca('1,234,567')).baris[0].nilai_perolehan).toBe(1234567)
    expect((await baca('1234,56')).baris[0].nilai_perolehan).toBe(1234.56)
    expect((await baca('1234.56')).baris[0].nilai_perolehan).toBe(1234.56)
    expect((await baca('2904000')).baris[0].nilai_perolehan).toBe(2904000)
    expect((await baca('Rp 8.915.000.000')).baris[0].nilai_perolehan).toBe(8915000000)
  })
})

describe('Dimension rusak pada export SIMAN', () => {
  it('perbaikiRefSheet menghitung ulang jangkauan dari sel yang ada', () => {
    const ws: Record<string, unknown> = { '!ref': 'A1:F1', A1: {}, B1: {}, A2: {}, Z50: {} }
    const ref = perbaikiRefSheet(ws, { encode_col: (n: number) => XLSX.utils.encode_col(n) })
    expect(ref).toBe('A1:Z50')
    expect(ws['!ref']).toBe('A1:Z50')
  })

  it('membaca berkas meski dimension-nya salah', async () => {
    const hasil = await bacaFileAset(buatBerkasDimensionRusak())
    expect(hasil.ok).toBe(true)
    expect(hasil.kurangKolom).toEqual([])
    expect(hasil.baris).toHaveLength(2)
    expect(hasil.baris[0].nama_barang).toBe('Tanah Kantor')
    expect(hasil.baris[0].satker_code).toBe('692307')
    expect(hasil.baris[0].nilai_perolehan).toBe(3266200000)
    expect(hasil.baris[1].kondisi).toBe('Rusak Berat')
    expect(hasil.snapshotDate).toBe('2026-10-03')
  })
})

describe('Deteksi tanggal snapshot dari nama berkas', () => {
  it('membaca nama berkas gaya SIMAN Kanwil', () => {
    expect(tebakSnapshotDate('Master aset 30 september 2026.xlsx')).toBe('2026-09-30')
    expect(tebakSnapshotDate('Master Aset 01 Agustus 2026.xlsx')).toBe('2026-08-01')
    expect(tebakSnapshotDate('aset belum psp.xlsx')).toBeNull()
  })
})

describe('Halaman Impor Data Aset', () => {
  it('menampilkan langkah unggah dan riwayat snapshot', async () => {
    render(<ImporAsetPage />)
    await waitFor(() => expect(screen.getByText('Impor Data Aset')).toBeTruthy())

    // Langkah 1 — area unggah
    expect(screen.getByText(/Pilih berkas \.xlsx/i)).toBeTruthy()

    // Riwayat snapshot menampilkan snapshot aktif beserta umurnya
    await waitFor(() => expect(screen.getAllByText('Aktif').length).toBeGreaterThan(0))
    expect(screen.getByText('Master aset 30 september 2026.xlsx')).toBeTruthy()
    expect(screen.getByText('3 hari lalu')).toBeTruthy()
    expect(screen.getAllByText('11.856').length).toBeGreaterThan(0)
  })
})
