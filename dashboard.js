function initPage(){ renderDashboard(); }

function renderDashboard(){
  const activeEmp = EMPLOYEES.filter(e=>e.active!==false);
  const recent = LOGS.slice(0,6);
  document.getElementById('dashboardBody').innerHTML = `
  <div class="grid cards4" style="margin-bottom:6px;">
    <div class="card stat"><div class="num">${ZONES.length}</div><div class="lbl">Zones</div></div>
    <div class="card stat"><div class="num">${activeEmp.length}</div><div class="lbl">Active employees</div></div>
    <div class="card stat"><div class="num">${EMPLOYEES.length - activeEmp.length}</div><div class="lbl">Inactive employees</div></div>
    <div class="card stat"><div class="num">${LOGS.length}</div><div class="lbl">Logged actions</div></div>
  </div>
  <div class="card">
    <div class="section-head"><h2>Recent activity</h2><a href="history.html" style="font-size:12.5px;color:var(--muted);">View full history →</a></div>
    ${recent.length===0 ? `<div class="empty">No activity yet.</div>` : `
    <p class="scroll-hint">← Swipe sideways to see more columns →</p>
    <table><thead><tr><th>When</th><th>Who</th><th>Action</th></tr></thead><tbody>
      ${recent.map(l=>`<tr><td class="mono" style="font-size:12.5px;white-space:nowrap;">${fmtTs(l.ts)}</td><td>${esc(l.user)} <span class="zonetag">${l.role}</span></td><td>${esc(l.action)}${l.details?' — <span style="color:var(--muted)">'+esc(l.details)+'</span>':''}</td></tr>`).join('')}
    </tbody></table>`}
  </div>`;
}
