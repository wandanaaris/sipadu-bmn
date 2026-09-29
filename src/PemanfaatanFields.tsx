import { useMemo } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { belumPspSatker } from './pspData'
import { asetSatker, kategoriLabel, type KategoriRusak } from './rusakBeratData'
import type { WorkflowStage } from './data'

// Data isian tahap disimpan satu paket per pekerjaan dan Satker, sehingga
// isian Tahap II (nilai sewa) tetap menempel pada baris item dari Tahap I.
export type ItemSewa = { nama: string; luas: string; nilai: string }

// Isian dikunci per kunci field agarapa pun (StageField.key) dapat ditambahkan
// tanpa mengubah struktur tipe.
export type IsianTahap = { items: ItemSewa[]; [key: string]: string | ItemSewa[] }

const defaultIsian: IsianTahap = { items: [] }

const teks = (isian: IsianTahap, key: string): string => (isian[key] as string) ?? ''

export const formatRupiah = (raw: string): string => {
  const n = Number(raw.replace(/\D/g, ''))
  return raw ? n.toLocaleString('id-ID') : ''
}

export function readIsian(taskId: string, satker: string): IsianTahap {
  try {
    const raw = JSON.parse(localStorage.getItem(isianKey(taskId, satker)) ?? 'null')
  if (raw && Array.isArray(raw.items)) return { ...defaultIsian, ...raw }
  } catch { /* abaikan */ }
  return defaultIsian
}

export function writeIsian(taskId: string, satker: string, value: IsianTahap): void {
  try {
    localStorage.setItem(isianKey(taskId, satker), JSON.stringify(value))
  } catch { /* abaikan */ }
}

const isianKey = (taskId: string, satker: string) => `sipadu_pemanfaatan_isian_${taskId}_${satker}`

const rupiah = (value: number) =>
  'Rp ' + value.toLocaleString('id-ID', { maximumFractionDigits: 0 })

const toNumber = (raw: string) => {
  const cleaned = raw.replace(/[^\d]/g, '')
  return cleaned ? Number(cleaned) : 0
}

export function StageFieldsForm({
  stage,
  taskId,
  satker,
  isian,
  onChange,
}: {
  stage: WorkflowStage
  taskId: string
  satker: string
  isian: IsianTahap
  onChange: (next: IsianTahap) => void
}) {
  if (!stage.fields?.length) return null

  const update = (patch: Record<string, unknown>) => {
    const next = { ...isian, ...patch } as IsianTahap
    writeIsian(taskId, satker, next)
    onChange(next)
  }

  const updateItem = (index: number, patch: Partial<ItemSewa>) => {
    const items = isian.items.map((item, i) => (i === index ? { ...item, ...patch } : item))
    update({ items })
  }

  const addItem = () => update({ items: [...isian.items, { nama: '', luas: '', nilai: '' }] })
  const removeItem = (index: number) => update({ items: isian.items.filter((_, i) => i !== index) })

  return (
    <div className="stage-fields">
      {stage.fields.filter(f => f.type !== 'item-luas-table' && f.type !== 'item-nilai-table').map(field => (
        <label key={field.key} className="stage-field">
          <span>{field.label}</span>
          {field.type === 'pilihan' ? (
            <select
              value={teks(isian, field.key)}
              onChange={e => update({ [field.key]: e.target.value })}
            >
              <option value="">-- Pilih --</option>
              {field.choices?.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          ) : field.type === 'date' ? (
            <input
              type="date"
              value={teks(isian, field.key)}
              onChange={e => update({ [field.key]: e.target.value })}
            />
          ) : field.type === 'number' ? (
            <input
              type="text"
              inputMode="numeric"
              value={formatRupiah(teks(isian, field.key))}
              onChange={e => update({ [field.key]: e.target.value.replace(/\D/g, '') })}
              placeholder="0"
            />
          ) : (
            <input
              type="text"
              value={teks(isian, field.key)}
              onChange={e => update({ [field.key]: e.target.value })}
              placeholder="Isi sesuai data"
            />
          )}
        </label>
      ))}

      {stage.fields.filter(f => f.type === 'item-luas-table' || f.type === 'item-nilai-table').map(field => (
        <ItemSewaTable
          key={field.key}
          withNilai={field.type === 'item-nilai-table'}
          items={isian.items}
          onChange={updateItem}
          onAdd={addItem}
          onRemove={removeItem}
        />
      ))}
    </div>
  )
}

function ItemSewaTable({
  items,
  withNilai,
  onChange,
  onAdd,
  onRemove,
}: {
  items: ItemSewa[]
  withNilai: boolean
  onChange: (index: number, patch: Partial<ItemSewa>) => void
  onAdd: () => void
  onRemove: (index: number) => void
}) {
  const { totalLuas, totalNilai } = useMemo(
    () => ({
      totalLuas: items.reduce((n, item) => n + toNumber(item.luas), 0),
      totalNilai: items.reduce((n, item) => n + toNumber(item.nilai), 0),
    }),
    [items],
  )

  return (
    <div className="item-table">
      <table>
        <thead>
          <tr>
            <th>Nama item yang disewakan</th>
            <th className="num">Luas (m2)</th>
            {withNilai && <th className="num">Nilai persetujuan sewa (Rp)</th>}
            <th className="act" aria-label="Aksi" />
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={withNilai ? 4 : 3} className="empty-row">Belum ada item. Tekan Tambah item.</td>
            </tr>
          )}
          {items.map((item, index) => (
            <tr key={index}>
              <td>
                <input
                  type="text"
                  value={item.nama}
                  onChange={e => onChange(index, { nama: e.target.value })}
                  placeholder="Contoh: Kios Cafe"
                />
              </td>
              <td className="num">
                <input
                  type="text"
                  inputMode="numeric"
                  value={item.luas}
                  onChange={e => onChange(index, { luas: e.target.value.replace(/[^\d]/g, '') })}
                  placeholder="0"
                />
              </td>
              {withNilai && (
                <td className="num">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={item.nilai}
                    onChange={e => onChange(index, { nilai: e.target.value.replace(/[^\d]/g, '') })}
                    placeholder="0"
                  />
                </td>
              )}
              <td className="act">
                <button type="button" className="icon-button" onClick={() => onRemove(index)} aria-label="Hapus item">
                  <Trash2 size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        {items.length > 0 && (
          <tfoot>
            <tr>
              <th>Total</th>
              <th className="num">{totalLuas.toLocaleString('id-ID')}</th>
              {withNilai && <th className="num">{withNilai ? rupiah(totalNilai) : ''}</th>}
              <th className="act" />
            </tr>
          </tfoot>
        )}
      </table>
      <button type="button" className="ghost add-item" onClick={onAdd}>
        <Plus size={15} /> Tambah item
      </button>
    </div>
  )
}

// Memeriksa apakah isian wajib pada suatu tahap sudah terisi.
// Dipakai sebelum Satker mengajukan tahap untuk verifikasi.
export function isianLengkap(stage: WorkflowStage, taskId: string, satker: string): boolean {
  const isian = readIsian(taskId, satker)
  const fields = stage.fields ?? []
  for (const field of fields) {
    if (field.type === 'text' || field.type === 'number' || field.type === 'date' || field.type === 'pilihan') {
      if (!teks(isian, field.key).trim()) return false
    }
    if (field.type === 'item-luas-table') {
      if (isian.items.length === 0) return false
      if (isian.items.some(i => !i.nama.trim() || !i.luas.trim())) return false
    }
    if (field.type === 'item-nilai-table') {
      if (isian.items.length === 0) return false
      if (isian.items.some(i => !i.nilai.trim())) return false
    }
  }
  return true
}

// Menampilkan jumlah aset Satker yang belum memiliki PSP sebagai data acuan.
export function PspInfoPanel({ kodeSatker }: { kodeSatker: string }) {
  const belum = belumPspSatker(kodeSatker)
  if (!belum) return null
  return (
    <div className="psp-info">
      <div className="psp-info-angka">
        <strong>{belum.toLocaleString('id-ID')}</strong>
        <span>aset belum PSP</span>
      </div>
      <p>
        Jumlah ini berasal dari Master Aset SIMAN dan tidak perlu diisi ulang. Setelah membuat
        tiket penetapan status penggunaan di SIMAN, catat nomor tiketnya di bawah.
      </p>
    </div>
  )
}

// Menampilkan jumlah aset rusak berat Satker pada kategori tertentu sebagai
// data acuan di Tahap I, supaya operator tahu berapa aset yang harus diajukan.
export function AsetRusakPanel({ kodeSatker, kategori }: { kodeSatker: string; kategori: KategoriRusak }) {
  const aset = asetSatker(kodeSatker, kategori)
  if (!aset.jumlah) return null
  return (
    <div className="psp-info">
      <div className="psp-info-angka">
        <strong>{aset.jumlah.toLocaleString('id-ID')}</strong>
        <span>aset rusak berat</span>
      </div>
      <p>
        <strong>{kategoriLabel[kategori]}</strong> — total nilai perolehan{' '}
        <strong>{formatRupiah(String(aset.nilai))}</strong> rupiah. Jumlah ini berasal dari
        Master Aset SIMAN dan tidak perlu diisi ulang; catat nomor tiket pada tahap ini.
      </p>
    </div>
  )
}
