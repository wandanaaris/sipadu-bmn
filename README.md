# SIPADU BMN DITJENPAS RIAU

**Sistem Informasi Pemantauan dan Data Terpadu Barang Milik Negara Direktorat Jenderal Pemasyarakatan Riau**

*Satu Portal, Data Terpadu, Tindak Lanjut Terpantau.*

## Fitur MVP

- Dashboard Korwil BMN: ringkasan, progress pekerjaan, monitoring satker, verifikasi, tutup/buka pekerjaan.
- Portal Satker tanpa login: pemilihan satker, daftar pekerjaan aktif, rincian kekurangan, progress, dan pengajuan verifikasi.
- Metode hybrid: spreadsheet eksternal, formulir portal, dan unggah dokumen.
- Pekerjaan yang ditutup tidak tampil di Portal Satker, tetapi tetap tersedia pada Dashboard Korwil/Data Center.
- Fondasi indikator kinerja: ketepatan waktu, kelengkapan pertama, jumlah perbaikan, dan penyelesaian.

## Menjalankan

```bash
npm install
npm run dev
```

Build produksi dan pengujian:

```bash
npx vitest run
npm run build
```

## Tahap berikutnya

1. Mengganti data contoh dengan basis data operasional.
2. Integrasi Google Sheets dan Google Apps Script untuk pekerjaan eksternal.
3. Autentikasi Google khusus Dashboard Korwil.
4. Tautan bertoken untuk Portal Satker.
5. Penyimpanan dokumen pada Google Drive kedinasan.
6. Audit trail perubahan status dan aktivitas.
7. Perumusan dan persetujuan bobot nilai kinerja UPT sebelum skor ditampilkan.

## Prinsip nilai kinerja

Skor tidak boleh dihitung hanya dari persentase akhir. Data yang disiapkan:

- selesai sebelum/sesuai/melewati tenggat;
- lengkap pada pengajuan pertama;
- jumlah pengembalian untuk perbaikan;
- lama penyelesaian;
- konsistensi penyelesaian seluruh pekerjaan;
- pengecualian untuk pekerjaan yang bukan kewajiban satker.

Bobot harus ditetapkan dan disosialisasikan sebelum menjadi penilaian resmi.
