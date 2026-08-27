import { createEmptyAkunMitraRecord, type AkunMitraPhotoSlot, type AkunMitraRecord } from '../akunMitra'

type Fetcher=(url:string,init?:RequestInit)=>Promise<Response>
const api='/api/local/mitra'

async function apiError(response:Response){
 try{const body=await response.json() as {error?:string};return body.error||`Local API gagal (${response.status}).`}catch{return`Local API gagal (${response.status}).`}
}
async function requireOk(response:Response){if(!response.ok)throw new Error(await apiError(response));return response}

const normalizeRecord=(saved:AkunMitraRecord):AkunMitraRecord=>{const empty=createEmptyAkunMitraRecord(saved.satkerCode);return{...empty,...saved,unit:{...empty.unit,...saved.unit},kpb:{...empty.kpb,...saved.kpb},operator:{...empty.operator,...saved.operator}}}

export function createLocalMitraRepository(fetcher:Fetcher=(url,init)=>fetch(url,init)){
 return{
  async loadOne(satkerCode:string):Promise<AkunMitraRecord>{
   const response=await fetcher(`${api}/${encodeURIComponent(satkerCode)}`,undefined)
   if(response.status===404)return createEmptyAkunMitraRecord(satkerCode)
   return normalizeRecord(await (await requireOk(response)).json() as AkunMitraRecord)
  },
  async loadAll():Promise<AkunMitraRecord[]>{
   const response=await requireOk(await fetcher(api,undefined))
   return (await response.json() as AkunMitraRecord[]).map(normalizeRecord)
  },
  async save(record:AkunMitraRecord):Promise<AkunMitraRecord>{
   const response=await requireOk(await fetcher(`${api}/${encodeURIComponent(record.satkerCode)}`,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(record)}))
   return normalizeRecord(await response.json() as AkunMitraRecord)
  },
  async review(satkerCode:string,decision:'perbaikan'|'selesai',reviewNote:string):Promise<AkunMitraRecord>{
   const response=await requireOk(await fetcher(`${api}/${encodeURIComponent(satkerCode)}/review`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({decision,reviewNote})}))
   return normalizeRecord(await response.json() as AkunMitraRecord)
  },
  async updateAccepted(record:AkunMitraRecord):Promise<AkunMitraRecord>{
   const response=await requireOk(await fetcher(`${api}/${encodeURIComponent(record.satkerCode)}/admin`,{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(record)}))
   return normalizeRecord(await response.json() as AkunMitraRecord)
  },
  async savePhoto(satkerCode:string,slot:AkunMitraPhotoSlot,file:File):Promise<void>{
   await requireOk(await fetcher(`${api}/${encodeURIComponent(satkerCode)}/photos/${slot}`,{method:'PUT',headers:{'content-type':file.type,'x-file-name':encodeURIComponent(file.name)},body:file}))
  },
  async getPhoto(satkerCode:string,slot:AkunMitraPhotoSlot):Promise<File|null>{
   const response=await fetcher(`${api}/${encodeURIComponent(satkerCode)}/photos/${slot}`,undefined)
   if(response.status===404)return null
   await requireOk(response)
   const name=decodeURIComponent(response.headers.get('x-file-name')??`${slot}.jpg`)
   return new File([await response.arrayBuffer()],name,{type:response.headers.get('content-type')??'application/octet-stream'})
  },
 }
}

export type LocalMitraRepository=ReturnType<typeof createLocalMitraRepository>
export const localMitraRepository=createLocalMitraRepository()
