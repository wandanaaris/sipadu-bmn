export type LocalMitraPhotoSlot='unit'|'kpb'|'operator'
export type LocalMitraRecord={
 satkerCode:string
 unit:Record<string,string>
 kpb:Record<string,string>
 operator:Record<string,string>
 status:'draf'|'siap_verifikasi'|'perbaikan'|'selesai'
 reviewNote:string
 updatedAt:string
}
