import { describe, expect, it } from 'vitest';
import { buatKertasKerja, DataXlsx, DASAR_PERATURAN } from './penaksiranXlsx';
import { hitungPenaksiran, type IdentitasPenaksiran, type BarisLelang } from './penaksiranKendaraan';

// Fixture Simulasi I KMK 375/2024 (Corolla Altis 1.8) - dari "Kertas Kerja Simulasi (2).xlsx"
const objek: IdentitasPenaksiran = {
  nomorKertasKerja: 'WP.4.PB.02/2026',
  namaObjek: 'Kendaraan Jabatan',
  kodeBarang: '302013',
  nup: '00001234',
  lokasiObjek: 'Jakarta IV',
  rencanaLokasi: 'Jakarta',
  kategoriLokasiObjek: 2,
  jenisKendaraan: 'roda4',
  kapasitasCc: 1800,
  merek: 'Toyota',
  tipe: 'Corolla Altis',
  nomorPolisi: 'XX XXXX XX',
  dokumenKepemilikan: 'BPKB',
  pemilikDokumen: 'Kementerian Imigrasi dan Pemasyarakatan',
  masaBerlaku: 'Masih Berlaku',
  keteranganLain: '',
  warna: 'Hitam',
  tahunPembuatan: 2005,
  bahanBakar: 'Bensin',
  kondisi: 'rusak90',
  penggunaan: 'Kendaraan Dinas',
  tahunTaksiran: 2024,
  tujuan: 'lelang',
  kota: 'Pekanbaru',
  tanggal: '2024-10-28',
  ketua: 'Budi Santoso', anggota: ['Ahmad Yani', 'Siti Rahma'],
};

const b: (merek: string, kode: string, tipe: string, harga: number, tahunLelang: number, lokasi: string, kategori: 1|2|3|4, tahun: number) => BarisLelang =
  (merek, kode, tipe, harga, tahunLelang, lokasi, kategori, tahun) =>
    ({ merek, kodeLelang: kode, tipe, hargaLelang: harga, tahunLelang, lokasiLelang: lokasi, kategoriLokasiLelang: kategori, tahunPembuatanLelang: tahun, penyesuaianTipe: 0, penyesuaianMerek: 0, hargaBaru: 0 });

const rows: BarisLelang[] = [
  b('Toyota', 'BCTT0N', 'Corolla Altis 1.8', 55_583_000, 2023, 'Jakarta', 2, 2004),
  b('Toyota', 'CK47MN', 'Corolla Altis 1.8', 55_583_000, 2023, 'Jakarta', 2, 2004),
  b('Toyota', 'TZ4FD1', 'Corolla Altis 1.8', 44_803_000, 2023, 'Jakarta', 2, 2004),
  b('Toyota', 'UCXOUN', 'Corolla Altis 1.8', 63_533_000, 2023, 'Jakarta', 2, 2004),
  b('Toyota', 'MG4ZLQ', 'Corolla Altis 1.8', 46_000_000, 2022, 'Jakarta', 2, 2006),
  b('Toyota', 'U6PQHA', 'Corolla Altis 1.8', 63_666_900, 2022, 'Jakarta', 2, 2006),
];

const hasil = hitungPenaksiran(rows, objek);
const data: DataXlsx = { objek, rowsValid: rows, hasil };

const teks = async (alamat: string, d: DataXlsx = data): Promise<string> => {
  const wb = await buatKertasKerja(d);
  return String(wb.getWorksheet('Simulasi')!.getCell(alamat).value ?? '');
};
const angka = async (alamat: string, d: DataXlsx = data): Promise<number> => {
  const wb = await buatKertasKerja(d);
  return Number(wb.getWorksheet('Simulasi')!.getCell(alamat).value ?? 0);
};

describe('penaksiranXlsx — kertas kerja diisi ke template resmi', () => {
  it('kop terisi: satker, tujuan, nomor kertas kerja', async () => {
    expect(await teks('D4')).toBe('Kementerian Imigrasi dan Pemasyarakatan');
    expect(await teks('D5')).toContain('TUJUAN PEMINDAHTANGANAN DENGAN PENJUALAN SECARA LELANG');
    expect(await teks('E8')).toBe('WP.4.PB.02/2026');
  });

  it('identifikasi terisi: nama objek, NUP, lokasi, kategori, centang jenis & dokumen', async () => {
    expect(await teks('E11')).toBe('Kendaraan Jabatan');
    expect(await teks('L11')).toBe('00001234');
    expect(await teks('E12')).toBe('Jakarta');
    expect(await teks('L12')).toBe('2');
    expect(await teks('E13')).toBe('');
    expect(await teks('I13')).toBe('v'); // roda 4
    expect(await teks('E14')).toBe('1800'); // kapasitas silender (butir d template)
    expect(await teks('E15')).toBe('Toyota');
    expect(await teks('E16')).toBe('Corolla Altis');
    expect(await teks('E18')).toBe('XX XXXX XX');
    expect(await teks('E19')).toBe('v'); // BPKB tercentang
    expect(await teks('I19')).toBe(''); // STNK tidak
    expect(await teks('E21')).toBe('v'); // masih berlaku
    expect(await teks('E23')).toBe('Kendaraan Dinas');
  });

  it('fisik terisi: warna, tahun pembuatan, bahan bakar, centang kondisi 0,5', async () => {
    expect(await teks('E27')).toBe('Hitam');
    expect(await teks('E28')).toBe('2005');
    expect(await teks('E29')).toBe('Bensin');
    expect(await teks('M27')).toBe('v');
    expect(await teks('M28')).toBe('');
    expect(await teks('M29')).toBe('');
  });

  it('tabel DATA HASIL LELANG terisi pada baris 32-37 dan pelengkap baris 38 kosong', async () => {
    expect(await teks('B32')).toBe('Toyota');
    expect(await teks('D32')).toBe('BCTT0N');
    expect(await teks('G32')).toBe('Corolla Altis 1.8');
    expect(await angka('I32')).toBe(55583000);
    expect(await angka('K32')).toBe(2023);
    expect(await teks('N32')).toBe('Jakarta');
    expect(await angka('O32')).toBe(2);
    expect(await angka('P32')).toBe(2004);
    expect(await teks('B38')).toBe(''); // baris pelengkap ke-7
    expect(await angka('I38')).toBe(0);
  });

  it('tabel PENYESUAIAN + ringkasan (jumlah, rata-rata, limit x 0,5, pembulatan)', async () => {
    expect(await teks('B41')).toBe('Toyota');
    expect(await angka('H41')).toBe(2); // waktu 2%
    expect(await angka('K41')).toBe(7); // tahun 7%
    expect(await angka('N41')).toBe(9); // total
    expect(await angka('P41')).toBeCloseTo(60585470, 0);
    expect(await angka('P48')).toBeCloseTo(345634073, 0);
    expect(await angka('P49')).toBeCloseTo(57605678.83, 1);
    expect(await angka('O50')).toBe(0.5);
    expect(await angka('P50')).toBeCloseTo(28802839.42, 0);
    expect(await angka('P51')).toBe(28803000);
    expect(await teks('O53')).toBe('Pekanbaru, Tanggal Penentuan Nilai Taksiran 28 Oktober 2024');
  });

  it('nama panitia terisi di bawah kolom ttd', async () => {
    expect(await teks('C60')).toBe('Budi Santoso');
    expect(await teks('H60')).toBe('Ahmad Yani');
    expect(await teks('N60')).toBe('Siti Rahma');
  });

  it('merek pembanding berbeda menambahkan sheet Lembar Kedua (Fpm)', async () => {
    const honda: BarisLelang = { ...b('Honda', 'ZZ01', 'Astrea C100', 5_000_000, 2022, 'Jakarta', 2, 2005), hargaBaru: 5_000_000 };
    const dataBeda: DataXlsx = { objek: { ...objek, hargaBaruObjek: 200_000 }, rowsValid: [...rows.slice(0, 2), honda], hasil: hitungPenaksiran([...rows.slice(0, 2), honda], objek) };
    const wb = await buatKertasKerja(dataBeda);
    expect(wb.getWorksheet('Lembar Kedua (Fpm)')).toBeTruthy();
  });

  it('sheet Dasar Peraturan memuat PP 27/2014 jo 28/2020, PMK 165, dan KMK 375', async () => {
    const wb = await buatKertasKerja(data);
    const dasar = wb.getWorksheet('Dasar Peraturan')!;
    const teksSheet = dasar.getSheetValues().join(' ');
    for (const [peraturan] of DASAR_PERATURAN) expect(teksSheet).toContain(peraturan.slice(0, 30));
  });

  it('template tetap mempertahankan strukturnya: merge kop dan nomor baris 1-7', async () => {
    const wb = await buatKertasKerja(data);
    const ws = wb.getWorksheet('Simulasi')!;
    expect(ws.getCell('D1').value).toContain('KERTAS KERJA ANALISIS PENENTUAN NILAI TAKSIRAN BMN');
    expect(ws.model.merges).toContain('A1:C6'); // merge kop template tidak hilang
    expect(ws.getCell('A32').value).toBe(1);
    expect(ws.getCell('A38').value).toBe(7);
  });
});

// ===== AUDIT CETAKAN: template diisi dengan Contoh 1 KMK (7 baris) — semua sel harus =====
// identik dengan angka yang tercetak di KMK halaman 27.
describe('audit cetakan — Contoh 1 KMK hal 27 pada file hasil unduhan', () => {
  const rowsKmk: BarisLelang[] = [
    b('Toyota', 'WKDLTZ', 'Corolla Altis 1.800 cc', 46_100_000, 2023, 'Jakarta', 2, 2005),
    b('Toyota', 'BCTT0N', 'Corolla Altis 1.800 cc', 55_583_000, 2023, 'Jakarta', 2, 2004),
    b('Toyota', 'MG4ZLQ', 'Corolla Altis 1.800 cc', 46_000_000, 2022, 'Jakarta', 2, 2006),
    b('Toyota', 'CK47MN', 'Corolla Altis 1.800 cc', 55_583_000, 2023, 'Jakarta', 2, 2004),
    b('Toyota', 'TZ4FD1', 'Corolla Altis 1.800 cc', 44_803_000, 2023, 'Jakarta', 2, 2004),
    b('Toyota', 'WIUSNI', 'Corolla Altis 1.800 cc', 54_321_321, 2023, 'Jakarta', 2, 2006),
    b('Toyota', 'MZYIJN', 'Corolla Altis 1.800 cc', 52_001_000, 2024, 'Jakarta', 2, 2006),
  ];
  const hasilKmk = hitungPenaksiran(rowsKmk, objek);
  const dataKmk: DataXlsx = { objek, rowsValid: rowsKmk, hasil: hasilKmk };

  it('sel penyesuaian baris 1-7 (waktu, tahun, total, nilai taksiran) identik dengan KMK', async () => {
    const wb = await buatKertasKerja(dataKmk);
    const ws = wb.getWorksheet('Simulasi')!;
    const harusTotal = [2, 9, -3, 9, 9, -5, -7];
    const harusNilai = [47_022_000, 60_585_470, 44_620_000, 60_585_470, 48_835_270, 51_605_254.95, 48_360_930];
    const harusWaktu = [2, 2, 4, 2, 2, 2, 0];
    const harusTahun = [0, 7, -7, 7, 7, -7, -7];
    for (let i = 0; i < 7; i++) {
      const r = 41 + i;
      expect(ws.getCell(`B${r}`).value).toBe('Toyota');
      expect(ws.getCell(`H${r}`).value).toBe(harusWaktu[i]);
      expect(ws.getCell(`K${r}`).value).toBe(harusTahun[i]);
      expect(ws.getCell(`N${r}`).value).toBe(harusTotal[i]);
      expect(Number(ws.getCell(`P${r}`).value)).toBeCloseTo(harusNilai[i], 2);
    }
  });

  it('sel ringkasan (jumlah, rata-rata, faktor, limit, pembulatan) identik dengan KMK', async () => {
    const wb = await buatKertasKerja(dataKmk);
    const ws = wb.getWorksheet('Simulasi')!;
    expect(Number(ws.getCell('P48').value)).toBeCloseTo(361_614_394.95, 2);
    expect(Number(ws.getCell('P49').value)).toBeCloseTo(51_659_199.28, 2);
    expect(ws.getCell('N50').value).toBe('x');
    expect(Number(ws.getCell('O50').value)).toBe(0.5);
    expect(Number(ws.getCell('P50').value)).toBeCloseTo(25_829_599.64, 2);
    expect(Number(ws.getCell('P51').value)).toBe(25_830_000);
    expect(String(ws.getCell('O53').value)).toBe('Pekanbaru, Tanggal Penentuan Nilai Taksiran 28 Oktober 2024');
  });

  it('sel data hasil lelang (harga, waktu lelang, kategori, tahun) identik dengan KMK', async () => {
    const wb = await buatKertasKerja(dataKmk);
    const ws = wb.getWorksheet('Simulasi')!;
    const harusHarga = [46_100_000, 55_583_000, 46_000_000, 55_583_000, 44_803_000, 54_321_321, 52_001_000];
    const harusTahunLelang = [2023, 2023, 2022, 2023, 2023, 2023, 2024];
    const harusTahunBuat = [2005, 2004, 2006, 2004, 2004, 2006, 2006];
    for (let i = 0; i < 7; i++) {
      const r = 32 + i;
      expect(ws.getCell(`I${r}`).value).toBe(harusHarga[i]);
      expect(ws.getCell(`K${r}`).value).toBe(harusTahunLelang[i]);
      expect(ws.getCell(`O${r}`).value).toBe(2);
      expect(ws.getCell(`P${r}`).value).toBe(harusTahunBuat[i]);
    }
  });
});
