import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Activity, Archive, ArrowLeft, BarChart3, Building2, CalendarDays, Check, CircleAlert, ClipboardCheck, Clock3, Database, ExternalLink, Eye, EyeOff, FileInput, FileSpreadsheet, Filter, KeyRound, LayoutDashboard, LockKeyhole, LogOut, Mail, Menu, Search, Settings, ShieldCheck, Upload, Users, X } from 'lucide-react'
import { satkers, statusLabel, type Task, type TaskMethod, type TaskStatus } from './data'
import { finalTasks } from './finalTasks'
import { createOpenSubmission, createTask, documentPreviewUrl, loadSubmissions, loadTasks, persistAssignmentStatus, persistTaskActive, reviewSubmission, submitLinkSubmission, transferSubmission, type SubmissionRecord } from './lib/repository'
import { currentAdmin, signInAdmin, signOutAdmin, type AdminProfile } from './lib/auth'

const fmtUpdated=(v:string)=>{if(!v||v==='Belum diperbarui')return v;const d=new Date(v);if(isNaN(d.getTime()))return v;return `${d.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})} · ${d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'})} WIB`}
import sipaduBanner from './assets/sipadu-bmn-banner.webp'
import sipaduLogo from './assets/sipadu-bmn-logo.png'
import './App.css'

type View = 'admin' | 'satker'
type FilterState = 'semua' | TaskStatus
type AdminPage = 'summary' | 'tasks' | 'monitoring' | 'data' | 'verification' | 'archive' | 'performance' | 'settings'

const methodMeta: Record<TaskMethod,{label:string; Icon: typeof FileSpreadsheet}> = {
  spreadsheet:{label:'Spreadsheet eksternal',Icon:FileSpreadsheet},
  portal:{label:'Formulir portal',Icon:FileInput},
  upload:{label:'Unggah dokumen',Icon:Upload}
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

  const refreshTasks=async()=>{const result=await loadTasks();setTasks(result.tasks);setDataSource(result.source)}
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
      : <SatkerView tasks={tasks} selectedSatker={selectedSatker} setSelectedSatker={setSelectedSatker} setView={setView} detail={detail} setDetail={setDetail} flash={flash}/>
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
  const pageTitle:Record<AdminPage,string>={summary:'Dashboard Korwil BMN',tasks:'Daftar Pekerjaan',monitoring:'Monitoring Satker',data:'Data Center BMN',verification:'Verifikasi Pekerjaan',archive:'Arsip Pekerjaan',performance:'Kinerja UPT',settings:'Pengaturan Portal'}
  const active=tasks.filter(t=>t.active)
  const allAssignments=active.flatMap(t=>t.assignments.map(a=>({...a,task:t})))
  const delayed=allAssignments.filter(x=>['belum','perbaikan'].includes(x.status)).length
  const verify=allAssignments.filter(x=>x.status==='verifikasi').length
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
        <button className={adminPage==='verification'?'nav-active':''} onClick={()=>setAdminPage('verification')}><ShieldCheck/>Verifikasi <span>{verify}</span></button>
        <button className={adminPage==='archive'?'nav-active':''} onClick={()=>setAdminPage('archive')}><Archive/>Arsip</button>
        <div className="nav-separator" />
        <button className={`${adminPage==='performance'?'nav-active ':''}future`} onClick={()=>setAdminPage('performance')}><BarChart3/>Kinerja UPT <small>Fase berikutnya</small></button>
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
        <Metric label="Menunggu verifikasi" value={verify} hint="Perlu tindakan Korwil" tone="amber" icon={ShieldCheck}/>
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
    {selectedTask&&<TaskDrawer task={selectedTask} onClose={()=>setDetail(null)} onToggle={()=>toggleTask(selectedTask.id)} updateAssignment={updateAssignment}/>} 
    {showCreate&&<CreateTaskModal onClose={()=>setShowCreate(false)} onCreated={async()=>{setShowCreate(false);await onRefresh();setAdminPage('tasks')}}/>}
  </div>
}

export function CreateTaskModal({onClose,onCreated}:{onClose:()=>void;onCreated:()=>Promise<void>}){
 const upt=satkers.filter(s=>s.code!=='692507')
 const [title,setTitle]=useState(''),[description,setDescription]=useState(''),[method,setMethod]=useState<TaskMethod>('upload'),[dueDate,setDueDate]=useState(''),[sourceUrl,setSourceUrl]=useState(''),[sourceLetter,setSourceLetter]=useState(''),[requirements,setRequirements]=useState('Surat Pengantar\nLaporan Pelaksanaan\nDokumentasi'),[targets,setTargets]=useState<string[]>(upt.map(s=>s.code)),[loading,setLoading]=useState(false),[error,setError]=useState('')
 const toggle=(code:string)=>setTargets(current=>current.includes(code)?current.filter(x=>x!==code):[...current,code])
 const submit=async(e:FormEvent)=>{e.preventDefault();if(!targets.length){setError('Pilih minimal satu satker.');return}setLoading(true);setError('');try{await createTask({title,description,method,dueDate:dueDate||undefined,sourceUrl:sourceUrl||undefined,sourceLetter:sourceLetter||undefined,priority:'normal',satkerCodes:targets,requirements:requirements.split('\n').map(x=>x.trim()).filter(Boolean)});await onCreated()}catch(err){setError(err instanceof Error?err.message:'Pekerjaan belum dapat dibuat.');setLoading(false)}}
 return <div className="drawer-backdrop create-backdrop"><section className="create-modal"><div className="drawer-head"><button onClick={onClose}><X/></button><span>Buat Pekerjaan Baru</span></div><form onSubmit={submit}><div className="create-grid"><label className="full">Nama pekerjaan<input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Contoh: Laporan Pengamanan Aset"/></label><label className="full">Deskripsi<textarea required value={description} onChange={e=>setDescription(e.target.value)} placeholder="Jelaskan tujuan dan data yang harus disampaikan"/></label><label>Metode<select value={method} onChange={e=>setMethod(e.target.value as TaskMethod)}><option value="upload">Unggah dokumen</option><option value="spreadsheet">Spreadsheet eksternal</option><option value="portal">Formulir portal</option></select></label><label>Tenggat<input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/></label><label className="full">Dasar surat<input value={sourceLetter} onChange={e=>setSourceLetter(e.target.value)}/></label>{method==='spreadsheet'&&<label className="full">Tautan spreadsheet<input type="url" required value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)}/></label>}<label className="full">Requirement — satu dokumen/field per baris<textarea value={requirements} onChange={e=>setRequirements(e.target.value)}/></label></div><div className="target-head"><div><strong>Satker tujuan</strong><span>{targets.length} UPT dipilih</span></div><button type="button" className="text-button" onClick={()=>setTargets(targets.length===upt.length?[]:upt.map(s=>s.code))}>{targets.length===upt.length?'Batalkan semua':'Pilih semua'}</button></div><div className="target-grid">{upt.map(s=><label key={s.code}><input type="checkbox" checked={targets.includes(s.code)} onChange={()=>toggle(s.code)}/><span>{s.name}</span></label>)}</div>{error&&<div className="auth-message error">{error}</div>}<div className="create-actions"><button type="button" className="ghost" onClick={onClose}>Batal</button><button className="primary" disabled={loading}>{loading?'Menyimpan…':'Buat dan Publikasikan'}</button></div></form></section></div>
}

function AdminSection({page,tasks,onRefresh,setDetail,toggleTask}:{page:Exclude<AdminPage,'summary'>;tasks:Task[];onRefresh:()=>Promise<void>;setDetail:(v:string|null)=>void;toggleTask:(id:string)=>void}){
 const active=tasks.filter(t=>t.active)
 const assignments=active.flatMap(t=>t.assignments.map(a=>({...a,task:t})))
 if(page==='tasks') return <section className="panel admin-page"><div className="panel-head"><div><h2>Seluruh pekerjaan</h2><p>Buka detail untuk mengatur satker, verifikasi, atau menutup pekerjaan.</p></div></div><div className="task-list">{tasks.map(task=>{const progress=Math.round(task.assignments.reduce((s,a)=>s+a.progress,0)/(task.assignments.length||1));return <button className={`task-row ${!task.active?'archived':''}`} key={task.id} onClick={()=>setDetail(task.id)}><MethodIcon method={task.method}/><div className="task-copy"><strong>{task.title}</strong><span>{methodMeta[task.method].label} · {task.assignments.length} satker</span></div><div className="task-date"><CalendarDays/>{task.due}</div><div className="task-progress"><Progress value={progress}/></div><span className={`visibility ${task.active?'open':'closed'}`}>{task.active?'Aktif':'Ditutup'}</span></button>})}</div></section>
 if(page==='monitoring') return <section className="panel admin-page"><div className="panel-head"><div><h2>Status seluruh satker</h2><p>{assignments.length} penugasan aktif dari {active.length} pekerjaan.</p></div></div><div className="table-wrap"><table><thead><tr><th>Satker</th><th>Pekerjaan</th><th>Progress</th><th>Status</th><th>Pembaruan</th><th></th></tr></thead><tbody>{assignments.slice(0,40).map(a=><tr key={`${a.task.id}-${a.satker}`}><td><strong>{satkers.find(s=>s.code===a.satker)?.name}</strong><span>{a.satker}</span></td><td>{a.task.title}<small>{methodMeta[a.task.method].label}</small></td><td><Progress value={a.progress}/></td><td><StatusPill status={a.status}/></td><td>{fmtUpdated(a.updated)}</td><td><button className="link-button" onClick={()=>setDetail(a.task.id)}>Periksa</button></td></tr>)}</tbody></table></div></section>
 if(page==='verification') return <SubmissionInbox onTasksChanged={onRefresh} tasks={tasks}/>
 if(page==='archive') {const archived=tasks.filter(t=>!t.active);return <section className="panel admin-page"><div className="panel-head"><div><h2>Arsip pekerjaan</h2><p>Pekerjaan ditutup tetap tersimpan dan dapat dibuka kembali.</p></div></div>{archived.length===0?<EmptyState icon={Archive} title="Arsip masih kosong" text="Pekerjaan yang ditutup akan tersimpan di sini."/>:<div className="archive-grid">{archived.map(t=><article className="archive-card" key={t.id}><MethodIcon method={t.method}/><div><span>{t.due}</span><h3>{t.title}</h3><p>{t.letter}</p></div><button className="ghost" onClick={()=>toggleTask(t.id)}>Buka kembali</button></article>)}</div>}</section>}
 if(page==='data') return <section className="admin-page"><div className="data-intro"><Database/><div><h2>Data Center BMN</h2><p>Pusat indeks pekerjaan, dokumen, dan riwayat. Pada MVP, berkas masih berupa data contoh dan tautan sumber.</p></div></div><div className="data-grid">{[['Tanah & Bangunan','Data tanah, gedung, pagar, dan dokumen legal'],['Rumah Negara','Status rumah negara, penghuni, dan papan nama'],['Peralatan & Mesin','Kendaraan, perangkat kerja, dan alat keamanan'],['BMN Idle & Rusak Berat','Klarifikasi, tindak lanjut, dan data dukung'],['RKBMN','Hasil penelaahan dan dokumen perencanaan'],['Arsip Pekerjaan',`${tasks.filter(t=>!t.active).length} pekerjaan telah ditutup`]].map(([title,text])=><article className="data-card" key={title}><Archive/><h3>{title}</h3><p>{text}</p><button>Lihat indeks →</button></article>)}</div></section>
 if(page==='performance') return <section className="admin-page"><div className="performance-hero"><BarChart3/><div><span>FASE BERIKUTNYA</span><h2>Rancangan Nilai Kinerja UPT</h2><p>Skor belum diaktifkan sebagai penilaian resmi. Sistem baru menyiapkan rekam data yang dapat diverifikasi.</p></div></div><div className="indicator-grid">{[['Ketepatan waktu','Tanggal selesai dibandingkan dengan tenggat'],['Kelengkapan pertama','Apakah pengajuan pertama sudah lengkap'],['Jumlah perbaikan','Berapa kali data dikembalikan Korwil'],['Konsistensi','Penyelesaian seluruh pekerjaan dalam satu periode']].map(([title,text],i)=><article key={title}><b>{i+1}</b><h3>{title}</h3><p>{text}</p></article>)}</div><div className="policy-note"><CircleAlert/><p>Bobot, pengecualian, dan mekanisme keberatan harus ditetapkan serta disosialisasikan sebelum nilai ditampilkan kepada UPT.</p></div></section>
 return <section className="panel admin-page settings-page"><div className="panel-head"><div><h2>Pengaturan portal</h2><p>Konfigurasi umum prototipe. Penyimpanan permanen memerlukan database.</p></div></div><div className="settings-form"><label>Nama portal<input defaultValue="SIPADU BMN DITJENPAS RIAU"/></label><label>Zona waktu<select defaultValue="WIB"><option>WIB</option></select></label><label className="full">Pesan untuk satker<textarea defaultValue="Selesaikan pekerjaan sesuai batas waktu dan ajukan untuk diverifikasi Korwil BMN."/></label><div className="setting-toggle"><div><strong>Sembunyikan pekerjaan yang ditutup</strong><span>Pekerjaan tertutup tidak muncul pada halaman satker.</span></div><input type="checkbox" defaultChecked/></div><button className="primary">Simpan pengaturan</button></div></section>
}

function SubmissionInbox({onTasksChanged,tasks}:{onTasksChanged:()=>Promise<void>;tasks:Task[]}){
 const [items,setItems]=useState<SubmissionRecord[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notes,setNotes]=useState<Record<string,string>>({}),[targets,setTargets]=useState<Record<string,string>>({}),[filter,setFilter]=useState('menunggu_verifikasi')
 const reload=async()=>{setLoading(true);setError('');try{setItems(await loadSubmissions())}catch(err){setError(err instanceof Error?err.message:'Inbox belum dapat dimuat.')}finally{setLoading(false)}}
 useEffect(()=>{void reload()},[])
 const review=async(item:SubmissionRecord,status:'diterima'|'perlu_perbaikan'|'ditolak')=>{setError('');try{await reviewSubmission(item.id,status,notes[item.id]??'')}catch(err){setError(err instanceof Error?err.message:'Status belum dapat disimpan.')}finally{await Promise.all([reload(),onTasksChanged()])}}
 const transfer=async(item:SubmissionRecord)=>{const target=targets[item.id];if(!target){setError('Pilih satker tujuan.');return}setError('');try{await transferSubmission(item.id,target,notes[item.id]??'')}catch(err){setError(err instanceof Error?err.message:'Pengajuan belum dapat dialihkan.')}finally{await Promise.all([reload(),onTasksChanged()])}}

 const visible=filter==='semua'?items:items.filter(x=>x.status===filter)
 return <section className="panel admin-page submission-inbox"><div className="panel-head"><div><h2>Inbox Verifikasi Dokumen</h2><p>{items.filter(x=>x.status==='menunggu_verifikasi').length} pengajuan menunggu pemeriksaan Korwil.</p></div><select value={filter} onChange={e=>setFilter(e.target.value)}><option value="menunggu_verifikasi">Menunggu verifikasi</option><option value="perlu_perbaikan">Perlu perbaikan</option><option value="diterima">Diterima</option><option value="ditolak">Ditolak</option><option value="dialihkan">Dialihkan</option><option value="semua">Semua pengajuan</option></select></div>{error&&<div className="auth-message error inbox-error">{error}</div>}{loading?<div className="empty-state"><div className="auth-spinner"/><p>Memuat pengajuan…</p></div>:visible.length===0?<EmptyState icon={ShieldCheck} title="Tidak ada pengajuan" text="Pengajuan satker dengan status ini belum tersedia."/>:<div className="submission-list">{visible.map(item=><article className="submission-card" key={item.id}><div className="submission-head"><div><span>{item.submission_number}</span><h3>{item.tasks?.title}</h3><p>{item.satkers?.name} · {item.sender_name}{item.sender_phone?` · ${item.sender_phone}`:''}</p></div><span className={`submission-status sub-${item.status}`}>{item.status.replaceAll('_',' ')}</span></div>{item.sender_note&&<div className="sender-note">“{item.sender_note}”</div>}<div className="document-list">{item.supporting_documents.map(doc=><div key={doc.id}><FileInput/><div><strong>{doc.document_type}</strong><span>{doc.original_filename} · {(doc.file_size/1024/1024).toFixed(2)} MB</span></div><button className="link-button" onClick={async()=>{const url=doc.drive_url??await documentPreviewUrl(doc.stored_path);if(url)window.open(url,'_blank','noopener')}}>Lihat file</button></div>)}</div><button className="link-button drive-folder-link" onClick={()=>{const t=tasks.find(t=>t.id===item.tasks?.task_key);const url=t?.uploadLink;if(url)window.open(url,'_blank','noopener');else setError('Folder data dukung pekerjaan ini tidak tersedia.')}}>Buka folder Data Dukung di Drive <ExternalLink/></button><textarea value={notes[item.id]??item.review_note??''} onChange={e=>setNotes(current=>({...current,[item.id]:e.target.value}))} placeholder="Catatan verifikasi Korwil"/><div className="review-actions"><button className="primary" onClick={()=>void review(item,'diterima')}>Terima</button><button className="ghost" onClick={()=>void review(item,'perlu_perbaikan')}>Perlu perbaikan</button><button className="danger" onClick={()=>void review(item,'ditolak')}>Tolak</button><div className="transfer-control"><select value={targets[item.id]??''} onChange={e=>setTargets(current=>({...current,[item.id]:e.target.value}))}><option value="">Pindahkan ke satker…</option>{satkers.filter(s=>s.code!=='692507'&&s.code!==item.satkers?.code).map(s=><option key={s.code} value={s.code}>{s.name}</option>)}</select><button className="ghost" onClick={()=>void transfer(item)}>Alihkan</button></div></div>{item.status==='diterima'&&<div className="archive-pending"><Archive/><span>{item.supporting_documents.every(d=>d.archive_status==='drive')?'Seluruh file sudah diarsipkan ke Google Drive.':'Diterima — menunggu proses arsip ke Google Drive.'}</span></div>}</article>)}</div>}</section>
}

function EmptyState({icon:Icon,title,text}:{icon:typeof Activity;title:string;text:string}){return <div className="empty-state"><Icon/><h3>{title}</h3><p>{text}</p></div>}

function Metric({label,value,hint,tone,icon:Icon}:{label:string;value:string|number;hint:string;tone:string;icon:typeof Activity}){return <div className="metric"><div className={`metric-icon ${tone}`}><Icon/></div><div><span>{label}</span><strong>{value}</strong><small>{hint}</small></div></div>}

function TaskDrawer({task,onClose,onToggle,updateAssignment}:{task:Task;onClose:()=>void;onToggle:()=>void;updateAssignment:(taskId:string,satker:string,status:TaskStatus)=>void}){
 const [search,setSearch]=useState('');const rows=task.assignments.filter(a=>satkers.find(s=>s.code===a.satker)?.name.toLowerCase().includes(search.toLowerCase()))
 return <div className="drawer-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><aside className="drawer"><div className="drawer-head"><button onClick={onClose}><X/></button><span>Detail pekerjaan</span></div><div className="drawer-title"><MethodIcon method={task.method} size={22}/><div><h2>{task.title}</h2><p>{task.description}</p></div></div><dl><div><dt>Metode</dt><dd>{methodMeta[task.method].label}</dd></div><div><dt>Batas waktu</dt><dd>{task.due}</dd></div><div><dt>Dasar</dt><dd>{task.letter}</dd></div></dl><div className="drawer-actions"><button className={task.active?'danger':'primary'} onClick={onToggle}>{task.active?'Tutup pekerjaan':'Buka kembali'}</button>{task.link&&<a href={task.link} target="_blank">Buka sumber <ExternalLink/></a>}{task.uploadLink&&<a href={task.uploadLink} target="_blank" rel="noopener noreferrer">Data dukung <ExternalLink/></a>}</div><div className="drawer-section"><div className="drawer-section-head"><h3>Penugasan satker</h3><label><Search/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari satker"/></label></div>{rows.map(a=><div className="assignment" key={a.satker}><div><strong>{satkers.find(s=>s.code===a.satker)?.name}</strong><span>{a.missing.length?a.missing.join(' · '):'Tidak ada kekurangan'}</span></div><Progress value={a.progress}/><StatusPill status={a.status}/>{a.status==='verifikasi'&&<div className="mini-actions"><button onClick={()=>updateAssignment(task.id,a.satker,'selesai')}>Setujui</button><button onClick={()=>updateAssignment(task.id,a.satker,'perbaikan')}>Perbaiki</button></div>}</div>)}</div></aside></div>
}

function SatkerView({tasks,selectedSatker,setSelectedSatker,setView,detail,setDetail,flash}:SharedProps&{flash:(s:string)=>void}){
 const [entered,setEntered]=useState(false)
 const satker=satkers.find(s=>s.code===selectedSatker)!;
 const assignments=useMemo(()=>tasks.flatMap(t=>{const a=t.assignments.find(x=>x.satker===selectedSatker);return a?[{task:t,assignment:a}]:[]}).filter(x=>x.task.active),[tasks,selectedSatker])
 const done=assignments.filter(x=>['selesai','verifikasi','persetujuan'].includes(x.assignment.status)).length;const avg=Math.round(assignments.reduce((s,x)=>s+x.assignment.progress,0)/(assignments.length||1));const selected=detail?assignments.find(x=>x.task.id===detail):null
 if(!entered) return <SatkerLanding setView={setView} tasks={tasks} chooseSatker={(code)=>{setSelectedSatker(code);setDetail(null);setEntered(true)}}/>
 return <div className="satker-shell"><header className="satker-header"><Brand/><div className="satker-actions"><div className="current-satker"><Building2/><div><span>Satker aktif</span><strong>{satker.name}</strong></div></div><button className="change-satker" onClick={()=>{setDetail(null);setEntered(false)}}>Ganti satker</button><button className="ghost" onClick={()=>setView('admin')}><LockKeyhole/>Dashboard Korwil</button></div></header><main className="satker-main">{selected?<SatkerTaskDetail item={selected} onBack={()=>setDetail(null)} flash={flash}/>:<><div className="satker-intro"><div><span className="eyebrow">PORTAL SATKER</span><h1>{satker.name}</h1><p>Seluruh pekerjaan BMN aktif berada di halaman ini. Selesaikan pekerjaan sesuai batas waktu dan ajukan untuk diverifikasi Korwil.</p></div><div className="update-chip"><Clock3/>Pembaruan terakhir<br/><strong>{(()=>{const ds=assignments.map(a=>a.assignment.updated).filter(u=>u&&u!=='Belum diperbarui');const latest=ds.sort().reverse()[0];return fmtUpdated(latest??'Belum ada pembaruan')})()}</strong></div></div><section className="satker-summary"><div><span>Pekerjaan aktif</span><strong>{assignments.length}</strong></div><div><span>Selesai / verifikasi</span><strong>{done}</strong></div><div><span>Perlu ditindaklanjuti</span><strong>{assignments.length-done}</strong></div><div className="overall"><span>Progress keseluruhan</span><strong>{avg}%</strong><div className="progress-track"><i style={{width:`${avg}%`}}/></div></div></section><div className="section-title"><div><h2>Daftar pekerjaan</h2><p>Pekerjaan yang ditutup Korwil tidak lagi ditampilkan.</p></div><span>{assignments.length} pekerjaan aktif</span></div><section className="satker-tasks">{assignments.map(({task,assignment})=><article className={`satker-task ${assignment.status==='perbaikan'?'needs-fix':''}`} key={task.id}><div className="satker-task-top"><MethodIcon method={task.method} size={20}/><div className="satker-task-main"><div className="task-meta"><span>{methodMeta[task.method].label}</span>{task.priority==='tinggi'&&<b>Prioritas</b>}</div><h3>{task.title}</h3><p>{task.description}</p></div><StatusPill status={assignment.status}/></div><div className="task-data"><div><span>Batas waktu</span><strong>{task.due}</strong></div><div><span>Progress</span><Progress value={assignment.progress}/></div><div className="missing"><span>Kekurangan</span><strong>{assignment.progress>=100?'Tidak ada':assignment.missing.length?(()=>{const notes=assignment.missing.filter(m=>m.startsWith('Catatan'));const items=assignment.missing.filter(m=>!m.startsWith('Catatan')).slice(0,2);return [...items,...notes].join(' · ')})():'Tidak ada'}</strong></div><button className="primary" onClick={()=>setDetail(task.id)}>{assignment.progress===0?'Mulai':'Lanjutkan'} →</button></div></article>)}</section><section className="help"><CircleAlert/><div><strong>Tidak menemukan pekerjaan?</strong><p>Pekerjaan yang telah diverifikasi dan ditutup dipindahkan ke Data Center Korwil. Hubungi Korwil BMN jika pekerjaan perlu dibuka kembali.</p></div></section></>}</main></div>
}

function SatkerLanding({setView,chooseSatker,tasks}:{setView:(v:View)=>void;chooseSatker:(code:string)=>void;tasks:Task[]}){
 const [search,setSearch]=useState('')
 const options=satkers.filter(s=>`${s.name} ${s.code}`.toLowerCase().includes(search.toLowerCase()))
 return <div className="satker-landing"><header className="landing-header"><Brand/><button className="ghost" onClick={()=>setView('admin')}><LockKeyhole/>Dashboard Korwil</button></header><main className="landing-main"><div className="landing-hero"><div className="landing-copy"><div className="landing-seal"><img src={sipaduLogo} alt="Logo SIPADU BMN Ditjenpas Riau"/></div><span className="eyebrow">SIPADU BMN DITJENPAS RIAU</span><h1>Pilih satuan kerja Anda</h1><p>Satu Portal, Data Terpadu, Tindak Lanjut Terpantau. Pilih satker untuk melihat pekerjaan aktif, progress, kekurangan data, dan batas waktu.</p><label className="satker-search"><Search/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nama atau kode satker"/></label></div><div className="landing-visual"><img src={sipaduBanner} alt="Ilustrasi ekosistem Barang Milik Negara: gedung, kendaraan, peralatan, dokumen, server, dan pengamanan aset"/><span>Tanah · Bangunan · Kendaraan · Peralatan · Dokumen</span></div></div><section className="satker-grid">{options.map(s=>{const asg=tasks.filter(t=>t.active).flatMap(t=>t.assignments.filter(a=>a.satker===s.code));const avg=asg.length?Math.round(asg.reduce((x,a)=>x+a.progress,0)/asg.length):0;const doneN=asg.filter(a=>['selesai','persetujuan'].includes(a.status)).length;return <button className="satker-card" key={s.code} onClick={()=>chooseSatker(s.code)}><div className="satker-card-icon"><Building2/></div><div className="satker-card-body"><span>{s.code}</span><strong>{s.name}</strong>{asg.length>0&&<div className="satker-card-progress"><div className="progress-track"><i style={{width:`${avg}%`}}/></div><small>{avg}% · {doneN}/{asg.length} selesai</small></div>}</div><b>Masuk →</b></button>})}</section>{options.length===0&&<div className="empty-search">Satker tidak ditemukan. Periksa kembali kata pencarian.</div>}<div className="landing-note"><ShieldCheck/><p>Portal satker tidak memerlukan login. Pastikan memilih satuan kerja yang benar sebelum melanjutkan.</p></div></main></div>
}

function SatkerTaskDetail({item,onBack,flash}:{item:{task:Task;assignment:Task['assignments'][number]};onBack:()=>void;flash:(s:string)=>void}){
 const {task,assignment}=item;const meta=methodMeta[task.method]
 const handleSubmitLink=async()=>{try{const nama=(window.prompt('Nama pengirim (operator satker):')||'').trim();if(!nama)return;await submitLinkSubmission({task,satkerCode:assignment.satker,senderName:nama,senderPhone:'',senderNote:'',sheetUrl:task.link??''});flash('Pekerjaan diajukan dan masuk antrean verifikasi Korwil.')}catch(err){flash(err instanceof Error?err.message:'Pengajuan belum dapat dikirim.')}}
 return <div className="task-detail-page"><button className="back" onClick={onBack}><ArrowLeft/>Kembali ke daftar pekerjaan</button><div className="detail-heading"><div className={`method-icon method-${task.method}`}><meta.Icon/></div><div><span>{meta.label}</span><h1>{task.title}</h1><p>{task.description}</p></div><StatusPill status={assignment.status}/></div><div className="detail-layout"><section className="panel detail-content"><div className="detail-progress"><div><span>Progress pengisian</span><strong>{assignment.progress}%</strong></div><div className="progress-track"><i style={{width:`${assignment.progress}%`}}/></div></div>{assignment.missing.length>0&&assignment.progress<100&&<div className="missing-box"><CircleAlert/><div><strong>Data yang masih perlu dilengkapi</strong><ul>{assignment.missing.map(m=><li key={m}>{m}</li>)}</ul></div></div>}{task.method==='spreadsheet'?<div><div className="external-work"><FileSpreadsheet/><div><h3>Unggah data dukung ke folder Drive</h3><p>Klik tombol di bawah untuk membuka folder Google Drive pekerjaan ini, lalu unggah dokumen sesuai format yang ditentukan. Setelah selesai, kembali ke portal dan ajukan verifikasi.</p>{task.uploadLink&&<a href={task.uploadLink} target="_blank" rel="noopener noreferrer" className="primary">Upload Data Dukung <ExternalLink/></a>}{!task.uploadLink&&task.link&&<a href={task.link} target="_blank" className="primary">Buka spreadsheet <ExternalLink/></a>}</div></div>{task.references&&task.references.length>0&&<div className="reference-links"><FileSpreadsheet/><div><strong>Peraturan &amp; Format Data Dukung</strong><span>Unduh berkas panduan sebelum mengunggah:</span><div className="reference-buttons">{task.references.map(r=><a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer" className="ghost">{r.label} <ExternalLink/></a>)}</div></div></div>}</div>:task.method==='upload'?<OpenUploadForm task={task} satkerCode={assignment.satker}/>:<PortalForm method={task.method}/>}{task.method!=='upload'&&(assignment.progress>=100?<div className="submit-row done-row"><span className="done-message">🎉 Selamat, Anda telah menyelesaikan pekerjaan ini!</span></div>:<div className="submit-row"><button className="primary" onClick={handleSubmitLink}>Ajukan untuk diverifikasi</button><span>Data tidak langsung dinyatakan selesai sebelum diperiksa Korwil.</span></div>)}</section><aside className="panel detail-side"><h3>Informasi pekerjaan</h3><dl><div><dt>Dasar</dt><dd>{task.letter}</dd></div><div><dt>Batas waktu</dt><dd>{task.due}</dd></div><div><dt>Terakhir diperbarui</dt><dd>{fmtUpdated(assignment.updated)}</dd></div><div><dt>Metode</dt><dd>{meta.label}</dd></div></dl><div className="privacy"><ShieldCheck/><p>Data hanya digunakan untuk monitoring pekerjaan BMN Kanwil Ditjenpas Riau.</p></div></aside></div></div>
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
