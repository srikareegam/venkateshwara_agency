let dailyDate = null;
let DAILY_CACHE = {};
let DAILY_DIRTY = new Set();
let DAILY_LOADED_MONTH = null;

function initPage(){
  dailyDate = todayISODate();
  renderDaily();
}

function setDailyDate(newDate){
  if(DAILY_DIRTY.size>0 && !confirm('You have unsaved changes for this date. Discard them?')){
    const picker = document.getElementById('dailyDatePicker');
    if(picker) picker.value = dailyDate;
    return;
  }
  dailyDate = newDate;
  renderDaily();
}
function shiftDailyDate(delta){
  const d = new Date(dailyDate+'T00:00:00');
  d.setDate(d.getDate()+delta);
  const newDate = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  setDailyDate(newDate);
}

async function renderDaily(){
  const date = dailyDate;
  const activeEmp = EMPLOYEES.filter(e=>e.active!==false);
  const dateLabel = new Date(date+'T00:00:00').toLocaleDateString('en-IN', {weekday:'long', day:'2-digit', month:'long', year:'numeric'});
  document.getElementById('dailyBody').innerHTML = `
  <div class="toolbar">
    <button class="btn btn-outline btn-sm" onclick="shiftDailyDate(-1)">‹ Prev</button>
    <div class="field" style="margin:0;flex:1;min-width:130px;"><label>Date</label><input type="date" id="dailyDatePicker" value="${date}" onchange="setDailyDate(this.value)"></div>
    <button class="btn btn-outline btn-sm" onclick="shiftDailyDate(1)">Next ›</button>
    <button class="btn btn-outline btn-sm" onclick="setDailyDate(todayISODate())">Today</button>
    <div style="display:flex;gap:8px;width:100%;margin-top:2px;">
      <button class="btn btn-outline btn-sm" style="flex:1;" onclick="dailyMarkAll('P')">Mark all Present</button>
      <button class="btn btn-primary" style="flex:1;" onclick="saveDailyAttendance()">Save attendance</button>
    </div>
  </div>
  ${activeEmp.length===0 ? `<div class="card"><div class="empty"><div class="big">No active employees</div>Add employees before marking attendance.</div></div>` : `
  <div class="card">
    <div class="section-head"><h2>${dateLabel}</h2></div>
    <div class="legend">
      <span><span class="dot" style="background:#3B6B4A;"></span>Present</span>
      <span><span class="dot" style="background:#8A6417;"></span>Half-day</span>
      <span><span class="dot" style="background:#8C3230;"></span>Absent</span>
      <span><span class="dot" style="background:#465580;"></span>Leave</span>
    </div>
    <p class="helptext" style="margin-bottom:14px;">Tap a name's status to cycle Present → Half-day → Absent → Leave → blank, then Save.</p>
    <table><thead><tr><th>Employee</th><th>Zone</th><th style="text-align:center;">Status</th></tr></thead>
    <tbody id="dailyTbody">
      ${activeEmp.map(e=>`
      <tr>
        <td id="dname-${e.id}"><b>${esc(e.name)}</b></td>
        <td><span class="zonetag">${esc(zoneName(e.zoneId))}</span></td>
        <td style="text-align:center;"><button class="daily-pill" id="dpill-${e.id}" onclick="cycleDaily('${e.id}')">Tap to mark</button></td>
      </tr>`).join('')}
    </tbody></table>
  </div>`}`;
  await bindDailyEvents();
}

async function bindDailyEvents(){
  const month = dailyDate.slice(0,7);
  if(DAILY_LOADED_MONTH !== month){
    DAILY_CACHE = {}; DAILY_DIRTY.clear(); DAILY_LOADED_MONTH = month;
  }
  const activeEmp = EMPLOYEES.filter(e=>e.active!==false);
  for(const e of activeEmp){
    if(!(e.id in DAILY_CACHE)){
      DAILY_CACHE[e.id] = await sget(attKey(e.id, month)) || {};
    }
    refreshDailyPill(e.id);
    if(DAILY_DIRTY.has(e.id)){
      const nameCell = document.getElementById('dname-'+e.id);
      if(nameCell && !nameCell.querySelector('.dirty-dot')) nameCell.insertAdjacentHTML('beforeend', '<span class="dirty-dot" title="Unsaved change"></span>');
    }
  }
}

function refreshDailyPill(empId){
  const day = Number(dailyDate.split('-')[2]);
  const st = DAILY_CACHE[empId] ? DAILY_CACHE[empId][day] : undefined;
  const el = document.getElementById('dpill-'+empId);
  if(!el) return;
  const labels = {P:'✓ Present', H:'H  Half-day', A:'✕ Absent', L:'—  Leave'};
  el.className = 'daily-pill' + (st ? ' st-'+st : '');
  el.textContent = st ? labels[st] : 'Tap to mark';
}

function cycleDaily(empId){
  const day = Number(dailyDate.split('-')[2]);
  if(!DAILY_CACHE[empId]) DAILY_CACHE[empId] = {};
  const cur = DAILY_CACHE[empId][day];
  const idx = STATUS_CYCLE.indexOf(cur);
  const next = STATUS_CYCLE[(idx+1) % STATUS_CYCLE.length];
  if(next===undefined) delete DAILY_CACHE[empId][day]; else DAILY_CACHE[empId][day] = next;
  DAILY_DIRTY.add(empId);
  refreshDailyPill(empId);
  const nameCell = document.getElementById('dname-'+empId);
  if(nameCell && !nameCell.querySelector('.dirty-dot')) nameCell.insertAdjacentHTML('beforeend', '<span class="dirty-dot" title="Unsaved change"></span>');
}

function dailyMarkAll(status){
  const day = Number(dailyDate.split('-')[2]);
  EMPLOYEES.filter(e=>e.active!==false).forEach(e=>{
    if(!DAILY_CACHE[e.id]) DAILY_CACHE[e.id] = {};
    DAILY_CACHE[e.id][day] = status;
    DAILY_DIRTY.add(e.id);
  });
  renderDaily();
}

async function saveDailyAttendance(){
  if(DAILY_DIRTY.size===0){ toast('No changes to save.'); return; }
  const month = dailyDate.slice(0,7);
  const ids = Array.from(DAILY_DIRTY);
  for(const empId of ids){
    await sset(attKey(empId, month), DAILY_CACHE[empId]);
  }
  const names = EMPLOYEES.filter(e=>ids.includes(e.id)).map(e=>e.name);
  const dateLabel = new Date(dailyDate+'T00:00:00').toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'});
  await logAction('Updated daily attendance', `${dateLabel} — ${names.length} employee(s): ${names.slice(0,6).join(', ')}${names.length>6?'…':''}`);
  DAILY_DIRTY.clear();
  renderDaily();
  toast('Daily attendance saved.');
}
