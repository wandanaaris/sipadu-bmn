// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AkunMitraAdmin } from './AkunMitraAdmin'
import { createEmptyAkunMitraRecord } from './akunMitra'
import type { LocalMitraRepository } from './lib/localMitraRepository'

afterEach(cleanup)
beforeEach(()=>localStorage.clear())

describe('Rekap Akun Mitra Korwil',()=>{
 it('allows Korwil to request revision with a required note',async()=>{
  const record={...createEmptyAkunMitraRecord('692310'),status:'siap_verifikasi' as const}
  const review=vi.fn(async(_code,_decision,note)=>({...record,status:'perbaikan' as const,reviewNote:note}))
  const repository={loadOne:vi.fn(),loadAll:vi.fn(async()=>[record]),save:vi.fn(),review,updateAccepted:vi.fn(),savePhoto:vi.fn(),getPhoto:vi.fn()} as LocalMitraRepository
  const user=userEvent.setup()
  render(<AkunMitraAdmin repository={repository}/>)
  await user.click(await screen.findByRole('button',{name:/Rutan Kelas IIB Siak Sri Indrapura/}))
  await user.type(screen.getByLabelText('Catatan review'),'Perbaiki email kantor.')
  await user.click(screen.getByRole('button',{name:'Perlu Perbaikan'}))
  expect(review).toHaveBeenCalledWith('692310','perbaikan','Perbaiki email kantor.')
  expect(await screen.findByText('Perbaiki email kantor.')).toBeInTheDocument()
 })

 it('edits accepted data as Korwil while keeping status selesai',async()=>{
  const record={...createEmptyAkunMitraRecord('692310'),status:'selesai' as const,reviewNote:'Diterima.'}
  record.unit.emailKantor='lama@example.go.id'
  const updateAccepted=vi.fn(async updated=>({...updated,status:'selesai' as const,updatedAt:'2026-08-27T12:00:00.000Z'}))
  const repository={loadOne:vi.fn(),loadAll:vi.fn(async()=>[record]),save:vi.fn(),review:vi.fn(),updateAccepted,savePhoto:vi.fn(),getPhoto:vi.fn()} as LocalMitraRepository
  const user=userEvent.setup()
  render(<AkunMitraAdmin repository={repository}/>)
  await user.click(await screen.findByRole('button',{name:/Rutan Kelas IIB Siak Sri Indrapura/}))
  await user.click(screen.getByRole('button',{name:'Edit data Korwil'}))
  await user.clear(screen.getByLabelText('Email kantor (Korwil)'))
  await user.type(screen.getByLabelText('Email kantor (Korwil)'),'baru@example.go.id')
  await user.click(screen.getByRole('button',{name:'Simpan koreksi Korwil'}))
  expect(updateAccepted).toHaveBeenCalledWith(expect.objectContaining({status:'selesai',unit:expect.objectContaining({emailKantor:'baru@example.go.id'})}))
 })

 it('can explicitly reopen accepted data for satker revision',async()=>{
  const record={...createEmptyAkunMitraRecord('692310'),status:'selesai' as const,reviewNote:'Diterima.'}
  const review=vi.fn(async(_code,_decision,note)=>({...record,status:'perbaikan' as const,reviewNote:note}))
  const repository={loadOne:vi.fn(),loadAll:vi.fn(async()=>[record]),save:vi.fn(),review,updateAccepted:vi.fn(),savePhoto:vi.fn(),getPhoto:vi.fn()} as LocalMitraRepository
  const user=userEvent.setup()
  render(<AkunMitraAdmin repository={repository}/>)
  await user.click(await screen.findByRole('button',{name:/Rutan Kelas IIB Siak Sri Indrapura/}))
  await user.clear(screen.getByLabelText('Catatan perbaikan setelah diterima'))
  await user.type(screen.getByLabelText('Catatan perbaikan setelah diterima'),'Koreksi NIK operator.')
  await user.click(screen.getByRole('button',{name:'Buka untuk Perbaikan Satker'}))
  expect(review).toHaveBeenCalledWith('692310','perbaikan','Koreksi NIK operator.')
 })

 it('menampilkan satker dan detail data terpusat',async()=>{
  const record=createEmptyAkunMitraRecord('692310')
  record.kpb.nama='Pejabat Contoh'
  const repository={loadOne:vi.fn(),loadAll:vi.fn(async()=>[record]),save:vi.fn(),review:vi.fn(),updateAccepted:vi.fn(),savePhoto:vi.fn(),getPhoto:vi.fn()} as LocalMitraRepository
  const user=userEvent.setup()
  render(<AkunMitraAdmin repository={repository}/>)
  expect(screen.getByRole('heading',{name:'Data Akun Mitra'})).toBeInTheDocument()
  expect(await screen.findByText(/SQLite lokal/)).toBeInTheDocument()
  await user.click(await screen.findByRole('button',{name:/Rutan Kelas IIB Siak Sri Indrapura/}))
  expect(repository.loadAll).toHaveBeenCalledOnce()
  expect(screen.getByText('Pejabat Contoh')).toBeInTheDocument()
  expect(screen.getByRole('button',{name:/Salin Nama Pejabat KPB/})).toBeInTheDocument()
 })
})
