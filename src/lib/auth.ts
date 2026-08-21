import { supabase } from './supabase'

export type AdminProfile = { email:string; displayName:string }

type LoginResult = { profile:AdminProfile|null; error:string|null }

export async function currentAdmin():Promise<AdminProfile|null>{
  if(!supabase) return null
  const { data:{ session } }=await supabase.auth.getSession()
  if(!session) return null
  const { data,error }=await supabase.rpc('get_my_admin_profile')
  if(error||!data) return null
  return data as AdminProfile
}

export async function signInAdmin(email:string,password:string):Promise<LoginResult>{
  if(!supabase) return {profile:null,error:'Koneksi Supabase belum dikonfigurasi.'}
  const { error }=await supabase.auth.signInWithPassword({email:email.trim().toLowerCase(),password})
  if(error) return {profile:null,error:'Email atau password tidak sesuai.'}
  const profile=await currentAdmin()
  if(!profile){await supabase.auth.signOut();return {profile:null,error:'Akun ini tidak memiliki akses Dashboard Korwil.'}}
  return {profile,error:null}
}

export async function signOutAdmin(){
  if(supabase) await supabase.auth.signOut()
}
