let histQuery = '';

function initPage(){ if(!requirePermission('viewHistory')) return; renderHistory(); }

function renderHistory(){
  const q = histQuery.toLowerCase();
  const filtered = LOGS.filter(l => !q || (l.action+l.details+l.user).toLowerCase().includes(q));
  document.getElementById('historyBody').innerHTML = `
  <div class="toolbar">
    <input placeholder="Search history…" style="flex:1;min-width:180px;padding:13px 14px;border:1px solid var(--border);border-radius:8px;min-height:48px;"
      value="${esc(histQuery)}" oninput="histQuery=this.value; renderHistory();">
  </div>
  <p class="helptext" style="margin-top:-6px;">Showing ${filtered.length} of ${LOGS.length} (latest 500 kept)</p>
  <div class="card">
    ${filtered.length===0 ? `<div class="empty">No matching activity.</div>` : `
    <p class="scroll-hint">← Swipe sideways to see more columns →</p>
    <table><thead><tr><th>When</th><th>Who</th><th>Role</th><th>Action</th><th>Details</th></tr></thead><tbody>
      ${filtered.map(l=>`<tr>
        <td class="mono" style="font-size:12px;white-space:nowrap;">${fmtTs(l.ts)}</td>
        <td>${esc(l.user)}</td>
        <td><span class="zonetag">${esc(l.role)}</span></td>
        <td>${esc(l.action)}</td>
        <td style="color:var(--muted);">${esc(l.details||'')}</td>
      </tr>`).join('')}
    </tbody></table>`}
  </div>`;
}
