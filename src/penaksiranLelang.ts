// Generator data pembanding lelang DJKN sesuai KMK 375/2024 angka 3 & 4:
// tahapan pencarian komprehensif Tahap 1–10 dengan perluasan wilayah KPKNL,
// batas tahun transaksi maksimal 3 tahun, dan aturan khusus Batam/Sabang.
// Murni — tanpa DOM/React, agar bisa dites dan dipakai ulang.
import type { BarisLelang } from './penaksiranKendaraan'

/** Satu baris basis data harga lelang kendaraan bermotor DJKN. */
export type KandidatLelang = {
  kode: string
  kategoriObjek: string // 'Mobil' | 'Motor'
  kpknl: string // 'KPKNL Pekanbaru'
  tahunLelang: number
  /** Kategori lokasi PKKNL terkait (PKPN semester terkini di basis data). */
  katLokasi: number | null
  /** Label kolom semester sumber kategori, mis. 'SEMESTER I 2025'. */
  sumberKat: string
  merek: string
  tipe: string
  tahunPembuatan: number
  warna: string
  harga: number // nilai terbentuk lelang (M0)
}

export type OpsiObjek = {
  kpknl: string // rencana lokasi lelang, bentuk 'KPKNL Pekanbaru'
  kategoriObjek: 'Mobil' | 'Motor'
  merek: string
  tipe: string
  tahunPembuatan: number
  tahunTaksiran: number
}

export type HasilGenerate = {
  baris: BarisLelang[]
  ringkasanTahap: { tahap: number; jumlah: number }[]
  catatan: string[]
}

// ─── Peta wilayah KPKNL ────────────────────────────────────────────────────
// Kunci = nama KPKNL tanpa prefiks, huruf kecil, tanpa tanda baca/spasi.

type Provinsi =
  | 'aceh' | 'sumut' | 'sumbar' | 'riau' | 'kepri' | 'jambi' | 'sumsel' | 'babel'
  | 'bengkulu' | 'lampung' | 'dki' | 'banten' | 'jabar' | 'jateng' | 'diy' | 'jatim'
  | 'bali' | 'ntb' | 'ntt' | 'kalbar' | 'kalteng' | 'kalsel' | 'kaltim' | 'kaltara'
  | 'sulut' | 'gorontalo' | 'sulteng' | 'sulsel' | 'sultra' | 'maluku' | 'malut'
  | 'papua' | 'papuabarat'

const WILAYAH: Record<string, Provinsi> = {
  // Sumatera
  bandaaceh: 'aceh', lhokseumawe: 'aceh',
  medan: 'sumut', kisaran: 'sumut', pematangsiantar: 'sumut',
  padangsidempuan: 'sumut', padangsidimpuan: 'sumut', // dua ejaan di data DJKN
  padang: 'sumbar', bukittinggi: 'sumbar',
  pekanbaru: 'riau', dumai: 'riau',
  batam: 'kepri',
  jambi: 'jambi',
  palembang: 'sumsel', lahat: 'sumsel',
  pangkalpinang: 'babel',
  bengkulu: 'bengkulu',
  bandarlampung: 'lampung', metro: 'lampung',
  // Jawa
  jakartai: 'dki', jakartaii: 'dki', jakartaiii: 'dki', jakartaiv: 'dki', jakartav: 'dki',
  serang: 'banten', tangerangi: 'banten', tangerangii: 'banten',
  bandung: 'jabar', bekasi: 'jabar', bogor: 'jabar', cirebon: 'jabar',
  purwakarta: 'jabar', tasikmalaya: 'jabar',
  purwokerto: 'jateng', semarang: 'jateng', pekalongan: 'jateng', surakarta: 'jateng', tegal: 'jateng',
  yogyakarta: 'diy',
  surabaya: 'jatim', sidoarjo: 'jatim', malang: 'jatim', jember: 'jatim', madiun: 'jatim', pamekasan: 'jatim',
  // Bali & Nusa Tenggara
  denpasar: 'bali', singaraja: 'bali',
  mataram: 'ntb', bima: 'ntb',
  kupang: 'ntt',
  // Kalimantan
  pontianak: 'kalbar', singkawang: 'kalbar',
  palangkaraya: 'kalteng',
  banjarmasin: 'kalsel',
  balikpapan: 'kaltim', samarinda: 'kaltim', bontang: 'kaltim',
  tarakan: 'kaltara',
  // Sulawesi
  manado: 'sulut', gorontalo: 'gorontalo',
  palu: 'sulteng', mamuju: 'sulteng',
  makassar: 'sulsel', palopo: 'sulsel', parepare: 'sulsel',
  kendari: 'sultra',
  // Maluku & Papua
  ambon: 'maluku', ternate: 'malut',
  jayapura: 'papua', sorong: 'papuabarat', biak: 'papuabarat',
}

// Provinsi berbatasan langsung (darat / selat sempit) untuk perluasan urutan pertama.
const TETANGGA: Record<Provinsi, Provinsi[]> = {
  aceh: ['sumut'],
  sumut: ['aceh', 'sumbar', 'riau'],
  sumbar: ['sumut', 'riau', 'jambi', 'bengkulu'],
  riau: ['sumut', 'sumbar', 'jambi', 'kepri'],
  kepri: ['riau', 'sumsel', 'babel'],
  jambi: ['sumbar', 'riau', 'sumsel', 'bengkulu'],
  sumsel: ['jambi', 'bengkulu', 'lampung', 'babel', 'kepri', 'kalbar'],
  babel: ['sumsel', 'lampung', 'kepri'],
  bengkulu: ['sumbar', 'jambi', 'sumsel', 'lampung'],
  lampung: ['sumsel', 'bengkulu', 'babel', 'banten'],
  dki: ['banten', 'jabar'],
  banten: ['dki', 'jabar', 'lampung'],
  jabar: ['dki', 'banten', 'jateng'],
  jateng: ['jabar', 'diy', 'jatim'],
  diy: ['jateng', 'jatim'],
  jatim: ['jateng', 'diy'],
  bali: ['jatim', 'ntb'],
  ntb: ['bali', 'ntt'],
  ntt: ['ntb'],
  kalbar: ['sumsel', 'kalteng'],
  kalteng: ['kalbar', 'kalsel', 'kaltim', 'sumsel'],
  kalsel: ['kalteng', 'kaltim'],
  kaltim: ['kalsel', 'kalteng', 'kaltara'],
  kaltara: ['kaltim'],
  sulut: ['gorontalo'],
  gorontalo: ['sulut', 'sulteng'],
  sulteng: ['gorontalo', 'sulsel', 'sultra'],
  sulsel: ['sulteng', 'sultra'],
  sultra: ['sulsel', 'sulteng'],
  maluku: ['malut'],
  malut: ['maluku'],
  papua: ['papuabarat'],
  papuabarat: ['papua'],
}

const PULAU_SUMATERA: Provinsi[] = ['aceh', 'sumut', 'sumbar', 'riau', 'kepri', 'jambi', 'sumsel', 'babel', 'bengkulu', 'lampung']
const PULAU_JAWA: Provinsi[] = ['dki', 'banten', 'jabar', 'jateng', 'diy', 'jatim']
const KALIMANTAN_TIMUR_GROUP: Provinsi[] = ['kaltara', 'kaltim', 'kalteng', 'kalsel'] // urutan kedua: Surabaya & Sidoarjo
const PULAU_SULAMPAPUA: Provinsi[] = ['sulut', 'gorontalo', 'sulteng', 'sulsel', 'sultra', 'maluku', 'malut', 'papua', 'papuabarat']
const PULAU_BALINUSRA: Provinsi[] = ['bali', 'ntb', 'ntt']

// Data KPKNL Batam dan Sabang tidak boleh dipakai di luar kotanya, dan
// pencarian dari kotanya itu tidak diperluas (KMK 375 angka 3.d.7).
const KPKNL_TERKUNCI = new Set(['batam'])

// Jakarta, Bogor, Tangerang, dan Bekasi — pasangan perluasan urutan kedua
// untuk rencana lokasi di Sumatera dan Kalimantan Barat (KMK 375 angka 3.d.2/3).
const JBT_KEYS = ['jakartai', 'jakartaii', 'jakartaiii', 'jakartaiv', 'jakartav', 'bogor', 'tangerangi', 'tangerangii', 'bekasi']

export function normTeks(s: string): string {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** 'KPKNL Pekanbaru' → 'pekanbaru'; 'Pekanbaru' → 'pekanbaru'. */
export function kunciKpknl(kpknl: string): string {
  return normTeks(String(kpknl || '').replace(/^KPKNL\s*/i, ''))
}

export function namaLokasi(kpknl: string): string {
  return String(kpknl || '').replace(/^KPKNL\s*/i, '').trim()
}

const provDari = (kpknl: string): Provinsi | null => WILAYAH[kunciKpknl(kpknl)] ?? null

/** Set KPKNL urutan pencarian sesuai KMK 375 angka 3.d (1 = berbatasan, 2, 3 = seluruh Indonesia). */
export function wilayahPencarian(kpknlObjek: string, urutan: 1 | 2 | 3): Set<string> {
  const semua = new Set(Object.keys(WILAYAH))
  const prov = provDari(kpknlObjek)
  const kunci = kunciKpknl(kpknlObjek)
  if (!prov) return semua // lokasi tak dikenal → tidak membatasi
  if (KPKNL_TERKUNCI.has(kunci)) return new Set([kunci]) // Batam/Sabang: tidak diperluas
  if (urutan === 3) return semua
  if (urutan === 2) {
    const target = new Set<string>()
    const tambahProvinsi = (provs: Provinsi[]) => {
      for (const [k, p] of Object.entries(WILAYAH)) if (provs.includes(p)) target.add(k)
    }
    if (PULAU_SUMATERA.includes(prov)) {
      tambahProvinsi(PULAU_SUMATERA)
      for (const kota of JBT_KEYS) target.add(kota)
    } else if (PULAU_JAWA.includes(prov)) {
      tambahProvinsi(PULAU_JAWA)
    } else if (prov === 'kalbar') {
      for (const kota of JBT_KEYS) target.add(kota)
    } else if (KALIMANTAN_TIMUR_GROUP.includes(prov)) {
      target.add('surabaya'); target.add('sidoarjo')
    } else if (PULAU_SULAMPAPUA.includes(prov)) {
      target.add('makassar'); target.add('surabaya'); target.add('sidoarjo')
    } else if (PULAU_BALINUSRA.includes(prov)) {
      target.add('denpasar'); target.add('surabaya'); target.add('sidoarjo')
    }
    return target
  }
  // urutan 1: Sumatera & Jawa = provinsi sendiri + tetangga; wilayah lain = satu provinsi
  const target = new Set<string>()
  const provs: Provinsi[] = (PULAU_SUMATERA.includes(prov) || PULAU_JAWA.includes(prov))
    ? [prov, ...TETANGGA[prov]]
    : [prov]
  for (const [k, p] of Object.entries(WILAYAH)) if (provs.includes(p)) target.add(k)
  return target
}

// ─── Pencocokan merek/tipe/tahun ───────────────────────────────────────────

/** Tipe dianggap sama hanya bila identik setelah normalisasi (huruf, spasi, tanda baca). */
export function tipeSama(a: string, b: string): boolean {
  const na = normTeks(a)
  const nb = normTeks(b)
  if (!na || !nb) return false
  return na === nb
}

/** Kedekatan tipe untuk merek berbeda (Tahap 9–10): jumlah token tipe yang sama. */
function skorTipe(tipeObjek: string, tipeKandidat: string): number {
  const a = normTeks(tipeObjek)
  const b = normTeks(tipeKandidat)
  if (!a || !b) return 0
  if (a === b) return 100
  if (a.includes(b) || b.includes(a)) return 50
  const tokensA = new Set((tipeObjek || '').toLowerCase().split(/\s+/).filter(t => t.length > 1))
  const tokensB = (tipeKandidat || '').toLowerCase().split(/\s+/).filter(t => t.length > 1)
  let sama = 0
  for (const t of tokensB) if (tokensA.has(t)) sama++
  return sama
}

// ─── Mesin tahapan pencarian (KMK 375 angka 4) ─────────────────────────────

type CakupanTahap = {
  tahap: number
  /** 0 = wilayah kerja; 1/2/3 = perluasan; 123 = gabungan urutan 1+2+3 (Tahap 10). */
  wilayah: 0 | 1 | 2 | 3 | 123
  merek: 'sama' | 'beda'
  tipe: 'sama' | 'bebas' | 'dekat'
  tahun: 'sama' | 'dekat'
}

// 'bebas' = tipe sama diutamakan, lalu tipe lain (Tahap 3–8: merek sama, tahun ±5 —
// contoh resmi KMK memakai tipe sama dengan tahun berbeda pada Tahap 3).
const TAHAPAN: CakupanTahap[] = [
  { tahap: 1, wilayah: 0, merek: 'sama', tipe: 'sama', tahun: 'sama' },
  { tahap: 2, wilayah: 1, merek: 'sama', tipe: 'sama', tahun: 'sama' },
  { tahap: 3, wilayah: 0, merek: 'sama', tipe: 'bebas', tahun: 'dekat' },
  { tahap: 4, wilayah: 1, merek: 'sama', tipe: 'bebas', tahun: 'dekat' },
  { tahap: 5, wilayah: 2, merek: 'sama', tipe: 'sama', tahun: 'sama' },
  { tahap: 6, wilayah: 2, merek: 'sama', tipe: 'bebas', tahun: 'dekat' },
  { tahap: 7, wilayah: 3, merek: 'sama', tipe: 'sama', tahun: 'sama' },
  { tahap: 8, wilayah: 3, merek: 'sama', tipe: 'bebas', tahun: 'dekat' },
  { tahap: 9, wilayah: 0, merek: 'beda', tipe: 'dekat', tahun: 'dekat' },
  { tahap: 10, wilayah: 123, merek: 'beda', tipe: 'dekat', tahun: 'dekat' },
]

const MIN_BARIS = 3
const MAX_BARIS = 7

export function kategoriDariJenis(jenis: 'roda2' | 'roda4'): 'Mobil' | 'Motor' {
  return jenis === 'roda2' ? 'Motor' : 'Mobil'
}

/**
 * Jalankan tahapan pencarian atas kandidat lelang DJKN.
 *
 * Urutan eksekusi dikelompokkan per TINGKAT KESAMAAN SPESIFIKASI (KMK 375 angka 3.a:
 * "data dengan tipe yang memiliki spesifikasi yang paling mendekati spesifikasi objek"),
 * karena selisih wilayah dinetralkan secara sistematis oleh penyesuaian lokasi 5%/kategori:
 *   Tingkat 1 — merek+tipe+tahun pembuatan persis: Tahap 1 → 2 → 5 → 7 (melebar wilayah).
 *   Tingkat 2 — merek sama, tahun ±5: Tahap 3/4/6/8 digabung, diurutkan spesifikasi
 *               terdekat → wilayah terdekat → tahun terdekat → harga terendah.
 *   Tingkat 3 — merek berbeda, spesifikasi mendekati: Tahap 9 → 10.
 * Berhenti ketika total ≥ 3; bila satu tingkat melampaui 7 data, diambil data bernilai
 * terendah pada pencarian terakhir hingga tepat 7 (KMK angka 4.b).
 */
export function generateBarisPembanding(
  kandidat: KandidatLelang[],
  objek: OpsiObjek,
): HasilGenerate {
  const catatan: string[] = []
  const batasTahunLelang = objek.tahunTaksiran - 3
  const kunciWilayah = {
    0: new Set([kunciKpknl(objek.kpknl)]),
    1: wilayahPencarian(objek.kpknl, 1),
    2: wilayahPencarian(objek.kpknl, 2),
    3: wilayahPencarian(objek.kpknl, 3),
  }
  const objekTerkunci = KPKNL_TERKUNCI.has(kunciKpknl(objek.kpknl))
  if (objekTerkunci) {
    catatan.push('Rencana lokasi Batam/Sabang: pencarian tidak diperluas ke wilayah lain (KMK 375 angka 3.d.7).')
  }

  const sudahDipakai = new Set<string>()
  const terpilih: { k: KandidatLelang; tahap: number }[] = []

  const ambilDari = (kolam: KandidatLelang[], tahap: number) => {
    const sisa = MAX_BARIS - terpilih.length
    // kolam sudah terurut sesuai prioritas tahapannya; ambil paling atas hingga sisa.
    // Aturan "nilai terendah" (KMK angka 4.b) terpenuhi karena kolam Tingkat 1 yang
    // spesifikasinya identik diurutkan dari harga terendah; pada tingkat spesifikasi
    // campuran, urutan "paling mendekati spesifikasi objek" (angka 3.a.1) yang berlaku.
    const ambil = kolam.filter(k => !sudahDipakai.has(k.kode)).slice(0, sisa)
    for (const k of ambil) {
      sudahDipakai.add(k.kode)
      terpilih.push({ k, tahap })
    }
  }

  const lolosDasar = (k: KandidatLelang, merek: 'sama' | 'beda'): boolean => {
    if (!k.merek || !k.kode || !k.katLokasi) return false
    if (!k.harga || !k.tahunLelang || !k.tahunPembuatan) return false // tanpa harga tidak berguna sebagai pembanding
    if (k.kategoriObjek !== objek.kategoriObjek) return false
    if (!objekTerkunci && KPKNL_TERKUNCI.has(kunciKpknl(k.kpknl))) return false
    if (k.tahunLelang > objek.tahunTaksiran || k.tahunLelang < batasTahunLelang) return false
    const merekSama = normTeks(k.merek) === normTeks(objek.merek)
    if (merek === 'sama' && !merekSama) return false
    if (merek === 'beda' && merekSama) return false
    return true
  }

  // ── Tingkat 1: merek+tipe+tahun pembuatan persis, melebar wilayah (Tahap 1,2,5,7) ──
  for (const def of TAHAPAN.filter(t => t.tipe === 'sama' && t.tahun === 'sama')) {
    if (terpilih.length >= MIN_BARIS) break
    const setWilayah: Set<string> = def.wilayah === 0
      ? kunciWilayah[0]
      : kunciWilayah[def.wilayah as 1 | 2 | 3]
    const kolam = kandidat.filter(k =>
      lolosDasar(k, def.merek)
      && setWilayah.has(kunciKpknl(k.kpknl))
      && k.tahunPembuatan === objek.tahunPembuatan
      && tipeSama(objek.tipe, k.tipe))
    kolam.sort((a, b) => a.harga - b.harga)
    ambilDari(kolam, def.tahap)
  }
  if (terpilih.length >= MIN_BARIS) return selesaikan(terpilih, catatan)

  // ── Tingkat 2: merek sama, tahun pembuatan ±5 (Tahap 3/4/6/8 digabung) ──
  // Diutamakan spesifikasi tipe terdekat (KMK angka 3.a.1), lalu wilayah terdekat,
  // lalu tahun terdekat, lalu harga terendah. Label tahap mengikuti wilayah baris.
  // Bertingkat menurut tahun: selisih ±3 tahun didahulukan di seluruh wilayah
  // (KMK angka 3.b "prioritas data yang terdekat"), baru selisih 4–5 tahun.
  {
    const ringTahap: { ring: 0 | 1 | 2 | 3; tahap: number }[] = [
      { ring: 0, tahap: 3 }, { ring: 1, tahap: 4 }, { ring: 2, tahap: 6 }, { ring: 3, tahap: 8 },
    ]
    const ringDari = (k: KandidatLelang): 0 | 1 | 2 | 3 => {
      const kunci = kunciKpknl(k.kpknl)
      if (kunciWilayah[0].has(kunci)) return 0
      if (kunciWilayah[1].has(kunci)) return 1
      if (kunciWilayah[2].has(kunci)) return 2
      return 3
    }
    const urutan = (a: KandidatLelang, b: KandidatLelang) => {
      const tipeA = -skorTipe(objek.tipe, a.tipe)
      const tipeB = -skorTipe(objek.tipe, b.tipe)
      if (tipeA !== tipeB) return tipeA - tipeB
      const ring = ringDari(a) - ringDari(b)
      if (ring !== 0) return ring
      const tahun = Math.abs(a.tahunPembuatan - objek.tahunPembuatan) - Math.abs(b.tahunPembuatan - objek.tahunPembuatan)
      if (tahun !== 0) return tahun
      return a.harga - b.harga
    }
    for (const jarakMaks of [3, 5]) {
      if (terpilih.length >= MIN_BARIS) break
      const kolam = kandidat.filter(k =>
        lolosDasar(k, 'sama')
        && Math.abs(k.tahunPembuatan - objek.tahunPembuatan) <= jarakMaks
        && Math.abs(k.tahunPembuatan - objek.tahunPembuatan) > (jarakMaks === 3 ? -1 : 3))
      kolam.sort(urutan)
      ambilDari(kolam, 0) // tahap ditentukan per baris di bawah
      // tetapkan label tahap sesuai ring tiap baris yang baru diambil
      for (let i = terpilih.length - 1; i >= 0 && terpilih[i].tahap === 0; i--) {
        terpilih[i].tahap = ringTahap.find(r => r.ring === ringDari(terpilih[i].k))!.tahap
      }
    }
  }
  if (terpilih.length >= MIN_BARIS) return selesaikan(terpilih, catatan)

  // ── Tingkat 3: merek berbeda, spesifikasi mendekati (Tahap 9,10) ──
  for (const def of TAHAPAN.filter(t => t.merek === 'beda')) {
    if (terpilih.length >= MIN_BARIS) break
    const setWilayah: Set<string> = def.wilayah === 123
      ? new Set([...kunciWilayah[1], ...kunciWilayah[2], ...kunciWilayah[3]])
      : def.wilayah === 0
        ? kunciWilayah[0]
        : kunciWilayah[def.wilayah as 1 | 2 | 3]
    const kolam = kandidat.filter(k =>
      lolosDasar(k, def.merek)
      && setWilayah.has(kunciKpknl(k.kpknl))
      && Math.abs(k.tahunPembuatan - objek.tahunPembuatan) <= 5)
    kolam.sort((a, b) => {
      const tipe = -skorTipe(objek.tipe, a.tipe) - -skorTipe(objek.tipe, b.tipe)
      if (tipe !== 0) return tipe
      const tahun = Math.abs(a.tahunPembuatan - objek.tahunPembuatan) - Math.abs(b.tahunPembuatan - objek.tahunPembuatan)
      if (tahun !== 0) return tahun
      return a.harga - b.harga
    })
    ambilDari(kolam, def.tahap)
  }

  return selesaikan(terpilih, catatan)
}

function selesaikan(terpilih: { k: KandidatLelang; tahap: number }[], catatan: string[]): HasilGenerate {
  const ringkasanTahap: { tahap: number; jumlah: number }[] = []
  for (const t of terpilih) {
    const entri = ringkasanTahap.find(r => r.tahap === t.tahap)
    if (entri) entri.jumlah++
    else ringkasanTahap.push({ tahap: t.tahap, jumlah: 1 })
  }
  if (terpilih.length < MIN_BARIS) {
    catatan.push(`Hanya ${terpilih.length} data ditemukan sampai Tahap 10 — minimal ${MIN_BARIS} data. Tambahkan pembanding secara manual.`)
  }
  const baris = terpilih.map(({ k, tahap }) => ({
    merek: k.merek,
    kodeLelang: k.kode,
    tipe: k.tipe,
    hargaLelang: k.harga,
    tahunLelang: k.tahunLelang,
    lokasiLelang: namaLokasi(k.kpknl),
    kategoriLokasiLelang: (k.katLokasi ?? 2) as BarisLelang['kategoriLokasiLelang'],
    tahunPembuatanLelang: k.tahunPembuatan,
    penyesuaianTipe: 0,
    penyesuaianMerek: 0,
    hargaBaru: 0,
    tahap,
  }))
  return { baris, ringkasanTahap, catatan }
}

/** Keterangan pintar per baris pembanding: selisih tipe, tahun pembuatan, dan kategori lokasi. */
export function keteranganPembanding(
  b: Pick<BarisLelang, 'tipe' | 'kategoriLokasiLelang' | 'tahunPembuatanLelang'>,
  objek: { tipe: string; tahunPembuatan: number; kategoriLokasiObjek: number },
): string {
  const catatan: string[] = []
  if (tipeSama(objek.tipe, b.tipe)) catatan.push('tipe sama')
  else if (skorTipe(objek.tipe, b.tipe) >= 50) catatan.push('tipe satu varian — spesifikasi mendekati')
  else catatan.push('tipe berbeda — nilai penyesuaian tipe (±8%)')
  const dT = b.tahunPembuatanLelang - objek.tahunPembuatan
  if (dT === 0) catatan.push('tahun pembuatan sama')
  else catatan.push(`tahun ${Math.abs(dT)} th ${dT > 0 ? 'lebih muda' : 'lebih tua'}`)
  if (b.kategoriLokasiLelang !== objek.kategoriLokasiObjek) {
    catatan.push(`kategori lokasi ${b.kategoriLokasiLelang} vs objek ${objek.kategoriLokasiObjek} (±5%/kategori)`)
  }
  return catatan.join(' · ')
}

// ─── Ringkasan basis data untuk autosuggest ────────────────────────────────

/** Kategori lokasi per KPKNL (nilai terbanyak) + label semester sumbernya. */
export function kategoriPerKpknl(kandidat: KandidatLelang[]): Map<string, { kat: number; sumber: string }> {
  const hitung = new Map<string, Map<number, number>>()
  const sumber = new Map<string, string>()
  for (const k of kandidat) {
    if (!k.kpknl || k.katLokasi == null) continue
    const kunci = kunciKpknl(k.kpknl)
    if (!hitung.has(kunci)) hitung.set(kunci, new Map())
    const dalam = hitung.get(kunci)!
    dalam.set(k.katLokasi, (dalam.get(k.katLokasi) ?? 0) + 1)
    if (k.sumberKat && !sumber.has(kunci)) sumber.set(kunci, k.sumberKat)
  }
  const hasil = new Map<string, { kat: number; sumber: string }>()
  for (const [kunci, dalam] of hitung) {
    let terbaik = 0
    let kat = 0
    for (const [k, n] of dalam) {
      if (n > terbaik || (n === terbaik && k < kat)) { terbaik = n; kat = k }
    }
    hasil.set(kunci, { kat, sumber: sumber.get(kunci) ?? '' })
  }
  return hasil
}

export function daftarKpknl(kandidat: KandidatLelang[]): { nama: string; kat: number | null }[] {
  const kat = kategoriPerKpknl(kandidat)
  const nama = Array.from(new Set(kandidat.map(k => k.kpknl).filter(Boolean)))
  nama.sort((a, b) => a.localeCompare(b, 'id'))
  return nama.map(n => ({ nama: n, kat: kat.get(kunciKpknl(n))?.kat ?? null }))
}

export function daftarMerek(kandidat: KandidatLelang[]): string[] {
  return Array.from(new Set(kandidat.map(k => k.merek).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'id'))
}

export function daftarTipe(kandidat: KandidatLelang[], merek?: string): string[] {
  const sumber = merek ? kandidat.filter(k => normTeks(k.merek) === normTeks(merek)) : kandidat
  return Array.from(new Set(sumber.map(k => k.tipe.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'id')).slice(0, 500)
}
