// Bangkitkan src/kode-barang-data.ts dari kelima file Excel kodefikasi BMN.
// Dijalankan: node scripts/gen-kode-lexicon.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SRC = join(ROOT, 'kode aset dan persediaan')
const OUT = join(ROOT, 'src', 'kode-barang-data.ts')

const sh = (name) => `2026_09_14-daftar-${name}.xlsx`

function rows(name, sheet) {
  const wb = XLSX.readFile(join(SRC, sh(name)))
  const ws = wb.Sheets[sheet]
  const json = XLSX.utils.sheet_to_json(ws, { header: 1 })
  return json.slice(1).filter((r) => r && r.some((c) => c !== undefined && c !== null))
}
const cl = (v) => String(v ?? '').trim()

// --- Golongan: kode -> nama
const golongan = {}
for (const r of rows('golongan', 'Golongan')) golongan[cl(r[0])] = cl(r[1])
const GOL = Object.entries(golongan).map(([code, nama]) => ({ code, nama }))

// --- Bidang: kodeBidangBarang(3 angka, ledakan golongan+bidang) -> nama ; juga golongan pemilik
const bidang = {}
const BID_GOL = {}
for (const r of rows('bidang', 'Bidang')) {
  const g = cl(r[0]); const kodeBidangBarang = cl(r[2]); const nama = cl(r[3])
  bidang[kodeBidangBarang] = nama
  BID_GOL[kodeBidangBarang] = g
}

// --- Kelompok: kodeKelompokBarang(5) -> nama
const kelompok = {}
for (const r of rows('kelompok', 'Kelompok')) kelompok[cl(r[2])] = cl(r[3])

// --- Subkelompok: kodeSubKelompokBarang(7) -> nama
const subkelompok = {}
for (const r of rows('subkelompok', 'Subkelompok')) subkelompok[cl(r[2])] = cl(r[3])

// --- Daun sub-subkelompok: kodeBarang(10) -> {sub(7), nama, satuan, dasar, jenis}
const daun = []
for (const r of rows('sub-subkelompok', 'Sub-Subkelompok')) {
  const kode = cl(r[2])
  if (!kode) continue
  daun.push({
    k: kode,
    s: cl(r[0]),          // kode subkelompok (7)
    n: cl(r[3]),          // nama
    sat: cl(r[4]),        // satuan
    d: cl(r[5]),          // dasar hukum
    j: cl(r[6]),          // jenis BMN
  })
}

// Keluaran: daftar daun + peta hierarki. Nama jalur disusun runtime agar ringkas.
const out =
  `// AUTO-GENERATED oleh scripts/gen-kode-lexicon.mjs -- JANGAN EDIT manual.\n` +
  `// Sumber: kode aset dan persediaan/*.xlsx (klasifikasi BMN).\n` +
  `export type Golongan = { code: string; nama: string }\n` +
  `export type DaunKode = { k: string; s: string; n: string; sat: string; d: string; j: string }\n` +
  `export const KODE_GOLONGAN: Golongan[] = ${JSON.stringify(GOL)}\n` +
  `export const KODE_BIDANG: Record<string, string> = ${JSON.stringify(bidang)}\n` +
  `export const KODE_BIDANG_GOLONGAN: Record<string, string> = ${JSON.stringify(BID_GOL)}\n` +
  `export const KODE_KELOMPOK: Record<string, string> = ${JSON.stringify(kelompok)}\n` +
  `export const KODE_SUBKELOMPOK: Record<string, string> = ${JSON.stringify(subkelompok)}\n` +
  `export const KODE_DAUN: DaunKode[] = ${JSON.stringify(daun)}\n`

writeFileSync(OUT, out)
console.log('ditulis:', OUT)
console.log('golongan:', GOL.length, '| bidang:', Object.keys(bidang).length,
  '| kelompok:', Object.keys(kelompok).length, '| subkelompok:', Object.keys(subkelompok).length,
  '| daun:', daun.length, '| ukuran:', (out.length / 1024).toFixed(0), 'KB')
