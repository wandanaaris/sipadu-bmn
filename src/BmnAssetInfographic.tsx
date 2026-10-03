import { useEffect, useState } from 'react'
import { Boxes, Landmark, Wallet, TrendingUp, CircleAlert } from 'lucide-react'
import { loadBmnOverview, loadBmnSatkerDetail, type BmnOverview } from './lib/bmnAssets'

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n)

const angka = (n: number) => new Intl.NumberFormat('id-ID').format(n)


const RINGKAS = [
  { key: 'totalAset', label: 'Jumlah Aset', icon: Boxes, tone: 'blue' },
  { key: 'nilai', label: 'Nilai Perolehan', icon: Wallet, tone: 'green' },
  { key: 'jenis', label: 'Jenis BMN', icon: TrendingUp, tone: 'amber' },
  { key: 'satker', label: 'Satker Pelapor', icon: Landmark, tone: 'slate' },
] as const

export function BmnAssetInfographic({ satkerCode }: { satkerCode?: string }) {
  const [data, setData] = useState<BmnOverview | null>(null)
  const [rincian, setRincian] = useState<Array<{ jenis: string; jumlah: number }>>([])
  const [state, setState] = useState<'memuat' | 'siap' | 'kosong' | 'gagal'>('memuat')
  const [pesan, setPesan] = useState('')

  useEffect(() => {
    let aktif = true
    loadBmnOverview()
      .then((hasil) => {
        if (!aktif) return
        if (!hasil) {
          setState('kosong')
          return
        }
        setData(hasil)
        setState('siap')
        // Rincian per satker diambil terpisah supaya grafik tidak ikut
        // ikut terpotong saat satker berganti.
        if (satkerCode) {
          loadBmnSatkerDetail(satkerCode)
            .then((detail) => {
              if (!aktif || !detail) return
              setRincian(detail.baris.map((b) => ({ jenis: b.jenis_bmn, jumlah: b.jumlah })))
            })
            .catch(() => {
              /* ringkasan tetap tampil tanpa rincian */
            })
        } else {
          setRincian([])
        }
      })
      .catch((error: unknown) => {
        if (!aktif) return
        setPesan(error instanceof Error ? error.message : 'Data belum dapat dimuat.')
        setState('gagal')
      })
    return () => {
      aktif = false
    }
  }, [satkerCode])

  if (state === 'memuat') {
    return (
      <section className="bmn-infograf bmn-infograf--kosong">
        <div className="auth-spinner" />
        <p>Memuat data Master Aset…</p>
      </section>
    )
  }

  if (state === 'kosong' || state === 'gagal') {
    return (
      <section className="bmn-infograf bmn-infograf--kosong">
        <CircleAlert size={20} />
        <div>
          <strong>Data Master Aset belum tersedia</strong>
          <p>{pesan || 'Jalankan: npm run import:bmn -- "path/Master aset.xlsx"'}</p>
        </div>
      </section>
    )
  }

  const satkerDipilih = satkerCode
    ? data!.perSatker.find((s) => (s.kode ?? s.code) === satkerCode)
    : undefined
  const perSatker = Boolean(satkerDipilih)

  // Grafik jenis memakai rincian satker bila ada; kalau tidak, pakai
  // agregat seluruh Riau.
  const jenisTerpakai = perSatker
    ? rincian
    : data!.perJenis.map((j) => ({ jenis: j.jenis, jumlah: j.jumlah }))

  const totalJumlah = satkerDipilih ? satkerDipilih.jumlah : data!.totalAset
  const totalNilai = satkerDipilih ? satkerDipilih.nilai : data!.totalNilai
  const jumlahJenis = perSatker ? jenisTerpakai.length : data!.perJenis.length
  const jumlahSatker = data!.perSatker.length
  const maksimum = Math.max(...jenisTerpakai.map((j) => j.jumlah), 1)

  return (
    <section className="bmn-infograf" aria-label="Rekapitulasi Barang Milik Negara">
      <header className="bmn-infograf__head">
        <div>
          <p className="eyebrow">MASTER ASET SIMAN</p>
          <h2>
            {perSatker && satkerDipilih
              ? `Rekap Aset ${satkerDipilih.nama ?? satkerDipilih.name}`
              : 'Rekapitulasi BMN Ditjenpas Riau'}
          </h2>
        </div>
        <div className="bmn-infograf__stamp">
          <Landmark size={18} />
          <span>Kanwil Ditjenpas Riau</span>
        </div>
      </header>

      <div className="bmn-infograf__ringkas">
        {RINGKAS.map((item) => {
          const Icon = item.icon
          const nilai = item.key === 'totalAset' ? angka(totalJumlah)
            : item.key === 'nilai' ? rupiah(Math.round(totalNilai))
            : item.key === 'jenis' ? angka(jumlahJenis)
            : angka(jumlahSatker)
          return (
            <div className={`bmn-kartu bmn-kartu--${item.tone}`} key={item.key}>
              <span className="bmn-kartu__icon" aria-hidden="true">
                <Icon size={18} />
              </span>
              <span className="bmn-kartu__label">{item.label}</span>
              <strong className="bmn-kartu__nilai">{nilai}</strong>
            </div>
          )
        })}
      </div>

      <div className="bmn-infograf__bagan">
        <h3>Jumlah aset menurut jenis BMN</h3>
        <ul className="bmn-batang">
          {jenisTerpakai.map((baris) => (
            <li key={baris.jenis}>
              <span className="bmn-batang__nama" title={baris.jenis}>
                {baris.jenis}
              </span>
              <span className="bmn-batang__rel">
                <i style={{ width: `${Math.max((baris.jumlah / maksimum) * 100, 1.5)}%` }} />
              </span>
              <span className="bmn-batang__nilai">{angka(baris.jumlah)}</span>
            </li>
          ))}
        </ul>
      </div>

      {!perSatker ? (
        <div className="bmn-infograf__bagan">
          <h3>Jumlah aset menurut satker</h3>
          <ul className="bmn-batang bmn-batang--ranking">
            {data!.perSatker.slice(0, 10).map((baris, index) => (
              <li key={baris.code}>
                <span className="bmn-batang__peringkat">{index + 1}</span>
                <span className="bmn-batang__nama" title={baris.name}>
                  {baris.name}
                </span>
                <span className="bmn-batang__rel">
                  <i style={{ width: `${Math.max((baris.jumlah / (data!.perSatker[0]?.jumlah || 1)) * 100, 1.5)}%` }} />
                </span>
                <span className="bmn-batang__nilai">{angka(baris.jumlah)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

    </section>
  )
}
