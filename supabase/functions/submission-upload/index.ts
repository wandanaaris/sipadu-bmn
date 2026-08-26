import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS"}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}})
const allowed=new Set(['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/jpeg','image/png','image/webp','application/zip'])
const safeName=(name:string)=>name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'_').replace(/_+/g,'_').slice(-120)

const log=(db:any,step:string,payload:any,msg:string)=>db.from('submission_debug').insert({step,payload,msg}).then(()=>{}).catch(()=>{})
Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors})
  if(req.method!=='POST')return json({error:'Method not allowed'},405)
  try{
    const body=await req.json()
    const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}})
    await log(db,'request',body,`action=${(body as any)?.action}`)
    if(body.action==='create'){
      const taskKey=String(body.taskKey??'').trim(),satkerCode=String(body.satkerCode??'').trim(),senderName=String(body.senderName??'').trim(),senderPhone=String(body.senderPhone??'').trim(),senderNote=String(body.senderNote??'').trim()
      const files=Array.isArray(body.files)?body.files:[]
      if(!taskKey||!/^69\d{4}$/.test(satkerCode))return json({error:'Pekerjaan atau satker tidak valid.'},400)
      if(senderName.length<2||senderName.length>100)return json({error:'Nama pengirim wajib diisi.'},400)
      if(senderPhone&&(!/^[0-9+ -]{7,20}$/.test(senderPhone)))return json({error:'Nomor kontak tidak valid.'},400)
      if(!files.length||files.length>10)return json({error:'Pilih 1 sampai 10 file.'},400)
      for(const f of files){if(!f?.name||!allowed.has(String(f.type))||Number(f.size)<=0||Number(f.size)>26214400)return json({error:`File ${String(f?.name??'')} tidak didukung atau melebihi 25 MB.`},400)}
      const [{data:task},{data:satker}]=await Promise.all([db.from('tasks').select('id,task_key,is_active').eq('task_key',taskKey).eq('is_active',true).maybeSingle(),db.from('satkers').select('id,code,is_active').eq('code',satkerCode).eq('is_active',true).maybeSingle()])
      if(!task||!satker)return json({error:'Pekerjaan tidak aktif atau satker tidak ditemukan.'},404)
      const {data:assignment}=await db.from('task_assignments').select('id').eq('task_id',task.id).eq('satker_id',satker.id).maybeSingle()
      if(!assignment)return json({error:'Satker tidak ditugaskan pada pekerjaan ini.'},403)
      const since=new Date(Date.now()-15*60*1000).toISOString();const {count}=await db.from('submissions').select('*',{count:'exact',head:true}).eq('task_id',task.id).eq('satker_id',satker.id).gte('created_at',since)
      if((count??0)>=5)return json({error:'Terlalu banyak pengajuan dalam 15 menit. Coba kembali beberapa saat lagi.'},429)
      const {data:submission,error:submissionError}=await db.from('submissions').insert({task_id:task.id,satker_id:satker.id,assignment_id:assignment.id,sender_name:senderName,sender_phone:senderPhone||null,sender_note:senderNote||null,status:'mengunggah'}).select('id,submission_number').single()
      if(submissionError)throw submissionError
      const uploads=[]
      for(const file of files){
        const path=`${taskKey}/${satkerCode}/${submission.submission_number}/${crypto.randomUUID()}-${safeName(String(file.name))}`
        const {data:signed,error:signedError}=await db.storage.from('submission-inbox').createSignedUploadUrl(path)
        if(signedError)throw signedError
        const {error:docError}=await db.from('supporting_documents').insert({assignment_id:assignment.id,submission_id:submission.id,document_type:String(file.documentType??'Data Dukung').slice(0,120),requirement_key:file.requirementKey?String(file.requirementKey).slice(0,100):null,title:String(file.documentType??file.name).slice(0,200),original_filename:String(file.name).slice(0,255),stored_path:path,file_size:Number(file.size),mime_type:String(file.type),verification_status:'menunggu',archive_status:'inbox'})
        if(docError)throw docError
        uploads.push({name:file.name,path,token:signed.token})
      }
      return json({submissionNumber:submission.submission_number,uploads})
    }
    if(body.action==='submit-link'){
      const taskKey=String(body.taskKey??'').trim(),satkerCode=String(body.satkerCode??'').trim(),senderName=String(body.senderName??'').trim(),senderPhone=String(body.senderPhone??'').trim(),senderNote=String(body.senderNote??'').trim(),sheetUrl=String(body.sheetUrl??'').trim()
      if(!taskKey||!/^69\d{4}$/.test(satkerCode))return json({error:'Pekerjaan atau satker tidak valid.'},400)
      if(senderName.length<2||senderName.length>100)return json({error:'Nama pengirim wajib diisi.'},400)
      if(!sheetUrl)return json({error:'Tautan sheet wajib diisi.'},400)
      const [{data:task},{data:satker}]=await Promise.all([db.from('tasks').select('id,task_key,is_active').eq('task_key',taskKey).eq('is_active',true).maybeSingle(),db.from('satkers').select('id,code,is_active').eq('code',satkerCode).eq('is_active',true).maybeSingle()])
      if(!task||!satker)return json({error:'Pekerjaan tidak aktif atau satker tidak ditemukan.'},404)
      const {data:assignment}=await db.from('task_assignments').select('id').eq('task_id',task.id).eq('satker_id',satker.id).maybeSingle()
      if(!assignment)return json({error:'Satker tidak ditugaskan pada pekerjaan ini.'},403)
      const {data:submission,error:submissionError}=await db.from('submissions').insert({task_id:task.id,satker_id:satker.id,assignment_id:assignment.id,sender_name:senderName,sender_phone:senderPhone||null,sender_note:senderNote||null,status:'menunggu_verifikasi',submitted_at:new Date().toISOString()}).select('id,submission_number').single()
      if(submissionError)throw submissionError
      const {error:docError}=await db.from('supporting_documents').insert({assignment_id:assignment.id,submission_id:submission.id,document_type:'Bukti Pengisian Sheet',requirement_key:null,title:'Tautan Sheet Sumber',original_filename:sheetUrl.slice(0,255),stored_path:null,file_size:0,mime_type:'text/uri-list',verification_status:'menunggu',archive_status:'inbox'})
      if(docError)throw docError
      await db.from('task_assignments').update({status:'verifikasi',submitted_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',assignment.id)
      return json({submissionNumber:submission.submission_number,status:'menunggu_verifikasi',submittedAt:new Date().toISOString(),documentCount:1})
    }
    if(body.action==='finalize'){
      const number=String(body.submissionNumber??'').trim().toUpperCase()
      const {data:submission}=await db.from('submissions').select('id,assignment_id,status,supporting_documents(id,stored_path)').eq('submission_number',number).maybeSingle()
      if(!submission)return json({error:'Nomor pengiriman tidak ditemukan.'},404)
      if(submission.status!=='mengunggah')return json({error:'Pengajuan sudah difinalisasi.'},409)
      const documents=(submission.supporting_documents??[]) as Array<{id:string;stored_path:string}>
      if(!documents.length)return json({error:'Tidak ada file dalam pengajuan.'},400)
      for(const document of documents){const parts=document.stored_path.split('/');const file=parts.pop()!;const folder=parts.join('/');const {data,error}=await db.storage.from('submission-inbox').list(folder,{search:file,limit:2});if(error||!data?.some(x=>x.name===file))return json({error:`File ${file} belum selesai diunggah.`},409)}
      const now=new Date().toISOString();const {error}=await db.from('submissions').update({status:'menunggu_verifikasi',submitted_at:now}).eq('id',submission.id);if(error)throw error
      await db.from('task_assignments').update({status:'verifikasi',progress:100,submitted_at:now,updated_at:now}).eq('id',submission.assignment_id)
      return json({submissionNumber:number,status:'menunggu_verifikasi',submittedAt:now,documentCount:documents.length})
    }
    return json({error:'Action tidak dikenal.'},400)
  }catch(error){console.error(error);await log(db,'error',body,error instanceof Error?error.message:'Terjadi kesalahan server.');return json({error:error instanceof Error?error.message:'Terjadi kesalahan server.'},500)}
})
