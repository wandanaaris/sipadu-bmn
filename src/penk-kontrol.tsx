// Kontrol masukan angka untuk formulir penaksiran: hanya menerima digit
// (dan tanda minus bila diizinkan), dengan pemisah ribuan gaya Indonesia
// yang terformat otomatis saat mengetik — titik/koma yang diketik pengguna
// diabaikan sehingga isian tidak menjadi rancu.
import { useMemo, useRef } from 'react'

type OpsiAngka = {
  nilai: number
  ubah: (n: number) => void
  /** Format pemisah ribuan (default true). Matikan untuk tahun/persen. */
  pemisah?: boolean
  /** Izinkan angka negatif (penyesuaian persen). */
  negatif?: boolean
  /** Batas jumlah digit (tahun = 4, cc = 5, …). */
  maksDigit?: number
  placeholder?: string
  labelAria?: string
}

const digitDari = (s: string): string => s.replace(/\D/g, '')

function tampilkan(nilai: number, pemisah: boolean, negatif: boolean): string {
  if (!nilai) return ''
  const tanda = nilai < 0 && negatif ? '-' : ''
  const mutlak = Math.abs(nilai)
  return tanda + (pemisah ? mutlak.toLocaleString('id-ID') : String(mutlak))
}

export function InputAngka({ nilai, ubah, pemisah = true, negatif = false, maksDigit, placeholder, labelAria }: OpsiAngka) {
  const ref = useRef<HTMLInputElement>(null)
  const tampil = useMemo(() => tampilkan(nilai, pemisah, negatif), [nilai, pemisah, negatif])

  const saatUbah = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target
    const mentah = el.value
    const caretLama = el.selectionStart ?? mentah.length
    // Berapa digit yang berada sebelum posisi kursor — untuk dikembalikan setelah format ulang.
    let digitSebelum = 0
    for (let i = 0; i < caretLama && i < mentah.length; i++) {
      if (/\d/.test(mentah[i])) digitSebelum++
    }
    const minus = negatif && mentah.trim().startsWith('-')
    let digit = digitDari(mentah)
    if (maksDigit && digit.length > maksDigit) digit = digit.slice(0, maksDigit)
    ubah(digit ? Number((minus ? '-' : '') + digit) : 0)
    const baru = tampilkan(digit ? Number((minus ? '-' : '') + digit) : 0, pemisah, negatif)
    requestAnimationFrame(() => {
      const el2 = ref.current
      if (!el2) return
      let pos = 0
      let hitung = 0
      while (pos < baru.length && hitung < digitSebelum) {
        if (/\d/.test(baru[pos])) hitung++
        pos++
      }
      try { el2.setSelectionRange(pos, pos) } catch { /* input angka lama: abaikan */ }
    })
  }

  return (
    <input
      ref={ref}
      inputMode="numeric"
      autoComplete="off"
      className="penk-angka"
      value={tampil}
      onChange={saatUbah}
      placeholder={placeholder}
      aria-label={labelAria}
    />
  )
}
