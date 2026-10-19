// Sinonim / nama barang konkret untuk kode tertentu — melengkapi nama resmi.
// Nama resmi tidak selalu memuat istilah sehari-hari (mis. "paracetamol"
// tidak ada di nama "Obat Padat (Barang Konsumsi)"), sehingga alias ini
// membantu pencocokan. Edit bebas di sini tanpa perlu membangkitkan ulang
// kode-barang-data.ts. Nilai = sinonim pencarian untuk kode tersebut.
// Sumber sebagian besar: nama barang konkret pada Daftar Satuan Persediaan
// Kemenkumham (PDF).
export const KODE_ALIAS: Record<string, string[]> = {
  // --- Obat (subkelompok 1010314) ---
  // Kemenkumham mengelompokkan obat per BENTUK SEDIAAN: cair, padat, gas, serbuk, gel/salep.
  '1010314002': ['paracetamol', 'panadol', 'paracetamol tablet', 'analgesik', 'antipiretik', 'obat tablet', 'obat kaplet', 'obat kapsul', 'polos', 'amoxilin', 'amoksisilin', 'amoxicillin', 'vitamin tablet',
    'ambroxol', 'ambroxol tablet', 'aspirin', 'ibuprofen', 'diklofenak', 'mefenamat', 'asam mefenamat', 'cetirizine', 'setirizin', 'loratadin', 'omeprazole', 'metformin', 'glimepirid', 'amlodipin', 'captopril', 'simvastatin', 'metamizol', 'cefadroxil', 'ciprofloxacin', 'azithromycin', 'azitromisin',
    'ketorolac', 'dexamethasone', 'dexamethason', 'dexametason', 'dexamethasone tablet', 'meloxicam', 'piroxicam', 'natrium diklofenak', 'domperidone', 'ondansetron', 'ranitidine', 'lansoprazole', 'pantoprazole', 'esomeprazole', 'sucralfate', 'bisoprolol', 'propranolol', 'digoxin', 'furosemide', 'spironolactone', 'allopurinol', 'ctm', 'chlorpheniramine', 'dextromethorphan', 'acetylcysteine', 'cefixime', 'co-amoxiclav', 'tetracycline', 'doxycycline', 'metronidazole', 'albendazole', 'mebendazole', 'fluconazole', 'ketoconazole', 'prednisone', 'methylprednisolone', 'montelukast', 'salbutamol tablet', 'vitamin b kompleks', 'vitamin c', 'asam folat', 'besi', 'sulfat besi', 'kalsium', 'zink'],
  '1010314001': ['obat sirup', 'obat tetes', 'obat cair', 'alkohol', 'betadin', 'cairan infus',
    'ambroxol sirup', 'paracetamol sirup', 'obat batuk sirup', 'sirup', 'drop obat', 'obat drop', 'antasida cair', 'obat penurun panas sirup',
    'infus', 'nacl', 'nacl 0.9', 'saline', 'ringer', 'ringer laktat', 'ringer asetat', 'dekstrosa', 'glukosa infus', 'cairan infus nacl', 'infus nacl', 'asering', 'cairan ringer',
    'injeksi', 'suntik', 'ketorolac injeksi', 'dexamethasone injeksi', 'furosemide injeksi', 'omeprazole injeksi', 'ranitidine injeksi', 'ceftriaxone', 'cefotaxime', 'ampicillin injeksi', 'obat tetes mata', 'chloramphenicol tetes', 'tetes telinga', 'vitamin c injeksi'],
  '1010314003': ['inhaler', 'obat inhalasi', 'obat gas', 'salbutamol inhaler', 'vapor'],
  '1010314004': ['oralit', 'obat serbuk', 'serbuk obat', 'bubuk obat', 'asam folat serbuk'],
  '1010314005': ['salep', 'krim', 'gel obat', 'obat oles', 'losion', 'miconazole krim', 'ketoconazole krim', 'salep kulit', 'obat gatal salep'],
  '1010314999': ['obat herbal', 'obat lainnya', 'obat tradisional', 'jamu', 'obat bebas lainnya'],

  // --- Alat Tulis Kantor (subkelompok 1010301) ---
  '1010301001': ['stabilo', 'spidol', 'spidol papan', 'pulpen', 'ballpoint', 'pensil', 'pena', 'highlighter', 'marker', 'penghapus pensil', 'penggaris'],
  '1010301003': ['paper clip', 'paper clips', 'binder clip', 'clip kertas', 'penjepit kertas'],
  '1010301005': ['buku folio', 'buku catatan', 'buku tulis', 'buku agenda', 'buku kuitansi', 'blangko'],
  '1010301008': ['cutter', 'isi cutter', 'gunting', 'pemotong kertas', 'pemotong'],
  '1010301004': ['penghapus', 'korektor', 'tipe x', 'correction tape'],

  // --- Kertas (subkelompok 1010302) ---
  '1010302001': ['hvs', 'kertas hvs', 'kertas fotokopi', 'kertas a4', 'kertas kuarto', 'kertas folio 80gsm'],
  '1010302002': ['kertas buram', 'kertas stiker', 'kertas linen', 'kertas asturo', 'berbagai kertas'],
  '1010302004': ['amplop', 'sampul surat', 'amplop surat', 'amplop coklat'],

  // --- APD / alat penunjang (persediaan kedokteran) ---
  '1010310001': ['handscoon', 'sarung tangan medis', 'sarung tangan karet', 'spuit', 'jarum suntik', 'masker medis', 'masker bedah', 'baju gown', 'jas lab', 'perlengkapan apd', 'baju pasien', 'kassa', 'kain kassa', 'kasa', 'kasa gulung', 'kassa gulung', 'perban', 'gauze', 'pembalut luka', 'plester medis', 'kapas'],

  // --- Peralatan & mesin (golongan 3): kata pasar/fungsi -> nama resmi ---
  // Mixer makanan: orang mencari "pengaduk adonan" walau nama resmi "Mixer".
  '3050205019': ['pengaduk', 'pengaduk adonan', 'pengaduk adonan makanan', 'pengaduk makanan', 'pengaduk kue', 'pengaduk minuman', 'mixer makanan', 'mixer adonan', 'pencampur adonan', 'pencampur makanan', 'pengaduk kue dan mixer'],
  '3050205018': ['blender', 'blender makanan', 'penghancur makanan', 'penghalus makanan', 'penghalus bumbu', 'penghancur buah', 'alat penghalus makanan'],
  '3050206036': ['dispenser', 'galon', 'tempat air minum', 'pemanas air minum', 'air minum dispenser'],
  '3100102002': ['laptop', 'lap top', 'notebook', 'ultrabook'],
  '3100102003': ['notebook', 'netbook'],
  '3100102001': ['pc', 'p.c', 'desktop', 'cpu', 'komputer pribadi', 'komputer desktop', 'workstation'],
  '3100102009': ['ipad', 'tablet pc', 'tablet komputer', 'tab komputer'],
  '3050204005': ['kulkas', 'lemari es', 'freezer', 'refrigerator', 'pendingin ruangan', 'ac', 'air conditioner', 'penyejuk ruangan', 'dispenser pendigin'],

  // --- Dasar hukum umum --- (kosong: hanya sebagai dokumentasi)
}

// Kode yang tidak punya alias sama sekali dihilangkan dari pemetaan di atas,
// namun objek tetap diekspor agar mudah dibaca. Berikut kode untuk nama biasa
// yang DESKRIPTIF (tidak butuh alias): meja, kursi, komputer, laptop, dll.
