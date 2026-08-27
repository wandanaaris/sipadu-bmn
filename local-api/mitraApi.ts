import type { LocalMitraPhotoSlot, LocalMitraRecord } from './types.js'
import type { MitraSqliteStore } from './mitraSqlite.js'

const API_PREFIX='/api/local/mitra'
const photoSlots=new Set<LocalMitraPhotoSlot>(['unit','kpb','operator'])
const localHosts=new Set(['localhost','127.0.0.1','::1'])
const json=(value:unknown,status=200)=>Response.json(value,{status})
const arrayBuffer=(bytes:Uint8Array)=>{const copy=new Uint8Array(bytes.byteLength);copy.set(bytes);return copy.buffer}

export async function handleLocalMitraRequest(request:Request,store:MitraSqliteStore):Promise<Response|null>{
 const url=new URL(request.url)
 if(!url.pathname.startsWith(API_PREFIX))return null
 if(!localHosts.has(url.hostname))return json({error:'Local Akun Mitra API hanya tersedia melalui localhost.'},403)
 const suffix=url.pathname.slice(API_PREFIX.length)
 if((suffix===''||suffix==='/')&&request.method==='GET')return json(store.listRecords())
 const parts=suffix.split('/').filter(Boolean).map(decodeURIComponent)
 const satkerCode=parts[0]
 if(!satkerCode||!/^\d{6}$/.test(satkerCode))return json({error:'Kode satker tidak valid.'},400)
 if(parts.length===1){
  if(request.method==='GET'){const record=store.getRecord(satkerCode);return record?json(record):json({error:'Data belum tersedia.'},404)}
  if(request.method==='PUT'){
   try{
    const record=await request.json() as LocalMitraRecord
    if(record.satkerCode!==satkerCode||!record.unit||!record.kpb||!record.operator)return json({error:'Payload Akun Mitra tidak valid.'},400)
    return json(store.upsertRecord(record))
   }catch{return json({error:'JSON tidak valid.'},400)}
  }
 }
 if(parts.length===2&&parts[1]==='review'&&request.method==='POST'){
  try{
   const body=await request.json() as {decision?:unknown;reviewNote?:unknown}
   if(body.decision!=='perbaikan'&&body.decision!=='selesai')return json({error:'Keputusan review tidak valid.'},400)
   return json(store.reviewRecord(satkerCode,body.decision,typeof body.reviewNote==='string'?body.reviewNote:''))
  }catch(error){return json({error:error instanceof Error?error.message:'Review gagal.'},409)}
 }
 if(parts.length===2&&parts[1]==='admin'&&request.method==='PUT'){
  try{
   const record=await request.json() as LocalMitraRecord
   if(record.satkerCode!==satkerCode||!record.unit||!record.kpb||!record.operator)return json({error:'Payload Akun Mitra tidak valid.'},400)
   return json(store.updateAcceptedRecord(record))
  }catch(error){return json({error:error instanceof Error?error.message:'Koreksi Korwil gagal.'},409)}
 }
 if(parts.length===3&&parts[1]==='photos'&&photoSlots.has(parts[2] as LocalMitraPhotoSlot)){
  const slot=parts[2] as LocalMitraPhotoSlot
  if(request.method==='GET'){
   const photo=store.getPhoto(satkerCode,slot)
   return photo?new Response(arrayBuffer(photo.bytes),{headers:{'content-type':photo.mimeType,'content-length':String(photo.bytes.byteLength),'x-file-name':encodeURIComponent(photo.fileName)}}):json({error:'Foto belum tersedia.'},404)
  }
  if(request.method==='PUT'){
   const record=store.getRecord(satkerCode)
   if(record&&['siap_verifikasi','selesai'].includes(record.status))return json({error:'Data Akun Mitra terkunci.'},409)
   const mimeType=request.headers.get('content-type')??''
   const encodedName=request.headers.get('x-file-name')??''
   if(!['image/jpeg','image/png','image/webp'].includes(mimeType))return json({error:'Format foto tidak didukung.'},415)
   const bytes=new Uint8Array(await request.arrayBuffer())
   if(bytes.byteLength>3*1024*1024)return json({error:'Ukuran foto maksimal 3 MB.'},413)
   if(!encodedName)return json({error:'Nama file wajib diisi.'},400)
   store.putPhoto(satkerCode,slot,{fileName:decodeURIComponent(encodedName),mimeType,bytes})
   return new Response(null,{status:204})
  }
 }
 return json({error:'Endpoint tidak ditemukan.'},404)
}
