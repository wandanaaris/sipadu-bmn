import type { LelangSqliteStore } from './lelangSqlite.js'

const API_PREFIX = '/api/local/lelang'
const localHosts = new Set(['localhost', '127.0.0.1', '::1'])

const json = (value: unknown, status = 200) => Response.json(value, { status })

export async function handleLelangRequest(request: Request, store: LelangSqliteStore): Promise<Response> {
  const url = new URL(request.url)
  if (!url.pathname.startsWith(API_PREFIX)) {
    return new Response('Not Found', { status: 404 })
  }
  if (!localHosts.has(url.hostname)) {
    return json({ error: 'Local lelang API hanya tersedia melalui localhost.' }, 403)
  }

  const suffix = url.pathname.slice(API_PREFIX.length)
  if (suffix === '' || suffix === '/') {
    if (request.method === 'GET') {
      const q = url.searchParams.get('q') ?? ''
      const filter: { merek?: string; kategori?: string; kode?: string; kpknl?: string } = {}
      if (q) {
        filter.merek = q
        filter.kategori = q
        filter.kode = q
      }
      const kpknl = url.searchParams.get('kpknl')
      if (kpknl) filter.kpknl = kpknl
      const rows = store.search(filter)
      return json({ count: rows.length, sumber: store.sumberKategori(), rows })
    }
    return json({ error: 'Method not allowed' }, 405)
  }

  // Query param filter: ?q=merek|kategori|kode
  const match = suffix.match(/^\/(\d+)$/)
  if (match) {
    return json({ error: 'Data lelang tidak diakses per-ID di endpoint ini.' }, 405)
  }

  return json({ error: 'Endpoint tidak ditemukan.' }, 404)
}
