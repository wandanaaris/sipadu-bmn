// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { createEmptyAkunMitraRecord } from '../akunMitra'
import { createSupabaseMitraRepository, mapMitraRow } from './mitraRepository'

describe('Supabase Mitra repository mapping',()=>{
 it('menggabungkan row parsial dengan struktur form lengkap',()=>{
  const record=mapMitraRow({satker_code:'692310',unit_data:{emailKantor:'unit@example.go.id'},kpb_data:{nama:'Pejabat'},operator_data:{},status:'draf',updated_at:'2026-08-27T00:00:00Z'})
  expect(record.satkerCode).toBe('692310')
  expect(record.unit.emailKantor).toBe('unit@example.go.id')
  expect(record.unit.npwpKantor).toBe('')
  expect(record.kpb.nama).toBe('Pejabat')
  expect(record.operator.nama).toBe('')
 })

 it('maps revision review notes from Supabase rows',()=>{
  const record=mapMitraRow({satker_code:'692310',unit_data:{},kpb_data:{},operator_data:{},status:'perbaikan',review_note:'Koreksi NIK.',updated_at:''})
  expect(record).toMatchObject({status:'perbaikan',reviewNote:'Koreksi NIK.'})
 })

 it('menggunakan nama file dari JSON form',()=>{
  const record=mapMitraRow({satker_code:'692310',unit_data:{fotoGedungFile:'gedung.jpg'},kpb_data:{pasFotoFile:'kpb.png'},operator_data:{pasFotoFile:'operator.webp'},status:'draf',updated_at:''})
  expect(record.unit.fotoGedungFile).toBe('gedung.jpg')
  expect(record.kpb.pasFotoFile).toBe('kpb.png')
  expect(record.operator.pasFotoFile).toBe('operator.webp')
 })

 it('membaca form satker melalui RPC terbatas, bukan select tabel langsung',async()=>{
  const rpc=vi.fn(async()=>({data:{satker_code:'692310',status:'selesai',review_note:'',updated_at:'2026-08-27T00:00:00Z'},error:null}))
  const from=vi.fn(()=>{throw new Error('select tabel langsung tidak boleh dipakai untuk form satker')})
  const repository=createSupabaseMitraRepository({rpc,from,storage:{}} as never)
  const record=await repository.loadOne('692310')
  expect(rpc).toHaveBeenCalledWith('get_mitra_satker_form',{p_satker_code:'692310'})
  expect(from).not.toHaveBeenCalled()
  expect(record.status).toBe('selesai')
  expect(record.kpb.nik).toBe('')
 })

 it('mengajukan verifikasi melalui RPC khusus tanpa update tabel langsung',async()=>{
  const rpc=vi.fn(async()=>({data:{satker_code:'692310',status:'siap_verifikasi',review_note:'',updated_at:'2026-08-27T00:00:00Z'},error:null}))
  const from=vi.fn(()=>{throw new Error('pengajuan tidak boleh mengubah tabel langsung')})
  const repository=createSupabaseMitraRepository({from,rpc,storage:{}} as never)
  const record=createEmptyAkunMitraRecord('692310');record.status='siap_verifikasi'
  const saved=await repository.save(record)
  expect(from).not.toHaveBeenCalled()
  expect(rpc).toHaveBeenCalledWith('submit_mitra_account',expect.objectContaining({p_satker_code:'692310'}))
  expect(saved.status).toBe('siap_verifikasi')
 })
})
