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
      a("692307",100,"selesai",[]),
      a("694759",71,"proses",["6 aset belum lengkap: Kode RT/RW","6 aset belum lengkap: Kode Pos"]),
      a("692507",100,"selesai",[]),
      a("692311",62,"proses",["6 aset belum lengkap: Kode RT/RW","23 aset belum lengkap: Kode Pos","24 aset belum lengkap: Latitude","24 aset belum lengkap: Longitude"]),
      a("692316",90,"proses",["9 aset belum lengkap: Kode Pos"]),
      a("692309",100,"selesai",[]),
      a("692308",100,"selesai",[]),
      a("692313",100,"selesai",[]),
      a("692317",100,"selesai",[]),
      a("692315",100,"selesai",[]),
      a("692314",100,"selesai",[]),
      a("692639",100,"selesai",[]),
      a("692537",100,"selesai",[]),
      a("692794",73,"proses",["7 aset belum lengkap: Kode RT/RW","2 aset belum lengkap: Kode Pos","7 aset belum lengkap: Latitude","7 aset belum lengkap: Longitude"]),
      a("692519",100,"selesai",[]),
      a("692781",100,"selesai",[]),
      a("692484",100,"selesai",[]),
      a("692312",100,"selesai",[]),
      a("692310",100,"selesai",[]),
    ]
  },
  {
    id:"rkbmn", title:"RKBMN SIMAN dan Non-SIMAN", description:"Menyampaikan usulan RKBMN melalui SIMAN dan melengkapi dokumen usulan RKBMN Non-SIMAN.",
    method:'spreadsheet', due:"31 Agustus 2026", letter:"Monitoring usulan RKBMN SIMAN dan Non-SIMAN Tahun 2027", link:"https://docs.google.com/spreadsheets/d/1Sp3hw2sRK8l_W7DUL3csaZpUjHxddeu25RGM3kEitu0/edit?gid=0#gid=0", active:true, priority:"tinggi",
    uploadLink:"https://drive.google.com/drive/folders/16WFLsXnxR2XxKnNMGOv60Wnme6TG49eH?usp=sharing",
    references:[
      {label:'Peraturan Terkait', url:'https://drive.google.com/drive/folders/1pI8RdE4u2Fkg-PMSImqSrzU8Gl9eNEc6?usp=drive_link'},
      {label:'Format Data Dukung', url:'https://drive.google.com/drive/folders/1SzsWDp2SFdDhj4TyjJztuqt-Xs5f4CpY?usp=drive_link'},
    ],
    assignments:[
      a("692307",0,"belum",["Surat Usulan RKBMN Non SIMAN", "Matriks Usulan Pengadaan", "Surat Pernyataan", "Profil Satker", "Usulan RKBMN SIMAN"]),
      a("692308",0,"belum",["Surat Usulan RKBMN Non SIMAN", "Matriks Usulan Pengadaan", "Surat Pernyataan", "Profil Satker", "Usulan RKBMN SIMAN"]),
      a("692309",17,"proses",["Surat Usulan RKBMN Non Siman","Matrik Usulan Pengadaan","Surat Pernyataan","Surat Profil Satker","Matrix Usulan Pengadaan (file xlsx)"]),
      a("692310",17,"proses",["Surat Usulan RKBMN Non Siman","Matrik Usulan Pengadaan","Surat Pernyataan","Surat Profil Satker","Matrix Usulan Pengadaan (file xlsx)"]),
      a("692311",0,"belum",["Surat Usulan RKBMN Non SIMAN", "Matriks Usulan Pengadaan", "Surat Pernyataan", "Profil Satker", "Usulan RKBMN SIMAN"]),
      a("692312",0,"belum",["Surat Usulan RKBMN Non SIMAN", "Matriks Usulan Pengadaan", "Surat Pernyataan", "Profil Satker", "Usulan RKBMN SIMAN"]),
      a("692313",100,"proses",[]),
      a("692314",0,"belum",["Surat Usulan RKBMN Non SIMAN", "Matriks Usulan Pengadaan", "Surat Pernyataan", "Profil Satker", "Usulan RKBMN SIMAN"]),
      a("692315",0,"belum",["Surat Usulan RKBMN Non SIMAN", "Matriks Usulan Pengadaan", "Surat Pernyataan", "Profil Satker", "Usulan RKBMN SIMAN"]),
      a("692316",0,"belum",["Surat Usulan RKBMN Non SIMAN", "Matriks Usulan Pengadaan", "Surat Pernyataan", "Profil Satker", "Usulan RKBMN SIMAN"]),
      a("692317",0,"belum",["Surat Usulan RKBMN Non SIMAN", "Matriks Usulan Pengadaan", "Surat Pernyataan", "Profil Satker", "Usulan RKBMN SIMAN"]),
      a("692484",33,"proses",["Matrik Usulan Pengadaan (kurang lengkap)","Surat Pernyataan (kurang lengkap)","Surat Profil Satker (kurang lengkap)","Matrix Usulan Pengadaan (file xlsx) belum ada","Catatan Korwil: file dijadikan 1 PDF"]),
      a("692507",0,"belum",["Surat Usulan RKBMN Non SIMAN", "Matriks Usulan Pengadaan", "Surat Pernyataan", "Profil Satker", "Usulan RKBMN SIMAN"]),
      a("692519",0,"belum",["Surat Usulan RKBMN Non SIMAN", "Matriks Usulan Pengadaan", "Surat Pernyataan", "Profil Satker", "Usulan RKBMN SIMAN"]),
      a("692537",100,"proses",[]),
      a("692639",0,"belum",["Surat Usulan RKBMN Non SIMAN", "Matriks Usulan Pengadaan", "Surat Pernyataan", "Profil Satker", "Usulan RKBMN SIMAN"]),
      a("692781",0,"belum",["Surat Usulan RKBMN Non SIMAN", "Matriks Usulan Pengadaan", "Surat Pernyataan", "Profil Satker", "Usulan RKBMN SIMAN"]),
      a("692794",0,"belum",["Surat Usulan RKBMN Non SIMAN", "Matriks Usulan Pengadaan", "Surat Pernyataan", "Profil Satker", "Usulan RKBMN SIMAN"]),
      a("694759",100,"proses",[]),
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
  {
    id:"tanah-rusak-berat", title:"Tindaklanjut Tanah Rusak Berat", description:"Tindaklanjut penanganan tanah rusak berat sesuai monitoring BMN Ditjen PAS Riau.",
    method:'spreadsheet', due:"Belum ditentukan", letter:"Monitoring Pengisian BMN Ditjen PAS Riau", link:"https://docs.google.com/spreadsheets/d/1P212po42PeS6LWOwvzf9z_Q_MyUrLV-bT_BMPiBUgZU/edit?usp=sharing", active:true, priority:"normal",
    uploadLink:"https://drive.google.com/drive/folders/14Ef-0Bf-sdYa-B_gRy8wIjzw9mDc017O?usp=sharing",
    assignments:[
      a("692309",0,"belum",["Berita Acara Perubahan Kondisi","Kronologis Lengkap","Cetakan Perubahan Kondisi Sakti"]),
    ]
  },
  {
    id:"xray-rb-2028", title:"Pengisian Data X-Ray Rusak Berat (Usulan Penghapusan/Pemeliharaan)", description:"Seluruh satker mengisi data unit X-Ray Rusak Berat pada spreadsheet, melengkapi foto kondisi terakhir, dan melakukan perubahan kondisi pada SIMAN V2. Satker yang memerlukan pemeliharaan merubah kondisi ke rusak ringan dan mengajukan surat usulan pemeliharaan berjenjang (satker→kanwil→ditjenpas).",
    method:'spreadsheet', due:"27 Agustus 2026", letter:"Pendataan X-Ray Rusak Berat untuk Penghapusan", link:"https://docs.google.com/spreadsheets/d/19O4FKz_lBLiZkv_859v748t77pH3UPyS-Cp3qBD63Mo/edit?usp=sharing", active:true, priority:"tinggi",
    assignments:[
      a("692308",0,"belum",["Isi data X-Ray di spreadsheet","Foto kondisi X-Ray terakhir","Update SIMAN V2"]),
      a("692309",0,"belum",["Isi data X-Ray di spreadsheet","Foto kondisi X-Ray terakhir","Update SIMAN V2"]),
      a("692310",0,"belum",["Isi data X-Ray di spreadsheet","Foto kondisi X-Ray terakhir","Update SIMAN V2"]),
      a("692311",0,"belum",["Isi data X-Ray di spreadsheet","Foto kondisi X-Ray terakhir","Update SIMAN V2"]),
      a("692313",0,"belum",["Isi data X-Ray di spreadsheet","Foto kondisi X-Ray terakhir","Update SIMAN V2"]),
      a("692316",0,"belum",["Isi data X-Ray di spreadsheet","Foto kondisi X-Ray terakhir","Update SIMAN V2"]),
      a("692317",0,"belum",["Isi data X-Ray di spreadsheet","Foto kondisi X-Ray terakhir","Update SIMAN V2"]),
      a("692639",0,"belum",["Isi data X-Ray di spreadsheet","Foto kondisi X-Ray terakhir","Update SIMAN V2"]),
      a("692781",0,"belum",["Isi data X-Ray di spreadsheet","Foto kondisi X-Ray terakhir","Update SIMAN V2"]),
    ]
  },
  {
    id:"pendataan-cctv-2026", title:"Pendataan CCTV 2026", description:"Seluruh satker mendata infrastruktur CCTV (kamera, NVR/DVR, jaringan, server/storage, kondisi fisik) menggunakan Form Survey CCTV. Unggah data dukung (termasuk denah bangunan dan ruangan dalam format PDF) ke folder Drive, lalu laporkan melalui Google Form. Progress monitoring dapat dipantau pada spreadsheet.",
    method:'spreadsheet', due:"28 Agustus 2026", letter:"Pendataan Infrastruktur CCTV Tahun 2026", link:"https://docs.google.com/spreadsheets/d/1R_OZMybUG_f2QVxHRrR5CBqFfTzyn4FHEsMoJDbBxj0/edit?usp=sharing", active:true, priority:"tinggi",
    uploadLink:"https://drive.google.com/drive/folders/1pO1a2PT6Ah9bfqw6Y3uu1pbYNvhDB3q5?usp=sharing",
    references:[
      {label:'Format Form Survey CCTV', url:'https://tinyurl.com/33sa2z5y'},
      {label:'Pelaporan Google Form', url:'https://docs.google.com/forms/d/e/1FAIpQLSdL6fBlt6gm8UH9bhF7phmvurIGUrMGPHdUa4AuJkIvRntyKQ/viewform'},
    ],
    assignments:[
      a("692307",0,"belum",["Form Survey CCTV terisi","Data dukung diunggah ke folder Drive (denah PDF)","Lapor via Google Form"]),
      a("692308",0,"belum",["Form Survey CCTV terisi","Data dukung diunggah ke folder Drive (denah PDF)","Lapor via Google Form"]),
      a("692309",0,"belum",["Form Survey CCTV terisi","Data dukung diunggah ke folder Drive (denah PDF)","Lapor via Google Form"]),
      a("692310",0,"belum",["Form Survey CCTV terisi","Data dukung diunggah ke folder Drive (denah PDF)","Lapor via Google Form"]),
      a("692311",0,"belum",["Form Survey CCTV terisi","Data dukung diunggah ke folder Drive (denah PDF)","Lapor via Google Form"]),
      a("692312",0,"belum",["Form Survey CCTV terisi","Data dukung diunggah ke folder Drive (denah PDF)","Lapor via Google Form"]),
      a("692313",0,"belum",["Form Survey CCTV terisi","Data dukung diunggah ke folder Drive (denah PDF)","Lapor via Google Form"]),
      a("692314",0,"belum",["Form Survey CCTV terisi","Data dukung diunggah ke folder Drive (denah PDF)","Lapor via Google Form"]),
      a("692315",0,"belum",["Form Survey CCTV terisi","Data dukung diunggah ke folder Drive (denah PDF)","Lapor via Google Form"]),
      a("692316",0,"belum",["Form Survey CCTV terisi","Data dukung diunggah ke folder Drive (denah PDF)","Lapor via Google Form"]),
      a("692317",0,"belum",["Form Survey CCTV terisi","Data dukung diunggah ke folder Drive (denah PDF)","Lapor via Google Form"]),
      a("692484",0,"belum",["Form Survey CCTV terisi","Data dukung diunggah ke folder Drive (denah PDF)","Lapor via Google Form"]),
      a("692507",0,"belum",["Form Survey CCTV terisi","Data dukung diunggah ke folder Drive (denah PDF)","Lapor via Google Form"]),
      a("692519",0,"belum",["Form Survey CCTV terisi","Data dukung diunggah ke folder Drive (denah PDF)","Lapor via Google Form"]),
      a("692537",0,"belum",["Form Survey CCTV terisi","Data dukung diunggah ke folder Drive (denah PDF)","Lapor via Google Form"]),
      a("692639",0,"belum",["Form Survey CCTV terisi","Data dukung diunggah ke folder Drive (denah PDF)","Lapor via Google Form"]),
      a("692781",0,"belum",["Form Survey CCTV terisi","Data dukung diunggah ke folder Drive (denah PDF)","Lapor via Google Form"]),
      a("692794",0,"belum",["Form Survey CCTV terisi","Data dukung diunggah ke folder Drive (denah PDF)","Lapor via Google Form"]),
      a("694759",0,"belum",["Form Survey CCTV terisi","Data dukung diunggah ke folder Drive (denah PDF)","Lapor via Google Form"]),
    ]
  },
]
