import type { Assignment, Task } from './data'
import { satkers } from './data'

export type UnitData={npwpKantor:string;emailKantor:string;telepon:string;alamat:string;rtRw:string;kodepos:string;fotoGedungFile:string}
export type PersonData={nama:string;jabatan:string;email:string;nip:string;nik:string;noHp:string;tempatLahir:string;tanggalLahir:string;jenisKelamin:string;alamat:string;rtRw:string;kodepos:string;pasFotoFile:string}
export type AkunMitraStatus='draf'|'siap_verifikasi'|'perbaikan'|'selesai'
export type AkunMitraRecord={satkerCode:string;unit:UnitData;kpb:PersonData;operator:PersonData;status:AkunMitraStatus;reviewNote:string;updatedAt:string}
export type AkunMitraProgress={unit:number;kpb:number;operator:number;total:number}
export type AkunMitraPhotoSlot='unit'|'kpb'|'operator'
export type AkunMitraFieldKey=keyof UnitData|keyof PersonData
export type AkunMitraErrors={unit:Partial<Record<keyof UnitData,string>>;kpb:Partial<Record<keyof PersonData,string>>;operator:Partial<Record<keyof PersonData,string>>}

const STORAGE_PREFIX='sipadu_akun_mitra_local_v1_'
const PHOTO_DB='sipadu-akun-mitra-local'
const PHOTO_STORE='photos'
const MAX_PHOTO_SIZE=3*1024*1024
const allowedPhotoTypes=['image/jpeg','image/png','image/webp']
const unitKeys:(keyof UnitData)[]=['npwpKantor','emailKantor','telepon','alamat','rtRw','kodepos','fotoGedungFile']
const personKeys:(keyof PersonData)[]=['nama','jabatan','email','nip','nik','noHp','tempatLahir','tanggalLahir','jenisKelamin','alamat','rtRw','kodepos','pasFotoFile']

const emptyPerson=():PersonData=>({nama:'',jabatan:'',email:'',nip:'',nik:'',noHp:'',tempatLahir:'',tanggalLahir:'',jenisKelamin:'',alamat:'',rtRw:'',kodepos:'',pasFotoFile:''})
export function createEmptyAkunMitraRecord(satkerCode:string):AkunMitraRecord{return{satkerCode,unit:{npwpKantor:'',emailKantor:'',telepon:'',alamat:'',rtRw:'',kodepos:'',fotoGedungFile:''},kpb:emptyPerson(),operator:emptyPerson(),status:'draf',reviewNote:'',updatedAt:''}}

export function validateAkunMitraField(key:AkunMitraFieldKey,value:string){
 const v=value.trim();if(!v)return'Field ini wajib diisi.'
 if(key==='npwpKantor'&&!/^\d{15,16}$/.test(v))return'NPWP harus berupa 15 atau 16 digit angka.'
 if((key==='email'||key==='emailKantor')&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))return'Masukkan format email yang valid.'
 if((key==='telepon'||key==='noHp')&&!/^\d+$/.test(v))return'Telepon/No HP harus hanya angka.'
 if(key==='nip'&&!/^\d{18}$/.test(v))return'NIP harus terdiri dari 18 digit angka.'
 if(key==='nik'&&!/^\d{16}$/.test(v))return'NIK harus terdiri dari 16 digit angka.'
 if(key==='rtRw'&&!/^\d{1,3}\/\d{1,3}$/.test(v))return'RT/RW harus berupa angka, contoh 001/002.'
 if(key==='kodepos'&&!/^\d{5}$/.test(v))return'Kode pos harus terdiri dari 5 digit angka.'
 if(key==='tanggalLahir'){const date=new Date(`${v}T00:00:00`);if(Number.isNaN(date.getTime()))return'Tanggal lahir tidak valid.';if(date>new Date())return'Tanggal lahir tidak boleh di masa depan.'}
 if(['nama','jabatan','tempatLahir'].includes(key)&&(!/^[A-Za-zÀ-ž.'’\-\s]+$/.test(v)||v.length<2))return'Gunakan huruf dan tanda baca nama yang sesuai.'
 if(key==='alamat'&&v.length<5)return'Alamat minimal 5 karakter.'
 return''
}

export function validateAkunMitraRecord(record:AkunMitraRecord):AkunMitraErrors{
 const errors:AkunMitraErrors={unit:{},kpb:{},operator:{}}
 for(const key of unitKeys){const error=validateAkunMitraField(key,record.unit[key]);if(error)errors.unit[key]=error}
 for(const group of ['kpb','operator'] as const)for(const key of personKeys){const error=validateAkunMitraField(key,record[group][key]);if(error)errors[group][key]=error}
 return errors
}
function percent<T extends Record<string,string>>(value:T,keys:(keyof T)[]){const valid=keys.filter(k=>!validateAkunMitraField(k as AkunMitraFieldKey,value[k])).length;return Math.round(valid/keys.length*100)}
export function calculateAkunMitraProgress(record:AkunMitraRecord):AkunMitraProgress{const unit=percent(record.unit,unitKeys),kpb=percent(record.kpb,personKeys),operator=percent(record.operator,personKeys);return{unit,kpb,operator,total:Math.round(unit*.3+kpb*.35+operator*.35)}}

export function loadAkunMitraRecord(satkerCode:string):AkunMitraRecord{const empty=createEmptyAkunMitraRecord(satkerCode);try{const raw=localStorage.getItem(STORAGE_PREFIX+satkerCode);if(raw){const saved=JSON.parse(raw) as Partial<AkunMitraRecord>;return{...empty,...saved,satkerCode,unit:{...empty.unit,...saved.unit},kpb:{...empty.kpb,...saved.kpb},operator:{...empty.operator,...saved.operator}}}}catch{/* draf rusak diabaikan */}return empty}
export function saveAkunMitraRecord(record:AkunMitraRecord){const saved={...record,updatedAt:new Date().toISOString()};localStorage.setItem(STORAGE_PREFIX+record.satkerCode,JSON.stringify(saved));window.dispatchEvent(new CustomEvent('akun-mitra-updated'));return saved}
export function loadAllAkunMitraRecords(){return satkers.filter(s=>s.code!=='692507').map(s=>loadAkunMitraRecord(s.code))}

export function validateAkunMitraPhoto(file:File){if(!allowedPhotoTypes.includes(file.type))return'Format foto harus JPG, PNG, atau WebP.';if(file.size>MAX_PHOTO_SIZE)return'Ukuran foto maksimal 3 MB.';return''}
function openPhotoDb():Promise<IDBDatabase|null>{if(typeof indexedDB==='undefined')return Promise.resolve(null);return new Promise((resolve,reject)=>{const request=indexedDB.open(PHOTO_DB,1);request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(PHOTO_STORE))request.result.createObjectStore(PHOTO_STORE)};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
export async function saveAkunMitraPhoto(satkerCode:string,slot:AkunMitraPhotoSlot,file:File){const error=validateAkunMitraPhoto(file);if(error)throw new Error(error);const db=await openPhotoDb();if(!db)return;await new Promise<void>((resolve,reject)=>{const tx=db.transaction(PHOTO_STORE,'readwrite');tx.objectStore(PHOTO_STORE).put(file,`${satkerCode}:${slot}`);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close()}
export async function getAkunMitraPhoto(satkerCode:string,slot:AkunMitraPhotoSlot):Promise<File|null>{const db=await openPhotoDb();if(!db)return null;const result=await new Promise<File|null>((resolve,reject)=>{const tx=db.transaction(PHOTO_STORE,'readonly');const request=tx.objectStore(PHOTO_STORE).get(`${satkerCode}:${slot}`);request.onsuccess=()=>resolve(request.result??null);request.onerror=()=>reject(request.error)});db.close();return result}

export function withLocalAkunMitraTask(tasks:Task[],records?:AkunMitraRecord[]):Task[]{return[...tasks.filter(t=>t.id!=='akun-mitra-local'),createLocalAkunMitraTask(records)]}
export function createLocalAkunMitraTask(records?:AkunMitraRecord[]):Task{
 const byCode=records?new Map(records.map(record=>[record.satkerCode,record])):null
 const assignments:Assignment[]=satkers.filter(s=>s.code!=='692507').map(s=>{const record=byCode?.get(s.code)??loadAkunMitraRecord(s.code),calculated=calculateAkunMitraProgress(record).total,progress=record.status==='selesai'?100:calculated;return{satker:s.code,progress,status:record.status==='siap_verifikasi'?'verifikasi':record.status==='perbaikan'?'perbaikan':record.status==='selesai'?'selesai':progress?'proses':'belum',missing:record.status==='selesai'?[]:record.status==='perbaikan'&&record.reviewNote?[record.reviewNote]:progress===100?[]:['Lengkapi Data Unit, Pejabat KPB, dan Operator'],revisionCount:record.status==='perbaikan'?1:0,updated:record.updatedAt||'Belum diperbarui'}})
 return{id:'akun-mitra-local',title:'Pemutakhiran Data Akun Mitra Satker',description:'Melengkapi data unit, Pejabat KPB, dan operator untuk pendaftaran akun pada web Mitra.',method:'portal',due:'Belum ditentukan',letter:'Prototipe lokal — belum menjadi penugasan resmi',active:true,priority:'tinggi',assignments}
}
