import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import type { LelangRow } from './types.js'

/** Satu baris CSV menjadi daftar kolom (mendukung tanda kutip dengan koma di dalamnya). */
function parseCsvLine(line: string): string[] {
  const kolom: string[] = []
  let sel = ''
  let dalamKutip = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (dalamKutip) {
      if (c === '"' && line[i + 1] === '"') { sel += '"'; i++ }
      else if (c === '"') dalamKutip = false
      else sel += c
    } else if (c === '"') {
      dalamKutip = true
    } else if (c === ',') {
      kolom.push(sel.trim()); sel = ''
    } else {
      sel += c
    }
  }
  kolom.push(sel.trim())
  return kolom
}

const normHeader = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '')

export class LelangSqliteStore {
  private readonly db: DatabaseSync

  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true })
    this.db = new DatabaseSync(path)
    this.ensureSchema()
  }

  private ensureSchema() {
    const ada = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='lelang_data'")
      .get() as { name: string } | undefined
    if (ada) {
      // Skema lama (kolom semester_ii_*) dihapus agar seed mengisi ulang dengan skema baru.
      const kolom = this.db.prepare('PRAGMA table_info(lelang_data)').all() as Array<{ name: string }>
      if (!kolom.some(c => c.name === 'kat_lokasi')) {
        this.db.exec('DROP TABLE lelang_data')
      }
    }
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS lelang_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kode TEXT NOT NULL,
        kategori_objek TEXT NOT NULL,
        kpknl TEXT NOT NULL,
        tahun_lelang INTEGER NOT NULL,
        kat_lokasi_sebelumnya INTEGER,
        kat_lokasi INTEGER,
        kat_lokasi_sumber TEXT,
        merek TEXT,
        tipe TEXT,
        tahun_pembuatan INTEGER,
        warna TEXT,
        m0 INTEGER
      )
    `)
  }

  /**
   * Seed penuh dari CSV ekspor Power BI DJKN. Header-aware: kolom "SEMESTER …"
   * dibaca sebagai kategori lokasi — yang terakhir (semester terbaru) menjadi
   * `kat_lokasi`, yang sebelumnya `kat_lokasi_sebelumnya`, lengkap dengan labelnya.
   */
  seed(csvPath: string): number {
    const raw: string = readFileSync(csvPath, 'utf-8')
    const lines: string[] = raw.split(/\r?\n/).filter((l: string) => l.trim() !== '')
    if (lines.length === 0) return 0
    const header = parseCsvLine(lines[0])
    const idx = new Map<string, number>()
    header.forEach((h, i) => idx.set(normHeader(h), i))
    const semesterIdx = header
      .map((h, i) => ({ h: normHeader(h), i }))
      .filter(c => c.h.startsWith('semester'))
      .map(c => c.i)
      .sort((a, b) => a - b)
    // Label semester resmi: nama tampilan di report DJKN bisa lebih baru daripada
    // nama kolom mentahnya (mis. kolom "SEMESTER I 2025" tampil sebagai
    // "Kat. Lokasi (Semester I 2026)") — lihat kamus_kolom.json dari skrip unduhan.
    const sumber = semesterIdx.length
      ? this.labelSemester(header[semesterIdx[semesterIdx.length - 1]], csvPath)
      : ''
    const at = (v: string[], nama: string) => {
      const i = idx.get(normHeader(nama))
      return i == null ? '' : (v[i] ?? '')
    }

    this.db.exec('DELETE FROM lelang_data')
    const stmt = this.db.prepare(
      `INSERT INTO lelang_data
        (kode, kategori_objek, kpknl, tahun_lelang, kat_lokasi_sebelumnya, kat_lokasi, kat_lokasi_sumber,
         merek, tipe, tahun_pembuatan, warna, m0)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
    )
    let count = 0
    for (const line of lines.slice(1)) {
      const v = parseCsvLine(line)
      const kode = at(v, 'KODE')
      if (!kode) continue
      const katSebelumnya = semesterIdx.length > 1 ? Number(atIdx(v, semesterIdx[0])) || null : null
      const katKini = semesterIdx.length ? Number(atIdx(v, semesterIdx[semesterIdx.length - 1])) || null : null
      stmt.run(
        kode,
        at(v, 'KATEGORI OBJEK') || 'Mobil',
        at(v, 'KPKNL'),
        Number(at(v, 'TAHUN LELANG')) || 0,
        katSebelumnya,
        katKini,
        sumber,
        at(v, 'MEREK'),
        at(v, 'TIPE'),
        Number(at(v, 'TAHUN PEMBUATAN')) || null,
        at(v, 'WARNA'),
        Number(String(at(v, 'M0')).replace(/[^\d.-]/g, '')) || null,
      )
      count++
    }
    return count
  }

  /** Label kolom semester sumber kategori lokasi, mis. 'SEMESTER I 2025'. */
  sumberKategori(): string {
    const row = this.db
      .prepare('SELECT kat_lokasi_sumber FROM lelang_data WHERE kat_lokasi_sumber IS NOT NULL LIMIT 1')
      .get() as { kat_lokasi_sumber: string } | undefined
    return row?.kat_lokasi_sumber ?? ''
  }

  /** Label semester resmi dari kamus nama-tampilan report DJKN; fallback = header mentah. */
  private labelSemester(headerMentah: string, csvPath: string): string {
    try {
      const kamus = JSON.parse(readFileSync(resolve(dirname(csvPath), 'kamus_kolom.json'), 'utf-8')) as Record<string, string>
      const tampil = kamus[headerMentah] ?? kamus[headerMentah.trim()]
      if (tampil) {
        const dalam = tampil.match(/\(([^)]+)\)/)
        return dalam ? dalam[1] : tampil
      }
    } catch { /* kamus tidak ada: pakai header mentah */ }
    return headerMentah
  }

  kosong(): boolean {
    const row = this.db.prepare('SELECT COUNT(*) c FROM lelang_data').get() as { c: number }
    return row.c === 0
  }

  search(filter: { merek?: string; kategori?: string; kode?: string; kpknl?: string } = {}): LelangRow[] {
    let sql: string = 'SELECT * FROM lelang_data WHERE 1=1'
    const params: unknown[] = []
    if (filter.merek) { sql += ' AND merek LIKE ?'; params.push(`%${filter.merek}%`) }
    if (filter.kategori) { sql += ' AND kategori_objek LIKE ?'; params.push(`%${filter.kategori}%`) }
    if (filter.kode) { sql += ' AND kode LIKE ?'; params.push(`%${filter.kode}%`) }
    if (filter.kpknl) { sql += ' AND kpknl LIKE ?'; params.push(`%${filter.kpknl}%`) }
    sql += ' ORDER BY kode'
    const rows: unknown[] = this.db.prepare(sql).all(...(params as any[]))
    return rows as unknown as LelangRow[]
  }

  close(): void {
    this.db.close()
  }
}

function atIdx(v: string[], i: number): string {
  return i >= 0 && i < v.length ? (v[i] ?? '') : ''
}
