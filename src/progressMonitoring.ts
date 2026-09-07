export type DisposalRoute = 'lelang' | 'senpi' | 'amunisi'
export type MonitoringPhase = { key:string; label:string }

export const phases:Record<DisposalRoute,MonitoringPhase[]> = {
  lelang:[
    {key:'tiket-siman',label:'Tiket SIMAN dibuat'},
    {key:'persetujuan',label:'Persetujuan diterima'},
    {key:'pengajuan-lelang',label:'Pengajuan lelang'},
    {key:'hasil-lelang',label:'Hasil lelang'},
    {key:'risalah-lelang',label:'Risalah lelang diterima'},
    {key:'bast',label:'BAST dibuat'},
    {key:'sk-penghapusan',label:'SK Penghapusan dibuat'},
    {key:'rekam-sakti',label:'Transaksi penghapusan direkam di SAKTI'},
  ],
  senpi:[
    {key:'tiket-siman-tahap-1',label:'Tiket SIMAN Tahap I dibuat'},
    {key:'persetujuan-kpknl',label:'Persetujuan KPKNL diterima'},
    {key:'tiket-tindak-lanjut',label:'Tiket tindak lanjut dibuat'},
    {key:'rekomendasi-polda',label:'Rekomendasi Polda diterima'},
    {key:'izin-kapolri',label:'Izin Kapolri diterima'},
    {key:'pemusnahan-fisik',label:'Pemusnahan fisik dilaksanakan'},
    {key:'ba-pemusnahan',label:'BA Pemusnahan diterima'},
    {key:'verifikasi-kpknl',label:'BA diverifikasi KPKNL'},
    {key:'sk-penghapusan',label:'SK Penghapusan dibuat'},
    {key:'rekam-sakti',label:'Transaksi penghapusan direkam di SAKTI'},
  ],
  amunisi:[
    {key:'dokumen-awal',label:'Dokumen awal disiapkan'},
    {key:'permintaan-kepolisian',label:'Permintaan/rekomendasi kepolisian'},
    {key:'izin-pemusnahan',label:'Izin pemusnahan diterima'},
    {key:'pemusnahan-fisik',label:'Pemusnahan fisik dilaksanakan'},
    {key:'ba-pemusnahan',label:'BA Pemusnahan diterima'},
    {key:'sk-penghapusan',label:'SK Penghapusan dibuat'},
    {key:'rekam-sakti',label:'Transaksi penghapusan direkam di SAKTI'},
  ],
}

export const routeLabels:Record<DisposalRoute,string>={lelang:'Lelang BMN umum',senpi:'Pemusnahan senjata api',amunisi:'Pemusnahan amunisi (manual)'}
export const phaseProgress=(route:DisposalRoute,phaseIndex:number)=>phaseIndex<0?0:Math.min(100,Math.round(((phaseIndex+1)/phases[route].length)*100))
export const localProgressKey=(taskId:string,satkerCode:string)=>`sipadu-monitoring-progress-v1:${taskId}:${satkerCode}`
export type LocalProgress={route:DisposalRoute;phaseIndex:number;currentPhase:string;documentNumber:string;documentDate:string;note:string;submittedAt:string;verification:'menunggu_verifikasi'}
