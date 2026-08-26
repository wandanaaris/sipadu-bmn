import type { Task, TaskStatus } from '../data'
import { finalTasks } from '../finalTasks'
import { isSupabaseConfigured, supabase } from './supabase'

export type SubmissionDocument={id:string;document_type:string;original_filename:string;stored_path:string;file_size:number;mime_type:string;verification_status:string;archive_status:string;drive_url:string|null;review_note:string|null}
export type SubmissionRecord={id:string;submission_number:string;sender_name:string;sender_phone:string|null;sender_note:string|null;status:'mengunggah'|'menunggu_verifikasi'|'diterima'|'perlu_perbaikan'|'ditolak'|'dialihkan';review_note:string|null;submitted_at:string|null;created_at:string;tasks:{task_key:string;title:string}|null;satkers:{code:string;name:string}|null;supporting_documents:SubmissionDocument[]}

const fallback = () => structuredClone(finalTasks)
// Terapkan metadata pekerjaan (uploadLink/references/link) dari finalTasks ke semua environment,
// supaya tampilan satker selalu memakai folder Drive upload + peraturan terkini.
function applyFinalMeta(tasks:Task[]):Task[]{
  return tasks.map(t=>{
    const o=finalTasks.find(f=>f.id===t.id)
    if(!o)return t
    return {...t,title:o.title,description:o.description,link:o.link,uploadLink:o.uploadLink??t.uploadLink,references:o.references??t.references}
  })
}
const TASKS_CACHE_KEY='sipadu_tasks_cache_v1'
const TASKS_CACHE_MS=60000
function readTasksCache():{tasks:Task[];source:'supabase'|'fallback'}|null{
  try{
    const raw=sessionStorage.getItem(TASKS_CACHE_KEY)
    if(!raw)return null
    const parsed=JSON.parse(raw) as {at:number;payload:{tasks:Task[];source:'supabase'|'fallback'}}
    if(!parsed?.payload?.tasks?.length||Date.now()-parsed.at>TASKS_CACHE_MS)return null
    return parsed.payload
  }catch{return null}
}
export function clearTasksCache(){try{sessionStorage.removeItem(TASKS_CACHE_KEY)}catch{/* abaikan */}}
export async function loadTasks(force=false): Promise<{ tasks: Task[]; source: 'supabase' | 'fallback' }> {
  if (!force) {const cached=readTasksCache();if(cached)return cached}
  if (!isSupabaseConfigured || !supabase) return { tasks: applyFinalMeta(fallback()), source: 'fallback' }
  const { data, error } = await supabase.rpc('get_active_portal')
  if (!error && Array.isArray(data) && data.length) {
    const result={tasks:applyFinalMeta(data as unknown as Task[]),source:'supabase' as const}
    try{sessionStorage.setItem(TASKS_CACHE_KEY,JSON.stringify({at:Date.now(),payload:result}))}catch{/* penuh: abaikan */}
    return result
  }
  console.warn('RPC portal aktif belum dapat dibaca; memakai data cadangan.', error?.message)
  return { tasks: applyFinalMeta(fallback()), source: 'fallback' }
}
export async function loadSatkerPortal(accessToken:string):Promise<Task[]|null>{if(!isSupabaseConfigured||!supabase)return null;const{data,error}=await supabase.rpc('get_satker_portal',{p_token:accessToken});if(error||!data)return null;return applyFinalMeta((data.tasks??[]) as Task[])}
export async function persistTaskActive(taskKey:string,active:boolean){if(!supabase)return;const{error}=await supabase.from('tasks').update({is_active:active}).eq('task_key',taskKey);if(error)console.warn('Status pekerjaan belum tersimpan:',error.message)}
export async function persistAssignmentStatus(taskKey:string,satkerCodeValue:string,status:TaskStatus,progress?:number){clearTasksCache();if(!supabase)return;const changes:Record<string,unknown>={status,updated_at:new Date().toISOString()};if(progress!==undefined)changes.progress=progress;const{data:task}=await supabase.from('tasks').select('id').eq('task_key',taskKey).single();const{data:satker}=await supabase.from('satkers').select('id').eq('code',satkerCodeValue).single();if(!task||!satker)return;const{error}=await supabase.from('task_assignments').update(changes).eq('task_id',task.id).eq('satker_id',satker.id);if(error)console.warn('Status satker belum tersimpan:',error.message)}

export async function createTask(input:{title:string;description:string;method:Task['method'];dueDate?:string;sourceUrl?:string;sourceLetter?:string;priority:Task['priority'];satkerCodes:string[];requirements:string[]}){clearTasksCache()
  if(!supabase)throw new Error('Database belum tersedia.')
  const slug=input.title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48)
  const taskKey=`${slug}-${Date.now().toString(36)}`
  const{data:task,error}=await supabase.from('tasks').insert({task_key:taskKey,title:input.title,description:input.description,method:input.method,due_date:input.dueDate||null,due_label:input.dueDate?new Date(`${input.dueDate}T00:00:00`).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}):'Tidak ada tenggat',source_url:input.sourceUrl||null,source_letter:input.sourceLetter||null,is_active:true,priority:input.priority}).select('id').single();if(error)throw error
  if(input.requirements.length){const reqs=input.requirements.map((label,index)=>({task_id:task.id,requirement_key:`dokumen_${index+1}`,label,track:'Data Dukung',display_order:index+1,is_required:true}));const{error:reqError}=await supabase.from('task_requirements').insert(reqs);if(reqError)throw reqError}
  const{data:targets,error:targetError}=await supabase.from('satkers').select('id,code').in('code',input.satkerCodes);if(targetError)throw targetError
  if(targets?.length){const rows=targets.map(s=>({task_id:task.id,satker_id:s.id,progress:0,status:'belum' as TaskStatus,missing:input.requirements}));const{error:aError}=await supabase.from('task_assignments').insert(rows);if(aError)throw aError}
  return taskKey
}

export async function submitLinkSubmission(input:{task:Task;satkerCode:string;senderName:string;senderPhone:string;senderNote:string;sheetUrl:string}){clearTasksCache()
  if(!supabase)throw new Error('Koneksi penyimpanan belum tersedia.')
  const payload={action:'submit-link',taskKey:input.task.id,satkerCode:input.satkerCode,senderName:input.senderName,senderPhone:input.senderPhone,senderNote:input.senderNote,sheetUrl:input.sheetUrl}
  const{data,error}=await supabase.functions.invoke('submission-upload',{body:payload});if(error)throw new Error(error.message);if(data?.error)throw new Error(data.error)
  return data as {submissionNumber:string;status:string;submittedAt:string;documentCount:number}
}
export async function createOpenSubmission(input:{task:Task;satkerCode:string;senderName:string;senderPhone:string;senderNote:string;files:Array<{file:File;requirementKey?:string;documentType:string}>}){
  if(!supabase)throw new Error('Koneksi penyimpanan belum tersedia.')
  const payload={action:'create',taskKey:input.task.id,satkerCode:input.satkerCode,senderName:input.senderName,senderPhone:input.senderPhone,senderNote:input.senderNote,files:input.files.map(x=>({name:x.file.name,size:x.file.size,type:x.file.type,requirementKey:x.requirementKey,documentType:x.documentType}))}
  const{data,error}=await supabase.functions.invoke('submission-upload',{body:payload});if(error)throw new Error(error.message);if(data?.error)throw new Error(data.error)
  const uploads=data.uploads as Array<{name:string;path:string;token:string}>
  for(let i=0;i<uploads.length;i++){const upload=uploads[i],source=input.files[i];const{error:uploadError}=await supabase.storage.from('submission-inbox').uploadToSignedUrl(upload.path,upload.token,source.file,{contentType:source.file.type});if(uploadError)throw new Error(`Gagal mengunggah ${source.file.name}: ${uploadError.message}`)}
  const{data:final,error:finalError}=await supabase.functions.invoke('submission-upload',{body:{action:'finalize',submissionNumber:data.submissionNumber}});if(finalError)throw new Error(finalError.message);if(final?.error)throw new Error(final.error)
  return final as {submissionNumber:string;status:string;submittedAt:string;documentCount:number}
}
export async function getSubmissionReceipt(number:string){if(!supabase)return null;const{data,error}=await supabase.rpc('get_submission_receipt',{p_number:number});if(error)return null;return data as {submissionNumber:string;status:string;task:string;satker:string;submittedAt:string|null;reviewNote:string|null;documentCount:number}|null}
export async function loadSubmissions():Promise<SubmissionRecord[]>{if(!supabase)return[];const{data,error}=await supabase.from('submissions').select('id,submission_number,sender_name,sender_phone,sender_note,status,review_note,submitted_at,created_at,tasks(task_key,title),satkers(code,name),supporting_documents(id,document_type,original_filename,stored_path,file_size,mime_type,verification_status,archive_status,drive_url,review_note)').order('created_at',{ascending:false});if(error)throw new Error(error.message);return(data??[])as unknown as SubmissionRecord[]}
export async function documentPreviewUrl(path:string){if(!supabase)return null;const{data,error}=await supabase.storage.from('submission-inbox').createSignedUrl(path,300);return error?null:data.signedUrl}
export async function reviewSubmission(id:string,status:'diterima'|'perlu_perbaikan'|'ditolak',note:string){clearTasksCache();if(!supabase)throw new Error('Database belum tersedia.');const{data:submission,error:readError}=await supabase.from('submissions').select('assignment_id').eq('id',id).single();if(readError)throw readError;const now=new Date().toISOString();const{error}=await supabase.from('submissions').update({status,review_note:note||null,reviewed_at:now}).eq('id',id);if(error)throw error;const docStatus=status==='diterima'?'diterima':status==='perlu_perbaikan'?'perlu_perbaikan':'ditolak';await supabase.from('supporting_documents').update({verification_status:docStatus,review_note:note||null,archive_status:status==='diterima'?'pending_drive':'inbox'}).eq('submission_id',id);const assignmentStatus:TaskStatus=status==='diterima'?'selesai':status==='perlu_perbaikan'?'perbaikan':'belum';await supabase.from('task_assignments').update({status:assignmentStatus,completed_at:status==='diterima'?now:null,updated_at:now}).eq('id',submission.assignment_id)}


export async function transferSubmission(id:string,targetCode:string,note:string){clearTasksCache();if(!supabase)throw new Error('Database belum tersedia.');const[{data:submission},{data:satker}]=await Promise.all([supabase.from('submissions').select('task_id').eq('id',id).single(),supabase.from('satkers').select('id').eq('code',targetCode).single()]);if(!submission||!satker)throw new Error('Satker tujuan tidak ditemukan.');const{data:assignment}=await supabase.from('task_assignments').select('id').eq('task_id',submission.task_id).eq('satker_id',satker.id).maybeSingle();if(!assignment)throw new Error('Satker tujuan tidak ditugaskan pada pekerjaan ini.');await supabase.from('submissions').update({satker_id:satker.id,assignment_id:assignment.id,status:'dialihkan',review_note:note||'Dialihkan oleh Korwil',reviewed_at:new Date().toISOString()}).eq('id',id);await supabase.from('supporting_documents').update({assignment_id:assignment.id}).eq('submission_id',id)}
