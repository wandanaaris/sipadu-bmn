// Tes ranker kode barang: perilaku, bukan implementasi detail.
import { describe, expect, it } from 'vitest'
import { rekomendasiKode, kodeKeTitik } from './kodeBarang'

describe('kodeKeTitik', () => {
  it('mengubah kode 10 digit ke format titik Kemenkumham', () => {
    expect(kodeKeTitik('1010314002')).toBe('1.01.03.14.002')
  })
})

describe('rekomendasiKode', () => {
  it('paracetamol -> Obat Padat (Barang Konsumsi) lewat sinonim', () => {
    const r = rekomendasiKode('paracetamol')
    expect(r.kandidat.length).toBeGreaterThanOrEqual(1)
    const top = r.kandidat[0]
    expect(top.kode).toBe('1010314002')
    expect(top.kodeTitik).toBe('1.01.03.14.002')
    expect(top.keyakinan).toBe('Sangat relevan')
    expect(top.alasan.some((a) => a.includes('Sinonim'))).toBe(true)
  })

  it('panadol juga mengarah ke Obat Padat', () => {
    expect(rekomendasiKode('panadol tablet').kandidat[0]?.kode).toBe('1010314002')
  })

  it('kata "obat" mengangkat beberapa kandidat persediaan obat', () => {
    const r = rekomendasiKode('obat')
    expect(r.kandidat.length).toBeGreaterThanOrEqual(2)
    expect(r.kandidat.every((k) => k.kode.startsWith('1010314'))).toBe(true)
  })

  it('kertas hvs -> Kertas HVS', () => {
    const r = rekomendasiKode('kertas hvs')
    expect(r.kandidat[0]?.kode).toBe('1010302001')
  })

  it('stabilo -> Alat Tulis lewat sinonim', () => {
    const r = rekomendasiKode('stabilo')
    expect(r.kandidat[0]?.kode).toBe('1010301001')
  })

  it('laptop -> Lap Top (kode resmi) lewat sinonim', () => {
    const r = rekomendasiKode('laptop')
    expect(r.kandidat[0]?.kode).toBe('3100102002')
    expect(r.kandidat[0]?.keyakinan).toBe('Sangat relevan')
  })

  it('air conditioner / kulkas -> Alat Pendingin lewat sinonim', () => {
    for (const q of ['air conditioner', 'kulkas']) {
      expect(rekomendasiKode(q).kandidat[0]?.kode).toBe('3050204005')
    }
  })

  it('kassa gulung -> Alat Penunjang Kedokteran, bukan Mesin Gulung', () => {
    const r = rekomendasiKode('kassa gulung')
    const top = r.kandidat[0]
    expect(top?.kode).toBe('1010310001')
    expect(top?.keyakinan).toBe('Sangat relevan')
    // kata kemasan "gulung" tidak boleh membajak ke mesin
    const namaKecil = r.kandidat.slice(0, 3).map((k) => k.nama.toLowerCase())
    expect(namaKecil.some((n) => n.includes('mesin gulung'))).toBe(false)
  })

  it('ambroxol -> Obat Padat (tablet) via kamus obat', () => {
    const r = rekomendasiKode('ambroxol')
    expect(r.kandidat[0]?.kode).toBe('1010314002')
    expect(r.kandidat[0]?.keyakinan).toBe('Sangat relevan')
  })

  it('ambroxol sirup -> Obat Cair (bentuk menang atas obat umum)', () => {
    const r = rekomendasiKode('ambroxol sirup')
    expect(r.kandidat[0]?.kode).toBe('1010314001')
    expect(r.kandidat[0]?.keyakinan).toBe('Sangat relevan')
  })

  it('amoksisilin kapsul -> Obat Padat', () => {
    expect(rekomendasiKode('amoksisilin kapsul').kandidat[0]?.kode).toBe('1010314002')
  })

  it('sirup / salep -> fallback bentuk obat walau kata tidak ada di kamus', () => {
    for (const [q, kode] of [['sirup', '1010314001'], ['salep', '1010314005'], ['inhaler', '1010314003']] as const) {
      const r = rekomendasiKode(q)
      expect(r.kandidat[0]?.kode).toBe(kode)
      expect(r.kandidat[0]?.keyakinan).not.toBe('Perlu ditinjau')
    }
  })

  it('ketorolac -> Obat Padat (dasar), ketorolac injeksi -> Obat Cair', () => {
    expect(rekomendasiKode('ketorolac').kandidat[0]?.kode).toBe('1010314002')
    const inj = rekomendasiKode('ketorolac injeksi')
    expect(inj.kandidat[0]?.kode).toBe('1010314001')
    expect(inj.kandidat[0]?.keyakinan).toBe('Sangat relevan')
  })

  it('DEXAMETHASON (kapital) dikenali -> Obat Padat', () => {
    const r = rekomendasiKode('DEXAMETHASON')
    expect(r.kandidat[0]?.kode).toBe('1010314002')
    expect(r.kandidat[0]?.keyakinan).toBe('Sangat relevan')
  })

  it('cairan infus nacl / ringer -> Obat Cair', () => {
    for (const q of ['cairan infus nacl', 'infus nacl', 'ringer laktat', 'nacl 0.9']) {
      expect(rekomendasiKode(q).kandidat[0]?.kode).toBe('1010314001')
    }
  })

  it('obat tak ada di kamus tapi berakhiran INN -> diberi arah obat (bukan "tidak ditemukan")', () => {
    for (const q of ['pioglitazone', 'atorvastatin', 'esomeprazole injeksi']) {
      const r = rekomendasiKode(q)
      expect(r.kandidat.length).toBeGreaterThan(0)
      // bentuk jelas -> Relevan; tanpa bentuk -> setidaknya bukan buntu
      expect(r.pesan).toBeUndefined()
    }
    const pio = rekomendasiKode('pioglitazone')
    expect(pio.kandidat[0]?.kode).toBe('1010314002')
    expect(pio.kandidat[0]?.keyakinan).toBe('Perlu ditinjau')
    const inj = rekomendasiKode('esomeprazole injeksi')
    expect(inj.kandidat[0]?.kode).toBe('1010314001')
  })

  it('kata non-obat tanpa indikasi obat -> tetap kosong, tidak dipaksa jadi obat', () => {
    const r = rekomendasiKode('qwertyobatx')
    expect(r.kandidat).toHaveLength(0)
    expect(r.pesan).toBeTruthy()
  })

  it('mixer -> kode "Mixer" (3050205019) di urutan teratas, bukan tertimbun 50 varian', () => {
    const r = rekomendasiKode('mixer')
    expect(r.kandidat[0]?.kode).toBe('3050205019')
    expect(r.kandidat[0]?.keyakinan).toBe('Sangat relevan')
  })

  it('asphalt mixer -> kode Asphalt Mixer', () => {
    expect(rekomendasiKode('asphalt mixer').kandidat[0]?.kode).toBe('3010106010')
  })

  it('pengaduk adonan makanan -> Mixer (bukan Bumbu Makanan)', () => {
    const r = rekomendasiKode('pengaduk adonan makanan')
    expect(r.kandidat[0]?.kode).toBe('3050205019')
    expect(r.kandidat[0]?.keyakinan).toBe('Sangat relevan')
  })

  it('penghancur makanan / blender -> Blender, bukan mixer', () => {
    for (const q of ['blender', 'penghancur makanan', 'penghalus bumbu']) {
      const r = rekomendasiKode(q)
      expect(r.kandidat[0]?.kode).toBe('3050205018')
    }
  })

  it('dua "Blender" punya keterangan berbeda sesuai klasifikasinya (alat dapur vs lab)', () => {
    const r = rekomendasiKode('blender')
    const dapur = r.kandidat.find((k) => k.kode === '3050205018')
    const lab = r.kandidat.find((k) => k.kode === '3080111022')
    expect(dapur && lab).toBeTruthy()
    expect(dapur!.deskripsi.toLowerCase()).toContain('dapur')
    expect(dapur!.deskripsi).not.toBe(lab!.deskripsi)
    expect(lab!.deskripsi.toLowerCase()).toContain('laboratorium')
  })

  it('kode tanpa deskripsi terkurasi tetap dapat keterangan sesuai rantai klasifikasinya (otomatis)', () => {
    // Vacuum Mixer (3070102104) tidak punya deskripsi kurasi -> auto dari breadcrumb
    const r = rekomendasiKode('vacuum mixer')
    const k = r.kandidat.find((c) => c.kode === '3070102104')
    expect(k).toBeTruthy()
    expect(k!.deskripsi).toContain('golongan')
    expect(k!.deskripsi).not.toContain('paling sering dimaksud')
  })

  it('setiap kandidat punya penjelasan (deskripsi) bukan hanya nama', () => {
    for (const q of ['mixer', 'paracetamol', 'meja kerja']) {
      const r = rekomendasiKode(q)
      expect(r.kandidat.length).toBeGreaterThan(0)
      for (const k of r.kandidat) {
        expect(typeof k.deskripsi).toBe('string')
        expect(k.deskripsi.trim().length).toBeGreaterThan(10)
      }
    }
    // mixer umum punya penjelasan terkurasi (bahasa sehari-hari, tanpa kalimat self-referensial)
    expect(rekomendasiKode('mixer').kandidat[0]?.deskripsi.toLowerCase()).toContain('pengaduk')
    expect(rekomendasiKode('mixer').kandidat[0]?.deskripsi).not.toContain('paling sering dimaksud')
  })

  it('meja kerja -> kandidat aset meja kerja', () => {
    const r = rekomendasiKode('meja kerja')
    expect(r.kandidat.length).toBeGreaterThanOrEqual(1)
    const nama = r.kandidat[0].nama
    expect(nama.toLowerCase()).toContain('meja')
  })

  it('kode numerik 10 digit cocok persis', () => {
    const r = rekomendasiKode('1010314002')
    expect(r.kandidat[0]?.kode).toBe('1010314002')
    expect(r.kandidat[0]?.keyakinan).toBe('Sangat relevan')
  })

  it('kode titik Kemenkumham 1.01.03.14 dipahami', () => {
    const r = rekomendasiKode('1.01.03.14')
    expect(r.kandidat.length).toBeGreaterThanOrEqual(1)
    expect(r.kandidat[0]?.kode.startsWith('1010314')).toBe(true)
  })

  it('input kosong -> pesan, tanpa kandidat', () => {
    const r = rekomendasiKode('')
    expect(r.kandidat).toHaveLength(0)
    expect(r.pesan).toBeTruthy()
  })

  it('hanya kata generik -> minta kata kunci spesifik', () => {
    const r = rekomendasiKode('barang alat untuk kegiatan')
    expect(r.kandidat).toHaveLength(0)
    expect(r.pesan).toBeTruthy()
  })

  it('kata lemah tunggal tidak dinilai "Sangat relevan"', () => {
    for (const q of ['besar', 'jenis']) {
      const r = rekomendasiKode(q)
      expect(r.kandidat[0]?.keyakinan).not.toBe('Sangat relevan')
    }
  })
})
