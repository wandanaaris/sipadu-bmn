// @vitest-environment jsdom
/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LabelBmnPage } from './LabelBmnPage'

// Data contoh meniru jsonb dari RPC bmn_label_daftar.
const BARIS = [
  {
    kodeRegister: 'REG-A',
    kodeBarang: '3050104001', nup: '1', namaBarang: 'Lemari Besi/Metal', merk: '',
    merkSimpan: '', merkTerisi: false,
    kondisi: 'Baik', kondisiReal: null, fotoUrl: null, fotoUkuran: null,
    statusBmn: 'Aktif', noPsp: 'SEK.3-PB.03.01-1008', tahunPerolehan: '2024-01-01',
    sumber: 'Eks Rupbasan Bengkalis', lokasiSimpan: 'Belum berlokasi',
    labelTercetak: true, sudahDitempel: false, tanggalTempel: null, petugas: null,
    sudahDiscan: false, ruangBaru: null, keterangan: 'Fisik sudah di Kanwil (hasil ASP eks Rupbasan Rengat)',
  },
  {
    kodeRegister: 'REG-B',
    kodeBarang: '3050104001', nup: '1', namaBarang: 'Lemari Besi/Metal', merk: 'ELITE',
    merkSimpan: 'ELITE', merkTerisi: false,
    kondisi: 'Baik', kondisiReal: 'Baik', fotoUrl: 'data:image/jpeg;base64,AAA', fotoUkuran: 120000,
    statusBmn: 'Aktif', noPsp: 'SEK.3-PB.03.01-1137', tahunPerolehan: '2024-01-01',
    sumber: 'PSP lain (Kanwil)', lokasiSimpan: '005 - RUANG TIM KEUANGAN',
    labelTercetak: true, sudahDitempel: true, tanggalTempel: '2026-10-14', petugas: 'Andi',
    sudahDiscan: true, ruangBaru: '010 - TIM TATA USAHA', keterangan: 'label rusak, tempel ulang',
  },
  {
    kodeRegister: 'REG-C',
    kodeBarang: '3050201020', nup: '7', namaBarang: 'Kursi Besi/Metal', merk: '',
    merkSimpan: '', merkTerisi: false,
    kondisi: 'Baik', kondisiReal: null, fotoUrl: null, fotoUkuran: null,
    statusBmn: 'Aktif', noPsp: '', tahunPerolehan: '2026-01-15',
    nilaiPerolehan: 8823375, nupLama: '12',
    sumber: 'Transfer Kanwil Kemenkum', lokasiSimpan: 'Belum berlokasi',
    labelTercetak: false, sudahDitempel: false, tanggalTempel: null, petugas: null,
    sudahDiscan: false, ruangBaru: null, keterangan: null,
  },
]

const REKAP = {
  total: 3,
  selesai: 1,
  belum: 2,
  merkKosong: 2,
  sudahFoto: 1,
  sudahKondisi: 1,
  perSumber: [
    { sumber: 'PSP lain (Kanwil)', total: 1, selesai: 1, labelTercetak: 1, berlokasi: 1, merkKosong: 0, kondisiTerisi: 1, fotoAda: 1 },
    { sumber: 'Eks Rupbasan Bengkalis', total: 1, selesai: 0, labelTercetak: 1, berlokasi: 0, merkKosong: 1, kondisiTerisi: 0, fotoAda: 0 },
    { sumber: 'Transfer Kanwil Kemenkum', total: 1, selesai: 0, labelTercetak: 0, berlokasi: 0, merkKosong: 1, kondisiTerisi: 0, fotoAda: 0 },
  ],
}

// Bentuk longgar agar mock bisa mengembalikan nilai gagal sekaligus nilai sukses.
type HasilRpc = { data: unknown; error: { message: string } | null }
type PanggilanRpc = [nama: string, argumen: Record<string, unknown> | undefined]

const rpcAsli = vi.fn(async (nama: string): Promise<HasilRpc> => (
  nama === 'bmn_label_daftar' ? { data: BARIS, error: null } : { data: REKAP, error: null }
))
const rpcMock = rpcAsli as unknown as {
  (...args: PanggilanRpc): Promise<HasilRpc>
  mockClear: () => void
  mockImplementationOnce: (fn: (nama: string) => Promise<HasilRpc>) => void
  mock: { calls: PanggilanRpc[] }
}

vi.mock('./lib/supabase', () => ({
  get supabase() {
    return { rpc: rpcMock }
  },
}))

beforeEach(() => { rpcMock.mockClear() })
afterEach(() => { cleanup() })

describe('LabelBmnPage', () => {
  it('memuat data lewat RPC bmn_label_daftar dan bmn_label_rekap', async () => {
    render(<LabelBmnPage />)
    await waitFor(() => expect(rpcMock).toHaveBeenCalledWith('bmn_label_daftar', { p_satker: '692507' }))
    expect(rpcMock).toHaveBeenCalledWith('bmn_label_rekap', { p_satker: '692507' })
  })

  it('menampilkan rekap per sumber dan jumlah aset', async () => {
    render(<LabelBmnPage />)
    expect(await screen.findByText('Label Barcode BMN — Kanwil Ditjenpas Riau')).toBeTruthy()
    expect(screen.getByText('3 aset')).toBeTruthy()
    // Muncul di tabel rekap DAN di baris aset — jadi diperiksa dengan getAllByText.
    expect(screen.getAllByText('Eks Rupbasan Bengkalis').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Transfer Kanwil Kemenkum').length).toBeGreaterThan(0)
  })

  it('menampilkan nilai perolehan dan NUP lama pada aset transfer kemenkum', async () => {
    render(<LabelBmnPage />)
    await screen.findByText('3 aset')
    // REG-C (Transfer Kanwil Kemenkum) membawa nilai 8.823.375 dan NUP lama 12.
    expect(screen.getByText('Rp 8,8 jt')).toBeTruthy()   // strong di dalam .kartu-nilai-rp
    expect(screen.getByText('NUP lama: 12')).toBeTruthy()
  })

  it('memperingatkan merk yang belum ada', async () => {
    render(<LabelBmnPage />)
    expect(await screen.findByText(/2 merk belum ada/)).toBeTruthy()
  })

  it('menandai aset yang fisiknya sudah di Kanwil', async () => {
    render(<LabelBmnPage />)
    await screen.findByText('3 aset')
    // REG-A punya keterangan fisik di Kanwil; REG-B punya keterangan biasa
    expect(screen.getByText('Fisik sudah di Kanwil (hasil ASP eks Rupbasan Rengat)')).toBeTruthy()
    expect(screen.getByText('label rusak, tempel ulang')).toBeTruthy()
    // hanya satu kartu yang berpenanda fisik
    expect(screen.getAllByText('Fisik di Kanwil').length).toBe(1)
  })

  it('rekap membungkus tabel dalam .table-wrap agar kolom kiri tidak terpotong', async () => {
    render(<LabelBmnPage />)
    await screen.findByText('3 aset')
    // overflow-x hanya bekerja pada kotak blok; menaruhnya di <table> tidak
    // membuat scroll container, sehingga tabel meluber dan teks terpotong.
    const rekap = document.querySelector('.label-rekap')!
    const pembungkus = rekap.querySelector(':scope > .table-wrap')
    expect(pembungkus).not.toBeNull()
    expect(pembungkus!.querySelector(':scope > table')).not.toBeNull()
    // Tabel tidak boleh sendiri membawa kelas table-wrap.
    expect(rekap.querySelector('table.table-wrap')).toBeNull()
  })

  it('menampilkan semua judul kolom rekap, termasuk sumber aset', async () => {
    render(<LabelBmnPage />)
    await screen.findByText('3 aset')
    const rekap = document.querySelector('.label-rekap')!
    const judul = [...rekap.querySelectorAll('th')].map(th => th.textContent!.trim())
    expect(judul).toEqual([
      'Sumber aset (No PSP)', 'Total', 'Selesai', 'Belum',
      'Label tercetak', 'Berlokasi', 'Merk kosong', 'Progress',
    ])
    // Nama sumber aset benar-benar terbaca di baris, bukan sel kosong.
    expect(rekap.textContent).toContain('PSP lain (Kanwil)')
    expect(rekap.textContent).toContain('Transfer Kanwil Kemenkum')
  })
  it('menampilkan badge asal yang berbeda untuk tiap sumber', async () => {
    render(<LabelBmnPage />)
    await screen.findByText('3 aset')
    expect(screen.getByText('Eks Rupb. Bengkalis')).toBeTruthy()
    expect(screen.getByText('Transfer Kemenkum')).toBeTruthy()
    expect(screen.getByText('PSP Kanwil')).toBeTruthy()
  })

  it('menyaring dengan dua status: belum dan selesai', async () => {
    const user = userEvent.setup()
    render(<LabelBmnPage />)
    await screen.findByText('3 aset')

    // REG-B sudah ditempel dan discan → selesai; dua lainnya belum.
    await user.click(screen.getByRole('button', { name: /Selesai/ }))
    await waitFor(() => expect(screen.getByText('1 aset ditampilkan')).toBeTruthy())
    expect(screen.getByText('ELITE')).toBeTruthy()

    await user.click(screen.getByRole('button', { name: /Belum/ }))
    await waitFor(() => expect(screen.getByText('2 aset ditampilkan')).toBeTruthy())
  })

  it('memberi warna berbeda untuk status selesai dan belum', async () => {
    render(<LabelBmnPage />)
    await screen.findByText('3 aset')
    // Tepi kartu dibedakan: satu selesai (REG-B), dua belum.
    const kartu = document.querySelectorAll('.label-kartu')
    expect(kartu.length).toBe(3)
    expect(document.querySelectorAll('.kartu-selesai').length).toBe(1)
    expect(document.querySelectorAll('.kartu-belum').length).toBe(2)
    // Badge status pada kartu: satu selesai, dua belum.
    expect(document.querySelectorAll('.label-kartu .status-selesai').length).toBe(1)
    expect(document.querySelectorAll('.label-kartu .status-belum').length).toBe(2)
  })

  it('kepala panel memakai pil status portal, bukan chip abu', async () => {
    render(<LabelBmnPage />)
    await screen.findByText('3 aset')
    const stat = document.querySelector('.label-stat')!
    // Kelas chip versi lama tidak boleh lagi dipakai di kepala panel.
    expect(stat.querySelector('.chip-row')).toBeNull()
    expect(stat.querySelector('.chip-belum')).toBeNull()
    // Pil status portal yang dipakai, dengan warna status masing-masing.
    expect(stat.querySelector('.status.status-belum')).not.toBeNull()
    expect(stat.querySelector('.status.status-selesai')).not.toBeNull()
    // Pil terpilih ditandai stat-on agar terbaca sebagai filter aktif.
    expect(stat.querySelector('.status.stat-on')).not.toBeNull()
  })

  it('mencari aset tanpa peduli huruf besar-kecil', async () => {
    const user = userEvent.setup()
    render(<LabelBmnPage />)
    await screen.findByText('3 aset')
    await user.type(screen.getByPlaceholderText(/Cari nama/), 'kursi')
    await waitFor(() => expect(screen.getByText('1 aset ditampilkan')).toBeTruthy())
  })

  it('membuka panel pencatatan dan mengirim kode_register yang benar', async () => {
    const user = userEvent.setup()
    render(<LabelBmnPage />)
    await screen.findByText('3 aset')

    // Saring lewat keterangan khas REG-A supaya hanya satu baris tersisa
    // (urutan default menaruh sumber Transfer Kanwil Kemenkum lebih dulu).
    await user.type(screen.getByPlaceholderText(/Cari nama/), 'hasil ASP eks Rupbasan Rengat')
    await waitFor(() => expect(screen.getByText('1 aset ditampilkan')).toBeTruthy())

    await user.click(screen.getByRole('button', { name: 'Catat Pemasangan' }))

    // Isi merk yang belum ada di SIMAN
    expect(await screen.findByLabelText(/^Merk/)).toBeTruthy()
    expect(screen.getByText(/Merk belum ada di SIMAN/)).toBeTruthy()
    await user.type(screen.getByLabelText(/^Merk/), 'BROTHER')
    // Ruang, Petugas, dan Tanggal tempel tidak lagi diisi di form: ruang diisi
    // lewat scan SIMAN Mobile, petugas dan tanggal tidak dikumpulkan manual.
    await user.click(screen.getByLabelText('Label sudah ditempel'))
    await user.click(screen.getByRole('button', { name: 'Simpan' }))

    expect(await screen.findByText(/Tersimpan: Lemari Besi\/Metal \(NUP 1\)/)).toBeTruthy()

    // Simpan adalah salah satu pemanggilan; pemanggilan lain adalah muat-ulang.
    const panggilanSimpan = rpcMock.mock.calls.find((c) => c[0] === 'bmn_label_simpan')
    const isi = panggilanSimpan?.[1] as Record<string, unknown> | undefined
    expect(isi).toMatchObject({
      p_satker: '692507',
      p_kode_register: 'REG-A',
      p_kode_barang: '3050104001',
      p_nup: '1',
      p_merk: 'BROTHER',
      p_sudah_ditempel: true,
      // Baris ini belum pernah punya ruang/petugas, jadi dikirim null yang
      // berarti "jangan ubah kolomnya" — bukan dikosongkan.
      p_petugas: null,
      p_ruang_baru: null,
    })
  })

  it('membawa ruang dan petugas lama saat menyimpan, tidak menimpanya kosong', async () => {
    const user = userEvent.setup()
    render(<LabelBmnPage />)
    await screen.findByText('3 aset')

    // REG-B sudah punya ruang dan petugas dari pencatatan sebelumnya.
    await user.type(screen.getByPlaceholderText(/Cari nama/), 'label rusak, tempel ulang')
    await waitFor(() => expect(screen.getByText('1 aset ditampilkan')).toBeTruthy())
    await user.click(screen.getByRole('button', { name: 'Catat Pemasangan' }))
    await user.click(await screen.findByRole('button', { name: 'Simpan' }))

    const panggilanSimpan = rpcMock.mock.calls.find((c) => c[0] === 'bmn_label_simpan')
    const isi = panggilanSimpan?.[1] as Record<string, unknown> | undefined
    expect(isi).toMatchObject({
      p_kode_register: 'REG-B',
      p_ruang_baru: '010 - TIM TATA USAHA',
      p_petugas: 'Andi',
      p_tanggal_tempel: '2026-10-14',
    })
  })

  it('menampilkan galat bila RPC gagal', async () => {
    rpcMock.mockImplementationOnce(async () => ({ data: null, error: { message: 'koneksi terputus' } }))
    render(<LabelBmnPage />)
    expect(await screen.findByText('koneksi terputus')).toBeTruthy()
  })
})
