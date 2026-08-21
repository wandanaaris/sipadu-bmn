import { createClient } from '@supabase/supabase-js'
import Papa from 'papaparse'

type Row = string[]
type Status = 'belum' | 'proses' | 'persetujuan' | 'selesai'
type Update = { taskKey:string; satker:string; progress:number; status:Status; missing:string[]; snapshot:Record<string,unknown> }

const sheets = {
  plang: { id:'1_UoTVM5_CAA1-T-1sxIz67mZwTeFbxueAhNS0XFAPXU', names:['Sheet1'] },
  xray: { id:'1t3IIrahsooPjPGIb2IfCNDI1gm53XtYtY19oQm3_Ryk', names:['Rekap Xray Barang','Rekap Xray Portabel','Rekap X-Ray Body Scanner'] },
  master: { id:'14O64ETAtsMr_qfCdui_aP0Rr_e0gvzYL', names:['DATA RINCI'] },
  rkbmn: { id:'1Sp3hw2sRK8l_W7DUL3csaZpUjHxddeu25RGM3kEitu0', names:['Sheet1'] },
  persediaan: { id:'1OeAZacp7wmOiKPsBiz2jFt1peHto-VHbIJ3podn9yXQ', names:['Usang','Rusak'] },
}

const satkerNames:Record<string,string> = {
  bapaskelasiipekanbaru:'692307', lapaskelasiiapekanbaru:'692308', lapaskelasiiabengkalis:'692309',
  rutankelasiibsiaksriindrapura:'692310', lapaskelasiiabagansiapiapi:'692311', rutankelasiibrengat:'692312',
  lapaskelasiiatembilahan:'692313', lapaskelasiibtelukkuantan:'692314', lapaskelasiibselatpanjang:'692315',
  lapaskelasiiabangkinang:'692316', lapaskelasiibpasirpangarayan:'692317', rutankelasiibdumai:'692484',
  lpkakelasiipekanbaru:'692519', lapasperempuankelasiiapekanbaru:'692537', lapasnarkotikakelasiibrumbai:'692639',
  rupbasankelasiibengkalis:'692675', rutankelasiipekanbaru:'692781', lapasterbukakelasiiirumbai:'692794', bapaskelasiidumai:'694759',
}

function norm(value:unknown){return String(value??'').toLowerCase().replace(/lembaga pemasyarakatan/g,'lapas').replace(/rumah tahanan negara/g,'rutan').replace(/balai pemasyarakatan/g,'bapas').replace(/lembaga pembinaan khusus anak/g,'lpka').replace(/[^a-z0-9]/g,'')}
function code(value:unknown){const match=String(value??'').match(/(69\d{4})/);return match?.[1]??null}
function valid(value:unknown){return !['','-','0','0.0','belum diisi','belum ada','tidak ada inputan','belum mengusulkan','nihil'].includes(String(value??'').trim().toLowerCase())}
function result(taskKey:string,satker:string,required:number,completed:number,missing:string[],snapshot:Record<string,unknown>={}):Update{
  const progress=required?Math.round(completed/required*100):100
  return {taskKey,satker,progress,status:progress===100?'selesai':progress===0?'belum':'proses',missing,snapshot}
}
async function csv(id:string,sheet:string):Promise<Row[]>{
  const url=`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`
  const response=await fetch(url,{headers:{'user-agent':'SIPADU-BMN-Sync/1.0'}})
  if(!response.ok) throw new Error(`${sheet}: HTTP ${response.status}`)
  const parsed=Papa.parse<Row>(await response.text(),{skipEmptyLines:false})
  if(parsed.errors.length) throw new Error(`${sheet}: ${parsed.errors[0].message}`)
  return parsed.data
}
function findHeader(rows:Row[],needle:string){const i=rows.findIndex(row=>row.some(cell=>String(cell).trim()===needle));if(i<0)throw new Error(`Header ${needle} tidak ditemukan`);return i}

async function parsePlang():Promise<Update[]>{
  const rows=await csv(sheets.plang.id,'Sheet1');const start=findHeader(rows,'Satuan Kerja')+1;const out:Update[]=[]
  for(const row of rows.slice(start)){const satker=code(row[1]);if(!satker)continue;const names=['Laporan Pengamanan Aset','Capture Bukti Mengisi Google Form'];const values=[row[3],row[4]];const missing=names.filter((_,i)=>!valid(values[i]));out.push(result('plang-rumah',satker,2,2-missing.length,missing,{note:row[5]??''}))}return out
}
async function parseXray():Promise<Update[]>{
  const aggregate=new Map<string,{required:number;completed:number;missing:string[];sheets:string[]}>()
  for(const sheet of sheets.xray.names){const rows=await csv(sheets.xray.id,sheet);const start=findHeader(rows,'Satker')+1
    for(const row of rows.slice(start)){const satker=satkerNames[norm(row[1])];if(!satker)continue;const names=['Merk','Tipe','Nomor Serial Rangka','Nomor Serial Tabung X-Ray','Foto X-Ray'];const values=row.slice(2,7);const missing=names.filter((_,i)=>!valid(values[i])).map(x=>`${sheet}: ${x}`);const a=aggregate.get(satker)??{required:0,completed:0,missing:[],sheets:[]};a.required+=5;a.completed+=5-missing.length;a.missing.push(...missing);a.sheets.push(sheet);aggregate.set(satker,a)}
  }return [...aggregate].map(([satker,a])=>result('xray',satker,a.required,a.completed,a.missing,{sheets:a.sheets}))
}
async function parseMaster():Promise<Update[]>{
  const rows=await csv(sheets.master.id,'DATA RINCI');const h=findHeader(rows,'Kode Satker');const headers=rows[h].map(x=>String(x).trim());const index=(name:string)=>headers.indexOf(name);const attrs=['Kode RT/RW','Kelurahan/Desa','Kab/Kota','Provinsi','Kode Pos','Latitude','Longitude','Foto'];const agg=new Map<string,{required:number;completed:number;counts:Record<string,number>;nup:number}>()
  for(const row of rows.slice(h+1)){const kind=String(row[index('Jenis BMN')]??'').toUpperCase();if(!['TANAH','BANGUNAN DAN GEDUNG','RUMAH NEGARA'].includes(kind))continue;const satker=code(row[index('Kode Satker')]);if(!satker)continue;const a=agg.get(satker)??{required:0,completed:0,counts:{},nup:0};a.required+=8;a.nup++;for(const attr of attrs){if(valid(row[index(attr)]))a.completed++;else a.counts[attr]=(a.counts[attr]??0)+1}agg.set(satker,a)}
  return [...agg].map(([satker,a])=>result('master-aset',satker,a.required,a.completed,Object.entries(a.counts).map(([name,count])=>`${count} aset belum lengkap: ${name}`),{nup:a.nup}))
}
async function parseRkbmn():Promise<Update[]>{
  const rows=await csv(sheets.rkbmn.id,'Sheet1');const start=findHeader(rows,'Satuan Kerja')+1;const out:Update[]=[];for(const row of rows.slice(start)){const satker=code(row[1]);if(!satker)continue;const fields:[string,string][]=[['Surat Usulan RKBMN Non-SIMAN',row[3]],['Matriks Usulan Pengadaan',row[4]],['Surat Pernyataan',row[5]],['Profil Satker',row[6]],['Usulan RKBMN SIMAN',row[8]]];const missing=fields.filter(([,v])=>!valid(v)).map(([n])=>n);out.push(result('rkbmn',satker,5,5-missing.length,missing,{siman:row[8]??''}))}return out
}
async function parseUsang():Promise<Update[]>{
  const rows=await csv(sheets.persediaan.id,'Usang');const start=findHeader(rows,'Satuan Kerja')+1;const names=['Surat Permohonan Satker','SK Tim Pemusnahan','SPTJM','Surat Pernyataan Tidak Mengganggu Tusi','Berita Acara Penelitian Persediaan','Cetakan Daftar Persediaan Usang/Rusak','Dokumentasi BMN Terkini','Telaah Staf'];const out:Update[]=[]
  for(const row of rows.slice(start)){const satker=code(row[1]);if(!satker)continue;const values=row.slice(3,11);const missing=names.filter((_,i)=>!valid(values[i]));const item=result('persediaan-usang',satker,8,8-missing.length,missing,{totalValue:row[11]??null,letter:row[13]??null,note:row[12]??''});if(item.progress===100)item.status='persetujuan';out.push(item)}return out
}
async function parsePersediaan():Promise<Update[]>{
  const rows=await csv(sheets.persediaan.id,'Rusak');const start=findHeader(rows,'Satuan Kerja')+1;const names=['Surat Permohonan dan Daftar BMN','SK Tim Penjualan BMN','SPTJM','Berita Acara Penelitian','Surat Pernyataan Tidak Mengganggu Tusi','Surat Pernyataan Nilai Limit','Telaahan Staf','Cetakan Laporan Persediaan','Cetakan Persediaan Rusak','Dokumentasi Foto Persediaan Rusak'];const out:Update[]=[];for(const row of rows.slice(start)){const satker=code(row[1]);if(!satker)continue;const values=row.slice(3,13);const missing=names.filter((_,i)=>!valid(values[i]));out.push(result('persediaan-rusak',satker,10,10-missing.length,missing,{totalValue:row[13]??null}))}return out
}

export default async function handler(req:any,res:any){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'})
  const secret=process.env.SYNC_SECRET;if(!secret||req.headers.authorization!==`Bearer ${secret}`)return res.status(401).json({error:'Unauthorized'})
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)return res.status(500).json({error:'Supabase server variables belum dikonfigurasi'})
  try{
    const updates=(await Promise.all([parsePlang(),parseXray(),parseMaster(),parseRkbmn(),parseUsang(),parsePersediaan()])).flat();const db=createClient(url,key,{auth:{persistSession:false}})
    const [{data:taskRows,error:taskError},{data:satkerRows,error:satkerError}]=await Promise.all([db.from('tasks').select('id,task_key'),db.from('satkers').select('id,code')]);if(taskError||satkerError)throw taskError??satkerError
    const taskIds=Object.fromEntries((taskRows??[]).map(x=>[x.task_key,x.id]));const satkerIds=Object.fromEntries((satkerRows??[]).map(x=>[x.code,x.id]));const now=new Date().toISOString()
    const payload=updates.filter(x=>taskIds[x.taskKey]&&satkerIds[x.satker]).map(x=>({task_id:taskIds[x.taskKey],satker_id:satkerIds[x.satker],progress:x.progress,status:x.status,missing:x.missing,source_snapshot:x.snapshot,last_synced_at:now,updated_at:now}))
    const {error}=await db.from('task_assignments').upsert(payload,{onConflict:'task_id,satker_id'});if(error)throw error
    return res.status(200).json({status:'success',syncedAt:now,assignments:payload.length,tasks:[...new Set(updates.map(x=>x.taskKey))]})
  }catch(error){console.error(error);return res.status(500).json({error:error instanceof Error?error.message:'Unknown sync error'})}
}
