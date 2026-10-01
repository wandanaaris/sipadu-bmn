import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

export type BmnAssetRow = {
  snapshot_date: string
  satker_code: string
  satker_name: string
  jenis_bmn: string
  jumlah: number
  nilai_perolehan: number
}

export type BmnImportMeta = {
  snapshot_date: string
  source_file: string
  total_baris: number
  total_nilai: number
  tanpa_psp: number
  jumlah_satker: number
  jumlah_jenis: number
  imported_at: string
}

export type BmnOverview = {
  snapshotDate: string
  importedAt: string
  sourceFile: string
  totalAset: number
  totalNilai: number
  tanpaPsp: number
  jumlahSatker: number
  jumlahJenis: number
  perSatker: Array<{ code: string; name: string; jumlah: number; nilai: number; belumPsp?: number }>
  perJenis: Array<{ jenis: string; jumlah: number; nilai: number }>
}

type SnapshotPayload = {
  snapshot_date: string
  source_file: string
  total_baris: number
  total_nilai: number
  tanpa_psp: number
  jumlah_satker: number
  jumlah_jenis: number
  baris: Array<{ satker_code: string; satker_name: string; jenis_bmn: string; jumlah: number; nilai_perolehan: number }>
}

export class BmnAssetStore {
  private readonly db: DatabaseSync

  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true })
    this.db = new DatabaseSync(path)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS bmn_imports (
        snapshot_date TEXT PRIMARY KEY,
        source_file TEXT NOT NULL,
        total_baris INTEGER NOT NULL,
        total_nilai REAL NOT NULL,
        tanpa_psp INTEGER NOT NULL,
        jumlah_satker INTEGER NOT NULL,
        jumlah_jenis INTEGER NOT NULL,
        imported_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS bmn_asset_summary (
        snapshot_date TEXT NOT NULL,
        satker_code TEXT NOT NULL,
        satker_name TEXT NOT NULL,
        jenis_bmn TEXT NOT NULL,
        jumlah INTEGER NOT NULL,
        nilai_perolehan REAL NOT NULL,
        PRIMARY KEY (snapshot_date, satker_code, jenis_bmn)
      );
      CREATE INDEX IF NOT EXISTS idx_bmn_summary_satker
        ON bmn_asset_summary(snapshot_date, satker_code);
      CREATE INDEX IF NOT EXISTS idx_bmn_summary_jenis
        ON bmn_asset_summary(snapshot_date, jenis_bmn);
    `)
  }

  /** Mengganti seluruh isi untuk satu tanggal snapshot, bukan menumpuk. */
  replaceSnapshot(payload: SnapshotPayload): BmnImportMeta {
    const now = new Date().toISOString()
    this.db.exec('BEGIN')
    try {
      this.db.prepare('DELETE FROM bmn_asset_summary WHERE snapshot_date = ?').run(payload.snapshot_date)
      this.db.prepare('DELETE FROM bmn_imports WHERE snapshot_date = ?').run(payload.snapshot_date)
      const insert = this.db.prepare(
        `INSERT INTO bmn_asset_summary
           (snapshot_date, satker_code, satker_name, jenis_bmn, jumlah, nilai_perolehan)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      for (const row of payload.baris) {
        insert.run(
          payload.snapshot_date,
          row.satker_code,
          row.satker_name,
          row.jenis_bmn,
          row.jumlah,
          row.nilai_perolehan,
        )
      }
      this.db
        .prepare(
          `INSERT INTO bmn_imports
             (snapshot_date, source_file, total_baris, total_nilai, tanpa_psp,
              jumlah_satker, jumlah_jenis, imported_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          payload.snapshot_date,
          payload.source_file,
          payload.total_baris,
          payload.total_nilai,
          payload.tanpa_psp,
          payload.jumlah_satker,
          payload.jumlah_jenis,
          now,
        )
      this.db.exec('COMMIT')
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
    return {
      snapshot_date: payload.snapshot_date,
      source_file: payload.source_file,
      total_baris: payload.total_baris,
      total_nilai: payload.total_nilai,
      tanpa_psp: payload.tanpa_psp,
      jumlah_satker: payload.jumlah_satker,
      jumlah_jenis: payload.jumlah_jenis,
      imported_at: now,
    }
  }

  listSnapshots(): BmnImportMeta[] {
    return this.db
      .prepare('SELECT * FROM bmn_imports ORDER BY snapshot_date DESC')
      .all() as unknown as BmnImportMeta[]
  }

  latestSnapshot(): string | null {
    const row = this.db
      .prepare('SELECT snapshot_date FROM bmn_imports ORDER BY snapshot_date DESC LIMIT 1')
      .get() as { snapshot_date: string } | undefined
    return row?.snapshot_date ?? null
  }

  overview(snapshotDate?: string): BmnOverview | null {
    const tanggal = snapshotDate ?? this.latestSnapshot()
    if (!tanggal) return null
    const meta = this.db
      .prepare('SELECT * FROM bmn_imports WHERE snapshot_date = ?')
      .get(tanggal) as unknown as BmnImportMeta | undefined
    if (!meta) return null

    const perSatker = this.db
      .prepare(
        `SELECT satker_code AS code, satker_name AS name,
                SUM(jumlah) AS jumlah, SUM(nilai_perolehan) AS nilai
         FROM bmn_asset_summary WHERE snapshot_date = ?
         GROUP BY satker_code, satker_name
         ORDER BY jumlah DESC`,
      )
      .all(tanggal) as unknown as Array<{ code: string; name: string; jumlah: number; nilai: number }>

    const perJenis = this.db
      .prepare(
        `SELECT jenis_bmn AS jenis, SUM(jumlah) AS jumlah, SUM(nilai_perolehan) AS nilai
         FROM bmn_asset_summary WHERE snapshot_date = ?
         GROUP BY jenis_bmn
         ORDER BY jumlah DESC`,
      )
      .all(tanggal) as unknown as Array<{ jenis: string; jumlah: number; nilai: number }>

    return {
      snapshotDate: tanggal,
      importedAt: meta.imported_at,
      sourceFile: meta.source_file,
      totalAset: perSatker.reduce((n, s) => n + s.jumlah, 0),
      totalNilai: perSatker.reduce((n, s) => n + s.nilai, 0),
      tanpaPsp: meta.tanpa_psp,
      jumlahSatker: perSatker.length,
      jumlahJenis: perJenis.length,
      perSatker,
      perJenis,
    }
  }

  satkerDetail(code: string, snapshotDate?: string): BmnAssetRow[] {
    const tanggal = snapshotDate ?? this.latestSnapshot()
    if (!tanggal) return []
    return this.db
      .prepare(
        `SELECT * FROM bmn_asset_summary
         WHERE snapshot_date = ? AND satker_code = ?
         ORDER BY jumlah DESC`,
      )
      .all(tanggal, code) as unknown as BmnAssetRow[]
  }

  close() {
    this.db.close()
  }
}
