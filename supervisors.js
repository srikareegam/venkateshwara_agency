let visiblePasswords = new Set();

function initPage(){ if(!requireOwner()) return; renderSupervisors(); }

function supervisorZoneNames(sup){
  const ids = sup.zoneIds || [];
  if(ids.length===0) return '<span style="color:var(--muted);">No zones assigned</span>';
  return ids.map(id=>`<span class="zonetag">${esc(zoneName(id))}</span>`).join(' ');
}

function supervisorPermSummary(sup){
  const perms = {...DEFAULT_PERMISSIONS, ...(sup.permissions||{})};
  const on = PERMISSION_KEYS.filter(k=>perms[k]);
  if(on.length===0) return '<span style="color:var(--muted);">No permissions</span>';
  return on.map(k=>`<span class="zonetag">${esc(PERMISSION_LABELS[k])}</span>`).join(' ');
}

function renderSupervisors(){
  document.getElementById('supervisorsBody').innerHTML = `
  <div class="toolbar">
    <button class="btn btn-brass" onclick="openSupervisorModal()" ${ZONES.length===0?'disabled title="Add a zone first"':''}>+ Add supervisor</button>
  </div>
  ${ZONES.length===0 ? `<div class="card"><div class="empty"><div class="big">Add a zone first</div>Supervisors are assigned to zones, so create at least one zone before adding a supervisor.</div></div>` : ''}
  <div class="card">
    ${SUPERVISORS.length===0 ? `<div class="empty"><div class="big">No supervisors yet</div>Tap "Add supervisor" to create a login, assign zones and choose what they can do.</div></div>` : `
    <p class="scroll-hint">← Swipe sideways to see more columns →</p>
    <table><thead><tr><th>Name</th><th>Username</th><th>Password</th><th>Zones</th><th>Permissions</th><th>Status</th><th></th></tr></thead><tbody>
      ${SUPERVISORS.map(s=>`
      <tr style="${s.active===false?'opacity:0.5;':''}">
        <td><b>${esc(s.name)}</b></td>
        <td class="mono">${esc(s.username)}</td>
        <td class="mono">
          <span id="pw-${s.id}">${visiblePasswords.has(s.id) ? esc(s.password) : '••••••••'}</span>
          <button class="btn btn-outline btn-sm" style="margin-left:6px;" onclick="togglePasswordVisible('${s.id}')">${visiblePasswords.has(s.id)?'Hide':'Show'}</button>
        </td>
        <td style="max-width:220px;">${supervisorZoneNames(s)}</td>
        <td style="max-width:260px;">${supervisorPermSummary(s)}</td>
        <td>${s.active===false ? '<span class="badge badge-A">Inactive</span>' : '<span class="badge badge-P">Active</span>'}</td>
        <td style="text-align:right;white-space:nowrap;">
          <button class="btn btn-outline btn-sm" onclick="openSupervisorModal('${s.id}')">Edit</button>
          <button class="btn ${s.active===false?'btn-outline':'btn-danger'} btn-sm" onclick="toggleSupervisorActive('${s.id}')">${s.active===false?'Reactivate':'Deactivate'}</button>
        </td>
      </tr>`).join('')}
    </tbody></table>`}
  </div>`;
}

function togglePasswordVisible(id){
  if(visiblePasswords.has(id)) visiblePasswords.delete(id); else visiblePasswords.add(id);
  renderSupervisors();
}

function openSupervisorModal(id){
  const editing = !!id;
  const s = editing ? SUPERVISORS.find(x=>x.id===id) : null;
  const zoneIds = s ? (s.zoneIds||[]) : [];
  const perms = {...DEFAULT_PERMISSIONS, ...(s?s.permissions:{})};

  const zoneChecks = ZONES.map(z=>`
    <label style="display:flex;align-items:center;gap:8px;padding:8px 0;font-size:14px;">
      <input type="checkbox" class="sup-zone-check" value="${z.id}" ${zoneIds.includes(z.id)?'checked':''}> ${esc(z.name)}
    </label>`).join('');

  const permChecks = PERMISSION_KEYS.map(k=>`
    <label style="display:flex;align-items:center;gap:8px;padding:8px 0;font-size:14px;">
      <input type="checkbox" class="sup-perm-check" value="${k}" ${perms[k]?'checked':''}> ${esc(PERMISSION_LABELS[k])}
    </label>`).join('');

  document.body.insertAdjacentHTML('beforeend', `
  <div class="modal-bg" id="supModal">
    <div class="modal" style="max-width:520px;">
      <h3>${editing?'Edit supervisor':'Add supervisor'}</h3>
      <div class="field"><label>Full name</label><input id="supName" value="${s?esc(s.name):''}" placeholder="e.g. Ramesh Kumar"></div>
      <div class="row">
        <div class="field"><label>Username</label><input id="supUsername" value="${s?esc(s.username):''}" placeholder="e.g. ramesh"></div>
        <div class="field"><label>Password</label><input id="supPassword" value="${s?esc(s.password):''}" placeholder="Login password"></div>
      </div>
      <div class="field">
        <label>Zones this supervisor can access</label>
        <div style="border:1px solid var(--border);border-radius:8px;padding:6px 12px;max-height:160px;overflow:auto;">
          ${zoneChecks || '<span style="color:var(--muted);font-size:13px;">No zones yet.</span>'}
        </div>
      </div>
      <div class="field">
        <label>What this supervisor can do</label>
        <div style="border:1px solid var(--border);border-radius:8px;padding:6px 12px;">
          ${permChecks}
        </div>
        <div class="helptext">Zone creation, editing settings, and managing supervisors always stay Owner-only.</div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="closeModal('supModal')">Cancel</button>
        <button class="btn btn-primary" style="width:auto;" onclick="saveSupervisor(${editing?`'${id}'`:'null'})">${editing?'Save changes':'Add supervisor'}</button>
      </div>
    </div>
  </div>`);
  document.getElementById('supName').focus();
}

async function saveSupervisor(id){
  const name = document.getElementById('supName').value.trim();
  const username = document.getElementById('supUsername').value.trim();
  const password = document.getElementById('supPassword').value;
  const zoneIds = Array.from(document.querySelectorAll('.sup-zone-check:checked')).map(el=>el.value);
  const permissions = {};
  PERMISSION_KEYS.forEach(k=>{ permissions[k] = false; });
  Array.from(document.querySelectorAll('.sup-perm-check:checked')).forEach(el=>{ permissions[el.value] = true; });

  if(!name) return toast('Enter the supervisor\'s name.');
  if(!username) return toast('Enter a username.');
  if(!password) return toast('Enter a password.');
  const dupe = SUPERVISORS.find(x => x.username.toLowerCase()===username.toLowerCase() && x.id!==id);
  if(dupe) return toast('That username is already taken by another supervisor.');

  if(id){
    const s = SUPERVISORS.find(x=>x.id===id);
    Object.assign(s, { name, username, password, zoneIds, permissions });
    await sset('supervisors', SUPERVISORS);
    await logAction('Updated supervisor', name);
    toast(`${name} updated.`);
  } else {
    SUPERVISORS.push({ id: uid(), name, username, password, zoneIds, permissions, active: true, createdAt: Date.now() });
    await sset('supervisors', SUPERVISORS);
    await logAction('Added supervisor', `${name} (${username})`);
    toast(`${name} added.`);
  }
  closeModal('supModal');
  renderSupervisors();
}

async function toggleSupervisorActive(id){
  const s = SUPERVISORS.find(x=>x.id===id);
  if(!s) return;
  const willBeActive = s.active===false;
  if(!willBeActive && !confirm(`Deactivate ${s.name}? They won't be able to sign in until reactivated.`)) return;
  s.active = willBeActive;
  await sset('supervisors', SUPERVISORS);
  await logAction(willBeActive?'Reactivated supervisor':'Deactivated supervisor', s.name);
  renderSupervisors();
}
