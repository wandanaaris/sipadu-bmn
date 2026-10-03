/// <reference types="vitest" />
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'

// Palsukan RPC rekap jenis BMN supaya kartu profil bisa diuji tanpa database.
vi.mock('./lib/supabase', () => ({
  supabase: {
    rpc: async (fn: string) =>
      fn === 'get_bmn_rekap_jenis'
        ? { data: [
            { jenis: 'MESIN PERALATAN NON TIK', jumlah: 798, nilai: 7490637718, tanpa_psp: 26, luas: 0 },
            { jenis: 'TANAH', jumlah: 4, nilai: 250000000, tanpa_psp: 0, luas: 1200 },
          ] }
        : fn === 'get_bmn_aset_satker'
          ? { data: [
              { no: 1, jenis_bmn: 'TANAH', nama_barang: 'Tanah Kantor', nup: '1', kode_barang: 'B1', kondisi: 'Baik',
                nilai_perolehan: 250000000, luas_tanah_seluruhnya: 1200, luas_bangunan: null },
            ] }
          : fn === 'get_bmn_rusak_rekap'
            ? { data: [{ A: 183, B: 1, C: 2, total: 186, nilai: 386000000 }] }
            : fn === 'get_bmn_perhatian'
            ? { data: [
                { nama_barang: 'Mesin Ketik', jenis_bmn: 'MESIN PERALATAN NON TIK', kategori: 'A',
                  kondisi: 'Rusak Berat', nilai_perolehan: 2904000, merk: 'BROTHER', tipe: '' },
              ] }
            : { data: [] },
  },
}))
import { render, screen, waitFor } from '@testing-library/react'
import { MonitoringSatkerPage } from './AdminPanels'
import { satkers } from './data'
import type { Task } from './data'

const kode = satkers[0].code

function tugasPalsu(): Task {
  return {
    id: 'uji-1',
    title: 'Pekerjaan Uji',
    description: '',
    letter: 'KU/1/2026',
    method: 'distribusi',
    due: '30 Sep 2026',
    dueDate: '2026-09-30',
    active: true,
    stages: [
      { id: 's1', label: 'Tahap I · Verifikasi', fields: [], requirements: ['Dokumen A'] },
      { id: 's2', label: 'Tahap II · Konfirmasi', fields: [], requirements: ['Dokumen B'] },
    ],
    assignments: [{ satker: kode, status: 'proses', progress: 40, missing: [], revisionCount: 0 }],
  } as unknown as Task
}

// Batas waktu longgar: saat suite penuh, lingkungan uji/jsdom bisa lambat.
const waitForWkt = (fn: () => void) => waitFor(fn, { timeout: 8000 })

describe('Halaman Monitoring Satker (satu tampilan)', () => {
  it('menampilkan seluruh bagian dari atas ke bawah setelah Satker dipilih', async () => {
    render(<MonitoringSatkerPage tasks={[tugasPalsu()]} kodeAwal={kode} />)
    await waitForWkt(() => expect(document.querySelectorAll('.pa-kategori').length).toBeGreaterThan(0))

    // Bagian 1 — hero + kartu aset (tanpa judul, mengikuti Profil Aset Satker)
    expect(screen.getByText(/Data SIMAN snapshot 30 September 2026/i)).toBeTruthy()
    // Bagian 2 — Kinerja & komposisi
    expect(screen.getByText(/Kinerja Satker/i)).toBeTruthy()
    expect(screen.getByText(/Komposisi status pekerjaan/i)).toBeTruthy()
    // Bagian 3 — daftar pekerjaan + tombol salin
    // Klik kartu aset -> tabel muncul di tempat (bukan pindah halaman)
    await waitForWkt(() => expect(document.querySelectorAll('.pa-kategori').length).toBeGreaterThan(0))
    const kartuTanah = [...document.querySelectorAll('.pa-kategori')]
      .find(k => k.textContent?.includes('Tanah')) as HTMLElement
    kartuTanah.click()
    await waitForWkt(() => expect(document.querySelector('.pa-tabel-panel')).toBeTruthy())
    expect(screen.getAllByText('Tanah Kantor').length).toBeGreaterThan(0)

    // Kartu aset yang perlu perhatian bisa diklik, angka diambil dari database
    expect(document.querySelectorAll('.pt-kartu').length).toBe(4)
    await waitForWkt(() => expect(screen.getAllByText('Rusak Berat A').length).toBeGreaterThan(0))
    // tidak boleh ada data rusak berat yang dibaca dari berkas lokal
    expect(document.querySelectorAll('.pt-kartu')[1]?.textContent).toContain('183')

    expect(screen.getAllByRole('heading', { name: /Pekerjaan belum selesai/i }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('heading', { name: /Pekerjaan selesai/i }).length).toBeGreaterThan(0)
    // Hero & kartu memakai kelas yang SAMA dengan halaman Profil Aset Satker
    expect(document.querySelectorAll('.pa-hero').length).toBe(1)
    expect(document.querySelectorAll('.pa-kategori').length).toBeGreaterThan(0)
    expect(document.querySelector('.info-hero')).toBeNull()
    expect(document.querySelector('.pg-kartu')).toBeNull()
    expect(screen.getAllByText(/Salin pesan/i).length).toBeGreaterThan(0)
  })
})
