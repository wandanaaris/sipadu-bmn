import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}})
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('')

Deno.serve(async(req:Request)=>{
  if(req.method!=='POST')return json({error:'Method not allowed'},405)
  try{
    const body=await req.json(),token=String(body.token??''),credentials=body.credentials,rootFolderId=String(body.rootFolderId??'')
    const validService=credentials?.type==='service_account'&&credentials.client_email&&credentials.private_key
    const validUser=credentials?.type==='authorized_user'&&credentials.client_id&&credentials.client_secret&&credentials.refresh_token
    if(!token||(!validService&&!validUser)||!rootFolderId)return json({error:'Konfigurasi tidak lengkap.'},400)
    const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}})
    const tokenHash=await hash(token);const{data:setup}=await db.from('setup_tokens').select('token_hash').eq('token_hash',tokenHash).eq('purpose','configure_drive').is('used_at',null).gt('expires_at',new Date().toISOString()).maybeSingle()
    if(!setup)return json({error:'Token konfigurasi tidak valid atau kedaluwarsa.'},401)
    const rows=[{secret_key:'google_service_account_json',secret_value:JSON.stringify(credentials),updated_at:new Date().toISOString()},{secret_key:'google_drive_root_folder_id',secret_value:rootFolderId,updated_at:new Date().toISOString()}]
    const{error}=await db.from('integration_secrets').upsert(rows,{onConflict:'secret_key'});if(error)throw error
    await db.from('setup_tokens').update({used_at:new Date().toISOString()}).eq('token_hash',tokenHash)
    return json({status:'configured',credentialType:credentials.type,rootFolderId})
  }catch(error){console.error(error);return json({error:error instanceof Error?error.message:'Konfigurasi gagal.'},500)}
})
