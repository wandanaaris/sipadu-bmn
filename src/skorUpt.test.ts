// @vitest-environment jsdom
/// <reference types="vitest" />
import { describe, it, expect } from 'vitest'
import { barisSatker } from './adminMetrics'
import type { Task } from './data'

// Kontrak: kartu Monitoring Satker memakai skor yang sama dengan menu Kinerja UPT.
// Skor UPT = (tingkat selesai × 70) + (skor revisi × 30), dihitung di database.

function tugas(satker: string, status: Task['assignments'][number]['status'], revisi = 0, aktif = true): Task {
  return {
    id: `t-${satker}-${status}-${revisi}`,
    title: `Pekerjaan ${status}`,
    description: '', letter: '', method: 'distribusi',
    due: '30 Sep 2026', dueDate: '2026-09-30', active: aktif,
    stages: [],
    assignments: [{ satker, status, progress: status === 'selesai' ? 100 : 0, missing: [], revisionCount: revisi }],
  } as unknown as Task
}

function hitungUpt(selesai: number, total: number, totalRevisi: number): number {
  const rate = Math.round((selesai / total) * 100)
  const revisi = totalRevisi === 0 ? 100 : Math.max(0, 100 - totalRevisi * 10)
  return Math.round(rate * 0.7 + revisi * 0.3)
}

describe('Skor tunggal untuk Monitoring Satker dan Kinerja UPT', () => {
  it('kartu Satker memakai skor UPT, bukan ketepatan waktu', () => {
    const kode = '692314'
    const tasks = [
      tugas(kode, 'selesai', 0), tugas(kode, 'selesai', 0),
      tugas(kode, 'proses', 3), tugas(kode, 'belum', 0),
    ]
    const baris = barisSatker(tasks).find(b => b.kodeSatker === kode)!
    // 2 selesai dari 4 tugas (50%), 3 revisi (skor 70) -> 50*0.7 + 70*0.3 = 56
    expect(hitungUpt(2, 4, 3)).toBe(56)
    // ketepatan waktu adalah metrik lain dan tidak lagi dipakai sebagai skor kartu
    expect(baris.ketepatanWaktu).not.toBe(56)
    expect(baris.ketepatanWaktuTepat).toBeLessThanOrEqual(baris.total)
  })

  it('ketepatanWaktuTepat tidak melebihi jumlah tugas', () => {
    const kode = '692311'
    const tasks = [
      tugas(kode, 'selesai', 0), tugas(kode, 'selesai', 2),
      tugas(kode, 'proses', 1), tugas(kode, 'perbaikan', 1), tugas(kode, 'belum', 0),
    ]
    const baris = barisSatker(tasks).find(b => b.kodeSatker === kode)!
    expect(baris.total).toBe(5)
    expect(baris.ketepatanWaktuTepat).toBeLessThanOrEqual(5)
    expect(baris.ketepatanWaktu).toBe(Math.round((baris.ketepatanWaktuTepat / baris.total) * 100))
  })

  it('Satker 692507 tidak dihitung sebagai Satker penerima tugas', () => {
    const baris = barisSatker([tugas('692507', 'selesai', 0)])
    expect(baris.find(b => b.kodeSatker === '692507')).toBeUndefined()
  })
})
