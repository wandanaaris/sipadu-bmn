// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { createEmptyAkunMitraRecord } from '../akunMitra'
import { createLocalMitraRepository } from './localMitraRepository'

const response=(body:unknown,status=200,headers?:HeadersInit)=>new Response(body===null?null:JSON.stringify(body),{status,headers:{'content-type':'application/json',...headers}})

describe('local SQLite Mitra repository client',()=>{
 it('returns an empty satker record when the API has no saved record',async()=>{
  const fetcher=vi.fn(async()=>response({error:'missing'},404))
  const repository=createLocalMitraRepository(fetcher)

  expect(await repository.loadOne('692310')).toEqual(createEmptyAkunMitraRecord('692310'))
  expect(fetcher).toHaveBeenCalledWith('/api/local/mitra/692310',undefined)
 })

 it('melengkapi struktur record parsial dari SQLite',async()=>{
  const partial={satkerCode:'692310',unit:{emailKantor:'verify@example.go.id'},kpb:{},operator:{},status:'draf',updatedAt:''}
  const repository=createLocalMitraRepository(vi.fn(async()=>response(partial)))
  const loaded=await repository.loadOne('692310')
  expect(loaded.unit.emailKantor).toBe('verify@example.go.id')
  expect(loaded.unit.npwpKantor).toBe('')
  expect(loaded.kpb.nama).toBe('')
 })

 it('upserts JSON and returns the server timestamped record',async()=>{
  const input=createEmptyAkunMitraRecord('692310'),saved={...input,updatedAt:'2026-08-27T08:00:00.000Z'}
  const fetcher=vi.fn(async()=>response(saved))
  const repository=createLocalMitraRepository(fetcher)

  expect(await repository.save(input)).toEqual(saved)
  expect(fetcher).toHaveBeenCalledWith('/api/local/mitra/692310',expect.objectContaining({method:'PUT',body:JSON.stringify(input)}))
 })

 it('uploads and reads photo bytes through the local API',async()=>{
  const photoBytes=new Uint8Array([4,5,6])
  const fetcher=vi.fn(async(_url:string,init?:RequestInit)=>init?.method==='PUT'?new Response(null,{status:204}):new Response(photoBytes,{headers:{'content-type':'image/png','x-file-name':encodeURIComponent('pas foto.png')}}))
  const repository=createLocalMitraRepository(fetcher)
  const file=new File([photoBytes],'pas foto.png',{type:'image/png'})

  await repository.savePhoto('692310','kpb',file)
  expect(fetcher).toHaveBeenNthCalledWith(1,'/api/local/mitra/692310/photos/kpb',expect.objectContaining({method:'PUT',body:file}))
  const loaded=await repository.getPhoto('692310','kpb')
  expect(loaded?.name).toBe('pas foto.png')
  expect(new Uint8Array(await loaded!.arrayBuffer())).toEqual(photoBytes)
 })
})
