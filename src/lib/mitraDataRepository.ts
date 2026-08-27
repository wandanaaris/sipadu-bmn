import type { AkunMitraPhotoSlot, AkunMitraRecord } from '../akunMitra'

export interface MitraDataRepository{
 loadOne(satkerCode:string):Promise<AkunMitraRecord>
 loadAll():Promise<AkunMitraRecord[]>
 save(record:AkunMitraRecord):Promise<AkunMitraRecord>
 review(satkerCode:string,decision:'perbaikan'|'selesai',reviewNote:string):Promise<AkunMitraRecord>
 updateAccepted(record:AkunMitraRecord):Promise<AkunMitraRecord>
 savePhoto(satkerCode:string,slot:AkunMitraPhotoSlot,file:File):Promise<void>
 getPhoto(satkerCode:string,slot:AkunMitraPhotoSlot):Promise<File|null>
}
