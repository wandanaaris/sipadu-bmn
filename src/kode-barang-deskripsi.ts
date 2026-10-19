// Penjelasan singkat (bahasa sehari-hari) untuk kode tertentu — membantu satker
// memahami "barang apa" di balik nama resmi yang kadang teknis/ambigu.
// Kode tanpa entri di sini mendapat penjelasan otomatis dari jalur klasifikasi.
// Tambahkan berkelanjutan; jangan dipaksa lengkap untuk semua 12.952 kode.
export const KODE_DESKRIPSI: Record<string, string> = {
  // --- Mixer (kasus: banyak varian, satker bingung) ---
  '3050205019': 'Alat pengaduk/pencampur serbaguna — umumnya dipakai untuk mengaduk adonan makanan atau minuman (memasak/membuat kue).',
  '3010106010': 'Mesin pencampur aspal untuk pekerjaan konstruksi jalan — mencampur aspal, agregat, dan bahan lain menjadi campuran aspal panas.',
  '3010108011': 'Mesin pencampur beton (molen) — mengaduk semen, pasir, kerikil, dan air menjadi adukan beton.',
  '3010108018': 'Concrete Mixer Tandem — molen beton berkapasitas besar, dua unit di saklar yang dapat dioperasikan berurutan (tandem).',
  '3010108020': 'Pan Mixer — alat pencampur beton/semen berbentuk pan/piringan berputar.',
  '3010108021': 'Asbuton Mixer — alat khusus untuk mencampur aspal buton (asbuton), bahan aspal alam dari Buton. Berbeda dari Asphalt Mixer biasa.',
  '3010108022': 'Paddle Mixer — alat pengaduk berdaun dayung (paddle) untuk mengaduk adonan/bahan kental.',
  '3030103025': 'Mixer (Perkakas Bengkel Listrik) — alat pengaduk bertenaga listrik yang dipakai di bengkel.',
  '3060101098': 'Mixer Sound System — alat pencampur sinyal audio (sound system), bukan pengaduk bahan.',
  '3060102015': 'Video Mixer — alat pencampur sinyal video (produksi siaran), bukan pengaduk bahan.',
  '3060102075': 'Mixer PVC — alat khusus industri untuk mencampur bahan PVC (plastik).',
  '3080141172': 'Mixer Laboratorium Pertanian — alat pengaduk sampel di laboratorium pertanian, bukan mixer dapur/bangunan.',

  // --- Peralatan umum yang kerap dicari ---
  '3100102002': 'Komputer jinjing (laptop). Kode resmi "Lap Top" dalam kelompok Personal Komputer.',
  '3100102001': 'Unit komputer (PC/desktop). Kode resmi "P.C Unit".',
  '3050201002': 'Meja kerja berbahan kayu — aset peralatan kantor.',
  '3050201001': 'Meja kerja berbahan besi/logam — aset peralatan kantor.',
  '3020104001': 'Kendaraan sepeda motor roda dua yang dioperasikan untuk keperluan operasional satker.',
  '3050204005': 'Pendingin ruangan/AC (portable) — alat pengatur suhu ruangan.',
  '1010301001': 'Barang habis pakai alat tulis kantor (pulpen, pensil, spidol, dst).',
  '1010302001': 'Kertas HVS untuk fotokopi/cetak — barang persediaan.',
  '1010314002': 'Obat dalam sediaan padat (tablet/kapsul/kaplet) — barang persediaan obat.',
  '1010314001': 'Obat dalam sediaan cair (sirup, tetes, injeksi, cairan infus) — barang persediaan obat.',
  '1010310001': 'Kebutuhan medis habis pakai (handscoon, spuit, kassa, plaester) — barang persediaan kedokteran.',

  // --- Nama kembar (disambiguasi): kode berbeda, nama sama, klasifikasi beda ---
  '3050205018': 'Alat dapur untuk menghaluskan/mencampur bahan makanan & minuman di dapur.',
  '3080111022': 'Blender laboratorium — alat untuk menghaluskan/mencampur sampel uji di laboratorium.',
  '3060347002': 'Generator set (genset) — pembangkit listrik untuk jaringan/instalasi.',
  '3150405001': 'Generator set (genset) — pembangkit listrik pada kendaraan/peralatan bergerak.',
  '3050204015': 'Chiller — alat pendingin udara/ruangan.',
  '3060102047': 'Chiller — peralatan pencampur/pendingin pada sistem audio/siaran.',
  '3080156072': 'Detektor gas — alat pendeteksi gas untuk keamanan/pemantauan di lapangan.',
  '3090409019': 'Detektor gas — instrumen elektronik pendeteksi gas.',
  '3030107001': 'Mesin jahit terpal — alat perbengkelan untuk menjahit terpal.',
  '3030212013': 'Mesin jahit terpal — mesin pada kelompok alat produksi/pengolahan.',
  '3070101010': 'Timbangan bayi — alat kesehatan/timbang badan untuk bayi di fasilitas kesehatan.',
  '3070110087': 'Timbangan bayi — alat timbang bayi pada kelompok alat kesehatan/laboratorium.',
  '3030101002': 'Mesin frais (milling) — peralatan perbengkelan mesin.',
  '3030212003': 'Mesin frais (milling) — mesin produksi/pengolahan.',
  '3030103030': 'Gergaji bundar (circular saw) — alat bengkel pemotong kayu/logam.',
  '3080707005': 'Circular saw — peralatan pengujian di laboratorium.',
  '3090202017': 'Helm — pelindung kepala untuk keselamatan kerja di lapangan.',
  '3150203004': 'Helm — bagian peralatan keselamatan/alat khusus.',
  '3080111138': 'Spektrofotometer — alat ukur laboratorium umum (mengukur serapan cahaya).',
  '3080122016': 'Spektrofotometer — alat pada subkelompok alat laboratorium lain (varian analitik).',
  '3080113019': 'Desikator — alat laboratorium untuk mengeringkan/menjaga kelembapan sampel.',
  '3080118052': 'Desikator — varian alat lab (peternakan/pertanian) untuk pengeringan sampel.',
  '3070101172': 'Termometer digital — alat pengukur suhu untuk pemeriksaan kesehatan.',
  '3080149009': 'Termometer digital — alat ukur suhu pada laboratorium/pengujian.',
}
