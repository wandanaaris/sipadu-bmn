import type { Task } from './data'

const a = (satker:string, progress:number, status:Task['assignments'][number]['status'], missing:string[]):Task['assignments'][number] => ({ satker, progress, status, missing, updated:'Sinkronisasi 20 Agustus 2026', revisionCount:0 })

export const finalTasks:Task[] = [
  {
    id:"plang-rumah", title:"Pergantian Plang Tanah dan Papan Rumah Negara", description:"Penyampaian laporan pengamanan aset dan bukti pengisian pergantian plang tanah serta papan rumah negara.",
    method:'spreadsheet', due:"20 Agustus 2026", letter:"Monitoring pergantian plang tanah dan papan rumah negara", link:"https://docs.google.com/spreadsheets/d/1_UoTVM5_CAA1-T-1sxIz67mZwTeFbxueAhNS0XFAPXU/edit?gid=0#gid=0", active:true, priority:"tinggi",
    assignments:[
      a("692307",100,"selesai",[]),
      a("692308",100,"selesai",[]),
      a("692309",100,"selesai",[]),
      a("692310",100,"selesai",[]),
      a("692311",100,"selesai",[]),
      a("692312",100,"selesai",[]),
      a("692313",100,"selesai",[]),
      a("692314",0,"belum",["Laporan Pengamanan Aset", "Capture Bukti Mengisi Google Form"]),
      a("692315",100,"selesai",[]),
      a("692316",0,"belum",["Laporan Pengamanan Aset", "Capture Bukti Mengisi Google Form"]),
      a("692317",100,"selesai",[]),
      a("692484",100,"selesai",[]),
      a("692507",100,"selesai",[]),
      a("692519",100,"selesai",[]),
      a("692537",100,"selesai",[]),
      a("692639",100,"selesai",[]),
      a("692781",100,"selesai",[]),
      a("692794",0,"belum",["Laporan Pengamanan Aset", "Capture Bukti Mengisi Google Form"]),
      a("694759",100,"selesai",[]),
    ]
  },
  {
    id:"xray", title:"Penghapusan X-Ray dan Body Scanner", description:"Melengkapi identitas teknis, nomor serial, kondisi, dan dokumentasi X-Ray yang ditindaklanjuti untuk penghapusan.",
    method:'spreadsheet', due:"Belum ditentukan", letter:"Tindak Lanjut Status X-Ray dan Body Scanner Rusak Berat", link:"https://docs.google.com/spreadsheets/d/1t3IIrahsooPjPGIb2IfCNDI1gm53XtYtY19oQm3_Ryk/edit?gid=0#gid=0", active:true, priority:"tinggi",
    assignments:[
      a("692311",80,"proses",["Rekap Xray Barang: Nomor Serial Tabung X-Ray"]),
      a("692316",100,"selesai",[]),
      a("692309",100,"selesai",[]),
      a("692308",100,"selesai",[]),
      a("692313",80,"proses",["Rekap Xray Barang: Foto X-Ray"]),
      a("692317",100,"selesai",[]),
      a("692639",0,"belum",["Rekap Xray Barang: Merk", "Rekap Xray Barang: Tipe", "Rekap Xray Barang: Nomor Serial Rangka", "Rekap Xray Barang: Nomor Serial Tabung X-Ray", "Rekap Xray Barang: Foto X-Ray"]),
      a("692781",100,"selesai",[]),
      a("692310",80,"proses",["Rekap Xray Barang: Nomor Serial Tabung X-Ray"]),
    ]
  },
  {
    id:"master-aset", title:"Kelengkapan Master Aset", description:"Melengkapi atribut Tanah, Rumah Negara, serta Gedung dan Bangunan pada Master Aset.",
    method:'spreadsheet', due:"20 Agustus 2026", letter:"Monitoring kelengkapan Master Aset SIMAN", link:"https://docs.google.com/spreadsheets/d/14O64ETAtsMr_qfCdui_aP0Rr_e0gvzYL/edit?gid=1530083301#gid=1530083301", active:true, priority:"tinggi",
    assignments:[
      a("692307",75,"proses",["4 aset belum lengkap: Kode Pos", "10 aset belum lengkap: Latitude", "10 aset belum lengkap: Longitude"]),
      a("694759",50,"proses",["6 aset belum lengkap: Kode RT/RW", "6 aset belum lengkap: Kode Pos", "6 aset belum lengkap: Latitude", "6 aset belum lengkap: Longitude"]),
      a("692507",100,"selesai",[]),
      a("692311",70,"proses",["8 aset belum lengkap: Kode RT/RW", "25 aset belum lengkap: Kode Pos", "15 aset belum lengkap: Latitude", "15 aset belum lengkap: Longitude", "7 aset belum lengkap: Kelurahan/Desa"]),
      a("692316",90,"proses",["10 aset belum lengkap: Kode Pos"]),
      a("692309",100,"selesai",[]),
      a("692308",65,"proses",["42 aset belum lengkap: Kode Pos", "44 aset belum lengkap: Latitude", "44 aset belum lengkap: Longitude"]),
      a("692313",76,"proses",["12 aset belum lengkap: Kode Pos", "17 aset belum lengkap: Kode RT/RW", "4 aset belum lengkap: Latitude", "4 aset belum lengkap: Longitude"]),
      a("692317",86,"proses",["10 aset belum lengkap: Kode Pos", "2 aset belum lengkap: Kode RT/RW", "6 aset belum lengkap: Latitude", "6 aset belum lengkap: Longitude"]),
      a("692315",90,"proses",["11 aset belum lengkap: Kode RT/RW"]),
      a("692314",64,"proses",["13 aset belum lengkap: Kode Pos", "12 aset belum lengkap: Latitude", "12 aset belum lengkap: Longitude", "6 aset belum lengkap: Kode RT/RW", "4 aset belum lengkap: Kelurahan/Desa", "4 aset belum lengkap: Kab/Kota", "4 aset belum lengkap: Provinsi"]),
      a("692639",90,"proses",["18 aset belum lengkap: Kode RT/RW", "5 aset belum lengkap: Kode Pos", "1 aset belum lengkap: Kelurahan/Desa"]),
      a("692537",93,"proses",["3 aset belum lengkap: Kode RT/RW", "1 aset belum lengkap: Latitude", "1 aset belum lengkap: Longitude", "1 aset belum lengkap: Kelurahan/Desa", "2 aset belum lengkap: Kode Pos"]),
      a("692794",85,"proses",["7 aset belum lengkap: Kode RT/RW", "1 aset belum lengkap: Kelurahan/Desa", "2 aset belum lengkap: Kode Pos", "2 aset belum lengkap: Latitude", "2 aset belum lengkap: Longitude"]),
      a("692519",72,"proses",["10 aset belum lengkap: Kode RT/RW", "6 aset belum lengkap: Latitude", "6 aset belum lengkap: Longitude", "5 aset belum lengkap: Kode Pos"]),
      a("692781",80,"proses",["19 aset belum lengkap: Kode Pos", "14 aset belum lengkap: Kode RT/RW", "4 aset belum lengkap: Latitude", "4 aset belum lengkap: Longitude", "2 aset belum lengkap: Kelurahan/Desa", "2 aset belum lengkap: Kab/Kota", "2 aset belum lengkap: Provinsi"]),
      a("692484",76,"proses",["30 aset belum lengkap: Kode Pos", "15 aset belum lengkap: Latitude", "15 aset belum lengkap: Longitude", "2 aset belum lengkap: Kode RT/RW", "2 aset belum lengkap: Kelurahan/Desa"]),
      a("692312",99,"proses",["1 aset belum lengkap: Kelurahan/Desa"]),
      a("692310",99,"proses",["2 aset belum lengkap: Kode RT/RW"]),
    ]
  },
  {
    id:"rkbmn", title:"RKBMN SIMAN dan Non-SIMAN", description:"Menyampaikan usulan RKBMN melalui SIMAN dan melengkapi dokumen usulan RKBMN Non-SIMAN.",
    method:'spreadsheet', due:"31 Agustus 2026", letter:"Monitoring usulan RKBMN SIMAN dan Non-SIMAN Tahun 2027", link:"https://docs.google.com/spreadsheets/d/1Sp3hw2sRK8l_W7DUL3csaZpUjHxddeu25RGM3kEitu0/edit?gid=0#gid=0", active:true, priority:"tinggi",
    assignments:[
      a("692307",0,"belum",["Surat Usulan RKBMN Non SIMAN", "Matriks Usulan Pengadaan", "Surat Pernyataan", "Profil Satker", "Usulan RKBMN SIMAN"]),
      a("692308",0,"belum",["Surat Usulan RKBMN Non SIMAN", "Matriks Usulan Pengadaan", "Surat Pernyataan", "Profil Satker", "Usulan RKBMN SIMAN"]),
      a("692309",20,"proses",["Surat Usulan RKBMN Non SIMAN", "Matriks Usulan Pengadaan", "Surat Pernyataan", "Profil Satker"]),
      a("692310",20,"proses",["Surat Usulan RKBMN Non SIMAN", "Matriks Usulan Pengadaan", "Surat Pernyataan", "Profil Satker"]),
      a("692311",0,"belum",["Surat Usulan RKBMN Non SIMAN", "Matriks Usulan Pengadaan", "Surat Pernyataan", "Profil Satker", "Usulan RKBMN SIMAN"]),
      a("692312",0,"belum",["Surat Usulan RKBMN Non SIMAN", "Matriks Usulan Pengadaan", "Surat Pernyataan", "Profil Satker", "Usulan RKBMN SIMAN"]),
      a("692313",20,"proses",["Surat Usulan RKBMN Non SIMAN", "Matriks Usulan Pengadaan", "Surat Pernyataan", "Profil Satker"]),
      a("692314",0,"belum",["Surat Usulan RKBMN Non SIMAN", "Matriks Usulan Pengadaan", "Surat Pernyataan", "Profil Satker", "Usulan RKBMN SIMAN"]),
      a("692315",0,"belum",["Surat Usulan RKBMN Non SIMAN", "Matriks Usulan Pengadaan", "Surat Pernyataan", "Profil Satker", "Usulan RKBMN SIMAN"]),
      a("692316",0,"belum",["Surat Usulan RKBMN Non SIMAN", "Matriks Usulan Pengadaan", "Surat Pernyataan", "Profil Satker", "Usulan RKBMN SIMAN"]),
      a("692317",0,"belum",["Surat Usulan RKBMN Non SIMAN", "Matriks Usulan Pengadaan", "Surat Pernyataan", "Profil Satker", "Usulan RKBMN SIMAN"]),
      a("692484",20,"proses",["Surat Usulan RKBMN Non SIMAN", "Matriks Usulan Pengadaan", "Surat Pernyataan", "Profil Satker"]),
      a("692507",0,"belum",["Surat Usulan RKBMN Non SIMAN", "Matriks Usulan Pengadaan", "Surat Pernyataan", "Profil Satker", "Usulan RKBMN SIMAN"]),
      a("692519",0,"belum",["Surat Usulan RKBMN Non SIMAN", "Matriks Usulan Pengadaan", "Surat Pernyataan", "Profil Satker", "Usulan RKBMN SIMAN"]),
      a("692537",20,"proses",["Surat Usulan RKBMN Non SIMAN", "Matriks Usulan Pengadaan", "Surat Pernyataan", "Profil Satker"]),
      a("692639",0,"belum",["Surat Usulan RKBMN Non SIMAN", "Matriks Usulan Pengadaan", "Surat Pernyataan", "Profil Satker", "Usulan RKBMN SIMAN"]),
      a("692781",0,"belum",["Surat Usulan RKBMN Non SIMAN", "Matriks Usulan Pengadaan", "Surat Pernyataan", "Profil Satker", "Usulan RKBMN SIMAN"]),
      a("692794",0,"belum",["Surat Usulan RKBMN Non SIMAN", "Matriks Usulan Pengadaan", "Surat Pernyataan", "Profil Satker", "Usulan RKBMN SIMAN"]),
      a("694759",20,"proses",["Surat Usulan RKBMN Non SIMAN", "Matriks Usulan Pengadaan", "Surat Pernyataan", "Profil Satker"]),
    ]
  },
  {
    id:"persediaan-rusak", title:"Tindak Lanjut Persediaan Rusak", description:"Melengkapi dokumen tindak lanjut persediaan rusak pada sheet Rusak (sheet 2).",
    method:'spreadsheet', due:"22 Agustus 2026", letter:"Monitoring tindak lanjut persediaan rusak", link:"https://docs.google.com/spreadsheets/d/1OeAZacp7wmOiKPsBiz2jFt1peHto-VHbIJ3podn9yXQ/edit?gid=0#gid=0", active:true, priority:"tinggi",
    assignments:[
      a("692311",0,"belum",["Surat Permohonan dan Daftar Barang Milik Negara yang Diusulkan Penjualan", "SK Tim Penjualan BMN", "SPTJM", "Berita Acara Penelitian", "Surat Pernyataan Tidak Mengganggu Tusi", "Surat Pernyataan Nilai Limit", "Telaahan Staf", "Cetakan Laporan Persediaan", "Cetakan Persediaa Rusak", "Dokumentasi Foto Persediaan Rusak"]),
    ]
  },
  {
    id:"persediaan-usang", title:"Tindak Lanjut Pemusnahan Persediaan Usang", description:"Seluruh satker yang memiliki persediaan usang telah mengajukan usulan dan saat ini menunggu persetujuan dari Pengguna Barang.",
    method:'spreadsheet', due:"Tidak ada tenggat", letter:"Monitoring tindak lanjut pemusnahan persediaan usang", link:"https://docs.google.com/spreadsheets/d/1OeAZacp7wmOiKPsBiz2jFt1peHto-VHbIJ3podn9yXQ/edit?gid=0#gid=0", active:true, priority:"normal",
    assignments:[
      a("692308",100,"persetujuan",[]), a("692309",100,"persetujuan",[]), a("692311",100,"persetujuan",[]),
      a("692312",100,"persetujuan",[]), a("692314",100,"persetujuan",[]), a("692315",100,"persetujuan",[]),
      a("692316",100,"persetujuan",[]), a("692317",100,"persetujuan",[]), a("692484",100,"persetujuan",[]),
      a("692519",100,"persetujuan",[]), a("692537",100,"persetujuan",[]), a("692781",100,"persetujuan",[]),
      a("692794",100,"persetujuan",[]),
    ]
  },
]
