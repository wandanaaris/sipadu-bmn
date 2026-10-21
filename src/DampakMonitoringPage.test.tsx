// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Mock RPC: rekap + detail. Mengikuti pola getter yang dipakai test lain.
type HasilRpc = { data: unknown; error: { message: string } | null }
type PanggilanRpc = [nama: string, argumen?: Record<string, unknown> | undefined]

const rpcAsli = vi.fn(async (nama: string): Promise<HasilRpc> => {
  if (nama === 'get_dukungan_bencana_rekap') {
    return { data: [
      { satker: '692307', nama: 'Bapas Kelas I Pekanbaru', total: 75, selesai: 30, belum: 45, menunggu: 4 },
      { satker: '692308', nama: 'Lapas Kelas IIA Pekanbaru', total: 145, selesai: 0, belum: 145, menunggu: 2 },
    ], error: null }
  }
  if (nama === 'get_dukungan_bencana_detail') {
    return { data: [
      { nip: '197308141997031001', nama: 'RUDY FERNANDO SIANTURI', jabatan: 'KEPALA KANTOR WILAYAH', status: 'menunggu_verifikasi', catatan: null, submitted_at: '2026-10-21T09:00:00Z' },
      { nip: '199001012000121001', nama: 'DEDI BUDIMAN', jabatan: 'PENJAGA TAHANAN', status: 'selesai', catatan: null, submitted_at: '2026-10-20T03:00:00Z' },
      { nip: '199202012017121001', nama: 'ALMIRA SARI', jabatan: null, status: 'belum', catatan: null, submitted_at: null },
    ], error: null }
  }
  return { data: null, error: { message: 'unknown:' + nama } }
})
const rpcMock = rpcAsli as unknown as { (...a: PanggilanRpc): Promise<HasilRpc>; mockClear: () => void }

vi.mock('./lib/supabase', () => ({
  get supabase() { return { rpc: rpcMock } },
}))

afterEach(() => { cleanup(); rpcMock.mockClear() })

describe('DampakMonitoringPage', () => {
  it('menampilkan rekap per satker dan total pegawai', async () => {
    const { DampakMonitoringPage } = await import('./DampakMonitoringPage')
    render(<DampakMonitoringPage />)
    await waitFor(() => expect(screen.getByText('Bapas Kelas I Pekanbaru')).toBeInTheDocument())
    expect(screen.getByText('Lapas Kelas IIA Pekanbaru')).toBeInTheDocument()
    // total pegawai = 75 + 145 = 220
    expect(screen.getByText('220')).toBeInTheDocument()
    // sudah mengisi = 30
    expect(screen.getAllByText('30').length).toBeGreaterThan(0)
  })

  it('membuka detail satker dan menampilkan status pegawai', async () => {
    const { DampakMonitoringPage } = await import('./DampakMonitoringPage')
    render(<DampakMonitoringPage />)
    await waitFor(() => expect(screen.getByText('Bapas Kelas I Pekanbaru')).toBeInTheDocument())
    await userEvent.click(screen.getByText('Bapas Kelas I Pekanbaru'))
    await waitFor(() => expect(screen.getByText('Kembali ke rekap')).toBeInTheDocument())
    expect(screen.getByText('RUDY FERNANDO SIANTURI')).toBeInTheDocument()
    expect(screen.getByText('DEDI BUDIMAN')).toBeInTheDocument()
    expect(screen.getAllByText('Menunggu verifikasi').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sudah / selesai').length).toBeGreaterThan(0)
  })
})
