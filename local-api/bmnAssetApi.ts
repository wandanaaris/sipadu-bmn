import type { BmnAssetStore } from './bmnAssets.js'

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })

/** Ringkasan BMN untuk infograf: /api/local/bmn-assets */
export async function handleBmnAssetRequest(
  request: Request,
  store: BmnAssetStore,
): Promise<Response | null> {
  const url = new URL(request.url)
  if (!url.pathname.startsWith('/api/local/bmn-assets')) return null

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return json({ error: 'Endpoint hanya menerima GET.' }, 405)
  }

  // /api/local/bmn-assets/snapshots
  if (url.pathname.endsWith('/snapshots')) {
    return json({ snapshots: store.listSnapshots() })
  }

  // /api/local/bmn-assets/satker/<kode>
  const satker = url.pathname.match(/\/satker\/([^/]+)$/)
  if (satker) {
    const kode = decodeURIComponent(satker[1])
    const baris = store.satkerDetail(kode, url.searchParams.get('snapshot') ?? undefined)
    if (baris.length === 0) return json({ error: 'Data aset satker belum tersedia.' }, 404)
    return json({ snapshotDate: store.latestSnapshot(), satkerCode: kode, baris })
  }

  // /api/local/bmn-assets
  const ringkasan = store.overview(url.searchParams.get('snapshot') ?? undefined)
  if (!ringkasan) {
    return json(
      {
        error:
          'Data Master Aset belum diimpor. Jalankan: npm run import:bmn -- "path/Master aset.xlsx"',
      },
      404,
    )
  }
  return json(ringkasan)
}
