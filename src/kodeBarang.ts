// Ranker deterministik: memetakan teks bebas ke kode barang (persediaan & aset).
// Murni di dalam proses — tidak ada panggilan API/AI eksternal, tidak menyimpan
// teks query. Mengembalikan 2-5 kandidat + alasan + keyakinan kualitatif.
// Keputusan kode final tetap di tangan petugas (bukan otomatis).
import {
  KODE_BIDANG, KODE_BIDANG_GOLONGAN, KODE_KELOMPOK, KODE_SUBKELOMPOK,
  KODE_DAUN, KODE_GOLONGAN,
} from './kode-barang-data'
import { KODE_ALIAS } from './kode-barang-aliases'
import { KODE_DESKRIPSI } from './kode-barang-deskripsi'

export type Keyakinan = 'Sangat relevan' | 'Relevan' | 'Perlu ditinjau'
export type KandidatKode = {
  kode: string        // 10 digit, mis. 1010314002
  kodeTitik: string   // format Kemenkumham, mis. 1.01.03.14.002
  nama: string
  deskripsi: string   // penjelasan singkat berbahasa sehari-hari
  jalur: string[]     // [golongan, bidang, kelompok, subkelompok]
  satuan: string
  dasar: string
  jenis: string
  keyakinan: Keyakinan
  alasan: string[]
  skor: number
}
export type Hasil = { kandidat: KandidatKode[]; pesan?: string }

// Kata generik berfrekuensi tinggi yang memuat seluruh kosakata; menekan
// istilah "bentuk" (barang, alat, bahan) agar tidak mendominasi substansi.
const GENERIK = new Set([
  'barang', 'alat', 'bahan', 'persediaan', 'lain', 'lainnya', 'kantor',
  'kegiatan', 'untuk', 'dan', 'dari', 'atau', 'yang', 'dengan', 'bekas',
  'habis', 'pakai', 'baru', 'satuan', 'unit', 'buah', 'pack', 'dll', 'danlan',
  // kata kemasan/bentuk (bukan substansi) — mencegah "kassa gulung" -> Mesin Gulung
  'gulung', 'roll', 'lembar', 'strip', 'dus', 'botol', 'jerigen', 'kantong',
  'paket', 'set', 'ltr', 'liter', 'gram', 'kg', 'mililiter',
].map((w) => w.toLowerCase()))

const RE_KODE_TITIK = /^(\d\.\d{2}(?:\.\d{2}){1,2}(?:\.\d{3})?)$/
const RE_KODE_DIGIT = /^\d{5,10}$/

/** Normalisasi: huruf kecil, non-alfanumerik -> spasi. */
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}
function tokens(s: string): string[] {
  return norm(s).split(' ').filter(Boolean)
}

/** Ubah kode 10 digit -> format titik Kemenkumham (1.01.03.14.002). */
export function kodeKeTitik(k10: string): string {
  if (k10.length !== 10) return k10
  return `${k10[0]}.${k10.slice(1, 3)}.${k10.slice(3, 5)}.${k10.slice(5, 7)}.${k10.slice(7, 10)}`
}

/** Penjelasan otomatis bila kode belum punya deskripsi terkurasi.
 *  Disusun dari rantai klasifikasi menjadi kalimat Indonesia yang wajar —
 *  mis. dua "Blender" (alat dapur vs lab) terbaca beda, tanpa label mentah. */
const KATA_PENGHUBUNG = new Set(['dan', 'untuk', 'dari', 'atau', 'pada', 'yang', 'dengan', 'ke', 'di', 'oleh', 'serta', 'danlan'])
function judul(s: string): string {
  return s.toLowerCase().split(/\s+/).map((w) => (KATA_PENGHUBUNG.has(w) ? w : (w ? w[0].toUpperCase() + w.slice(1) : w))).join(' ')
}
function deskripsiOtomatis(p: Prep): string {
  const [gol, bid, kel, sub] = p.jalur
  const inti = sub || kel || bid || gol || 'BMN'
  let t = `${p.n ? `"${p.n}" — ` : ''}${judul(inti)}`
  if (kel && sub !== kel) t += ` (bagian dari ${judul(kel)})`
  if (bid && inti !== bid) t += ` pada bidang ${judul(bid)}`
  if (gol && inti !== gol) t += ` (golongan ${judul(gol)})`
  t += '.'
  if (p.sat) t += ` Satuan: ${p.sat}.`
  if (p.d) t += ` Dasar hukum: ${p.d}.`
  return t
}

// --- Persiapan kamus satu kali (di modul, sekali per sesi) ---
type Prep = {
  k: string; s: string; n: string; sat: string; d: string; j: string
  nameT: Set<string>; subT: Set<string>; kelT: Set<string>
  bidT: Set<string>; golT: Set<string>; satT: Set<string>
  search: string
  jalur: string[]
}
const GOL_N = new Map(KODE_GOLONGAN.map((g) => [g.code, g.nama]))
const PREP: Prep[] = KODE_DAUN.map((da) => {
  const bid = da.k.slice(0, 3)
  const kel = da.s.slice(0, 5)
  const gol = KODE_BIDANG_GOLONGAN[bid] ?? ''
  const goln = GOL_N.get(gol) ?? ''
  const bidn = KODE_BIDANG[bid] ?? ''
  const keln = KODE_KELOMPOK[kel] ?? ''
  const subn = KODE_SUBKELOMPOK[da.s] ?? ''
  const nameT = new Set(tokens(da.n))
  const subT = new Set(tokens(subn))
  const kelT = new Set(tokens(keln))
  const bidT = new Set(tokens(bidn))
  const golT = new Set(tokens(goln))
  const satT = new Set(tokens(da.sat))
  const search = [da.n, subn, keln, bidn, goln, da.sat, da.d, da.j]
    .map(norm).filter(Boolean).join(' ')
  return {
    k: da.k, s: da.s, n: da.n, sat: da.sat, d: da.d, j: da.j,
    nameT, subT, kelT, bidT, golT, satT, search,
    jalur: [goln, bidn, keln, subn].filter((x) => x),
  }
})
const PREP_BY_KODE = new Map(PREP.map((p) => [p.k, p]))

// Kode obat persediaan per bentuk sediaan (Kemenkumham 1.01.03.14, klasifikasi 1010314).
const KODE_BENTUK_OBAT: Record<string, string> = {
  padat: '1010314002', cair: '1010314001', gas: '1010314003', serbuk: '1010314004', gel: '1010314005',
}
// [kata bentuk, bentuk, keterangan]
const BENTUK_OBAT: Array<[string[], string, string]> = [
  [['tablet', 'kaplet', 'kapsul', 'pil'], 'padat', 'Obat Padat (tablet/kapsul)'],
  [['sirup', 'drop', 'tetes', 'ampul', 'cair', 'cairan', 'injeksi', 'suntik', 'infus', 'nacl', 'ringer', 'dekstrosa', 'saline', 'vial', 'tetes mata'], 'cair', 'Obat Cair (sirup/drop/injeksi/infus)'],
  [['inhaler', 'inhalasi', 'semprot', 'vapor'], 'gas', 'Obat Gas (inhaler)'],
  [['serbuk', 'bubuk', 'oralit'], 'serbuk', 'Obat Serbuk/Tepung'],
  [['salep', 'krim', 'gel', 'losion', 'foam'], 'gel', 'Obat Gel/Salep'],
]

/** Heuristik nama obat (INN): akhiran umum nama bahan obat (prazole, pril, cillin,
 *  mycin, sartan, dll). Dipakai agar nama obat yang belum ada di kamus tetap diberi
 *  arah kode persediaan obat — bukan berakhir "tidak ditemukan". */
const SUFIX_OBAT = [
  'prazole', 'pril', 'sartan', 'statin', 'cillin', 'mycin', 'conazole', 'oxacin',
  'cycline', 'olol', 'tidine', 'olac', 'azepam', 'profen', 'oxicam', 'dipine',
  'triptan', 'fenac', 'gesic', 'glitazone', 'penem', 'adin', 'troban',
]
function drugLikely(makna: string[]): boolean {
  for (const t of makna) {
    const kata = t.replace(/[^a-z]/g, '')
    if (kata.length <= 5) continue
    if (SUFIX_OBAT.some((s) => kata.endsWith(s))) return true
  }
  return false
}

/** Fallback obat: bila tidak ada kecocokan kuat tetapi ada kata bentuk sediaan
 *  (tablet/sirup/salep/kapsul/inhaler), arahkan ke kode obat sesuai bentuk
 *  sehingga obat yang tak ada di kamus tidak berakhir "tidak ditemukan".
 *  Bila nama tampak obat (INN) tanpa kata bentuk, arahkan ke bentuk paling umum. */
function fallbackObat(makna: string[]): KandidatKode[] {
  const mk = new Set(makna)
  const out: KandidatKode[] = []
  const pakai = new Set<string>()
  for (const [kata, bentuk, ket] of BENTUK_OBAT) {
    const cocok = kata.filter((x) => mk.has(x))
    if (!cocok.length) continue
    const kode = KODE_BENTUK_OBAT[bentuk]
    if (pakai.has(kode)) continue
    pakai.add(kode)
    const p = PREP_BY_KODE.get(kode)
    if (p) out.push(bakKandidat(p, 8, 'Relevan', [`Bentuk sediaan "${cocok[0]}" → ${ket} (tergolong obat persediaan)`]))
  }
  // Nama yang tampak obat (INN) tanpa kata bentuk: arahkan ke bentuk paling umum (tablet→Padat, cair).
  if (out.length === 0 && drugLikely(makna)) {
    for (const kode of ['1010314002', '1010314001']) {
      const p = PREP_BY_KODE.get(kode)
      if (p) out.push(bakKandidat(p, 4.5, 'Perlu ditinjau',
        ['Nama tampaknya obat persediaan', 'Bentuk tidak disebutkan — pilih sesuai yang dibeli (tablet→Padat, sirup/injeksi→Cair)']))
    }
  }
  return out
}

function bakKandidat(p: Prep, skor: number, keyakinan: Keyakinan, alasan: string[]): KandidatKode {
  return {
    kode: p.k,
    kodeTitik: kodeKeTitik(p.k),
    nama: p.n,
    deskripsi: KODE_DESKRIPSI[p.k] ?? deskripsiOtomatis(p),
    jalur: p.jalur,
    satuan: p.sat,
    dasar: p.d,
    jenis: p.j,
    keyakinan,
    alasan: dedup(alasan),
    skor,
  }
}
function dedup(a: string[]): string[] { return Array.from(new Set(a)) }

/** Pencocokan kode numerik (tiket/kode/serial) bila input berupa angka. */
function cariKodeNumerik(q: string): KandidatKode[] {
  const d = q.replace(/[^\d]/g, '')
  let matches: Prep[] = []
  if (d.length >= 5) {
    matches = PREP.filter((p) => p.k === d || p.k.startsWith(d) || p.s === d)
  }
  matches.sort((a, b) => a.k.length - b.k.length)
  return matches.slice(0, 5).map((p) =>
    bakKandidat(p, 10, p.k === d ? 'Sangat relevan' : 'Relevan',
      p.k === d ? ['Kode cocok persis'] : [`Kode/kelompok diawali ${q}`]))
}

/** Ranker utama: teks bebas -> kandidat kode. */
export function rekomendasiKode(query: string, limit = 5): Hasil {
  const q = (query ?? '').trim()
  if (!q) return { kandidat: [], pesan: 'Ketik nama barang atau kode untuk mencari.' }
  if (RE_KODE_TITIK.test(q) || RE_KODE_DIGIT.test(q)) {
    const k = cariKodeNumerik(q)
    return k.length ? { kandidat: k } : { kandidat: [], pesan: 'Kode tidak ditemukan. Pastikan format nomor benar.' }
  }

  const qt = tokens(q)
  const makna = qt.filter((t) => !GENERIK.has(t))
  if (makna.length === 0) {
    return { kandidat: [], pesan: 'Tambah kata kunci yang lebih spesifik (mis. nama barang, bahan, atau fungsinya).' }
  }
  const frase = norm(q)

  const scored: KandidatKode[] = []
  for (const p of PREP) {
    const hit: string[] = []   // [label-lokasi, token]
    let skor = 0
    // Kecocokan NAMA RESMI PERSIS (mis. query "mixer" = kode "Mixer") menang besar —
    // agar kode umum yang dimaksud muncul di urutan teratas, bukan tertimbun 50 varian.
    if (norm(p.n) === frase) { skor += 18; hit.push(`Nama resmi persis "${p.n}"`) }
    for (const t of makna) {
      if (p.nameT.has(t)) { skor += 3.5; hit.push(`Nama "${t}"`) }
      else if (p.subT.has(t)) { skor += 2.2; hit.push(`Subkelompok "${t}"`) }
      else if (p.kelT.has(t)) { skor += 1.5; hit.push(`Kelompok "${t}"`) }
      else if (p.bidT.has(t)) { skor += 0.9; hit.push(`Bidang "${t}"`) }
      else if (p.golT.has(t)) { skor += 0.5; hit.push(`Golongan "${t}"`) }
      else if (p.satT.has(t)) { skor += 0.7; hit.push(`Satuan "${t}"`) }
    }
    // Alias/sinonim: kecocokan utuh frasa alias bernilai kuat.
    let aliasKetemu = ''
    for (const al of KODE_ALIAS[p.k] ?? []) {
      const at = tokens(al)
      if (at.length && at.every((a) => makna.includes(a))) {
        // Alias lebih spesifik (banyak kata) menang atas alias umum — mis. "ambroxol sirup" > "ambroxol".
        const extra = at.length > 1 ? 2 * (at.length - 1) : 0
        skor += 9 + extra; aliasKetemu = al; break
      }
    }
    if (aliasKetemu) hit.push(`Sinonim "${aliasKetemu}" → ${p.n}`)
    // Frasa utuh pada jalur/identitas.
    if (frase.length >= 3 && p.search.includes(frase)) { skor += 5; hit.push(`Frasa "${frase}"`) }
    // Sinergi beberapa kata kunci yang cocok.
    const unik = new Set(hit.filter((h) => !h.startsWith('Sinonim') && !h.startsWith('Frasa'))
      .map((h) => h.split(' ')[1] ?? ''))
    if (unik.size >= 2) skor += 1.2 * (unik.size - 1)
    if (skor >= 0.6) {
      const frasematch = frase.length >= 4 && p.search.includes(frase)
      const kuat2 = aliasKetemu !== '' || (unik.size >= 2 && (skor >= 7 || frasematch))
      const keyakinan: Keyakinan = kuat2 ? 'Sangat relevan'
        : skor >= 3.4 ? 'Relevan'
        : 'Perlu ditinjau'
      scored.push(bakKandidat(p, skor, keyakinan, hit))
    }
  }
  scored.sort((a, b) => b.skor - a.skor)
  let kandidat = scored.slice(0, limit)
  // Fallback obat: bila tidak ada kecocokan kuat tetapi ada kata bentuk sediaan,
  // arahkan ke kode obat sesuai bentuk (mis. "amoksisilin kapsul" / "sirup").
  const adaKuat = scored.some((s) => s.keyakinan === 'Sangat relevan' || s.skor >= 3.4)
  if (!adaKuat) {
    const fb = fallbackObat(makna)
    if (fb.length) {
      const terpakai = new Set(kandidat.map((k) => k.kode))
      kandidat = [...fb, ...kandidat.filter((k) => !terpakai.has(k.kode))].slice(0, limit)
    }
  }
  if (kandidat.length === 0) {
    return { kandidat: [], pesan: 'Tidak ada kode yang cukup cocok. Coba tambah jenis barang, bahan, atau fungsinya.' }
  }
  return { kandidat }
}
