// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AkunMitraForm } from './AkunMitraForm'
import { createEmptyAkunMitraRecord } from './akunMitra'
import type { LocalMitraRepository } from './lib/localMitraRepository'

afterEach(cleanup)
beforeEach(()=>localStorage.clear())

describe('Form Akun Mitra',()=>{
 it('locks the form immediately while submitted data awaits Korwil review',async()=>{
  const record={...createEmptyAkunMitraRecord('692310'),status:'siap_verifikasi' as const}
  const repository={loadOne:vi.fn(async()=>record),loadAll:vi.fn(),save:vi.fn(),review:vi.fn(),updateAccepted:vi.fn(),savePhoto:vi.fn(),getPhoto:vi.fn()} as LocalMitraRepository
  render(<AkunMitraForm satkerCode="692310" onSaved={()=>{}} repository={repository}/>)
  expect(await screen.findByText('Data sedang menunggu verifikasi Korwil.')).toBeInTheDocument()
  expect(screen.queryByRole('button',{name:'Simpan draf'})).not.toBeInTheDocument()
  expect(screen.queryByLabelText('NPWP kantor')).not.toBeInTheDocument()
 })

 it('menampilkan tiga tahap dan menyimpan draf per satker ke SQLite lokal',async()=>{
  const user=userEvent.setup(),saved=createEmptyAkunMitraRecord('692310')
  const repository={loadOne:vi.fn(async()=>saved),loadAll:vi.fn(),save:vi.fn(async record=>({...record,updatedAt:'2026-08-27T08:00:00.000Z'})),review:vi.fn(),updateAccepted:vi.fn(),savePhoto:vi.fn(),getPhoto:vi.fn()} as LocalMitraRepository
  render(<AkunMitraForm satkerCode="692310" onSaved={()=>{}} repository={repository}/>)
  expect(await screen.findByRole('heading',{name:'Pemutakhiran Data Akun Mitra'})).toBeInTheDocument()
  expect(screen.getByRole('button',{name:/Data Unit/})).toBeInTheDocument()
  expect(screen.getByRole('heading',{name:'Data Unit (Satker)'})).toBeInTheDocument()
  expect(screen.queryByText('Data Unit (Kanwil)')).not.toBeInTheDocument()
  expect(screen.getByRole('button',{name:/Pejabat KPB/})).toBeInTheDocument()
  expect(screen.getByRole('button',{name:/Operator/})).toBeInTheDocument()
  expect(screen.queryByText('Status pendaftaran')).not.toBeInTheDocument()
  expect(screen.getByLabelText('Upload foto gedung kantor')).toBeInTheDocument()
  expect(screen.getByLabelText('Telepon/No HP')).toBeInTheDocument()
  await user.type(screen.getByLabelText('NPWP kantor'),'12.345')
  await user.tab()
  expect(screen.getByText(/NPWP harus berupa 15 atau 16 digit angka/)).toBeInTheDocument()
  await user.type(screen.getByLabelText('Email kantor'),'rutan.siak@example.go.id')
  await user.click(screen.getByRole('button',{name:'Simpan draf'}))
  expect(await screen.findByText(/Draf tersimpan di SQLite lokal/)).toBeInTheDocument()
  expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({satkerCode:'692310',status:'draf'}))
  const oversized=new File([new Uint8Array(3*1024*1024+1)],'besar.jpg',{type:'image/jpeg'})
  await user.upload(screen.getByLabelText('Upload foto gedung kantor'),oversized)
  expect(screen.getByText(/Ukuran foto maksimal 3 MB/)).toBeInTheDocument()
 })
})
