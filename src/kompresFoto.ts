// Kompresi foto untuk bukti pemasangan label.
// Foto dari kamera HP biasanya 2–6 MB; database terbatas, jadi setiap foto
// dikompres hingga di bawah BATAS_BYTE sebelum disimpan.

/** Batas ukuran per foto setelah kompres. */
export const BATAS_BYTE = 500 * 1024

export type HasilKompres = {
  dataUrl: string
  ukuran: number
  lebar: number
  tinggi: number
  kualitas: number
}

/** Ukuran data URL base64 dalam byte (tanpa prefiks data:...). */
export function ukuranDataUrl(dataUrl: string): number {
  const koma = dataUrl.indexOf(',')
  if (koma === -1) return 0
  const isi = dataUrl.slice(koma + 1)
  const padding = isi.endsWith('==') ? 2 : isi.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((isi.length * 3) / 4) - padding)
}

export function formatUkuran(byte: number): string {
  if (byte < 1024) return `${byte} B`
  if (byte < 1024 * 1024) return `${(byte / 1024).toFixed(0)} KB`
  return `${(byte / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Kompres berkas gambar hingga di bawah BATAS_BYTE.
 *
 * Ukuran maksimum sisi panjang dibatasi 1600 px (cukup untuk membaca label),
 * lalu kualitas JPEG diturunkan bertahap. Gambar yang tetap terlalu besar
 * setelah kualitas minimum akan dipaksa lebih kecil lagi pada dimensinya.
 */
export async function kompresFoto(
  berkas: Blob,
  batas: number = BATAS_BYTE,
  sisiMaks = 1600,
): Promise<HasilKompres> {
  const bitmap = await muatGambar(berkas)
  try {
    let sisi = Math.min(sisiMaks, Math.max(bitmap.width, bitmap.height))
    let kualitas = 0.82
    let terbaik: HasilKompres | null = null

    // Turunkan kualitas dulu; kalau masih terlalu besar, perkecil dimensi.
    for (let putaran = 0; putaran < 8; putaran++) {
      const skala = Math.min(1, sisi / Math.max(bitmap.width, bitmap.height))
      const lebar = Math.max(1, Math.round(bitmap.width * skala))
      const tinggi = Math.max(1, Math.round(bitmap.height * skala))
      const dataUrl = gambarKeDataUrl(bitmap, lebar, tinggi, kualitas)
      const ukuran = ukuranDataUrl(dataUrl)
      const hasil: HasilKompres = { dataUrl, ukuran, lebar, tinggi, kualitas }
      if (ukuran <= batas) return hasil
      terbaik = hasil
      if (kualitas > 0.4) {
        kualitas = Math.max(0.4, kualitas - 0.15)
      } else {
        sisi = Math.round(sisi * 0.75)
      }
    }
    // Tidak pernah mencapai batas (mis. gambar ekstrem): pakai hasil terkecil.
    if (terbaik) return terbaik
    throw new Error('Foto tidak dapat dikompres.')
  } finally {
    bitmap.close?.()
  }
}

function muatGambar(berkas: Blob): Promise<ImageBitmap> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(berkas)
  }
  // Cadangan untuk lingkungan tanpa createImageBitmap (mis. jsdom lama).
  return new Promise((selesai, tolak) => {
    const url = URL.createObjectURL(berkas)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      selesai(img as unknown as ImageBitmap)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      tolak(new Error('Berkas bukan gambar yang dapat dibaca.'))
    }
    img.src = url
  })
}

function gambarKeDataUrl(sumber: ImageBitmap, lebar: number, tinggi: number, kualitas: number): string {
  const kanvas = document.createElement('canvas')
  kanvas.width = lebar
  kanvas.height = tinggi
  const ctx = kanvas.getContext('2d')
  if (!ctx) throw new Error('Canvas tidak tersedia di peramban ini.')
  ctx.drawImage(sumber as unknown as CanvasImageSource, 0, 0, lebar, tinggi)
  return kanvas.toDataURL('image/jpeg', kualitas)
}
