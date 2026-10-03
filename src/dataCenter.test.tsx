// @vitest-environment jsdom
/// <reference types="vitest" />
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { DataCenterBmnPage } from './AdminPanels'

vi.mock('./lib/supabase', () => ({
  supabase: {
    rpc: async (fn: string) => {
      if (fn === 'get_bmn_rekap_wilayah') {
        return { data: [{
          snapshot_date: '2026-09-30', source_file: 'Master aset 30 september 2026.xlsx',
          total_aset: 11856, total_nilai: 986366876381, jumlah_satker: 19, jumlah_jenis: 2, tanpa_psp: 363,
          per_jenis: [
            { jenis: 'TANAH', jumlah: 33, nilai: 27578988338 },
            { jenis: 'MESIN PERALATAN NON TIK', jumlah: 8915, nilai: 81090602597 },
          ],
          per_satker: [{ kode: '692311', nama: 'Lapas Kelas IIA Pekanbaru', jumlah: 924, nilai: 295513970916, tanpa_psp: 27 }],
          top_aset: [],
        }] }
      }
      if (fn === 'get_bmn_aset_wilayah') {
        return { data: [{ jumlah: 33, nilai: 27578988338, satker: 15, baris: [
          { no: 1, jenis_bmn: 'TANAH', nama_barang: 'Tanah Bangunan Kantor', nama_satker: 'Lapas Kelas IIA Pekanbaru',
            nup: '1', kode_barang: 'B1', kondisi: 'Baik', nilai_perolehan: 81913771000, luas_tanah_seluruhnya: 32630 },
        ] }] }
      }
      return { data: [] }
    },
  },
}))

describe('Data Center BMN — tombol per jenis BMN', () => {
  it('menampilkan satu tombol untuk setiap jenis, berisi jumlah aset dan nilai', async () => {
    render(<DataCenterBmnPage onBukaSatker={() => {}} />)
    await waitFor(() => expect(document.querySelectorAll('.pa-kategori').length).toBe(2))
    const kartu = [...document.querySelectorAll('.pa-kategori')].map(k => k.textContent ?? '')
    // jumlah aset
    expect(kartu.some(t => t.includes('Tanah') && t.includes('33'))).toBe(true)
    // nilai perolehan (format ringkas yang sama dengan halaman lain)
    expect(kartu.some(t => t.includes('Rp 27,6 M'))).toBe(true)
    // porsi terhadap total nilai
    expect(kartu.some(t => /\d+[,.]?\d*%/.test(t))).toBe(true)
  })

  it('klik tombol jenis BMN membuka tabel detailnya', async () => {
    render(<DataCenterBmnPage onBukaSatker={() => {}} />)
    await waitFor(() => expect(document.querySelectorAll('.pa-kategori').length).toBe(2))
    const tanah = [...document.querySelectorAll('.pa-kategori')].find(k => k.textContent?.includes('Tanah')) as HTMLElement
    tanah.click()
    await waitFor(() => expect(document.querySelector('.pa-tabel-panel')).toBeTruthy())
    expect(screen.getAllByText('Tanah Bangunan Kantor').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Lapas Kelas IIA Pekanbaru/).length).toBeGreaterThan(0)
  })
})
