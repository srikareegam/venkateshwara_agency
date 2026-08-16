let attMonth = null;
let ATT_CACHE = {};

function initPage(){
  if(!requirePermission('monthlyAttendance')) return;
  attMonth = todayYYYYMM();
  renderAttendance();
}

function renderAttendance(){
  const activeEmp = visibleEmployees().filter(e=>e.active!==false);
  document.getElementById('attendanceBody').innerHTML = `
  <div class="toolbar">
    <div class="field" style="margin:0;"><label>Month</label><input type="month" id="attMonthPicker" value="${attMonth}" onchange="attMonth=this.value; renderAttendance();"></div>
  </div>
  ${activeEmp.length===0 ? `<div class="card"><div class="empty"><div class="big">No active employees</div>Add employees before marking attendance.</div></div>` : `
  <div class="card">
    <div class="section-head"><h2>${monthLabel(attMonth)}</h2></div>
    <p class="scroll-hint">← Swipe sideways to see more columns →</p>
    <table><thead><tr><th>Employee</th><th>Zone</th><th>Present</th><th>Half-day</th><th>Absent</th><th>Leave</th><th></th></tr></thead>
    <tbody id="attTbody">
      ${activeEmp.map(e=>`
      <tr data-emp="${e.id}">
        <td><b>${esc(e.name)}</b></td>
        <td><span class="zonetag">${esc(zoneName(e.zoneId))}</span></td>
        <td class="num-cell" id="sumP-${e.id}">…</td>
        <td class="num-cell" id="sumH-${e.id}">…</td>
        <td class="num-cell deduction" id="sumA-${e.id}">…</td>
        <td class="num-cell" id="sumL-${e.id}">…</td>
        <td style="text-align:right;"><button class="btn btn-outline btn-sm" onclick="openAttendanceModal('${e.id}','${attMonth}')">Mark days</button></td>
      </tr>`).join('')}
    </tbody></table>
  </div>`}`;
  bindAttendanceEvents();
}

async function bindAttendanceEvents(){
  const activeEmp = visibleEmployees().filter(e=>e.active!==false);
  for(const e of activeEmp){
    const data = await sget(attKey(e.id, attMonth)) || {};
    ATT_CACHE[attKey(e.id, attMonth)] = data;
    const s = summarize(data);
    const setEl = (id,val)=>{ const el=document.getElementById(id); if(el) el.textContent = val; };
    setEl(`sumP-${e.id}`, s.P); setEl(`sumH-${e.id}`, s.H); setEl(`sumA-${e.id}`, s.A); setEl(`sumL-${e.id}`, s.L);
  }
}

function openAttendanceModal(empId, month){
  if(!canDo('monthlyAttendance')) return toast("You don't have permission to mark attendance.");
  const emp = EMPLOYEES.find(e=>e.id===empId);
  const key = attKey(empId, month);
  const data = ATT_CACHE[key] || {};
  const totalDays = daysInCalMonth(month);
  const [y,m] = month.split('-').map(Number);
  const firstDow = new Date(y, m-1, 1).getDay();

  let cells = '';
  for(let i=0;i<firstDow;i++) cells += `<div></div>`;
  for(let d=1; d<=totalDays; d++){
    const st = data[d];
    cells += `<div class="dcell ${st?'st-'+st:''}" data-day="${d}" onclick="cycleDay(${d})">
      <div class="dn">${d}</div><div>${st||'—'}</div>
    </div>`;
  }

  document.body.insertAdjacentHTML('beforeend', `
  <div class="modal-bg" id="attModal">
    <div class="modal" style="max-width:520px;">
      <h3>${esc(emp.name)} — ${monthLabel(month)}</h3>
      <div class="legend">
        <span><span class="dot" style="background:#3B6B4A;"></span>P = Present</span>
        <span><span class="dot" style="background:#8A6417;"></span>H = Half-day</span>
        <span><span class="dot" style="background:#8C3230;"></span>A = Absent</span>
        <span><span class="dot" style="background:#465580;"></span>L = Leave</span>
      </div>
      <p class="helptext">Tap a day to cycle through Present → Half-day → Absent → Leave → blank.</p>
      <div class="cal" id="calGrid">${cells}</div>
      <div style="display:flex;gap:10px;">
        <button class="btn btn-outline btn-sm" onclick="markAllPresent(${totalDays})">Mark all Present</button>
        <button class="btn btn-outline btn-sm" onclick="clearAllDays()">Clear all</button>
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="closeModal('attModal')">Cancel</button>
        <button class="btn btn-primary" style="width:auto;" onclick="saveAttendance('${empId}','${month}')">Save attendance</button>
      </div>
    </div>
  </div>`);
  window.__calData = {...data};
}

function refreshCalGrid(){
  document.querySelectorAll('#calGrid .dcell[data-day]').forEach(cell=>{
    const d = cell.getAttribute('data-day');
    const st = window.__calData[d];
    cell.className = 'dcell ' + (st ? 'st-'+st : '');
    cell.innerHTML = `<div class="dn">${d}</div><div>${st||'—'}</div>`;
  });
}
function cycleDay(day){
  const cur = window.__calData[day];
  const idx = STATUS_CYCLE.indexOf(cur);
  const next = STATUS_CYCLE[(idx+1) % STATUS_CYCLE.length];
  if(next === undefined) delete window.__calData[day];
  else window.__calData[day] = next;
  refreshCalGrid();
}
function markAllPresent(totalDays){
  for(let d=1; d<=totalDays; d++) window.__calData[d] = 'P';
  refreshCalGrid();
}
function clearAllDays(){ window.__calData = {}; refreshCalGrid(); }

async function saveAttendance(empId, month){
  if(!canDo('monthlyAttendance')) return toast("You don't have permission to mark attendance.");
  const key = attKey(empId, month);
  await sset(key, window.__calData);
  ATT_CACHE[key] = {...window.__calData};
  const emp = EMPLOYEES.find(e=>e.id===empId);
  await logAction('Updated attendance', `${emp.name} — ${monthLabel(month)}`);
  closeModal('attModal');
  bindAttendanceEvents();
  toast('Attendance saved.');
}
