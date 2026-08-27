// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { calculateAkunMitraProgress, createEmptyAkunMitraRecord, loadAkunMitraRecord, saveAkunMitraRecord, validateAkunMitraField, validateAkunMitraPhoto, validateAkunMitraRecord, withLocalAkunMitraTask } from './akunMitra'

describe('data Akun Mitra lokal', () => {
  beforeEach(() => localStorage.clear())

  it('menghitung progress 0 untuk data kosong dan 100 untuk seluruh field wajib', () => {
    const empty=createEmptyAkunMitraRecord('692310')
    expect(calculateAkunMitraProgress(empty).total).toBe(0)

    const filled=createEmptyAkunMitraRecord('692310')
    Object.assign(filled.unit,{npwpKantor:'123456789012345',emailKantor:'unit@example.go.id',telepon:'081234567890',alamat:'Jalan Contoh Nomor 1',rtRw:'001/002',kodepos:'28122',fotoGedungFile:'gedung.jpg'})
    const person={nama:'Nama Contoh',jabatan:'Kepala Satuan Kerja',email:'pegawai@example.go.id',nip:'198001012010011001',nik:'1471010101010001',noHp:'081234567890',tempatLahir:'Pekanbaru',tanggalLahir:'1980-01-01',jenisKelamin:'Laki-laki',alamat:'Jalan Contoh Nomor 1',rtRw:'001/002',kodepos:'28122',pasFotoFile:'foto.jpg'}
    Object.assign(filled.kpb,person);Object.assign(filled.operator,person)
    expect(calculateAkunMitraProgress(filled)).toEqual({unit:100,kpb:100,operator:100,total:100})
  })

  it('memvalidasi format identitas, kontak, alamat, dan tanggal',()=>{
    expect(validateAkunMitraField('npwpKantor','123456789012345')).toBe('')
    expect(validateAkunMitraField('npwpKantor','12.345')).toMatch(/15 atau 16 digit/)
    expect(validateAkunMitraField('email','salah@')).toMatch(/format email/)
    expect(validateAkunMitraField('telepon','1')).toBe('')
    expect(validateAkunMitraField('noHp','081234567890123456789')).toBe('')
    expect(validateAkunMitraField('telepon','0812abc')).toMatch(/hanya angka/)
    expect(validateAkunMitraField('nip','198001012010011001')).toBe('')
    expect(validateAkunMitraField('nip','123')).toMatch(/18 digit/)
    expect(validateAkunMitraField('nik','1471010101010001')).toBe('')
    expect(validateAkunMitraField('nik','123')).toMatch(/16 digit/)
    expect(validateAkunMitraField('rtRw','001/002')).toBe('')
    expect(validateAkunMitraField('rtRw','RT 1')).toMatch(/contoh 001\/002/)
    expect(validateAkunMitraField('kodepos','28122')).toBe('')
    expect(validateAkunMitraField('kodepos','2812')).toMatch(/5 digit/)
    expect(validateAkunMitraField('tanggalLahir','2999-01-01')).toMatch(/masa depan/)
  })

  it('tidak menghitung record invalid sebagai lengkap',()=>{
    const record=createEmptyAkunMitraRecord('692310')
    Object.assign(record.unit,{npwpKantor:'abc',emailKantor:'salah',telepon:'nomor',alamat:'A',rtRw:'x',kodepos:'1',fotoGedungFile:'foto.jpg'})
    expect(calculateAkunMitraProgress(record).unit).toBe(14)
    expect(validateAkunMitraRecord(record).unit.npwpKantor).toBeTruthy()
  })

  it('menolak foto yang melebihi 3 MB dan menerima gambar valid',()=>{
    const valid=new File([new Uint8Array(1024)],'foto.jpg',{type:'image/jpeg'})
    const tooLarge=new File([new Uint8Array(3*1024*1024+1)],'besar.jpg',{type:'image/jpeg'})
    const wrongType=new File([new Uint8Array(10)],'dokumen.pdf',{type:'application/pdf'})
    expect(validateAkunMitraPhoto(valid)).toBe('')
    expect(validateAkunMitraPhoto(tooLarge)).toMatch(/maksimal 3 MB/)
    expect(validateAkunMitraPhoto(wrongType)).toMatch(/JPG, PNG, atau WebP/)
  })

  it('menambahkan satu pekerjaan lokal untuk 18 satker tanpa Kanwil',()=>{
    const tasks=withLocalAkunMitraTask([])
    expect(tasks).toHaveLength(1)
    expect(tasks[0].id).toBe('akun-mitra-local')
    expect(tasks[0].assignments).toHaveLength(18)
    expect(tasks[0].assignments.some(a=>a.satker==='692507')).toBe(false)
  })

  it('maps SQLite workflow states without resetting other assignments',()=>{
    const accepted={...createEmptyAkunMitraRecord('692310'),status:'selesai' as const}
    const revision={...createEmptyAkunMitraRecord('692781'),status:'perbaikan' as const,reviewNote:'Koreksi NIK.'}
    const existing={id:'other-task',title:'Lain',description:'',method:'portal' as const,due:'',letter:'',active:true,priority:'normal' as const,assignments:[{satker:'692310',progress:70,status:'proses' as const,missing:[],revisionCount:0,updated:''}]}
    const tasks=withLocalAkunMitraTask([existing],[accepted,revision])
    expect(tasks.find(task=>task.id==='other-task')?.assignments[0].progress).toBe(70)
    const mitra=tasks.find(task=>task.id==='akun-mitra-local')!
    expect(mitra.assignments.find(item=>item.satker==='692310')).toMatchObject({status:'selesai',progress:100,missing:[]})
    expect(mitra.assignments.find(item=>item.satker==='692781')).toMatchObject({status:'perbaikan'})
  })

  it('menyimpan data terpisah untuk setiap satker', () => {
    const siak=createEmptyAkunMitraRecord('692310')
    siak.unit.emailKantor='rutan.siak@example.go.id'
    saveAkunMitraRecord(siak)

    expect(loadAkunMitraRecord('692310').unit.emailKantor).toBe('rutan.siak@example.go.id')
    expect(loadAkunMitraRecord('692781').unit.emailKantor).toBe('')
  })
})
