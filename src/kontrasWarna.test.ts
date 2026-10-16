// @vitest-environment jsdom
// Uji kontras warna teks terhadap latarnya.
//
// Bug yang ditangkap tes ini: --muted dan --muted-foreground dua-duanya
// #657484 di App.css, sehingga aturan `.chip{background:var(--muted);
// color:var(--muted-foreground)}` menghasilkan teks sewarna latar — rasio
// kontras 1:1, tidak terbaca sama sekali. Pengguna melihat batang grey polos
// tanpa tulisan. Karena itu setiap pasangan warna teks/latar yang dipakai
// komponen diperiksa di sini, bukan hanya dilihat di peramban.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

// __dirname tidak tersedia di ESM, dan import.meta.url menjadi URL http
// ketika tes dijalankan lewat server Vitest (fileURLToPath lalu menolaknya).
// CWD Vitest adalah root proyek, jadi cukup gabungkan dengan 'src/'.
const SRC = process.cwd() + '/src/'
const berkas = (n: string) => readFileSync(SRC + n, 'utf-8')

/** Ambil nilai sebuah variabel CSS dari blok :root pertama sebuah berkas. */
function variabel(nama: string, css: string): string | null {
  const root = css.match(/:root\{([^}]*)\}/s)
  if (!root) return null
  const m = root[1].match(new RegExp(`${nama}\\s*:\\s*([^;]+)`))
  if (!m) return null
  // Nilai bisa berada di tengah baris berkomentar multi-baris; ambil token
  // hex/ warna terakhir pada kecocokan agar komentar tidak ikut terbawa.
  const potong = m[1].split(/[\s,{}]+/).filter(Boolean)
  const warna = potong.find(t => /^#[0-9a-fA-F]{3,8}$/.test(t))
  return warna ?? potong[potong.length - 1] ?? null
}

/** luminansi relatif menurut WCAG 2.1 */
function luminansi(warna: string): number {
  // Perluas bentuk pendek #abc -> #aabbcc agar tiap saluran 2 digit.
  const pendek = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/.exec(warna)
  const h = pendek
    ? pendek.slice(1).map(c => c + c).join('')
    : warna.replace('#', '')
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

/** rasio kontras WCAG antara dua warna hex (1–21) */
function kontras(a: string, b: string): number {
  const [la, lb] = [luminansi(a), luminansi(b)]
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

const appCss = berkas('App.css')

describe('variabel warna portal', () => {
  it('--muted dan --muted-foreground tidak boleh sewarna', () => {
    // Inilah akar bug chip tak terbaca: keduanya #657484.
    const muted = variabel('--muted', appCss)
    const mutedFg = variabel('--muted-foreground', appCss)
    expect(muted).toBeTruthy()
    expect(mutedFg).toBeTruthy()
    expect(mutedFg).not.toBe(muted)
  })
})

describe('kontras teks chip', () => {
  it('teks di atas latar chip minimal 4.5:1 (WCAG AA)', () => {
    const muted = variabel('--muted', appCss)!
    // .chip memakai latar --muted; teks harus putih (bukan --muted-foreground).
    const teks = '#ffffff'
    expect(kontras(teks, muted)).toBeGreaterThanOrEqual(4.5)
  })

  it('tidak ada aturan yang memasang --muted-foreground sebagai warna teks di atas --muted', () => {
    // Pola berbahaya: warna teks == warna latar. Periksa tiap berkas gaya.
    for (const nama of ['App.css', 'workflow-layout.css', 'label-bmn.css', 'workflow-layout.css']) {
      const css = berkas(nama)
      const bahaya = /background\s*:\s*var\(--muted\)[^;]*;\s*color\s*:\s*var\(--muted-foreground\)/.test(css)
      expect(bahaya, `${nama}: teks sewarna latar pada .chip`).toBe(false)
    }
  })
})

describe('kontras teks utama', () => {
  it('--foreground di atas --card terbaca', () => {
    expect(kontras(variabel('--foreground', appCss)!, variabel('--card', appCss)!)).toBeGreaterThanOrEqual(4.5)
  })

  it('--muted-foreground di atas --card terbaca', () => {
    expect(kontras(variabel('--muted-foreground', appCss)!, variabel('--card', appCss)!)).toBeGreaterThanOrEqual(4.5)
  })
})
