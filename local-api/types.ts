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
export interface LelangRow{
 kode:string
 kategori_objek:string
 kpknl:string
 tahun_lelang:number
 kat_lokasi_sebelumnya:number|null
 kat_lokasi:number|null
 kat_lokasi_sumber:string|null
 merek:string
 tipe:string
 tahun_pembuatan:number|null
 warna:string
 m0:number|null
}
