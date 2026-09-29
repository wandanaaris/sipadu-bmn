import { describe, expect, it } from 'vitest'
import { contohPemanfaatan, dukmanLocalPreviewTasks, taskPemanfaatanBmn, taskPemanfaatanRumahNegara, taskSertifikasiTanah } from './dukmanTasks'
import { satkers } from './data'

const knownCodes = new Set(satkers.map(s => s.code))
const codesOf = (task: typeof taskSertifikasiTanah) => task.assignments.map(a => a.satker)

describe('Pekerjaan lokal DUKMAN TA 2026', () => {
  it('pemanfaatan BMN punya tiga tahap sesuai alur SIMAN', () => {
    const stages = taskPemanfaatanBmn.stages!
    expect(stages.map(x => x.id)).toEqual(['cetak-dan-item', 'persetujuan', 'tindak-lanjut'])
    expect(stages[0].label).toContain('Cetakan')
    expect(stages[1].label).toContain('Persetujuan Sewa')
    expect(stages[2].label).toContain('Tindak Lanjut')
  })

  it('Tahap I meminta cetakan SIMAN sekaligus isian item dan luas', () => {
    const tahapI = taskPemanfaatanBmn.stages![0]
    expect(tahapI.requirements).toHaveLength(1)
    expect(tahapI.requirements[0]).toContain('SIMAN')
    // Cetakan SIMAN hanya memuat nomor tiket dan nama Satker,
    // sehingga item dan luas tetap diketik Satker.
    const keys = tahapI.fields!.map(f => f.key)
    expect(keys).toEqual(['nomorTiket', 'periode', 'items'])
    expect(tahapI.fields!.find(f => f.key === 'items')!.type).toBe('item-luas-table')
  })

  it('Tahap II menambah kolom nilai pada daftar item yang sama', () => {
    const tahapII = taskPemanfaatanBmn.stages![1]
    const keys = tahapII.fields!.map(f => f.key)
    expect(keys).toEqual(['nomorPersetujuan', 'nilaiSewa'])
    expect(tahapII.fields!.find(f => f.key === 'nilaiSewa')!.type).toBe('item-nilai-table')
  })

  it('pekerjaan pemanfaatan BMN punya folder Drive untuk unggah cetakan dan surat', () => {
    expect(taskPemanfaatanBmn.uploadLink).toContain('drive.google.com')
  })

  it('Tahap III tetap tanpa dokumen, sementara Tahap I dan II ada unggahan', () => {
    expect(taskPemanfaatanBmn.stages![0].requirements.length).toBeGreaterThan(0)
    expect(taskPemanfaatanBmn.stages![1].requirements.length).toBeGreaterThan(0)
    expect(taskPemanfaatanBmn.stages![2].requirements).toEqual([])
  })

  it('Tahap III memakai konfirmasi saja tanpa dokumen', () => {
    const tahapIII = taskPemanfaatanBmn.stages![2]
    expect(tahapIII.confirmOnly).toBe(true)
    expect(tahapIII.requirements).toEqual([])
    expect(tahapIII.confirmLabel).toContain('SK Penetapan')
  })

  it('contoh Dumai memakai satu daftar dan luas tetap sama antara usulan dan persetujuan', () => {
    const tiket = contohPemanfaatan[0].tiket[0]
    expect(tiket.nomorTiket).toBe('PPL26081908155728114')
    expect(tiket.nomorPersetujuan).toBe('S-83/MK/KNL.0305/2026')
    expect(tiket.items).toHaveLength(6)
    const totalLuas = tiket.items.reduce((n, i) => n + i.luas, 0)
    const totalNilai = tiket.items.reduce((n, i) => n + i.nilai, 0)
    expect(totalLuas).toBe(101)
    expect(totalNilai).toBe(27_301_000)
  })

  it('mendaftarkan enam pekerjaan pratinjau, Leveraging BMN belum tampil', () => {
    expect(dukmanLocalPreviewTasks.map(t => t.id)).toEqual([
      'sertifikasi-tanah-bagansiapiapi-2026',
      'pemanfaatan-rumah-negara-2026',
      'penetapan-status-penggunaan-2026',
      'penghapusan-bmn-rusak-berat-a-2026',
      'penghapusan-bmn-rusak-berat-b-2026',
      'penghapusan-bmn-rusak-berat-c-2026',
    ])
  })

  it('sertifikasi tanah ditugaskan ke 15 Satker pemilik aset tanah', () => {
    expect(taskSertifikasiTanah.assignments).toHaveLength(15)
    expect(codesOf(taskSertifikasiTanah)).toEqual([
      '692307', '692308', '692309', '692310', '692311',
      '692312', '692313', '692314', '692315', '692316',
      '692317', '692484', '692781', '692794', '694759',
    ])
    expect(codesOf(taskSertifikasiTanah).every(code => knownCodes.has(code))).toBe(true)
    expect(codesOf(taskSertifikasiTanah)).toContain('692311')
  })

  it('setiap penugasan tanah memakai kode Satker yang unik', () => {
    const codes = codesOf(taskSertifikasiTanah)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('pekerjaan tanah tetap memakai dua data dukung SRIKANDI', () => {
    expect(taskSertifikasiTanah.requirements?.map(r => r.key)).toEqual(['laporan_progress', 'capture_srikandi'])
    expect(taskSertifikasiTanah.uploadLink).toContain('drive.google.com')
    expect(taskSertifikasiTanah.assignments.every(a => a.missing.length === 2)).toBe(true)
  })

  it('rumah negara berjalan pada workflow bertahap tiga tahap', () => {
    expect(taskPemanfaatanRumahNegara.workflow).toBe('staged-destruction')
    const stages = taskPemanfaatanRumahNegara.stages!
    expect(stages.map(s => s.id)).toEqual(['spreadsheet', 'sip', 'siman'])
    expect(stages[0].label).toContain('Spreadsheet')
    expect(stages[1].label).toContain('Surat Izin Penghunian')
    expect(stages[2].label).toContain('Detail Rumah Negara')
  })

  it('Tahap I hanya mewajibkan satu butir, yaitu data spreadsheet', () => {
    expect(taskPemanfaatanRumahNegara.stages?.[0].requirements).toEqual([
      'Data rumah negara Satker telah diisi lengkap pada spreadsheet',
    ])
  })

  it('hanya Tahap II yang mewajibkan satu dokumen, yaitu SIP', () => {
    const stages = taskPemanfaatanRumahNegara.stages!
    expect(stages[1].requirements).toEqual(['Surat Izin Penghunian (SIP) rumah negara'])
  })

  it('Tahap III hanya konfirmasi, tanpa dokumen yang harus diunggah', () => {
    const tahapIII = taskPemanfaatanRumahNegara.stages![2]
    expect(tahapIII.confirmOnly).toBe(true)
    expect(tahapIII.requirements).toEqual([])
    expect(tahapIII.link).toBeUndefined()
    expect(tahapIII.confirmLabel).toBe('Saya sudah update detail dan upload SIP pada web SIMAN')
  })

  it('Tahap I dan II tetap berupa tahap unggah dokumen', () => {
    const [tahapI, tahapII] = taskPemanfaatanRumahNegara.stages!
    expect(tahapI.confirmOnly).toBeUndefined()
    expect(tahapII.confirmOnly).toBeUndefined()
    expect(tahapI.requirements.length).toBeGreaterThan(0)
    expect(tahapII.requirements.length).toBeGreaterThan(0)
  })

  it('Tahap I menunjuk ke spreadsheet rumah negara', () => {
    expect(taskPemanfaatanRumahNegara.stages?.[0].link).toBe(
      'https://docs.google.com/spreadsheets/d/1N1S0kwQwXxRf4qRoZoSeEVwww9C0KGt2/edit?usp=sharing&ouid=114001219248527397686&rtpof=true&sd=true',
    )
  })

  it('pekerjaan rumah negara memakai folder Drive baru', () => {
    expect(taskPemanfaatanRumahNegara.uploadLink).toBe('https://drive.google.com/drive/folders/1D6BvJs7LKQwrwfpRsY8Dfz3iFlGRfCHu?usp=drive_link')
    expect(taskPemanfaatanRumahNegara.link).toContain('docs.google.com/spreadsheets')
  })

  it('penugasan rumah negara memakai kode Satker yang dikenal dan unik', () => {
    const codes = codesOf(taskPemanfaatanRumahNegara)
    expect(codes.every(code => knownCodes.has(code))).toBe(true)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it('setiap pekerjaan punya link folder Drive untuk unggah data dukung', () => {
    expect(taskSertifikasiTanah.uploadLink).toBe('https://drive.google.com/drive/folders/1sCyKsMT_H8Db0KpeB-gO5GxNJvupXq1C?usp=drive_link')
  })

  it('Kanwil tidak ditugaskan sebagai Satker pada pekerjaan tanah', () => {
    expect(codesOf(taskSertifikasiTanah)).not.toContain('692507')
  })
})
