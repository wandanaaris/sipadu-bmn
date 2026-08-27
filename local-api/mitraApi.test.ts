import { afterEach, describe, expect, it } from 'vitest'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createEmptyAkunMitraRecord } from '../src/akunMitra'
import { handleLocalMitraRequest } from './mitraApi'
import { MitraSqliteStore } from './mitraSqlite'

const paths:string[]=[]
const setup=()=>{const path=join(tmpdir(),`akun-mitra-api-${crypto.randomUUID()}.sqlite`);paths.push(path);return new MitraSqliteStore(path)}
afterEach(()=>{for(const path of paths.splice(0))rmSync(path,{force:true})})

describe('local Akun Mitra API',()=>{
 it('upserts, gets, and lists records on localhost',async()=>{
  const store=setup(),record=createEmptyAkunMitraRecord('692310')
  record.unit.emailKantor='unit@example.go.id'
  const put=await handleLocalMitraRequest(new Request('http://localhost/api/local/mitra/692310',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(record)}),store)
  expect(put?.status).toBe(200)

  const get=await handleLocalMitraRequest(new Request('http://localhost/api/local/mitra/692310'),store)
  expect((await get?.json()).unit.emailKantor).toBe('unit@example.go.id')
  const list=await handleLocalMitraRequest(new Request('http://localhost/api/local/mitra'),store)
  expect(await list?.json()).toHaveLength(1)
  store.close()
 })

 it('reviews submitted records through the Korwil endpoint',async()=>{
  const store=setup(),record={...createEmptyAkunMitraRecord('692310'),status:'siap_verifikasi' as const}
  store.upsertRecord(record)
  const response=await handleLocalMitraRequest(new Request('http://localhost/api/local/mitra/692310/review',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({decision:'perbaikan',reviewNote:'Lengkapi alamat.'})}),store)
  expect(response?.status).toBe(200)
  expect(await response?.json()).toMatchObject({status:'perbaikan',reviewNote:'Lengkapi alamat.'})
  store.close()
 })

 it('persists Korwil edits to accepted records while keeping them closed',async()=>{
  const store=setup(),submitted=store.upsertRecord({...createEmptyAkunMitraRecord('692310'),status:'siap_verifikasi'})
  const accepted=store.reviewRecord(submitted.satkerCode,'selesai','Diterima.')
  const response=await handleLocalMitraRequest(new Request('http://localhost/api/local/mitra/692310/admin',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({...accepted,unit:{...accepted.unit,emailKantor:'koreksi@example.go.id'},status:'perbaikan'})}),store)
  expect(response?.status).toBe(200)
  expect(await response?.json()).toMatchObject({status:'selesai',unit:{emailKantor:'koreksi@example.go.id'}})
  store.close()
 })

 it('rejects photo changes after satker submission',async()=>{
  const store=setup()
  store.upsertRecord({...createEmptyAkunMitraRecord('692310'),status:'siap_verifikasi'})
  const response=await handleLocalMitraRequest(new Request('http://localhost/api/local/mitra/692310/photos/unit',{method:'PUT',headers:{'content-type':'image/png','x-file-name':'gedung.png'},body:new Uint8Array([1])}),store)
  expect(response?.status).toBe(409)
  store.close()
 })

 it('uploads and reads a photo with metadata',async()=>{
  const store=setup(),bytes=new Uint8Array([7,8,9])
  const upload=await handleLocalMitraRequest(new Request('http://127.0.0.1/api/local/mitra/692310/photos/unit',{method:'PUT',headers:{'content-type':'image/png','x-file-name':encodeURIComponent('gedung satu.png')},body:bytes}),store)
  expect(upload?.status).toBe(204)
  const photo=await handleLocalMitraRequest(new Request('http://127.0.0.1/api/local/mitra/692310/photos/unit'),store)
  expect(photo?.headers.get('content-type')).toBe('image/png')
  expect(decodeURIComponent(photo?.headers.get('x-file-name')??'')).toBe('gedung satu.png')
  expect(new Uint8Array(await photo!.arrayBuffer())).toEqual(bytes)
  store.close()
 })

 it('rejects non-local hosts and mismatched satker payloads',async()=>{
  const store=setup(),record=createEmptyAkunMitraRecord('692781')
  expect((await handleLocalMitraRequest(new Request('http://example.com/api/local/mitra'),store))?.status).toBe(403)
  expect((await handleLocalMitraRequest(new Request('http://localhost/api/local/mitra/692310',{method:'PUT',body:JSON.stringify(record)}),store))?.status).toBe(400)
  store.close()
 })
})
