// @vitest-environment jsdom
/// <reference types="vitest" />
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ImporAsetPage } from './AdminPanels'
import { tebakSnapshotDate } from './imporAset'

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
