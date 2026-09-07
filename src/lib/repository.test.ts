import { describe,expect,it,vi } from 'vitest'
import { countPendingVerifications, loadSubmissions } from './repository'

describe('inbox verifikasi',()=>{
 it('memuat daftar melalui RPC admin agar RLS tidak diam-diam menghasilkan daftar kosong',async()=>{
  const item={id:'sub-1',submission_number:'SIPADU-1',sender_name:'Operator',sender_phone:null,sender_note:null,status:'menunggu_verifikasi',review_note:null,submitted_at:'2026-08-28T02:17:49Z',created_at:'2026-08-28T02:17:50Z',tasks:{task_key:'rkbmn',title:'RKBMN'},satkers:{code:'692312',name:'Rutan Kelas IIB Rengat'},supporting_documents:[]}
  const rpc=vi.fn(async()=>({data:[item],error:null}))
  const result=await loadSubmissions({rpc} as never)
  expect(rpc).toHaveBeenCalledWith('get_verification_inbox')
  expect(result).toEqual([item])
 })
 it('menghitung badge dari item inbox yang benar-benar dapat ditampilkan',()=>{
  const items=[
   {status:'menunggu_verifikasi'},
   {status:'diterima'},
   {status:'perlu_perbaikan'},
  ] as never
  expect(countPendingVerifications(items)).toBe(1)
  expect(countPendingVerifications([])).toBe(0)
 })
})
