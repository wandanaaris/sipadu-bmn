import { afterEach, describe, expect, it } from 'vitest'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createEmptyAkunMitraRecord } from '../src/akunMitra'
import { MitraSqliteStore } from './mitraSqlite'

const paths:string[]=[]
const tempDb=()=>{const path=join(tmpdir(),`akun-mitra-${crypto.randomUUID()}.sqlite`);paths.push(path);return path}
afterEach(()=>{for(const path of paths.splice(0))rmSync(path,{force:true})})

describe('MitraSqliteStore',()=>{
 it('upserts and reads one record without mixing satkers',()=>{
  const store=new MitraSqliteStore(tempDb())
  const record=createEmptyAkunMitraRecord('692310')
  record.unit.emailKantor='rutan.siak@example.go.id'
  const saved=store.upsertRecord(record)

  expect(saved.updatedAt).not.toBe('')
  expect(store.getRecord('692310')).toEqual(saved)
  expect(store.getRecord('692781')).toBeNull()
  store.close()
 })

 it('lists records in satker-code order',()=>{
  const store=new MitraSqliteStore(tempDb())
  store.upsertRecord(createEmptyAkunMitraRecord('692781'))
  store.upsertRecord(createEmptyAkunMitraRecord('692310'))

  expect(store.listRecords().map(record=>record.satkerCode)).toEqual(['692310','692781'])
  store.close()
 })

 it('prevents satker writes from forging an accepted status',()=>{
  const store=new MitraSqliteStore(tempDb())
  expect(()=>store.upsertRecord({...createEmptyAkunMitraRecord('692310'),status:'selesai'})).toThrow(/Korwil/i)
  store.close()
 })

 it('enforces submit, revision, and accepted review transitions',()=>{
  const store=new MitraSqliteStore(tempDb())
  const draft=createEmptyAkunMitraRecord('692310')
  const submitted=store.upsertRecord({...draft,status:'siap_verifikasi'})

  expect(()=>store.upsertRecord({...submitted,unit:{...submitted.unit,emailKantor:'changed@example.go.id'}})).toThrow(/terkunci/i)
  const revision=store.reviewRecord('692310','perbaikan','Perbaiki email kantor.')
  expect(revision).toMatchObject({status:'perbaikan',reviewNote:'Perbaiki email kantor.'})
  const corrected=store.upsertRecord({...revision,unit:{...revision.unit,emailKantor:'fixed@example.go.id'}})
  expect(corrected.unit.emailKantor).toBe('fixed@example.go.id')
  store.upsertRecord({...corrected,status:'siap_verifikasi'})
  const accepted=store.reviewRecord('692310','selesai','Data diterima.')
  expect(accepted).toMatchObject({status:'selesai',reviewNote:'Data diterima.'})
  expect(()=>store.upsertRecord({...accepted,status:'draf'})).toThrow(/permanen/i)
  store.close()
 })

 it('lets Korwil reopen an accepted record explicitly for satker revision',()=>{
  const store=new MitraSqliteStore(tempDb())
  const submitted=store.upsertRecord({...createEmptyAkunMitraRecord('692310'),status:'siap_verifikasi'})
  store.reviewRecord(submitted.satkerCode,'selesai','Diterima.')
  const reopened=store.reviewRecord(submitted.satkerCode,'perbaikan','Koreksi NIK operator.')
  expect(reopened).toMatchObject({status:'perbaikan',reviewNote:'Koreksi NIK operator.'})
  store.close()
 })

 it('lets Korwil edit an accepted record without reopening it',()=>{
  const store=new MitraSqliteStore(tempDb())
  const submitted=store.upsertRecord({...createEmptyAkunMitraRecord('692310'),status:'siap_verifikasi'})
  const accepted=store.reviewRecord(submitted.satkerCode,'selesai','Diterima.')
  const edited=store.updateAcceptedRecord({...accepted,unit:{...accepted.unit,emailKantor:'koreksi@example.go.id'}})

  expect(edited).toMatchObject({status:'selesai',reviewNote:'Diterima.',unit:{emailKantor:'koreksi@example.go.id'}})
  expect(edited.updatedAt).not.toBe(accepted.updatedAt)
  expect(store.getRecord('692310')).toEqual(edited)
  store.close()
 })

 it('persists photo bytes and metadata by satker and slot',()=>{
  const store=new MitraSqliteStore(tempDb())
  const bytes=new Uint8Array([1,2,3,4])
  store.putPhoto('692310','unit',{fileName:'gedung.webp',mimeType:'image/webp',bytes})

  expect(store.getPhoto('692310','unit')).toEqual({fileName:'gedung.webp',mimeType:'image/webp',bytes})
  expect(store.getPhoto('692310','kpb')).toBeNull()
  store.close()
 })
})
