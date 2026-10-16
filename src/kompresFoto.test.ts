// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { BATAS_BYTE, formatUkuran, kompresFoto, ukuranDataUrl } from './kompresFoto'

describe('ukuranDataUrl', () => {
  it('menghitung ukuran payload base64 tanpa prefiks data:', () => {
    // 8 karakter base64 = 6 byte (dibulatkan ke bawah dari 8*3/4)
    expect(ukuranDataUrl('data:image/jpeg;base64,AAAAAAAA')).toBe(6)
  })

  it('mengurangi padding "==" dan "="', () => {
    expect(ukuranDataUrl('data:image/jpeg;base64,AAAA')).toBe(3)
    expect(ukuranDataUrl('data:image/jpeg;base64,AA==')).toBe(1)
  })

  it('mengembalikan 0 untuk data url tanpa koma', () => {
    expect(ukuranDataUrl('bukan-data-url')).toBe(0)
  })
})

describe('formatUkuran', () => {
  it('menampilkan satuan yang sesuai', () => {
    expect(formatUkuran(512)).toBe('512 B')
    expect(formatUkuran(500 * 1024)).toBe('500 KB')
    expect(formatUkuran(2 * 1024 * 1024)).toBe('2.0 MB')
  })
})

describe('kompresFoto', () => {
  it('BATAS_BYTE adalah 500 KB', () => {
    expect(BATAS_BYTE).toBe(500 * 1024)
  })

  it('membatalkan gambar setelah selesai agar memori HP terbebas', async () => {
    const tutup = vi.fn()
    // toDataURL di-stub: 4000 karakter base64 ≈ 3 KB, di bawah batas uji 1 KB.
    const gambar = { width: 3000, height: 2000, close: tutup }
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(gambar))
    vi.spyOn(document, 'createElement').mockReturnValue({
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: () => {} }),
      toDataURL: () => 'data:image/jpeg;base64,' + 'A'.repeat(400),
    } as unknown as HTMLCanvasElement)

    const hasil = await kompresFoto(new Blob(['x']), 1024)
    expect(hasil.ukuran).toBeLessThanOrEqual(1024)
    expect(hasil.dataUrl.startsWith('data:image/jpeg;base64,')).toBe(true)
    expect(tutup).toHaveBeenCalled()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('menurunkan kualitas berulang kali sampai di bawah batas', async () => {
    const kualitas: number[] = []
    const gambar = { width: 2000, height: 1500, close: vi.fn() }
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(gambar))
    // Ukuran bergantung pada kualitas DAN dimensi kanvas, seperti JPEG asli:
    // begitu kualitas mentok, kompresor mengecilkan dimensi dan ukuran turun lagi.
    const kanvas = { width: 0, height: 0 }
    vi.spyOn(document, 'createElement').mockReturnValue({
      get width() { return kanvas.width },
      set width(n: number) { kanvas.width = n },
      get height() { return kanvas.height },
      set height(n: number) { kanvas.height = n },
      getContext: () => ({ drawImage: () => {} }),
      toDataURL: (_tipe: string, k: number) => {
        kualitas.push(k)
        const panjang = Math.max(4, Math.round((kanvas.width * kanvas.height * k) / 200))
        return 'data:image/jpeg;base64,' + 'A'.repeat(panjang)
      },
    } as unknown as HTMLCanvasElement)

    const hasil = await kompresFoto(new Blob(['x']), 1024)
    expect(hasil.ukuran).toBeLessThanOrEqual(1024)
    expect(kualitas.length).toBeGreaterThan(1) // kualitas diturunkan bertahap
    expect(kualitas[0]).toBeGreaterThan(kualitas[kualitas.length - 1])
    expect(kualitas.every(k => k >= 0.4)).toBe(true)
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('memperkecil dimensi bila kualitas minimum masih terlalu besar', async () => {
    const gambar = { width: 4000, height: 3000, close: vi.fn() }
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(gambar))
    // Selalu terlalu besar, agar kompresor terpaksa mengecilkan dimensi.
    vi.spyOn(document, 'createElement').mockReturnValue({
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: () => {} }),
      toDataURL: () => 'data:image/jpeg;base64,' + 'A'.repeat(900_000),
    } as unknown as HTMLCanvasElement)

    const hasil = await kompresFoto(new Blob(['x']), BATAS_BYTE, 1600)
    expect(hasil.ukuran).toBeGreaterThan(BATAS_BYTE) // gambar sengaja mustahil
    expect(hasil.lebar).toBeLessThan(4000) // dimensi sudah dikecilkan
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })
})
