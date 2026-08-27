import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import type { LocalMitraPhotoSlot, LocalMitraRecord } from './types.js'

export type StoredPhoto={fileName:string;mimeType:string;bytes:Uint8Array}

export class MitraSqliteStore {
 private readonly db:DatabaseSync
 constructor(path:string){
  mkdirSync(dirname(path),{recursive:true})
  this.db=new DatabaseSync(path)
  this.db.exec(`
   CREATE TABLE IF NOT EXISTS mitra_records (
    satker_code TEXT PRIMARY KEY,
    record_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draf',
    review_note TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
   );
   CREATE TABLE IF NOT EXISTS mitra_photos (
    satker_code TEXT NOT NULL,
    slot TEXT NOT NULL CHECK(slot IN ('unit','kpb','operator')),
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    bytes BLOB NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (satker_code,slot)
   )
  `)
  const columns=this.db.prepare('PRAGMA table_info(mitra_records)').all() as Array<{name:string}>
  if(!columns.some(column=>column.name==='status'))this.db.exec("ALTER TABLE mitra_records ADD COLUMN status TEXT NOT NULL DEFAULT 'draf'")
  if(!columns.some(column=>column.name==='review_note'))this.db.exec("ALTER TABLE mitra_records ADD COLUMN review_note TEXT NOT NULL DEFAULT ''")
 }
 getRecord(satkerCode:string):LocalMitraRecord|null{
  const row=this.db.prepare('SELECT record_json FROM mitra_records WHERE satker_code = ?').get(satkerCode) as {record_json:string}|undefined
  return row?JSON.parse(row.record_json) as LocalMitraRecord:null
 }
 upsertRecord(record:LocalMitraRecord):LocalMitraRecord{
  const current=this.getRecord(record.satkerCode)
  if(record.status==='selesai')throw new Error('Status selesai hanya dapat ditetapkan Korwil.')
  if(current?.status==='selesai')throw new Error('Data yang diterima terkunci permanen.')
  if(current?.status==='siap_verifikasi')throw new Error('Data sedang diverifikasi dan terkunci.')
  const saved={...record,reviewNote:current?.status==='perbaikan'?current.reviewNote:(record.reviewNote??''),updatedAt:new Date().toISOString()}
  this.db.prepare(`INSERT INTO mitra_records (satker_code,record_json,status,review_note,updated_at) VALUES (?,?,?,?,?)
   ON CONFLICT(satker_code) DO UPDATE SET record_json=excluded.record_json,status=excluded.status,review_note=excluded.review_note,updated_at=excluded.updated_at`).run(saved.satkerCode,JSON.stringify(saved),saved.status,saved.reviewNote,saved.updatedAt)
  return saved
 }
 reviewRecord(satkerCode:string,status:'perbaikan'|'selesai',reviewNote:string):LocalMitraRecord{
  const current=this.getRecord(satkerCode)
  if(!current)throw new Error('Data Akun Mitra belum tersedia.')
  if(current.status!=='siap_verifikasi'&&!(current.status==='selesai'&&status==='perbaikan'))throw new Error('Status data tidak dapat direview.')
  if(status==='perbaikan'&&!reviewNote.trim())throw new Error('Catatan perbaikan wajib diisi.')
  const saved={...current,status,reviewNote:reviewNote.trim(),updatedAt:new Date().toISOString()}
  this.db.prepare('UPDATE mitra_records SET record_json = ?, status = ?, review_note = ?, updated_at = ? WHERE satker_code = ?').run(JSON.stringify(saved),saved.status,saved.reviewNote,saved.updatedAt,satkerCode)
  return saved
 }
 updateAcceptedRecord(record:LocalMitraRecord):LocalMitraRecord{
  const current=this.getRecord(record.satkerCode)
  if(current?.status!=='selesai')throw new Error('Hanya data yang sudah diterima dapat dikoreksi Korwil.')
  const now=Date.now(),previous=Date.parse(current.updatedAt),updatedAt=new Date(Math.max(now,Number.isNaN(previous)?now:previous+1)).toISOString()
  const saved={...record,status:'selesai' as const,reviewNote:current.reviewNote,updatedAt}
  this.db.prepare('UPDATE mitra_records SET record_json = ?, status = ?, review_note = ?, updated_at = ? WHERE satker_code = ?').run(JSON.stringify(saved),saved.status,saved.reviewNote,saved.updatedAt,saved.satkerCode)
  return saved
 }
 listRecords():LocalMitraRecord[]{
  const rows=this.db.prepare('SELECT record_json FROM mitra_records ORDER BY satker_code').all() as Array<{record_json:string}>
  return rows.map(row=>JSON.parse(row.record_json) as LocalMitraRecord)
 }
 putPhoto(satkerCode:string,slot:LocalMitraPhotoSlot,photo:StoredPhoto){
  this.db.prepare(`INSERT INTO mitra_photos (satker_code,slot,file_name,mime_type,bytes,updated_at) VALUES (?,?,?,?,?,?)
   ON CONFLICT(satker_code,slot) DO UPDATE SET file_name=excluded.file_name,mime_type=excluded.mime_type,bytes=excluded.bytes,updated_at=excluded.updated_at`)
   .run(satkerCode,slot,photo.fileName,photo.mimeType,photo.bytes,new Date().toISOString())
 }
 getPhoto(satkerCode:string,slot:LocalMitraPhotoSlot):StoredPhoto|null{
  const row=this.db.prepare('SELECT file_name,mime_type,bytes FROM mitra_photos WHERE satker_code = ? AND slot = ?').get(satkerCode,slot) as {file_name:string;mime_type:string;bytes:Uint8Array}|undefined
  return row?{fileName:row.file_name,mimeType:row.mime_type,bytes:new Uint8Array(row.bytes)}:null
 }
 close(){this.db.close()}
}
