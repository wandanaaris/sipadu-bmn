import { useEffect, useMemo, useState } from 'react'
import { Building2, Check, CircleAlert, ImageUp, Save, ShieldCheck, UserRound } from 'lucide-react'
import { satkers } from './data'
import { calculateAkunMitraProgress, createEmptyAkunMitraRecord, validateAkunMitraPhoto, validateAkunMitraRecord, type AkunMitraFieldKey, type AkunMitraPhotoSlot, type AkunMitraRecord, type PersonData, type UnitData } from './akunMitra'
import type { MitraDataRepository } from './lib/mitraDataRepository'
import { activeMitraRepository } from './lib/activeMitraRepository'

const personFields:Array<{key:keyof PersonData;label:string;type?:string;wide?:boolean}>=[
 {key:'nama',label:'Nama lengkap'}, {key:'jabatan',label:'Jabatan'}, {key:'email',label:'Email',type:'email'}, {key:'nip',label:'NIP'}, {key:'nik',label:'NIK'},
 {key:'noHp',label:'Telepon/No HP'}, {key:'tempatLahir',label:'Tempat lahir'}, {key:'tanggalLahir',label:'Tanggal lahir',type:'date'}, {key:'jenisKelamin',label:'Jenis kelamin'},
 {key:'alamat',label:'Alamat',wide:true}, {key:'rtRw',label:'RT/RW'}, {key:'kodepos',label:'Kode pos'},
]
const numericFields:AkunMitraFieldKey[]=['npwpKantor','telepon','noHp','nip','nik','kodepos']
const maxLengths:Partial<Record<AkunMitraFieldKey,number>>={npwpKantor:16,nip:18,nik:16,rtRw:7,kodepos:5}
const normalize=(field:AkunMitraFieldKey,value:string)=>{
 if(numericFields.includes(field)){const digits=value.replace(/\D/g,'');const limit=maxLengths[field];return limit?digits.slice(0,limit):digits}
 return field==='rtRw'?value.replace(/[^\d/]/g,'').replace(/(\/.*)\//g,'$1').slice(0,7):value
}

const storageName=import.meta.env.DEV?'SQLite lokal':'Supabase'
const formMode=import.meta.env.DEV?'PROTOTIPE LOKAL':'FORM AKUN MITRA'
const storageNotice=import.meta.env.DEV?'Prototipe localhost ini menyimpan teks dan foto di SQLite lokal pada komputer ini. Data tidak dikirim ke Supabase atau layanan produksi.':'Data teks dan foto tersimpan terpusat di Supabase.'

export function AkunMitraForm({satkerCode,onSaved,repository=activeMitraRepository}:{satkerCode:string;onSaved:()=>void;repository?:MitraDataRepository}){
 const [record,setRecord]=useState<AkunMitraRecord>(()=>createEmptyAkunMitraRecord(satkerCode))
 const [tab,setTab]=useState<'unit'|'kpb'|'operator'>('unit'),[message,setMessage]=useState(''),[photoError,setPhotoError]=useState(''),[saving,setSaving]=useState(false),[loaded,setLoaded]=useState(false)
 const [touched,setTouched]=useState<Record<string,boolean>>({})
 useEffect(()=>{let active=true;repository.loadOne(satkerCode).then(value=>{if(active){setRecord(value);setLoaded(true)}}).catch(error=>{if(active){setMessage(error instanceof Error?error.message:'Data SQLite lokal belum dapat dibaca.');setLoaded(true)}});return()=>{active=false}},[repository,satkerCode])
 const progress=useMemo(()=>calculateAkunMitraProgress(record),[record]),errors=useMemo(()=>validateAkunMitraRecord(record),[record])
 const satker=satkers.find(s=>s.code===satkerCode)
 const update=<G extends 'unit'|'kpb'|'operator'>(group:G,key:keyof AkunMitraRecord[G],value:string)=>setRecord(current=>({...current,[group]:{...current[group],[key]:normalize(key as AkunMitraFieldKey,value)}}))
 const touch=(group:string,key:string)=>setTouched(current=>({...current,[`${group}.${key}`]:true}))
 const save=async(ready=false)=>{setSaving(true);try{const status=ready?'siap_verifikasi':record.status==='perbaikan'?'perbaikan':'draf';const saved=await repository.save({...record,status});setRecord(saved);setMessage(ready?`Data ditandai siap untuk diverifikasi pada ${storageName}.`:`Draf tersimpan di ${storageName}.`);window.dispatchEvent(new CustomEvent('akun-mitra-updated'));onSaved()}catch(error){setMessage(error instanceof Error?error.message:'Draf belum dapat disimpan.')}finally{setSaving(false)}}
 const uploadPhoto=async(slot:AkunMitraPhotoSlot,file:File)=>{const error=validateAkunMitraPhoto(file);if(error){setPhotoError(error);return}setPhotoError('');try{await repository.savePhoto(satkerCode,slot,file);if(slot==='unit')update('unit','fotoGedungFile',file.name);else update(slot,'pasFotoFile',file.name);setMessage(`${file.name} tersimpan di ${storageName}.`)}catch(uploadError){setPhotoError(uploadError instanceof Error?uploadError.message:'Foto belum dapat disimpan.')}}
 if(!loaded)return <section className="akun-mitra-form"><p>Memuat data Akun Mitra…</p></section>
 if(record.status==='selesai')return <section className="akun-mitra-form akun-mitra-closed"><Check/><strong>Anda sudah mengisi pekerjaan ini.</strong></section>
 if(record.status==='siap_verifikasi')return <section className="akun-mitra-form akun-mitra-locked"><ShieldCheck/><strong>Data sedang menunggu verifikasi Korwil.</strong><p>Form terkunci sampai Korwil meminta perbaikan.</p></section>
 return <section className="akun-mitra-form">
  <div className="akun-mitra-title"><div><span className="eyebrow">{formMode}</span><h2>Pemutakhiran Data Akun Mitra</h2><p>{satker?.name} · {satkerCode}</p></div><div className="akun-total"><strong>{progress.total}%</strong><span>Kelengkapan</span></div></div>
  <div className="privacy-warning"><ShieldCheck/><div><strong>Data pribadi sensitif</strong><p>{storageNotice}</p></div></div>
  {record.status==='perbaikan'&&<div className="akun-review-note"><CircleAlert/><div><strong>Perlu perbaikan dari Korwil</strong><p>{record.reviewNote}</p></div></div>}
  <nav className="akun-tabs">
   <button className={tab==='unit'?'active':''} onClick={()=>setTab('unit')}><Building2/><span>Data Unit<small>{progress.unit}% lengkap</small></span></button>
   <button className={tab==='kpb'?'active':''} onClick={()=>setTab('kpb')}><UserRound/><span>Pejabat KPB<small>{progress.kpb}% lengkap</small></span></button>
   <button className={tab==='operator'?'active':''} onClick={()=>setTab('operator')}><UserRound/><span>Operator<small>{progress.operator}% lengkap</small></span></button>
  </nav>
  {tab==='unit'?<UnitFields value={record.unit} errors={errors.unit} touched={touched} touch={key=>touch('unit',key)} update={(key,value)=>update('unit',key,value)} upload={file=>void uploadPhoto('unit',file)} satkerCode={satkerCode} satkerName={satker?.name??''}/>:<PersonFields title={tab==='kpb'?'Data Pejabat KPB Satker':'Data Operator Satker'} slot={tab} value={record[tab]} errors={errors[tab]} touched={touched} touch={key=>touch(tab,key)} update={(key,value)=>update(tab,key,value)} upload={file=>void uploadPhoto(tab,file)}/>}
  {photoError&&<div className="auth-message error">{photoError}</div>}
  {message&&<div className="akun-message"><Check/>{message}</div>}
  <div className="akun-actions"><button className="ghost" disabled={saving} onClick={()=>void save(false)}><Save/>Simpan draf</button><button className="primary" disabled={saving||progress.total<100} onClick={()=>void save(true)}><ShieldCheck/>Ajukan untuk diverifikasi</button></div>
  {progress.total<100&&<div className="akun-incomplete"><CircleAlert/>Field yang kosong atau formatnya salah tidak dihitung lengkap.</div>}
 </section>
}

type CommonProps={errors:Partial<Record<string,string>>;touched:Record<string,boolean>;touch:(key:string)=>void}
function UnitFields({value,errors,touched,touch,update,upload,satkerCode,satkerName}:{value:UnitData;update:(key:keyof UnitData,value:string)=>void;upload:(file:File)=>void;satkerCode:string;satkerName:string}&CommonProps){
 const code20=`137040900${satkerCode}000KD`,prefix='unit.'
 return <div className="akun-section"><div className="akun-section-head"><h3>Data Unit (Kanwil)</h3><p>Identitas kantor dan unggahan foto gedung.</p></div><div className="akun-field-grid">
  <label>Nama unit<input value={satkerName} readOnly/></label><label>Kode Satker 20 digit<input value={code20} readOnly/></label>
  <ValidatedField field="npwpKantor" label="NPWP kantor" value={value.npwpKantor} error={errors.npwpKantor} showError={touched[prefix+'npwpKantor']} onBlur={()=>touch('npwpKantor')} onChange={v=>update('npwpKantor',v)}/>
  <ValidatedField field="emailKantor" label="Email kantor" type="email" value={value.emailKantor} error={errors.emailKantor} showError={touched[prefix+'emailKantor']} onBlur={()=>touch('emailKantor')} onChange={v=>update('emailKantor',v)}/>
  <ValidatedField field="telepon" label="Telepon/No HP" value={value.telepon} error={errors.telepon} showError={touched[prefix+'telepon']} onBlur={()=>touch('telepon')} onChange={v=>update('telepon',v)}/>
  <ValidatedField field="rtRw" label="RT/RW" placeholder="001/002" value={value.rtRw} error={errors.rtRw} showError={touched[prefix+'rtRw']} onBlur={()=>touch('rtRw')} onChange={v=>update('rtRw',v)}/>
  <ValidatedField field="kodepos" label="Kode pos" value={value.kodepos} error={errors.kodepos} showError={touched[prefix+'kodepos']} onBlur={()=>touch('kodepos')} onChange={v=>update('kodepos',v)}/>
  <ValidatedField field="alamat" label="Alamat" wide textarea value={value.alamat} error={errors.alamat} showError={touched[prefix+'alamat']} onBlur={()=>touch('alamat')} onChange={v=>update('alamat',v)}/>
  <PhotoUpload ariaLabel="Upload foto gedung kantor" title="Foto gedung kantor" fileName={value.fotoGedungFile} upload={upload}/>
 </div></div>
}

function PersonFields({title,slot,value,errors,touched,touch,update,upload}:{title:string;slot:'kpb'|'operator';value:PersonData;update:(key:keyof PersonData,value:string)=>void;upload:(file:File)=>void}&CommonProps){
 return <div className="akun-section"><div className="akun-section-head"><h3>{title}</h3><p>Identitas pejabat/operator dan unggahan pasfoto.</p></div><div className="akun-field-grid">{personFields.map(f=><ValidatedField key={f.key} field={f.key} label={f.label} type={f.type} wide={f.wide} textarea={f.key==='alamat'} select={f.key==='jenisKelamin'} value={value[f.key]} error={errors[f.key]} showError={touched[`${slot}.${f.key}`]} onBlur={()=>touch(f.key)} onChange={v=>update(f.key,v)}/>)}<PhotoUpload ariaLabel={`Upload pasfoto ${slot==='kpb'?'Pejabat KPB':'Operator'}`} title={`Pasfoto ${slot==='kpb'?'Pejabat KPB':'Operator'}`} fileName={value.pasFotoFile} upload={upload}/></div></div>
}

function ValidatedField({field,label,value,error,showError,onChange,onBlur,type='text',wide,textarea,select,placeholder}:{field:AkunMitraFieldKey;label:string;value:string;error?:string;showError?:boolean;onChange:(v:string)=>void;onBlur:()=>void;type?:string;wide?:boolean;textarea?:boolean;select?:boolean;placeholder?:string}){
 const props={value,'aria-label':label,onChange:(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>)=>onChange(e.target.value),onBlur,required:true,'aria-invalid':Boolean(showError&&error),'aria-describedby':`${field}-error`}
 const inputProps={...props,inputMode:numericFields.includes(field)?'numeric' as const:field==='rtRw'?'numeric' as const:undefined,maxLength:maxLengths[field],placeholder,type,max:type==='date'?new Date().toISOString().slice(0,10):undefined}
 return <label className={`${wide?'wide ':''}${showError&&error?'field-invalid':''}`}>{label}<span className="field-rule">{ruleHint(field)}</span>{select?<select {...props}><option value="">Pilih</option><option>Laki-laki</option><option>Perempuan</option></select>:textarea?<textarea {...props} placeholder={placeholder}/>:<input {...inputProps}/>} {showError&&error&&<small id={`${field}-error`} className="field-error">{error}</small>}</label>
}
const ruleHint=(field:AkunMitraFieldKey)=>field==='npwpKantor'?'15–16 digit angka':field==='email'||field==='emailKantor'?'Format email aktif':field==='telepon'||field==='noHp'?'Hanya angka':field==='nip'?'18 digit angka':field==='nik'?'16 digit angka':field==='rtRw'?'Contoh 001/002':field==='kodepos'?'5 digit angka':field==='tanggalLahir'?'Tidak boleh di masa depan':field==='alamat'?'Minimal 5 karakter':field==='nama'||field==='jabatan'||field==='tempatLahir'?'Huruf dan tanda baca yang sesuai':''

function PhotoUpload({ariaLabel,title,fileName,upload}:{ariaLabel:string;title:string;fileName:string;upload:(file:File)=>void}){
 return <label className={`akun-photo-upload wide ${fileName?'has-file':''}`}><input aria-label={ariaLabel} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={e=>{const file=e.target.files?.[0];if(file)upload(file)}}/><ImageUp/><span><strong>{title}</strong><small>{fileName||'JPG, PNG, atau WebP · maksimal 3 MB'}</small></span><b>{fileName?'Ganti foto':'Pilih foto'}</b></label>
}
