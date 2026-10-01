/**
 * Impor Master Aset SIMAN ke database lokal portal.
 *
 * Jalankan ulang setiap kali ada export baru:
 *   npm run import:bmn -- "C:/Users/WANDANA/Documents/Kanwil/Master Aset/Master aset 30 september 2026.xlsx"
 *
 * Langkah ini hanya menulis ke .local-data/bmn-assets.sqlite dan tidak
 * menyentuh database Supabase. Pemindahan ke produksi dilakukan terpisah
 * lewat migrasi SQL setelah datanya disetujui.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { BmnAssetStore } from '../local-api/bmnAssets.ts'

const args = process.argv.slice(2).filter((a) => a !== '--')
const xlsx = args[0]
if (!xlsx) {
  console.error('Pemakaian: npm run import:bmn -- "path/Master aset.xlsx"')
  process.exit(1)
}
const input = resolve(xlsx)
if (!existsSync(input)) {
  console.error(`Berkas tidak ditemukan: ${input}`)
  process.exit(1)
}

const cacheDir = resolve(process.cwd(), '.local-data')
mkdirSync(cacheDir, { recursive: true })
const jsonPath = resolve(cacheDir, 'bmn-extract.json')

// openpyxl hanya tersedia di Python. Urutan kandidat: variabel lingkungan
// PYTHON lebih dulu, lalu interpreter bawaan.
const candidates = [
  ...(process.env.PYTHON ? [process.env.PYTHON] : []),
  'python',
  'python3',
  'py -3.12',
  'py -3.11',
  'py',
]
let extracted = false
for (const cmd of candidates) {
  // Path bisa mengandung spasi, jadi/apit setiap argumen.
  const quote = (value: string) => `"${value.replace(/"/g, '\\"')}"`
  const command = `${cmd} scripts/extract-bmn-assets.py ${quote(input)} -o ${quote(jsonPath)}`
  const run = spawnSync(command, { stdio: 'inherit', shell: true })
  if (run.status === 0) {
    extracted = true
    break
  }
}
if (!extracted) {
  console.error('\nGagal menjalankan ekstraktor Python.')
  console.error('Pasang openpyxl:  pip install openpyxl')
  console.error('Atau tunjuk interpreter yang benar:  set PYTHON=/path/ke/python.exe')
  process.exit(1)
}

const payload = JSON.parse(readFileSync(jsonPath, 'utf8'))
const store = new BmnAssetStore(resolve(cacheDir, 'bmn-assets.sqlite'))
const meta = store.replaceSnapshot(payload)
const ringkasan = store.overview()

console.log('')
console.log('=== Data Master Aset masuk database lokal ===')
console.log(`tanggal snapshot : ${meta.snapshot_date}`)
console.log(`berkas sumber    : ${meta.source_file}`)
console.log(`baris diproses   : ${meta.total_baris.toLocaleString('id-ID')}`)
console.log(`satker           : ${meta.jumlah_satker}`)
console.log(`jenis BMN        : ${meta.jumlah_jenis}`)
console.log(`baris tersimpan  : ${payload.baris.length.toLocaleString('id-ID')}`)
console.log(`total aset       : ${ringkasan?.totalAset.toLocaleString('id-ID')}`)
console.log(`total nilai      : Rp ${Math.round(ringkasan?.totalNilai ?? 0).toLocaleString('id-ID')}`)
console.log(`diimpor pada     : ${meta.imported_at}`)
store.close()
