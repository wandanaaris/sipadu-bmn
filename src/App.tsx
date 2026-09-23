import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Activity, Archive, ArrowLeft, BarChart3, Building2, CalendarDays, Check, CircleAlert, ClipboardCheck, Clock3, Database, ExternalLink, Eye, EyeOff, FileInput, FileSpreadsheet, FileText, Filter, KeyRound, LayoutDashboard, LockKeyhole, LogOut, Mail, Menu, Search, Settings, ShieldCheck, Upload, Users, X } from 'lucide-react'
import { telaahRkbmn, satkers, statusLabel, type Task, type TaskMethod, type TaskStatus } from './data'
import { finalTasks } from './finalTasks'
import { countPendingVerifications, createOpenSubmission, createTask, documentPreviewUrl, loadSatkerContacts, loadSubmissions, loadTasks, persistAssignmentStatus, persistTaskActive, reviewStagedStage, reviewSubmission, saveSatkerContact, submitLinkSubmission, submitStagedStage, transferSubmission, type SatkerContact, type SubmissionRecord } from './lib/repository'
import { currentAdmin, signInAdmin, signOutAdmin, type AdminProfile } from './lib/auth'
import { AkunMitraForm } from './AkunMitraForm'
import { AkunMitraAdmin } from './AkunMitraAdmin'
import { sortSatkerWorkItems } from './taskSorting'


const fmtUpdated=(v:string)=>{if(!v||v==='Belum diperbarui')return v;const d=new Date(v);if(isNaN(d.getTime()))return v;return `${d.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})} · ${d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'})} WIB`}
import sipaduBanner from './assets/sipadu-bmn-banner.webp'
import sipaduLogo from './assets/sipadu-bmn-logo.png'
import './App.css'
import './workflow-layout.css'

type View = 'admin' | 'satker'
type FilterState = 'semua' | TaskStatus
type AdminPage = 'summary' | 'tasks' | 'monitoring' | 'data' | 'akun-mitra' | 'verification' | 'archive' | 'performance' | 'settings'

const methodMeta: Record<TaskMethod,{label:string; Icon: typeof FileSpreadsheet}> = {
  spreadsheet:{label:'Spreadsheet eksternal',Icon:FileSpreadsheet},
  portal:{label:'Formulir portal',Icon:FileInput},
  upload:{label:'Unggah dokumen',Icon:Upload},
  monitoring:{label:'Monitoring progress',Icon:Activity}
}

function StatusPill({status}:{status:TaskStatus}) {
  return <span className={`status status-${status}`}><i />{statusLabel[status]}</span>
}

function Progress({value}:{value:number}) {
  return <div className="progress-wrap"><div className="progress-track"><span style={{width:`${value}%`}} /></div><b>{value}%</b></div>
}

function MethodIcon({method,size=19}:{method:TaskMethod;size?:number}) {
  const Icon=methodMeta[method].Icon
  return <div className={`method-icon method-${method}`}><Icon size={size}/></div>
}

function App() {
  const testMode=import.meta.env.MODE==='test'
  const [view,setView] = useState<View>(testMode?'admin':'satker')
  const [telaahOpen,setTelaahOpen]=useState(false)
  const [adminProfile,setAdminProfile] = useState<AdminProfile|null>(testMode?{email:'test@sipadu.local',displayName:'Korwil BMN'}:null)
  const [authReady,setAuthReady] = useState(testMode)
  const [selectedSatker,setSelectedSatker] = useState('692313')
  const [tasks,setTasks] = useState<Task[]>(finalTasks)
  const [dataSource,setDataSource] = useState<'supabase'|'fallback'>('fallback')
  const [adminFilter,setAdminFilter] = useState<FilterState>('semua')
  const [query,setQuery] = useState('')
  const [detail,setDetail] = useState<string | null>(null)
  const [toast,setToast] = useState('')

  useEffect(()=>{
    if(testMode) return
    let active=true
    Promise.all([loadTasks(),currentAdmin()]).then(async([result,profile])=>{
      if(!active)return
      setTasks(result.tasks);setDataSource(result.source);setAdminProfile(profile);setAuthReady(true)
      if(profile){const adminData=await loadTasks();if(active){setTasks(adminData.tasks);setDataSource(adminData.source)}}
    }).catch(()=>{if(active)setAuthReady(true)})
    return ()=>{active=false}
  },[testMode])

  const flash=(message:string)=>{setToast(message);window.setTimeout(()=>setToast(''),2600)}
  const toggleTask=(id:string)=>{
    const task=tasks.find(t=>t.id===id)
    const nextActive=!(task?.active ?? true)
    setTasks(current=>current.map(t=>t.id===id?{...t,active:nextActive}:t))
    void persistTaskActive(id,nextActive)
    flash(task?.active?'Pekerjaan ditutup dan dipindahkan ke arsip.':'Pekerjaan dibuka kembali untuk satker.')
  }
  const updateAssignment=(taskId:string, satkerCode:string, status:TaskStatus)=>{
    const nextProgress=status==='selesai'?100:undefined
    setTasks(current=>current.map(t=>t.id!==taskId?t:{...t,assignments:t.assignments.map(a=>a.satker===satkerCode?{...a,status,progress:nextProgress??a.progress,updated:'Baru saja'}:a)}))
    void persistAssignmentStatus(taskId,satkerCode,status,nextProgress)
    flash(status==='selesai'?'Data telah diverifikasi dan dinyatakan selesai.':'Pekerjaan dikembalikan untuk diperbaiki satker.')
  }

  const refreshTasks=async(force=false)=>{const result=await loadTasks(force);setTasks(result.tasks);setDataSource(result.source)}

  useEffect(()=>{const handler=()=>void refreshTasks(true);window.addEventListener('akun-mitra-updated',handler);return()=>window.removeEventListener('akun-mitra-updated',handler)},[])
  const handleAdminLogin=async(profile:AdminProfile)=>{
    setAdminProfile(profile);setView('admin');await refreshTasks()
  }
  const handleLogout=async()=>{
    await signOutAdmin();setAdminProfile(null);setView('satker');setDetail(null)
    const result=await loadTasks();setTasks(result.tasks);setDataSource(result.source)
  }

  return <div className="app-shell">
    {view==='admin'
      ? !authReady?<AuthLoading/>:adminProfile?<AdminView tasks={tasks} adminProfile={adminProfile} onLogout={handleLogout} onRefresh={refreshTasks} dataSource={dataSource} filter={adminFilter} setFilter={setAdminFilter} query={query} setQuery={setQuery} setView={setView} selectedSatker={selectedSatker} setSelectedSatker={setSelectedSatker} detail={detail} setDetail={setDetail} toggleTask={toggleTask} updateAssignment={updateAssignment}/>:<AdminLogin onBack={()=>setView('satker')} onSuccess={handleAdminLogin}/>
      : telaahOpen?<TelaahPublicPage onBack={()=>setTelaahOpen(false)} setView={setView}/>:<SatkerView tasks={tasks} selectedSatker={selectedSatker} setSelectedSatker={setSelectedSatker} setView={setView} detail={detail} setDetail={setDetail} flash={flash} onOpenTelaah={()=>setTelaahOpen(true)} onRefresh={refreshTasks}/>
    }
    {toast&&<div className="toast"><Check size={18}/>{toast}</div>}
  </div>
}

function AuthLoading(){return <div className="auth-shell"><div className="auth-loading"><div className="auth-spinner"/><span>Memeriksa sesi Korwil…</span></div></div>}

export function AdminLogin({onBack,onSuccess}:{onBack:()=>void;onSuccess:(profile:AdminProfile)=>Promise<void>}){
  const [email,setEmail]=useState('bmnditjenpas.wp4@gmail.com')
  const [password,setPassword]=useState('')
  const [showPassword,setShowPassword]=useState(false)
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const submit=async(event:FormEvent)=>{event.preventDefault();setLoading(true);setError('');const result=await signInAdmin(email,password);setLoading(false);if(result.error){setError(result.error);return}if(result.profile)await onSuccess(result.profile)}
  return <div className="auth-shell"><header className="auth-header"><Brand/><button className="ghost" onClick={onBack}><ArrowLeft/>Kembali ke Portal Satker</button></header><main className="auth-main"><section className="auth-card"><div className="auth-icon"><LockKeyhole/></div><span className="eyebrow">AKSES TERBATAS</span><h1>Login Dashboard Korwil</h1><p>Masuk menggunakan akun Korwil yang telah didaftarkan. Tidak tersedia pendaftaran akun secara publik.</p><form onSubmit={submit}><label>Email Korwil<div className="auth-input"><Mail/><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username"/></div></label><label>Password<div className="auth-input"><KeyRound/><input type={showPassword?'text':'password'} required value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"/><button type="button" aria-label={showPassword?'Sembunyikan password':'Tampilkan password'} onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff/>:<Eye/>}</button></div></label>{error&&<div className="auth-message error">{error}</div>}<button className="primary auth-submit" disabled={loading}>{loading?'Memeriksa akun…':'Masuk ke Dashboard'}</button></form><div className="auth-security"><ShieldCheck/><span>Session dikelola oleh Supabase Auth dan akses data dilindungi Row Level Security.</span></div></section></main></div>
}

type SharedProps={tasks:Task[];selectedSatker:string;setSelectedSatker:(v:string)=>void;setView:(v:View)=>void;detail:string|null;setDetail:(v:string|null)=>void}

function Brand(){return <div className="brand"><div className="brand-logo-wrap"><img className="brand-logo" src={sipaduLogo} alt="Logo SIPADU BMN Ditjenpas Riau"/></div><div><strong>SIPADU BMN</strong><span>Ditjenpas Riau</span></div></div>}

function AdminView({tasks,dataSource,adminProfile,onLogout,onRefresh,filter,setFilter,query,setQuery,setView,selectedSatker:_selectedSatker,setSelectedSatker:_setSelectedSatker,detail,setDetail,toggleTask,updateAssignment}:SharedProps&{dataSource:'supabase'|'fallback';adminProfile:AdminProfile;onLogout:()=>Promise<void>;onRefresh:()=>Promise<void>;filter:FilterState;setFilter:(v:FilterState)=>void;query:string;setQuery:(v:string)=>void;toggleTask:(id:string)=>void;updateAssignment:(taskId:string,satker:string,status:TaskStatus)=>void}){
  const [adminPage,setAdminPage]=useState<AdminPage>('summary')
  const [showCreate,setShowCreate]=useState(false)
  const [verify,setVerify]=useState(0)
  useEffect(()=>{let mounted=true;void loadSubmissions().then(items=>{if(mounted)setVerify(countPendingVerifications(items))}).catch(()=>{if(mounted)setVerify(0)});return()=>{mounted=false}},[tasks])
  const pageTitle:Record<AdminPage,string>={summary:'Dashboard Korwil BMN',tasks:'Daftar Pekerjaan',monitoring:'Monitoring Satker',data:'Data Center BMN','akun-mitra':'Data Akun Mitra',verification:'Verifikasi Pekerjaan',archive:'Arsip Pekerjaan',performance:'Kinerja UPT',settings:'Pengaturan Portal'}
  const active=tasks.filter(t=>t.active)
  const allAssignments=active.flatMap(t=>t.assignments.map(a=>({...a,task:t})))
  const stagedPendingCount=tasks.filter(t=>t.workflow==='staged-destruction'&&t.active).flatMap(t=>t.assignments.filter(a=>(a.stageStates??[]).includes('menunggu_verifikasi'))).length
  const delayed=allAssignments.filter(x=>['belum','perbaikan'].includes(x.status)).length
  const avg=Math.round(allAssignments.reduce((s,a)=>s+a.progress,0)/(allAssignments.length||1))
  const filtered=allAssignments.filter(x=>(filter==='semua'||x.status===filter)&&`${x.task.title} ${satkers.find(s=>s.code===x.satker)?.name}`.toLowerCase().includes(query.toLowerCase()))
  const selectedTask=detail?tasks.find(t=>t.id===detail):null

  return <div className="admin-layout">
    <aside className="sidebar">
      <Brand/>
      <nav>
        <button className={adminPage==='summary'?'nav-active':''} onClick={()=>setAdminPage('summary')}><LayoutDashboard/>Ringkasan</button>
        <button className={adminPage==='tasks'?'nav-active':''} onClick={()=>setAdminPage('tasks')}><ClipboardCheck/>Pekerjaan <span>{active.length}</span></button>
        <button className={adminPage==='monitoring'?'nav-active':''} onClick={()=>setAdminPage('monitoring')}><Users/>Monitoring Satker</button>
        <button className={adminPage==='data'?'nav-active':''} onClick={()=>setAdminPage('data')}><Database/>Data Center BMN</button>
        <button className={adminPage==='akun-mitra'?'nav-active':''} onClick={()=>setAdminPage('akun-mitra')}><KeyRound/>Data Akun Mitra</button>
        <button className={adminPage==='verification'?'nav-active':''} onClick={()=>setAdminPage('verification')}><ShieldCheck/>Verifikasi <span>{verify+stagedPendingCount}</span></button>
        <button className={adminPage==='archive'?'nav-active':''} onClick={()=>setAdminPage('archive')}><Archive/>Arsip</button>
        <div className="nav-separator" />
        <button className={adminPage==='performance'?'nav-active':''} onClick={()=>setAdminPage('performance')}><BarChart3/>Kinerja UPT</button>
        <button className={adminPage==='settings'?'nav-active':''} onClick={()=>setAdminPage('settings')}><Settings/>Pengaturan</button>
      </nav>
      <div className="sidebar-foot"><div className="avatar">KB</div><div><strong>{adminProfile.displayName}</strong><span>{adminProfile.email}</span></div><button aria-label="Keluar Dashboard Korwil" onClick={()=>void onLogout()}><LogOut/></button></div>
    </aside>
    <main className="main">
      <header className="topbar"><button className="mobile-menu"><Menu/></button><div><h1>{pageTitle[adminPage]}</h1><p>20 Agustus 2026 · Sumber: {dataSource==='supabase'?'Database Supabase':'Data cadangan hasil sinkronisasi'}</p></div><div className="top-actions"><button className="ghost" onClick={()=>setView('satker')}><Building2/>Pratinjau Satker</button><button className="primary" onClick={()=>setShowCreate(true)}>+ Buat Pekerjaan</button></div></header>
      {adminPage==='summary'?<>
      <section className="metric-grid">
        <Metric label="Pekerjaan aktif" value={active.length} hint={`${tasks.filter(t=>!t.active).length} pekerjaan diarsipkan`} tone="blue" icon={ClipboardCheck}/>
        <Metric label="Progress keseluruhan" value={`${avg}%`} hint="Seluruh penugasan aktif" tone="green" icon={Activity}/>
        <Metric label="Menunggu verifikasi" value={verify+stagedPendingCount} hint="Perlu tindakan Korwil" tone="amber" icon={ShieldCheck}/>
        <Metric label="Perlu perhatian" value={delayed} hint="Belum mulai atau perbaikan" tone="red" icon={CircleAlert}/>
      </section>
      <section className="work-grid">
        <div className="panel task-overview">
          <div className="panel-head"><div><h2>Progress pekerjaan</h2><p>Ringkasan penyelesaian seluruh satker</p></div><button className="icon-button"><Filter/></button></div>
          <div className="task-list">
            {tasks.map(task=>{
              const avgTask=Math.round(task.assignments.reduce((s,a)=>s+a.progress,0)/(task.assignments.length||1));const done=task.assignments.filter(a=>['selesai','ditutup'].includes(a.status)).length
              return <button key={task.id} className={`task-row ${!task.active?'archived':''}`} onClick={()=>setDetail(task.id)}>
                <MethodIcon method={task.method}/>
                <div className="task-copy"><strong>{task.title}</strong><span>{methodMeta[task.method].label} · {task.assignments.length} satker</span></div>
                <div className="task-date"><CalendarDays size={15}/>{task.due}</div>
                <div className="task-progress"><Progress value={avgTask}/><span>{done}/{task.assignments.length} selesai</span></div>
                <span className={`visibility ${task.active?'open':'closed'}`}>{task.active?'Aktif':'Ditutup'}</span>
              </button>
            })}
          </div>
        </div>
        <div className="panel attention">
          <div className="panel-head"><div><h2>Perlu perhatian</h2><p>Prioritas tindak lanjut hari ini</p></div></div>
          {allAssignments.filter(x=>['belum','perbaikan'].includes(x.status)).slice(0,5).map((x,i)=><div className="attention-row" key={`${x.task.id}${x.satker}`}><div className="rank">{i+1}</div><div><strong>{satkers.find(s=>s.code===x.satker)?.name}</strong><span>{x.task.title}</span></div><StatusPill status={x.status}/></div>)}
          <button className="text-button">Lihat seluruh prioritas →</button>
        </div>
      </section>
      <section className="panel monitoring">
        <div className="panel-head"><div><h2>Monitoring satker</h2><p>Status terbaru seluruh penugasan aktif</p></div><div className="table-tools"><label><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari satker atau pekerjaan"/></label><select value={filter} onChange={e=>setFilter(e.target.value as FilterState)}><option value="semua">Semua status</option><option value="belum">Belum dikerjakan</option><option value="proses">Dalam proses</option><option value="verifikasi">Menunggu verifikasi</option><option value="persetujuan">Menunggu persetujuan</option><option value="perbaikan">Perlu perbaikan</option><option value="selesai">Selesai</option></select></div></div>
        <div className="table-wrap"><table><thead><tr><th>Satker</th><th>Pekerjaan</th><th>Progress</th><th>Status</th><th>Pembaruan</th><th></th></tr></thead><tbody>{filtered.slice(0,12).map(x=><tr key={`${x.task.id}-${x.satker}`}><td><strong>{satkers.find(s=>s.code===x.satker)?.name}</strong><span>{x.satker}</span></td><td>{x.task.title}<small>{methodMeta[x.task.method].label}</small></td><td><Progress value={x.progress}/></td><td><StatusPill status={x.status}/></td><td>{fmtUpdated(x.updated)}</td><td><button className="link-button" onClick={()=>setDetail(x.task.id)}>Periksa</button></td></tr>)}</tbody></table></div>
      </section>
      <section className="performance-note"><LockKeyhole/><div><strong>Fondasi nilai kinerja UPT sudah disiapkan</strong><p>Sistem mencatat ketepatan waktu, kelengkapan pertama, jumlah perbaikan, dan penyelesaian pekerjaan. Bobot penilaian akan ditetapkan kemudian agar transparan dan adil.</p></div><button onClick={()=>setAdminPage('performance')}>Pelajari rancangan</button></section>
      </>:<AdminSection page={adminPage} tasks={tasks} onRefresh={onRefresh} setDetail={setDetail} toggleTask={toggleTask}/>}
    </main>
    {selectedTask&&<TaskDrawer task={selectedTask} onClose={()=>setDetail(null)} onToggle={()=>toggleTask(selectedTask.id)} updateAssignment={updateAssignment} onRefresh={onRefresh}/>}
    {showCreate&&<CreateTaskModal onClose={()=>setShowCreate(false)} onCreated={async()=>{setShowCreate(false);await onRefresh();setAdminPage('tasks')}}/>}
  </div>
}

export function CreateTaskModal({onClose,onCreated}:{onClose:()=>void;onCreated:()=>Promise<void>}){
 const upt=satkers.filter(s=>s.code!=='692507')
 const [title,setTitle]=useState(''),[description,setDescription]=useState(''),[method,setMethod]=useState<TaskMethod>('upload'),[dueDate,setDueDate]=useState(''),[sourceUrl,setSourceUrl]=useState(''),[sourceLetter,setSourceLetter]=useState(''),[requirements,setRequirements]=useState('Surat Pengantar\nLaporan Pelaksanaan\nDokumentasi'),[targets,setTargets]=useState<string[]>(upt.map(s=>s.code)),[loading,setLoading]=useState(false),[error,setError]=useState('')
 const toggle=(code:string)=>setTargets(current=>current.includes(code)?current.filter(x=>x!==code):[...current,code])
 const submit=async(e:FormEvent)=>{e.preventDefault();if(!targets.length){setError('Pilih minimal satu satker.');return}setLoading(true);setError('');try{await createTask({title,description,method,dueDate:dueDate||undefined,sourceUrl:sourceUrl||undefined,sourceLetter:sourceLetter||undefined,priority:'normal',satkerCodes:targets,requirements:requirements.split('\n').map(x=>x.trim()).filter(Boolean)});await onCreated()}catch(err){setError(err instanceof Error?err.message:'Pekerjaan belum dapat dibuat.');setLoading(false)}}
 return <div className="drawer-backdrop create-backdrop"><section className="create-modal"><div className="drawer-head"><button onClick={onClose}><X/></button><span>Buat Pekerjaan Baru</span></div><form onSubmit={submit}><div className="create-grid"><label className="full">Nama pekerjaan<input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Contoh: Laporan Pengamanan Aset"/></label><label className="full">Deskripsi<textarea required value={description} onChange={e=>setDescription(e.target.value)} placeholder="Jelaskan tujuan dan data yang harus disampaikan"/></label><label>Metode<select value={method} onChange={e=>setMethod(e.target.value as TaskMethod)}><option value="upload">Unggah dokumen</option><option value="spreadsheet">Spreadsheet eksternal</option><option value="portal">Formulir portal</option></select></label><label>Tenggat<input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/></label><label className="full">Dasar surat<input value={sourceLetter} onChange={e=>setSourceLetter(e.target.value)}/></label>{method==='spreadsheet'&&<label className="full">Tautan spreadsheet<input type="url" required value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)}/></label>}<label className="full">Requirement — satu dokumen/field per baris<textarea value={requirements} onChange={e=>setRequirements(e.target.value)}/></label></div><div className="target-head"><div><strong>Satker tujuan</strong><span>{targets.length} UPT dipilih</span></div><button type="button" className="text-button" onClick={()=>setTargets(targets.length===upt.length?[]:upt.map(s=>s.code))}>{targets.length===upt.length?'Batalkan semua':'Pilih semua'}</button></div><div className="target-grid">{upt.map(s=><label key={s.code}><input type="checkbox" checked={targets.includes(s.code)} onChange={()=>toggle(s.code)}/><span>{s.name}</span></label>)}</div>{error&&<div className="auth-message error">{error}</div>}<div className="create-actions"><button type="button" className="ghost" onClick={onClose}>Batal</button><button className="primary" disabled={loading}>{loading?'Membuat pekerjaan…':'Buat pekerjaan'}</button></div></form></section></div>
}

function dataCards(archiveCount:number):[string,string][]{
 return [['Tanah & Bangunan','Data tanah, gedung, pagar, dan dokumen legal'],['Rumah Negara','Status rumah negara, penghuni, dan papan nama'],['Peralatan & Mesin','Kendaraan, perangkat kerja, dan alat keamanan'],['BMN Idle & Rusak Berat','Klarifikasi, tindak lanjut, dan data dukung'],['RKBMN','Hasil penelaahan dan dokumen perencanaan'],['Arsip Pekerjaan',archiveCount+' pekerjaan telah ditutup']]
}

type UptScore={satker:string;satkerName:string;totalAssignments:number;completed:number;inRevision:number;pendingVerification:number;totalRevisions:number;completionRate:number;revisionScore:number;score:number}
function PerformanceView(){
  const [scores,setScores]=useState<UptScore[]>([])
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  useEffect(()=>{let mounted=true;import('./lib/supabase').then(async({supabase})=>{if(!supabase){if(mounted)setLoading(false);return}const{data,error:rpcError}=await supabase.rpc('get_upt_scores');if(!mounted)return;if(rpcError){setError(rpcError.message);setLoading(false);return}setScores((data??[]) as unknown as UptScore[]);setLoading(false)}).catch(()=>{if(mounted){setError('Nilai kinerja belum dapat dimuat.');setLoading(false)}});return()=>{mounted=false}},[])
  const sorted=[...scores].sort((a,b)=>b.score-a.score)
  const medal=(rank:number)=>rank===0?'🥇':rank===1?'🥈':rank===2?'🥉':`${rank+1}`
  const tone=(score:number)=>score>=90?'excellent':score>=75?'good':score>=60?'fair':'poor'
  return <section className="admin-page performance-page"><div className="performance-hero"><BarChart3/><div><span>NILAI KINERJA UPT</span><h2>Peringkat Kinerja UPT</h2><p>Skor dihitung dari data penugasan portal: tingkat penyelesaian pekerjaan (bobot 70%) dan kualitas pengajuan tanpa perbaikan (bobot 30%). Diperbarui otomatis mengikuti data terbaru.</p></div></div>{error&&<div className="auth-message error">{error}</div>}{loading?<div className="empty-state"><div className="auth-spinner"/><p>Memuat nilai kinerja…</p></div>:<div className="table-wrap performance-table"><table><thead><tr><th>Peringkat</th><th>Satker</th><th>Skor</th><th>Selesai</th><th>Perlu Perbaikan</th><th>Total Perbaikan</th><th>Tingkat Penyelesaian</th></tr></thead><tbody>{sorted.map((s,i)=><tr key={s.satker}><td><span className={`rank-medal ${tone(s.score)}`}>{medal(i)}</span></td><td><strong>{s.satkerName}</strong><span>{s.satker}</span></td><td><b className={`score-badge score-${tone(s.score)}`}>{s.score}</b></td><td>{s.completed}/{s.totalAssignments}</td><td>{s.inRevision}</td><td>{s.totalRevisions}</td><td>{s.completionRate}%</td></tr>)}</tbody></table></div>}<div className="policy-note"><CircleAlert/><p>Skor ini merupakan alat bantu monitoring internal Korwil, bukan penilaian resmi kinerja pegawai. Bobot penilaian dapat ditinjau bersama pimpinan sebelum digunakan lebih lanjut.</p></div></section>
}

function buildReminderMessage(satkerName:string,items:Array<{title:string;status:TaskStatus;progress:number}>):string{
  const lines=items.map(item=>`• ${item.title} — ${statusLabel[item.status]} (${item.progress}%)`)
  return `Yth. Operator ${satkerName},\n\nKami dari Korwil BMN Ditjenpas Riau ingin mengingatkan pekerjaan SIPADU BMN berikut yang masih perlu ditindaklanjuti:\n\n${lines.join('\n')}\n\nMohon segera dikerjakan dan diunggah melalui portal SIPADU BMN (https://sipadu-bmn.vercel.app). Jika ada kendala, silakan hubungi Korwil BMN.\n\nTerima kasih.\n— Korwil BMN Ditjenpas Riau`
}

function normalizeWaNumber(raw:string):string{
  const digits=raw.replace(/[^0-9]/g,'')
  if(digits.startsWith('0'))return '62'+digits.slice(1)
  if(digits.startsWith('62'))return digits
  if(digits.startsWith('8'))return '62'+digits
  return digits
}

function RemindSatkerPanel({tasks}:{tasks:Task[]}){
  const pending=tasks.filter(t=>t.active).flatMap(t=>t.assignments.filter(a=>a.status==='belum'||a.status==='perbaikan').map(a=>({task:t,assignment:a})))
  const bySatker=new Map<string,Array<{title:string;status:TaskStatus;progress:number}>>()
  for(const p of pending){
    const list=bySatker.get(p.assignment.satker)??[]
    list.push({title:p.task.title,status:p.assignment.status,progress:p.assignment.progress})
    bySatker.set(p.assignment.satker,list)
  }
  const [selected,setSelected]=useState<string|null>(null)
  const [contacts,setContacts]=useState<Record<string,SatkerContact>>({})
  const [idsByCode,setIdsByCode]=useState<Record<string,string>>({})
  const [editing,setEditing]=useState<string|null>(null)
  const [waInput,setWaInput]=useState('')
  const [nameInput,setNameInput]=useState('')
  const [saving,setSaving]=useState(false)
  const [copied,setCopied]=useState(false)
  useEffect(()=>{let mounted=true;loadSatkerContacts().then(r=>{if(mounted){setContacts(r.contacts);setIdsByCode(r.idsByCode)}}).catch(()=>{});return()=>{mounted=false}},[])
  const satkerEntries=[...bySatker.entries()].sort((a,b)=>satkers.find(s=>s.code===a[0])?.name.localeCompare(satkers.find(s=>s.code===b[0])?.name??'')??0)
  const copyMessage=async(code:string)=>{
    const items=bySatker.get(code)??[]
    const name=satkers.find(s=>s.code===code)?.name??code
    const msg=buildReminderMessage(name,items)
    try{await navigator.clipboard.writeText(msg);setCopied(true);window.setTimeout(()=>setCopied(false),2000)}catch{alert(msg)}
  }
  const openWhatsApp=(code:string)=>{
    const items=bySatker.get(code)??[]
    const name=satkers.find(s=>s.code===code)?.name??code
    const contact=contacts[idsByCode[code]??'']
    if(!contact){setEditing(code);setWaInput('');setNameInput('');return}
    const msg=buildReminderMessage(name,items)
    window.open(`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(msg)}`,'_blank','noopener')
  }
  const saveContact=async(code:string)=>{
    const satkerId=idsByCode[code]
    if(!satkerId){alert('Data satker tidak ditemukan.');return}
    const normalized=normalizeWaNumber(waInput)
    if(normalized.length<9){alert('Nomor WhatsApp tidak valid. Gunakan format 08xxx atau 62xxx.');return}
    setSaving(true)
    try{
      await saveSatkerContact(satkerId,normalized,nameInput)
      setContacts(current=>({...current,[satkerId]:{satker_id:satkerId,operator_name:nameInput||null,whatsapp:normalized}}))
      setEditing(null)
    }catch(err){alert(err instanceof Error?err.message:'Gagal menyimpan kontak.')}finally{setSaving(false)}
  }
  const copyAll=async()=>{
    const all=satkerEntries.map(([code])=>{
      const items=bySatker.get(code)??[]
      const name=satkers.find(s=>s.code===code)?.name??code
      return buildReminderMessage(name,items)
    }).join('\n\n───────────────────\n\n')
    try{await navigator.clipboard.writeText(all);setCopied(true);window.setTimeout(()=>setCopied(false),2000)}catch{alert('Gagal menyalin. Salin manual dari masing-masing satker.')}
  }
  if(!satkerEntries.length)return null
  return <section className="panel admin-page remind-panel"><div className="panel-head"><div><h2>Ingatkan Satker</h2><p>{satkerEntries.length} satker memiliki pekerjaan belum selesai ({pending.length} penugasan). Tombol WhatsApp membuka chat dengan pesan sudah terisi — tinggal tekan kirim.</p></div><button className="ghost" onClick={()=>void copyAll()}>Salin Semua Pesan</button></div><div className="remind-list">{satkerEntries.map(([code,items])=>{const name=satkers.find(s=>s.code===code)?.name??code;const open=selected===code;const satkerId=idsByCode[code]??'';const contact=contacts[satkerId] as SatkerContact|undefined;return <div className="remind-row" key={code}><button className="remind-row-head" onClick={()=>setSelected(open?null:code)}><strong>{name}</strong><span>{items.length} pekerjaan belum selesai{contact?.operator_name?` · ${contact.operator_name}`:''}</span><b>{open?'▲':'▼'}</b></button>{open&&<div className="remind-row-body"><ul>{items.map(item=><li key={item.title}><span>{item.title}</span><StatusPill status={item.status}/><small>{item.progress}%</small></li>)}</ul>{editing===code?<div className="remind-contact-form"><label>Nama operator<input value={nameInput} onChange={e=>setNameInput(e.target.value)} placeholder="Nama operator (opsional)"/></label><label>Nomor WhatsApp<input value={waInput} onChange={e=>setWaInput(e.target.value)} placeholder="08xxxxxxxxxx"/></label><div className="remind-contact-actions"><button className="primary" disabled={saving} onClick={()=>void saveContact(code)}>{saving?'Menyimpan…':'Simpan Kontak'}</button><button className="ghost" onClick={()=>setEditing(null)}>Batal</button></div></div>:<div className="remind-actions">{contact?<button className="primary" onClick={()=>openWhatsApp(code)}>Kirim WhatsApp ke {contact.whatsapp}</button>:<button className="ghost" onClick={()=>{setEditing(code);setWaInput('');setNameInput('')}}>+ Tambah Nomor WA</button>}<button className="ghost" onClick={()=>void copyMessage(code)}>Salin Pesan</button>{contact&&<button className="link-button" onClick={()=>{setEditing(code);setWaInput(contact.whatsapp);setNameInput(contact.operator_name??'')}}>Edit kontak</button>}</div>}{copied&&<small className="remind-copied">Pesan tersalin ke clipboard.</small>}</div>}</div>})}</div></section>
}

function AdminSection({page,tasks,onRefresh,setDetail,toggleTask}:{page:Exclude<AdminPage,'summary'>;tasks:Task[];onRefresh:()=>Promise<void>;setDetail:(v:string|null)=>void;toggleTask:(id:string)=>void}){
 const active=tasks.filter(t=>t.active)
 const assignments=active.flatMap(t=>t.assignments.map(a=>({...a,task:t})))
 if(page==='tasks') return <section className="panel admin-page"><div className="panel-head"><div><h2>Seluruh pekerjaan</h2><p>Buka detail untuk mengatur satker, verifikasi, atau menutup pekerjaan.</p></div></div><div className="task-list">{tasks.map(task=>{const progress=Math.round(task.assignments.reduce((s,a)=>s+a.progress,0)/(task.assignments.length||1));return <button className={`task-row ${!task.active?'archived':''}`} key={task.id} onClick={()=>setDetail(task.id)}><MethodIcon method={task.method}/><div className="task-copy"><strong>{task.title}</strong><span>{methodMeta[task.method].label} · {task.assignments.length} satker</span></div><div className="task-date"><CalendarDays/>{task.due}</div><div className="task-progress"><Progress value={progress}/></div><span className={`visibility ${task.active?'open':'closed'}`}>{task.active?'Aktif':'Ditutup'}</span></button>})}</div></section>
 if(page==='monitoring') return <><RemindSatkerPanel tasks={tasks}/><section className="panel admin-page"><div className="panel-head"><div><h2>Status seluruh satker</h2><p>{assignments.length} penugasan aktif dari {active.length} pekerjaan.</p></div></div><div className="table-wrap"><table><thead><tr><th>Satker</th><th>Pekerjaan</th><th>Progress</th><th>Status</th><th>Pembaruan</th><th></th></tr></thead><tbody>{assignments.slice(0,40).map(a=><tr key={`${a.task.id}-${a.satker}`}><td><strong>{satkers.find(s=>s.code===a.satker)?.name}</strong><span>{a.satker}</span></td><td>{a.task.title}<small>{methodMeta[a.task.method].label}</small></td><td><Progress value={a.progress}/></td><td><StatusPill status={a.status}/></td><td>{fmtUpdated(a.updated)}</td><td><button className="link-button" onClick={()=>setDetail(a.task.id)}>Periksa</button></td></tr>)}</tbody></table></div></section></>
 if(page==='verification') return <><StagedVerificationSection tasks={tasks} onRefresh={onRefresh}/><SubmissionInbox onTasksChanged={onRefresh} tasks={tasks}/></>
 if(page==='archive') {const archived=tasks.filter(t=>!t.active);return <section className="panel admin-page"><div className="panel-head"><div><h2>Arsip pekerjaan</h2><p>Pekerjaan ditutup tetap tersimpan dan dapat dibuka kembali.</p></div></div>{archived.length===0?<EmptyState icon={Archive} title="Arsip masih kosong" text="Pekerjaan yang ditutup akan tersimpan di sini."/>:<div className="archive-grid">{archived.map(t=><article className="archive-card" key={t.id}><MethodIcon method={t.method}/><div><span>{t.due}</span><h3>{t.title}</h3><p>{t.letter}</p></div><button className="ghost" onClick={()=>toggleTask(t.id)}>Buka kembali</button></article>)}</div>}</section>}
 if(page==='data'){const archiveCount=tasks.filter(t=>!t.active).length;return <section className="admin-page"><div className="data-intro"><Database/><div><h2>Data Center BMN</h2><p>Pusat indeks pekerjaan, dokumen, dan riwayat. Pada MVP, berkas masih berupa data contoh dan tautan sumber.</p></div></div><div className="data-grid">{dataCards(archiveCount).map(([title,text])=><article className="data-card" key={title}><Archive/><h3>{title}</h3><p>{text}</p><button>Lihat indeks →</button></article>)}</div></section>}
 if(page==='akun-mitra') return <AkunMitraAdmin/>
 if(page==='performance') return <PerformanceView/>
 return <section className="panel admin-page settings-page"><div className="panel-head"><div><h2>Pengaturan portal</h2><p>Konfigurasi umum prototipe. Penyimpanan permanen memerlukan database.</p></div></div><div className="settings-form"><label>Nama portal<input defaultValue="SIPADU BMN DITJENPAS RIAU"/></label><label>Zona waktu<select defaultValue="WIB"><option>WIB</option></select></label><label className="full">Pesan untuk satker<textarea defaultValue="Selesaikan pekerjaan sesuai batas waktu dan ajukan untuk diverifikasi Korwil BMN."/></label><div className="setting-toggle"><div><strong>Sembunyikan pekerjaan yang ditutup</strong><span>Pekerjaan tertutup tidak muncul pada halaman satker.</span></div><input type="checkbox" defaultChecked/></div><button className="primary">Simpan pengaturan</button></div></section>
}

function StagedVerificationRow({row,busy,act}:{row:any;busy:string|null;act:(action:'verify'|'return',row:any)=>void}){const key=`${row.task.id}-${row.assignment.satker}-${row.index}`;const satkerName=satkers.find(s=>s.code===row.assignment.satker)?.name;return <div className="staged-verification-row" key={key}><div className="staged-verification-info"><strong>{satkerName}</strong><span>{row.task.title}</span><b>{row.stage.label}</b></div><div className="admin-stage-actions"><button className="primary" disabled={busy===key} onClick={()=>void act('verify',row)}>Setujui Tahap {row.index+1}</button><button className="ghost" disabled={busy===key} onClick={()=>void act('return',row)}>Minta Perbaikan</button></div></div>}

function StagedVerificationSection({tasks,onRefresh}:{tasks:Task[];onRefresh:()=>Promise<void>}){
 const [busy,setBusy]=useState<string|null>(null)
 const rows=tasks.filter(t=>t.workflow==='staged-destruction'&&t.active).flatMap(t=>{const stages=t.stages??[];return t.assignments.flatMap(a=>{const states=stageStatesFor(a,stages);return stages.map((stage,index)=>({task:t,assignment:a,stage,index,state:states[index]}))})}).filter(r=>r.state==='menunggu_verifikasi')
 const act=async(action:'verify'|'return',row:typeof rows[number])=>{
   const key=`${row.task.id}-${row.assignment.satker}-${row.index}`
   if(busy)return
   setBusy(key)
   try{
     const result=await reviewStagedStage(row.task.id,row.assignment.satker,row.index,action)
     if(!(result as {ok:boolean}).ok)throw new Error((result as {error?:string}).error??'Operasi gagal.')
     await onRefresh()
   }catch(err){alert(err instanceof Error?err.message:'Operasi gagal.')}finally{setBusy(null)}
 }
 if(!rows.length)return null
 return <section className="panel admin-page staged-verification"><div className="panel-head"><div><h2>Pengajuan Verifikasi Tahapan Pemusnahan</h2><p>{rows.length} tahapan menunggu keputusan Korwil. Dokumen diperiksa pada folder Google Drive pekerjaan.</p></div></div><div className="staged-verification-list">{rows.map(row=><StagedVerificationRow key={`${row.task.id}-${row.assignment.satker}-${row.index}`} row={row} busy={busy} act={act}/>)}</div></section>
 }

function SubmissionInbox({onTasksChanged,tasks}:{onTasksChanged:()=>Promise<void>;tasks:Task[]}){
 const [items,setItems]=useState<SubmissionRecord[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notes,setNotes]=useState<Record<string,string>>({}),[targets,setTargets]=useState<Record<string,string>>({}),[filter,setFilter]=useState('menunggu_verifikasi')
 const reload=async()=>{setLoading(true);setError('');try{setItems(await loadSubmissions())}catch(err){setError(err instanceof Error?err.message:'Inbox belum dapat dimuat.')}finally{setLoading(false)}}
 useEffect(()=>{void reload()},[])
 const review=async(item:SubmissionRecord,status:'diterima'|'perlu_perbaikan'|'ditolak')=>{setError('');try{await reviewSubmission(item.id,status,notes[item.id]??'')}catch(err){setError(err instanceof Error?err.message:'Status belum dapat disimpan.')}finally{await Promise.all([reload(),onTasksChanged()])}}
 const transfer=async(item:SubmissionRecord)=>{const target=targets[item.id];if(!target){setError('Pilih satker tujuan.');return}setError('');try{await transferSubmission(item.id,target,notes[item.id]??'')}catch(err){setError(err instanceof Error?err.message:'Pengajuan belum dapat dialihkan.')}finally{await Promise.all([reload(),onTasksChanged()])}}
 const visible=filter==='semua'?items:items.filter(x=>x.status===filter)
 const content=loading?<div className="empty-state"><div className="auth-spinner"/><p>Memuat pengajuan…</p></div>:visible.length===0?<EmptyState icon={ShieldCheck} title="Tidak ada pengajuan" text="Pengajuan satker dengan status ini belum tersedia."/>:<div className="submission-list">{visible.map(item=><SubmissionCard key={item.id} item={item} tasks={tasks} notes={notes} setNotes={setNotes} targets={targets} setTargets={setTargets} onReview={review} onTransfer={transfer}/>)}</div>
 const errEl=error?<div className="auth-message error inbox-error">{error}</div>:null
 return <section className="panel admin-page submission-inbox"><div className="panel-head"><div><h2>Inbox Verifikasi Dokumen</h2><p>{items.filter(x=>x.status==='menunggu_verifikasi').length} pengajuan menunggu pemeriksaan Korwil.</p></div><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="menunggu_verifikasi">Menunggu verifikasi</option><option value="perlu_perbaikan">Perlu perbaikan</option><option value="diterima">Diterima</option><option value="ditolak">Ditolak</option><option value="dialihkan">Dialihkan</option><option value="semua">Semua pengajuan</option></select></div>{errEl}{content}</section>
 }

function SubmissionCard({item,tasks,notes,setNotes,targets,setTargets,onReview,onTransfer}:{item:SubmissionRecord;tasks:Task[];notes:Record<string,string>;setNotes:(fn:(current:Record<string,string>)=>Record<string,string>)=>void;targets:Record<string,string>;setTargets:(fn:(current:Record<string,string>)=>Record<string,string>)=>void;onReview:(item:SubmissionRecord,status:'diterima'|'perlu_perbaikan'|'ditolak')=>Promise<void>;onTransfer:(item:SubmissionRecord)=>Promise<void>}){const handleDocClick=async(doc:SubmissionRecord['supporting_documents'][number])=>{const url=doc.drive_url??await documentPreviewUrl(doc.stored_path);if(url)window.open(url,'_blank','noopener')};const handleDriveClick=()=>{const t=tasks.find(t=>t.id===item.tasks?.task_key);const url=t?.uploadLink;if(url)window.open(url,'_blank','noopener noreferrer')};const satkerName=item.satkers?.name??'';const phoneSuffix=item.sender_phone? ' · '+item.sender_phone : '';const senderNote=item.sender_note?<div className="sender-note">"{item.sender_note}"</div>:null;return <article className="submission-card"><div className="submission-head"><div><span>{item.submission_number}</span><h3>{item.tasks?.title}</h3><p>{satkerName} · {item.sender_name}{phoneSuffix}</p></div><span className={`submission-status sub-${item.status}`}>{item.status.replaceAll('_',' ')}</span></div>{senderNote}<div className="document-list">{item.supporting_documents.map(doc=><div key={doc.id}><FileInput/><div><strong>{doc.document_type}</strong><span>{doc.original_filename} · {(doc.file_size/1024/1024).toFixed(2)} MB</span></div><button className="link-button" onClick={()=>handleDocClick(doc)}>Lihat file</button></div>)}</div><button className="link-button drive-folder-link" onClick={handleDriveClick}>Buka folder Drive pekerjaan <ExternalLink/></button><label className="admin-note-input">Catatan review (opsional)<textarea value={notes[item.id]??''} onChange={e=>setNotes(current=>({...current,[item.id]:e.target.value}))} placeholder="Catatan untuk satker"/></label><div className="review-actions"><button className="primary" onClick={()=>void onReview(item,'diterima')}>Terima</button><button className="ghost" onClick={()=>void onReview(item,'perlu_perbaikan')}>Perlu Perbaikan</button><button className="ghost" onClick={()=>void onReview(item,'ditolak')}>Tolak</button></div><div className="transfer-row"><select value={targets[item.id]??''} onChange={e=>setTargets(current=>({...current,[item.id]:e.target.value}))}><option value="">Alihkan ke satker lain…</option>{satkers.filter(s=>s.code!==item.satkers?.code).map(s=><option key={s.code} value={s.code}>{s.name}</option>)}</select><button className="ghost" onClick={()=>void onTransfer(item)}>Alihkan</button></div></article>
}

function TelaahPublicPage({onBack,setView}:{onBack:()=>void;setView:(v:View)=>void}){
 return <div className="telaah-public-page document-center-page">
  <header className="landing-header"><Brand/><div className="landing-header-actions"><button className="ghost nav-current"><FileText/>Pusat Dokumen</button><button className="ghost" onClick={()=>setView('admin')}><LockKeyhole/>Dashboard Korwil</button></div></header>
  <main className="telaah-public-main document-center-main">
   <button className="document-back" onClick={onBack}><span className="document-back-icon"><ArrowLeft/></span><span className="document-back-label"><small>Kembali</small><strong>Halaman Utama</strong></span></button>
   <div className="telaah-public-head"><span className="eyebrow">PUSAT INFORMASI BMN</span><h1>Pusat Dokumen</h1><p>Kumpulan dokumen hasil penelaahan dan informasi pendukung pengelolaan BMN.</p></div>
   <section className="document-category-content"><div className="document-section-head"><div><span className="eyebrow">KATEGORI</span><h2>Penelaahan RKBMN</h2><p>Dokumen hasil penelaahan RKBMN SIMAN dan Non-SIMAN.</p></div></div>
    {Object.entries(telaahRkbmn).map(([tahun,docs])=><div key={tahun} className="telaah-group"><h3 className="telaah-year">Tahun Anggaran {tahun.replace('TA ','')}</h3><div className="telaah-grid">{docs.map(d=><a key={d.url} className="telaah-card" href={d.url} target="_blank" rel="noopener noreferrer"><span className="telaah-icon"><FileText/></span><div><strong>{d.title}</strong><span>PDF · Google Drive</span></div><b>Buka <ExternalLink/></b></a>)}</div></div>)}
   </section>
  </main>
 </div>
}

function EmptyState({icon:Icon,title,text}:{icon:typeof Activity;title:string;text:string}){return <div className="empty-state"><Icon/><h3>{title}</h3><p>{text}</p></div>}

function Metric({label,value,hint,tone,icon:Icon}:{label:string;value:string|number;hint:string;tone:string;icon:typeof Activity}){return <div className="metric"><div className={`metric-icon ${tone}`}><Icon/></div><div><span>{label}</span><strong>{value}</strong><small>{hint}</small></div></div>}

type StageState='terkunci'|'terbuka'|'menunggu_verifikasi'|'selesai'|'perbaikan'
function stageStatesFor(assignment:Task['assignments'][number],stages:NonNullable<Task['stages']>):StageState[]{
 if(assignment.stageStates&&assignment.stageStates.length===stages.length)return assignment.stageStates
 const s:StageState[]=[];for(let i=0;i<stages.length;i++)s.push(i===0?'terbuka':'terkunci');return s
}

function TaskDrawer({task,onClose,onToggle,updateAssignment: _updateAssignment,onRefresh}:{task:Task;onClose:()=>void;onToggle:()=>void;updateAssignment:(taskId:string,satker:string,status:TaskStatus)=>void;onRefresh:()=>Promise<void>}){
 const [search,setSearch]=useState('');const rows=task.assignments.filter(a=>satkers.find(s=>s.code===a.satker)?.name.toLowerCase().includes(search.toLowerCase()))
 return <div className="drawer-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><aside className="drawer"><div className="drawer-head"><button onClick={onClose}><X/></button><span>Detail pekerjaan</span></div><div className="drawer-title"><MethodIcon method={task.method} size={22}/><div><h2>{task.title}</h2><p>{task.description}</p></div></div><dl><div><dt>Metode</dt><dd>{methodMeta[task.method].label}</dd></div><div><dt>Batas waktu</dt><dd>{task.due}</dd></div><div><dt>Dasar</dt><dd>{task.letter}</dd></div></dl>{task.workflow==='staged-destruction'&&rows.map(a=><StagedAdminSummary key={`staged-${a.satker}`} task={task} assignment={a} onRefresh={onRefresh}/>)}<div className="drawer-actions"><button className={task.active?'danger':'primary'} onClick={onToggle}>{task.active?'Tutup pekerjaan':'Buka kembali'}</button>{task.link&&<a href={task.link} target="_blank">Buka sumber <ExternalLink/></a>}{task.uploadLink&&<a href={task.uploadLink} target="_blank" rel="noopener noreferrer">Data dukung <ExternalLink/></a>}</div><div className="drawer-section"><div className="drawer-section-head"><h3>Penugasan satker</h3><label><Search/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari satker"/></label></div>{rows.map(a=><div className="assignment" key={a.satker}><div><strong>{satkers.find(s=>s.code===a.satker)?.name}</strong><span>{a.missing.length?a.missing.join(' · '):'Tidak ada kekurangan'}</span></div><Progress value={a.progress}/><StatusPill status={a.status}/></div>)}</div></aside></div>
}

function StagedAdminSummary({task,assignment,onRefresh}:{task:Task;assignment:Task['assignments'][number];onRefresh:()=>Promise<void>}){
 const stages=task.stages??[]
 const states=stageStatesFor(assignment,stages)
 const [busy,setBusy]=useState(false)
 const act=async(action:'verify'|'return',index:number)=>{
   if(busy)return
   setBusy(true)
   try{
     const result=await reviewStagedStage(task.id,assignment.satker,index,action)
     if(!(result as {ok:boolean}).ok)throw new Error((result as {error?:string}).error??'Operasi gagal.')
     await onRefresh()
   }catch(err){alert(err instanceof Error?err.message:'Operasi gagal.')}finally{setBusy(false)}
 }
 return <div className="staged-admin-summary"><h3>Progress tahapan</h3>{stages.map((stage,index)=>{const state=states[index];return <div key={stage.id}><span>{stage.label}</span><b className={`stage-dot stage-dot-${state}`}>{state==='selesai'?'Selesai':state==='menunggu_verifikasi'?'Menunggu verifikasi':state==='perbaikan'?'Perlu perbaikan':state==='terbuka'?'Sedang berjalan':'Terkunci'}</b>{(state==='menunggu_verifikasi')&&<div className="admin-stage-actions"><button className="primary" disabled={busy} onClick={()=>void act('verify',index)}>Setujui</button><button className="ghost" disabled={busy} onClick={()=>void act('return',index)}>Perbaiki</button></div>}</div>})}</div>
}

function SatkerView({tasks,selectedSatker,setSelectedSatker,setView,detail,setDetail,flash,onOpenTelaah,onRefresh}:SharedProps&{flash:(s:string)=>void;onOpenTelaah:()=>void;onRefresh:()=>Promise<void>}){
 const [entered,setEntered]=useState(false)
 const satker=satkers.find(s=>s.code===selectedSatker)!;
 const assignments=useMemo(()=>sortSatkerWorkItems(tasks.flatMap(t=>{const a=t.assignments.find(x=>x.satker===selectedSatker);return a?[{task:t,assignment:a}]:[]}).filter(x=>x.task.active)),[tasks,selectedSatker])
 const done=assignments.filter(x=>['selesai','verifikasi','persetujuan'].includes(x.assignment.status)).length;const avg=Math.round(assignments.reduce((s,x)=>s+x.assignment.progress,0)/(assignments.length||1));const selected=detail?assignments.find(x=>x.task.id===detail):null
 if(!entered) return <SatkerLanding setView={setView} tasks={tasks} onOpenTelaah={onOpenTelaah} chooseSatker={(code)=>{setSelectedSatker(code);setDetail(null);setEntered(true)}}/>
 return <div className="satker-shell"><header className="satker-header"><Brand/><div className="satker-actions"><div className="current-satker"><Building2/><div><span>Satker aktif</span><strong>{satker.name}</strong></div></div><button className="change-satker" onClick={()=>{setDetail(null);setEntered(false)}}>Ganti satker</button><button className="ghost" onClick={()=>setView('admin')}><LockKeyhole/>Dashboard Korwil</button></div></header><main className="satker-main">{selected?<SatkerTaskDetail item={selected} onBack={()=>setDetail(null)} flash={flash} onRefresh={onRefresh}/>:<><div className="satker-intro"><div><span className="eyebrow">PORTAL SATKER</span><h1>{satker.name}</h1><p>Seluruh pekerjaan BMN aktif berada di halaman ini. Selesaikan pekerjaan sesuai batas waktu dan ajukan untuk diverifikasi Korwil.</p></div><div className="update-chip"><Clock3/>Pembaruan terakhir<br/><strong>{(()=>{const ds=assignments.map(a=>a.assignment.updated).filter(u=>u&&u!=='Belum diperbarui');const latest=ds.sort().reverse()[0];return fmtUpdated(latest??'Belum ada pembaruan')})()}</strong></div></div><section className="satker-summary"><div><span>Pekerjaan aktif</span><strong>{assignments.length}</strong></div><div><span>Selesai / verifikasi</span><strong>{done}</strong></div><div><span>Perlu ditindaklanjuti</span><strong>{assignments.length-done}</strong></div><div className="overall"><span>Progress keseluruhan</span><strong>{avg}%</strong><div className="progress-track"><i style={{width:`${avg}%`}}/></div></div></section><div className="section-title"><div><h2>Daftar pekerjaan</h2><p>Pekerjaan yang ditutup Korwil tidak lagi ditampilkan.</p></div><span>{assignments.length} pekerjaan aktif</span></div><section className="satker-tasks">{assignments.map(({task,assignment})=><article className={`satker-task ${assignment.status==='perbaikan'?'needs-fix':''}`} key={task.id}><div className="satker-task-top"><MethodIcon method={task.method} size={20}/><div className="satker-task-main"><div className="task-meta"><span>{methodMeta[task.method].label}</span>{task.priority==='tinggi'&&<b>Prioritas</b>}</div><h3>{task.title}</h3><p>{task.description}</p></div><StatusPill status={assignment.status}/></div><div className="task-data"><div><span>Batas waktu</span><strong>{task.due}</strong></div><div><span>Progress</span><Progress value={assignment.progress}/></div><div className="missing"><span>Kekurangan</span><strong>{assignment.progress>=100?'Tidak ada':assignment.missing.length?(()=>{const notes=assignment.missing.filter(m=>m.startsWith('Catatan'));const items=assignment.missing.filter(m=>!m.startsWith('Catatan')).slice(0,2);return [...items,...notes].join(' · ')})():'Tidak ada'}</strong></div><button className="primary" onClick={()=>setDetail(task.id)}>{assignment.progress===0?'Mulai':'Lanjutkan'} →</button></div></article>)}</section><section className="help"><CircleAlert/><div><strong>Tidak menemukan pekerjaan?</strong><p>Pekerjaan yang telah diverifikasi dan ditutup dipindahkan ke Data Center Korwil. Hubungi Korwil BMN jika pekerjaan perlu dibuka kembali.</p></div></section></>}</main></div>
}

function SatkerLanding({setView,chooseSatker,tasks,onOpenTelaah}:{setView:(v:View)=>void;chooseSatker:(code:string)=>void;tasks:Task[];onOpenTelaah:()=>void}){
 const [search,setSearch]=useState('')
 const options=satkers.filter(s=>`${s.name} ${s.code}`.toLowerCase().includes(search.toLowerCase()))
 return <div className="satker-landing"><header className="landing-header"><Brand/><div className="landing-header-actions"><button className="ghost telaah-headlink" onClick={onOpenTelaah}><FileText/>Pusat Dokumen</button><button className="ghost" onClick={()=>setView('admin')}><LockKeyhole/>Dashboard Korwil</button></div></header><main className="landing-main"><div className="landing-hero"><div className="landing-copy"><div className="landing-seal"><img src={sipaduLogo} alt="Logo SIPADU BMN Ditjenpas Riau"/></div><span className="eyebrow">SIPADU BMN DITJENPAS RIAU</span><h1>Pilih satuan kerja Anda</h1><p>Satu Portal, Data Terpadu, Tindak Lanjut Terpantau. Pilih satker untuk melihat pekerjaan aktif, progress, kekurangan data, dan batas waktu.</p><label className="satker-search"><Search/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nama atau kode satker"/></label></div><div className="landing-visual"><img src={sipaduBanner} alt="Ilustrasi ekosistem Barang Milik Negara: gedung, kendaraan, peralatan, dokumen, server, dan pengamanan aset"/><span>Tanah · Bangunan · Kendaraan · Peralatan · Dokumen</span></div></div><section className="satker-grid">{options.map(s=>{const asg=tasks.filter(t=>t.active).flatMap(t=>t.assignments.filter(a=>a.satker===s.code));const avg=asg.length?Math.round(asg.reduce((x,a)=>x+a.progress,0)/asg.length):0;const doneN=asg.filter(a=>['selesai','persetujuan'].includes(a.status)).length;return <button className="satker-card" key={s.code} onClick={()=>chooseSatker(s.code)}><div className="satker-card-icon"><Building2/></div><div className="satker-card-body"><span>{s.code}</span><strong>{s.name}</strong>{asg.length>0&&<div className="satker-card-progress"><div className="progress-track"><i style={{width:`${avg}%`}}/></div><small>{avg}% · {doneN}/{asg.length} selesai</small></div>}</div><b>Masuk →</b></button>})}</section>{options.length===0&&<div className="empty-search">Satker tidak ditemukan. Periksa kembali kata pencarian.</div>}</main></div>
}

function SatkerTaskDetail({item,onBack,flash,onRefresh}:{item:{task:Task;assignment:Task['assignments'][number]};onBack:()=>void;flash:(s:string)=>void;onRefresh:()=>Promise<void>}){
 const {task,assignment}=item;const meta=methodMeta[task.method]
 if(task.workflow==='staged-destruction') return <StagedDestructionView task={task} assignment={assignment} flash={flash} onBack={onBack} onRefresh={onRefresh}/>
 const handleSubmitLink=async()=>{try{const nama=(window.prompt('Nama pengirim (operator satker):')||'').trim();if(!nama)return;await submitLinkSubmission({task,satkerCode:assignment.satker,senderName:nama,senderPhone:'',senderNote:'',sheetUrl:task.link??''});flash('Pekerjaan diajukan dan masuk antrean verifikasi Korwil.')}catch(err){flash(err instanceof Error?err.message:'Pengajuan belum dapat dikirim.')}}

 return <div className="task-detail-page"><button className="back" onClick={onBack}><ArrowLeft/>Kembali ke daftar pekerjaan</button><div className="detail-heading"><div className={`method-icon method-${task.method}`}><meta.Icon/></div><div><span>{meta.label}</span><h1>{task.title}</h1><p>{task.description}</p></div><StatusPill status={assignment.status}/></div><div className="detail-layout"><section className="panel detail-content"><div className="detail-progress"><div><span>{task.method==='monitoring'?'Progress pengusulan tiket SIMAN':'Progress pengisian'}</span><strong>{assignment.progress}%</strong></div><div className="progress-track"><i style={{width:`${assignment.progress}%`}}/></div></div>{assignment.missing.length>0&&assignment.progress<100&&<div className="missing-box"><CircleAlert/><div><strong>Data yang masih perlu dilengkapi</strong><ul>{assignment.missing.map(m=><li key={m}>{m}</li>)}</ul></div></div>}{task.method==='monitoring'?<MonitoringProgressView assignment={assignment}/>:task.method==='spreadsheet'?<div><div className="external-work"><FileSpreadsheet/><div><h3>Unggah data dukung ke folder Drive</h3><p>Klik tombol di bawah untuk membuka folder Google Drive pekerjaan ini, lalu unggah dokumen sesuai format yang ditentukan. Setelah selesai, kembali ke portal dan ajukan verifikasi.</p>{task.uploadLink&&<a href={task.uploadLink} target="_blank" rel="noopener noreferrer" className="primary">Upload Data Dukung <ExternalLink/></a>}{!task.uploadLink&&task.link&&<a href={task.link} target="_blank" className="primary">Buka spreadsheet <ExternalLink/></a>}</div></div>{task.references&&task.references.length>0&&<div className="reference-links"><FileSpreadsheet/><div><strong>{task.references?.some(r=>r.label==='Isi Form Pendataan')?'Link Pendataan Google Form':'Peraturan &amp; Format Data Dukung'}</strong><span>{task.references?.some(r=>r.label==='Isi Form Pendataan')?'Buka tautan pendataan sebelum mengunggah bukti:':'Unduh berkas panduan sebelum mengunggah:'}</span><div className="reference-buttons">{task.references.map(r=><a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer" className="ghost">{r.label} <ExternalLink/></a>)}</div></div></div>}</div>:task.method==='upload'?<OpenUploadForm task={task} satkerCode={assignment.satker}/>:['akun-mitra-local','akun-mitra'].includes(task.id)?<AkunMitraForm satkerCode={assignment.satker} onSaved={()=>flash('Draf Akun Mitra diperbarui.')}/>:<PortalForm method={task.method}/>}{task.method!=='upload'&&task.method!=='monitoring'&&!['akun-mitra-local','akun-mitra'].includes(task.id)&&(assignment.progress>=100?<div className="submit-row done-row"><span className="done-message">Selamat, pekerjaan ini telah diselesaikan dan diverifikasi.</span></div>:<div className="submit-row"><button className="primary" onClick={handleSubmitLink}>Ajukan untuk diverifikasi</button><span>Data tidak langsung dinyatakan selesai sebelum diperiksa Korwil.</span></div>)}</section><aside className="panel detail-side"><h3>Informasi pekerjaan</h3><dl><div><dt>Dasar</dt><dd>{task.letter}</dd></div><div><dt>Batas waktu</dt><dd>{task.due}</dd></div><div><dt>Terakhir diperbarui</dt><dd>{fmtUpdated(assignment.updated)}</dd></div><div><dt>Metode</dt><dd>{meta.label}</dd></div></dl><div className="privacy"><ShieldCheck/><p>Data hanya digunakan untuk monitoring pekerjaan BMN Kanwil Ditjenpas Riau.</p></div></aside></div></div>
}

const stagedStorageKey=(taskId:string,satker:string)=>`sipadu_staged_workflow_${taskId}_${satker}`
function readStageStates(taskId:string,satker:string,count:number):StageState[]{
 try{const saved=JSON.parse(localStorage.getItem(stagedStorageKey(taskId,satker))??'null');if(Array.isArray(saved)&&saved.length===count)return saved as StageState[]}catch{/* abaikan */}
 return Array.from({length:count},(_,i)=>i===0?'terbuka':'terkunci')
}

function StagedDestructionView({task,assignment,flash,onBack,onRefresh}:{task:Task;assignment:Task['assignments'][number];flash:(s:string)=>void;onBack:()=>void;onRefresh:()=>Promise<void>}){
 const stages=task.stages??[]
 const usingSupabase=!!(assignment.stageStates&&assignment.stageStates.length===stages.length)
 const [previewStates,setPreviewStates]=useState<StageState[]>(()=>readStageStates(task.id,assignment.satker,stages.length))
 const states:StageState[]=usingSupabase?assignment.stageStates!:previewStates
 const [openStage,setOpenStage]=useState(0)
 const [submitting,setSubmitting]=useState(false)
 const accessTokenPromise: Promise<string|null> = (async()=>{
   try{
     const {supabase}=await import('./lib/supabase')
     if(!supabase)return null
     const res=await supabase.rpc('get_satker_token',{p_code:assignment.satker})
     return typeof res.data === 'string' ? res.data : null
   }catch{return null}
 })()
 const submitStage=async(stage:number)=>{
   if(submitting)return
   setSubmitting(true)
   try{
     if(!usingSupabase){
       setPreviewStates(cur=>cur.map((s,i)=>i===stage?'menunggu_verifikasi':s))
       flash(`[Preview] Tahap ${stage+1} diajukan untuk verifikasi Korwil.`)
       return
     }
     const token=await accessTokenPromise
     if(!token)throw new Error('Token satker tidak ditemukan.')
     const result=await submitStagedStage(token,task.id,stage)
     if(!(result as {ok:boolean}).ok)throw new Error((result as {error?:string}).error??'Pengajuan gagal.')
     flash(`Tahap ${stage+1} diajukan untuk verifikasi Korwil.`)
     await onRefresh()
   }catch(err){
     flash(err instanceof Error?err.message:'Pengajuan belum dapat dikirim.')
   }finally{setSubmitting(false)}
 }
 const completed=states.filter(s=>s==='selesai').length
 const progress=Math.round(completed/(stages.length||1)*100)
 return <div className="task-detail-page"><button className="back" onClick={onBack}><ArrowLeft/>Kembali ke daftar pekerjaan</button><div className="detail-heading"><div className="method-icon method-spreadsheet"><FileSpreadsheet/></div><div><span>Workflow bertahap</span><h1>{task.title}</h1><p>{task.description}</p></div><span className={`status status-${completed===stages.length?'selesai':'proses'}`}><i />{completed===stages.length?'Selesai':'Tahap '+(Math.min(states.findIndex(s=>s!=='selesai'&&s!=='terkunci'),stages.length-1)+1)+' berjalan'}</span></div><div className="detail-layout"><section className="panel detail-content"><div className="detail-progress"><div><span>Progress tahapan</span><strong>{progress}%</strong></div><div className="progress-track"><i style={{width:`${progress}%`}}/></div></div><div className="stage-list">{stages.map((stage,index)=>{const state=states[index];const unlocked=state!=='terkunci';return <article className={`stage-card stage-${state}`} key={stage.id}><button className="stage-card-head" onClick={()=>unlocked&&setOpenStage(index)}><span className="stage-number">{state==='selesai'?<Check size={16}/>:index+1}</span><div><strong>{stage.label}</strong><span>{stage.description}</span></div><StatusPill status={state==='menunggu_verifikasi'?'verifikasi':state==='selesai'?'selesai':state==='perbaikan'?'perbaikan':state==='terkunci'?'belum':'proses'}/></button>{openStage===index&&unlocked&&<div className="stage-body"><h3>Dokumen yang harus diunggah ke Google Drive</h3>{stage.requirements.map(requirement=><div className="stage-file" key={requirement}><div><strong>{requirement}</strong><span>Unggah ke folder Google Drive pekerjaan ini</span></div><b>Wajib</b></div>)}<a className="primary" href={task.uploadLink} target="_blank" rel="noopener noreferrer">Buka Folder Google Drive <ExternalLink/></a>{(state==='terbuka'||state==='perbaikan')&&<button className="primary" disabled={submitting} onClick={()=>void submitStage(index)}>{submitting?'Mengajukan…':'Saya sudah mengunggah — Ajukan Tahap '+(index+1)+' untuk Verifikasi'}</button>}{state==='menunggu_verifikasi'&&<div className="stage-review production"><strong>Menunggu Verifikasi Korwil</strong><span>Tahap ini telah diajukan. Korwil akan memeriksa dokumen di folder Google Drive pekerjaan.</span></div>}{state==='selesai'&&<div className="stage-complete"><Check size={17}/>Tahap telah diverifikasi.</div>}</div>}</article>})}</div></section><aside className="panel detail-side"><h3>Ringkasan tahapan</h3><dl><div><dt>Satker</dt><dd>{satkers.find(s=>s.code===assignment.satker)?.name}</dd></div><div><dt>Tahap selesai</dt><dd>{completed} dari {stages.length}</dd></div><div><dt>Progress assignment</dt><dd>{progress}%</dd></div><div><dt>Folder upload</dt><dd><a href={task.uploadLink} target="_blank" rel="noopener noreferrer">Buka folder Drive <ExternalLink/></a></dd></div></dl><div className="reference-links staged-references"><FileText/><div><strong>Berkas Data Dukung</strong><span>Persetujuan dan template yang diperlukan:</span><div className="reference-buttons">{(task.references??[]).map(reference=><a key={reference.url} href={reference.url} target="_blank" rel="noopener noreferrer" className="ghost">{reference.label} <ExternalLink/></a>)}</div></div></div></aside></div></div>

}

function MonitoringProgressView({assignment}:{assignment:Task['assignments'][number]}){
 const notes=assignment.missing.length?assignment.missing:['Belum ada pembaruan fase dari spreadsheet monitoring.']
 return <div className="monitoring-panel"><div className="monitoring-note"><ShieldCheck/><div><strong>Monitoring dari spreadsheet Korwil</strong><span>Halaman ini hanya menampilkan snapshot monitoring. Satker tidak menginput atau mengirim data melalui portal.</span></div></div><div className="monitoring-calculated"><span>Progress penghapusan terdata</span><strong>{assignment.progress}%</strong><small>{assignment.status==='belum'?'Belum ada pengajuan yang tercatat pada snapshot spreadsheet.':'Status: '+statusLabel[assignment.status]}</small></div><div className="monitoring-readonly"><strong>Informasi tindak lanjut</strong><ul>{notes.map(note=><li key={note}>{note}</li>)}</ul></div><div className="monitoring-readonly"><strong>Sumber data</strong><span>MONITORING_PENGUSULAN_BMN_RUSAK_BERAT_SIMAN.xlsx · snapshot lokal</span><span>Terakhir diperbarui: {assignment.updated}</span></div></div>
}

export function OpenUploadForm({task,satkerCode}:{task:Task;satkerCode:string}){
 const requirements=task.requirements?.length?task.requirements:[{key:'data_dukung',label:'Data Dukung',required:true}]
 const [senderName,setSenderName]=useState(''),[senderPhone,setSenderPhone]=useState(''),[senderNote,setSenderNote]=useState(''),[files,setFiles]=useState<Record<string,File>>({}),[loading,setLoading]=useState(false),[error,setError]=useState(''),[receipt,setReceipt]=useState<{submissionNumber:string;documentCount:number}|null>(null)
 const submit=async(e:FormEvent)=>{e.preventDefault();const missing=requirements.filter(r=>r.required!==false&&!files[r.key]);if(missing.length){setError(`Pilih file: ${missing.map(x=>x.label).join(', ')}`);return}setLoading(true);setError('');try{const selected=requirements.filter(r=>files[r.key]).map(r=>({file:files[r.key],requirementKey:r.key,documentType:r.label}));const result=await createOpenSubmission({task,satkerCode,senderName,senderPhone,senderNote,files:selected});setReceipt(result)}catch(err){setError(err instanceof Error?err.message:'Pengajuan belum dapat dikirim.')}finally{setLoading(false)}}
 if(receipt)return <div className="receipt-card"><div className="receipt-check"><Check/></div><span>DATA BERHASIL DIKIRIM</span><h3>{receipt.submissionNumber}</h3><p>{receipt.documentCount} file telah diterima sistem dan menunggu verifikasi Korwil. Simpan nomor pengiriman ini.</p><button className="ghost" onClick={()=>void navigator.clipboard?.writeText(receipt.submissionNumber)}>Salin nomor pengiriman</button></div>
 return <form className="open-upload-form" onSubmit={submit}><div className="upload-heading"><Upload/><div><h3>Unggah Data Dukung</h3><p>File masuk ke inbox privat dan baru dinyatakan sah setelah diverifikasi Korwil.</p></div></div><div className="sender-grid"><label>Nama pengirim<input required value={senderName} onChange={e=>setSenderName(e.target.value)} placeholder="Nama operator/pengirim"/></label><label>Nomor WhatsApp<input value={senderPhone} onChange={e=>setSenderPhone(e.target.value)} placeholder="08xxxxxxxxxx"/></label><label className="full">Keterangan<textarea value={senderNote} onChange={e=>setSenderNote(e.target.value)} placeholder="Keterangan tambahan (opsional)"/></label></div><div className="requirement-files">{requirements.map(r=><label className={files[r.key]?'has-file':''} key={r.key}><div><strong>{r.label}</strong><span>{files[r.key]?`${files[r.key].name} · ${(files[r.key].size/1024/1024).toFixed(2)} MB`:'PDF, DOCX, XLSX, JPG, PNG, WebP, atau ZIP · maks. 25 MB'}</span></div><input type="file" aria-required={r.required!==false} accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png,.webp,.zip" onChange={e=>{const file=e.target.files?.[0];if(file)setFiles(current=>({...current,[r.key]:file}))}}/><b>{files[r.key]?'Ganti file':'Pilih file'}</b></label>)}</div>{error&&<div className="auth-message error">{error}</div>}<button className="primary upload-submit" disabled={loading}>{loading?'Mengunggah dan memfinalisasi…':'Unggah dan Ajukan ke Korwil'}</button><small className="upload-disclaimer">Dengan mengirim, pengunggah menyatakan file telah dipilih untuk satker dan pekerjaan yang benar.</small></form>
}

function PortalForm({method}:{method:TaskMethod}){return <div className="portal-form"><h3>{method==='upload'?'Unggah data dukung':'Formulir pekerjaan'}</h3><div className="form-grid"><label>Nama dokumen<input placeholder="Contoh: Laporan Pengamanan Aset"/></label><label>Tanggal pelaksanaan<input type="date"/></label><label className="full">Keterangan<textarea placeholder="Tuliskan keterangan pelaksanaan atau kondisi terkini"/></label><label className="upload full"><Upload/><span><strong>Pilih data dukung</strong><small>PDF, XLSX, JPG, atau PNG · maksimum 10 MB</small></span><input type="file"/></label></div><button className="ghost">Simpan draf</button></div>}

export default App
