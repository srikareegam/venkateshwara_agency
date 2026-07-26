/* ============================= SHARED STATE ============================= */
let session = null; // {role, username}
let ZONES = [], EMPLOYEES = [], SETTINGS = {}, LOGS = [];
const DEFAULT_SETTINGS = { salaryDayBasis: 'calendar', defaultPfPercent: 12 };

async function loadAllData(){
  ZONES = await sget('zones') || [];
  EMPLOYEES = await sget('employees') || [];
  SETTINGS = await sget('settings') || {...DEFAULT_SETTINGS};
  LOGS = await sget('logs') || [];
}

async function logAction(action, details=''){
  let logs = await sget('logs') || [];
  logs.unshift({ id: uid(), ts: Date.now(), user: session ? session.username : 'system', role: session ? session.role : '-', action, details });
  if(logs.length > 500) logs = logs.slice(0,500);
  await sset('logs', logs);
  LOGS = logs;
}

/* ============================= UTIL ============================= */
function uid(){ return (crypto.randomUUID ? crypto.randomUUID() : 'id-'+Math.random().toString(36).slice(2)+Date.now()); }
function inr(n){ if(isNaN(n)) n=0; return '₹' + Number(n).toLocaleString('en-IN', {maximumFractionDigits:2, minimumFractionDigits:2}); }
function esc(s){ const d=document.createElement('div'); d.textContent = s==null?'':String(s); return d.innerHTML; }
function monthLabel(yyyymm){
  const [y,m] = yyyymm.split('-').map(Number);
  return new Date(y, m-1, 1).toLocaleString('en-IN', {month:'long', year:'numeric'});
}
function todayYYYYMM(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); }
function todayISODate(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function daysInCalMonth(yyyymm){ const [y,m]=yyyymm.split('-').map(Number); return new Date(y,m,0).getDate(); }
function fmtTs(ts){ return new Date(ts).toLocaleString('en-IN', {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
function zoneName(id){ const z = ZONES.find(z=>z.id===id); return z ? z.name : '—'; }
function empCountForZone(zoneId){ return EMPLOYEES.filter(e=>e.zoneId===zoneId && e.active!==false).length; }

let toastTimer=null;
function toast(msg){
  let t = document.getElementById('toast');
  if(t) t.remove();
  t = document.createElement('div'); t.id='toast'; t.className='toast'; t.textContent = msg;
  document.body.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.remove(), 3200);
}

/* ============================= ATTENDANCE / SALARY SHARED LOGIC ============================= */
const STATUS_CYCLE = [undefined, 'P', 'H', 'A', 'L'];
function attKey(empId, yyyymm){ return `att:${empId}:${yyyymm}`; }

function summarize(dataObj){
  let P=0,A=0,H=0,L=0;
  Object.values(dataObj||{}).forEach(v=>{ if(v==='P')P++; else if(v==='A')A++; else if(v==='H')H++; else if(v==='L')L++; });
  return {P,A,H,L, marked:P+A+H+L};
}
function salaryBasisDays(month){
  if(SETTINGS.salaryDayBasis === 'calendar') return daysInCalMonth(month);
  return Number(SETTINGS.salaryDayBasis);
}
function computeSalary(emp, attData, month){
  const s = summarize(attData);
  const presentEquiv = s.P + s.H*0.5;
  const basisDays = salaryBasisDays(month);
  const perDay = basisDays ? emp.monthlySalary / basisDays : 0;
  const gross = perDay * presentEquiv;
  const pf = gross * (emp.pfPercent/100);
  const net = gross - pf;
  return { ...s, presentEquiv, basisDays, perDay, gross, pf, net };
}

/* ============================= MODAL HELPER ============================= */
function closeModal(id){ const m = document.getElementById(id); if(m) m.remove(); }
