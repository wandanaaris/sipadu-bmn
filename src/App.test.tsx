// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App, { AdminLogin, CreateTaskModal, OpenUploadForm, StagedDestructionView } from './App'
import type { Task } from './data'

afterEach(() => cleanup())

describe('Portal Monitoring BMN MVP', () => {
  it('menampilkan dashboard Korwil dengan fondasi kinerja UPT', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Dashboard Korwil BMN' })).toBeInTheDocument()
    expect(screen.getByText('Fondasi nilai kinerja UPT sudah disiapkan')).toBeInTheDocument()
    expect(screen.getAllByText('RKBMN SIMAN dan Non-SIMAN').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Tindak Lanjut Pemusnahan Persediaan Usang Amunisi').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Tindak Lanjut Pemusnahan Persediaan Usang Non-Amunisi').length).toBeGreaterThan(0)
  })

  it('menampilkan login Korwil tanpa pendaftaran publik', async () => {
    const user=userEvent.setup()
    render(<AdminLogin onBack={()=>{}} onSuccess={async()=>{}}/>)
    expect(screen.getByRole('heading',{name:'Login Dashboard Korwil'})).toBeInTheDocument()
    expect(screen.getByDisplayValue('bmnditjenpas.wp4@gmail.com')).toBeInTheDocument()
    const password=screen.getByLabelText('Password')
    expect(password).toHaveAttribute('type','password')
    await user.click(screen.getByRole('button',{name:'Tampilkan password'}))
    expect(password).toHaveAttribute('type','text')
    expect(screen.getByText(/Tidak tersedia pendaftaran akun secara publik/)).toBeInTheDocument()
  })

  it('menampilkan formulir pembuatan pekerjaan dan unggah terbuka', async () => {
    const user=userEvent.setup()
    render(<CreateTaskModal onClose={()=>{}} onCreated={async()=>{}}/>)
    expect(screen.getByText('Buat Pekerjaan Baru')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Unggah dokumen')).toBeInTheDocument()
    expect(screen.getByText('18 UPT dipilih')).toBeInTheDocument()
    cleanup()
    const task:Task={id:'upload-test',title:'Uji Unggah',description:'',method:'upload',due:'Tidak ada tenggat',letter:'',active:true,priority:'normal',requirements:[{key:'surat',label:'Surat Pengantar',required:true},{key:'foto',label:'Dokumentasi',required:true}],assignments:[]}
    render(<OpenUploadForm task={task} satkerCode="692313"/>)
    expect(screen.getByText('Surat Pengantar')).toBeInTheDocument()
    expect(screen.getByText('Dokumentasi')).toBeInTheDocument()
    await user.type(screen.getByLabelText('Nama pengirim'),'Operator Satker')
    await user.click(screen.getByRole('button',{name:'Unggah dan Ajukan ke Korwil'}))
    expect(screen.getByText(/Pilih file: Surat Pengantar, Dokumentasi/)).toBeInTheDocument()
  })

  it('mengaktifkan seluruh menu sidebar admin', async () => {
    const user = userEvent.setup()
    render(<App />)
    const menus: Array<[RegExp,string]> = [
      [/^Pekerjaan/, 'Daftar Pekerjaan'],
      [/^Monitoring Satker$/, 'Monitoring Satker'],
      [/^Data Center BMN$/, 'Data Center BMN'],
      [/^Verifikasi/, 'Verifikasi Pekerjaan'],
      [/^Arsip$/, 'Arsip Pekerjaan'],
      [/^Kinerja UPT/, 'Kinerja UPT'],
      [/^Pengaturan$/, 'Pengaturan Portal'],
      [/^Ringkasan$/, 'Dashboard Korwil BMN'],
    ]
    for (const [menu,title] of menus) {
      await user.click(screen.getByRole('button', { name: menu }))
      expect(screen.getByRole('heading', { name: title, level: 1 })).toBeInTheDocument()
    }
  })

  it('berpindah ke portal satker, memilih Rutan Rengat, dan membuka detail pekerjaan', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: /Pratinjau Satker/i }))
    expect(screen.getByRole('heading', { name: 'Pilih satuan kerja Anda' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /692312.*Rutan Kelas IIB Rengat/i }))
    expect(screen.getByRole('heading', { name: 'Rutan Kelas IIB Rengat' })).toBeInTheDocument()
    const masterCard = screen.getByRole('heading', { name: 'Kelengkapan Master Aset' }).closest('article')
    expect(masterCard).not.toBeNull()
    await user.click(within(masterCard!).getByRole('button', { name: /Lanjutkan/i }))
    const spreadsheetLink = screen.getByRole('link', { name: /Buka spreadsheet/i })
    expect(spreadsheetLink).toHaveAttribute('href', 'https://docs.google.com/spreadsheets/d/14O64ETAtsMr_qfCdui_aP0Rr_e0gvzYL/edit?gid=1530083301#gid=1530083301')
  })

  it('menu garis tiga membuka dan menutup sidebar di tampilan HP', async () => {
    const user = userEvent.setup()
    render(<App />)
    const layout = document.querySelector('.admin-layout')!
    const garisTiga = screen.getByRole('button', { name: 'Buka menu' })

    // Awalnya laci tertutup — kelas nav-buka belum ada.
    expect(layout.className).not.toContain('nav-buka')
    expect(garisTiga).toHaveAttribute('aria-expanded', 'false')

    // Tekan garis tiga → laci terbuka.
    await user.click(garisTiga)
    expect(layout.className).toContain('nav-buka')
    expect(screen.getByRole('button', { name: 'Buka menu' })).toHaveAttribute('aria-expanded', 'true')

    // Memilih satu menu langsung menutup laci lagi (tidak menutupi konten).
    await user.click(screen.getByRole('button', { name: /^Pengaturan$/ }))
    expect(layout.className).not.toContain('nav-buka')
    expect(screen.getByRole('heading', { name: 'Pengaturan Portal', level: 1 })).toBeInTheDocument()
  })

  it('tombol tutup dan latar gelap menutup laci tanpa berpindah menu', async () => {
    const user = userEvent.setup()
    render(<App />)
    const layout = document.querySelector('.admin-layout')!
    await user.click(screen.getByRole('button', { name: 'Buka menu' }))
    expect(layout.className).toContain('nav-buka')

    await user.click(screen.getByRole('button', { name: 'Tutup menu' }))
    expect(layout.className).not.toContain('nav-buka')
    // Menu tidak berpindah — masih di Ringkasan.
    expect(screen.getByRole('heading', { name: 'Dashboard Korwil BMN', level: 1 })).toBeInTheDocument()

    // Menyentuh latar gelap di luar laci juga menutup, tanpa berpindah menu.
    await user.click(screen.getByRole('button', { name: 'Buka menu' }))
    expect(layout.className).toContain('nav-buka')
    await user.click(screen.getByRole('button', { name: /sentuh di luar/ }))
    expect(layout.className).not.toContain('nav-buka')
    expect(screen.getByRole('heading', { name: 'Dashboard Korwil BMN', level: 1 })).toBeInTheDocument()
  })

})
