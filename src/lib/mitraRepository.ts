import type { SupabaseClient } from '@supabase/supabase-js'
import { calculateAkunMitraProgress, createEmptyAkunMitraRecord, type AkunMitraPhotoSlot, type AkunMitraRecord } from '../akunMitra'
import type { MitraDataRepository } from './mitraDataRepository'
import { supabase } from './supabase'

const TABLE='mitra_accounts',BUCKET='mitra-private'
type MitraRow={satker_code:string;unit_data?:Partial<AkunMitraRecord['unit']>|null;kpb_data?:Partial<AkunMitraRecord['kpb']>|null;operator_data?:Partial<AkunMitraRecord['operator']>|null;status?:AkunMitraRecord['status'];review_note?:string|null;updated_at?:string|null;photo_unit_path?:string|null;photo_kpb_path?:string|null;photo_operator_path?:string|null}
export function mapMitraRow(row:MitraRow):AkunMitraRecord{const empty=createEmptyAkunMitraRecord(row.satker_code);return{...empty,unit:{...empty.unit,...row.unit_data},kpb:{...empty.kpb,...row.kpb_data},operator:{...empty.operator,...row.operator_data},status:row.status??'draf',reviewNote:row.review_note??'',updatedAt:row.updated_at??''}}
const photoColumn=(slot:AkunMitraPhotoSlot)=>slot==='unit'?'photo_unit_path':slot==='kpb'?'photo_kpb_path':'photo_operator_path'
const photoName=(slot:AkunMitraPhotoSlot,record:AkunMitraRecord)=>slot==='unit'?record.unit.fotoGedungFile:record[slot].pasFotoFile

export function createSupabaseMitraRepository(client:SupabaseClient,fetcher:typeof fetch=fetch):MitraDataRepository{return{
 async loadOne(satkerCode){const{data,error}=await client.rpc('get_mitra_satker_form',{p_satker_code:satkerCode});if(error)throw error;return data?mapMitraRow(data as MitraRow):createEmptyAkunMitraRecord(satkerCode)},
 async loadAll(){const{data,error}=await client.from(TABLE).select('*').order('satker_code');if(error)throw error;return(data??[]).map(mapMitraRow)},
 async save(record){const progress=calculateAkunMitraProgress(record).total;if(record.status==='siap_verifikasi'){const{data,error}=await client.rpc('submit_mitra_account',{p_satker_code:record.satkerCode,p_unit_data:record.unit,p_kpb_data:record.kpb,p_operator_data:record.operator,p_progress:progress});if(error)throw error;return mapMitraRow(data as MitraRow)}const payload={satker_code:record.satkerCode,unit_data:record.unit,kpb_data:record.kpb,operator_data:record.operator,status:record.status,completion_progress:progress,submitted_at:null};const{data,error}=await client.from(TABLE).upsert(payload,{onConflict:'satker_code'}).select('*').single();if(error)throw error;return mapMitraRow(data)},
 async review(satkerCode,decision,reviewNote){const{data,error}=await client.rpc('review_mitra_account',{p_satker_code:satkerCode,p_decision:decision,p_review_note:reviewNote});if(error)throw error;return mapMitraRow(data as MitraRow)},
 async updateAccepted(record){const{data,error}=await client.rpc('update_accepted_mitra_account',{p_satker_code:record.satkerCode,p_unit_data:record.unit,p_kpb_data:record.kpb,p_operator_data:record.operator});if(error)throw error;return mapMitraRow(data as MitraRow)},
 async savePhoto(satkerCode,slot,file){const ext=file.name.split('.').pop()?.toLowerCase()||'jpg',path=`${satkerCode}/${slot}/${slot}.${ext}`;const{error}=await client.storage.from(BUCKET).upload(path,file,{upsert:true,contentType:file.type});if(error)throw error;const{error:updateError}=await client.from(TABLE).upsert({satker_code:satkerCode,[photoColumn(slot)]:path},{onConflict:'satker_code'});if(updateError)throw updateError},
 async getPhoto(satkerCode,slot){const column=photoColumn(slot);const{data:row,error}=await client.from(TABLE).select(column).eq('satker_code',satkerCode).maybeSingle();if(error)throw error;const path=(row as Record<string,unknown>|null)?.[column] as string|undefined;if(!path)return null;const{data,error:signedError}=await client.storage.from(BUCKET).createSignedUrl(path,300);if(signedError)throw signedError;const response=await fetcher(data.signedUrl);if(!response.ok)throw new Error('Foto Akun Mitra belum dapat dibuka.');const record=await this.loadOne(satkerCode);return new File([await response.arrayBuffer()],photoName(slot,record)||`${slot}.jpg`,{type:response.headers.get('content-type')||'image/jpeg'})}
}}

export const supabaseMitraRepository=supabase?createSupabaseMitraRepository(supabase):null
