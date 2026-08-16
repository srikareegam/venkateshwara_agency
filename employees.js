let showInactive = false;

function initPage(){ renderEmployees(); }

function renderEmployees(){
  const zones = visibleZones();
  const canAdd = canDo('addEmployees') && zones.length>0;
  const canEdit = canDo('editEmployees');
  const addTitle = zones.length===0 ? 'Add a zone first' : "You don't have permission to add employees";
  const list = visibleEmployees().filter(e => showInactive ? true : e.active!==false);
  document.getElementById('employeesBody').innerHTML = `
  <div class="toolbar">
    <button class="btn btn-brass" onclick="openEmployeeModal()" ${canAdd?'':`disabled title="${addTitle}"`}>+ Add employee</button>
    <label style="font-size:13px;color:var(--muted);display:flex;align-items:center;gap:6px;margin-left:auto;">
      <input type="checkbox" ${showInactive?'checked':''} onchange="showInactive=this.checked; renderEmployees();"> Show inactive too
    </label>
  </div>
  ${zones.length===0 ? `<div class="card"><div class="empty"><div class="big">No zones available</div>${session.role==='owner'?'Employees are assigned to a zone, so create at least one zone before adding people.':"You haven't been assigned any zones yet. Ask the Owner to assign you a zone."}</div></div>` : `
  <div class="card">
    ${list.length===0 ? `<div class="empty"><div class="big">No employees yet</div>${canAdd?'Tap "Add employee" to get started.':'No employees in your zone(s) yet.'}</div>` : `
    <p class="scroll-hint">← Swipe sideways to see more columns →</p>
    <table><thead><tr><th>Name</th><th>Zone</th><th>Monthly salary</th><th>PF %</th><th>Status</th>${canEdit?'<th></th>':''}</tr></thead><tbody>
      ${list.map(e=>`
      <tr style="${e.active===false?'opacity:0.5;':''}">
        <td><b>${esc(e.name)}</b></td>
        <td><span class="zonetag">${esc(zoneName(e.zoneId))}</span></td>
        <td class="num-cell">${inr(e.monthlySalary)}</td>
        <td class="num-cell">${e.pfPercent}%</td>
        <td>${e.active===false ? '<span class="badge badge-A">Inactive</span>' : '<span class="badge badge-P">Active</span>'}</td>
        ${canEdit ? `<td style="text-align:right;white-space:nowrap;">
          <button class="btn btn-outline btn-sm" onclick="openEmployeeModal('${e.id}')">Edit</button>
          <button class="btn ${e.active===false?'btn-outline':'btn-danger'} btn-sm" onclick="toggleEmployeeActive('${e.id}')">${e.active===false?'Reactivate':'Deactivate'}</button>
        </td>` : ''}
      </tr>`).join('')}
    </tbody></table>`}
  </div>`}`;
}

function openEmployeeModal(id){
  const editing = !!id;
  if(editing && !canDo('editEmployees')) return toast("You don't have permission to edit employees.");
  if(!editing && !canDo('addEmployees')) return toast("You don't have permission to add employees.");
  const e = editing ? EMPLOYEES.find(x=>x.id===id) : null;
  const zoneOpts = visibleZones().map(z=>`<option value="${z.id}" ${e&&e.zoneId===z.id?'selected':''}>${esc(z.name)}</option>`).join('');
  document.body.insertAdjacentHTML('beforeend', `
  <div class="modal-bg" id="empModal">
    <div class="modal">
      <h3>${editing?'Edit employee':'Add employee'}</h3>
      <div class="field"><label>Full name</label><input id="empName" value="${e?esc(e.name):''}" placeholder="e.g. Ramesh Kumar"></div>
      <div class="field"><label>Zone</label><select id="empZone">${zoneOpts}</select></div>
      <div class="row">
        <div class="field"><label>Monthly salary (₹)</label><input id="empSalary" type="number" min="0" value="${e?e.monthlySalary:''}" placeholder="e.g. 18000"></div>
        <div class="field"><label>PF %</label><input id="empPf" type="number" min="0" max="100" step="0.5" value="${e?e.pfPercent:SETTINGS.defaultPfPercent}"></div>
      </div>
      <div class="field"><label>Joining date</label><input id="empJoin" type="date" value="${e?e.joinDate:''}"></div>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="closeModal('empModal')">Cancel</button>
        <button class="btn btn-primary" style="width:auto;" onclick="saveEmployee(${editing?`'${id}'`:'null'})">${editing?'Save changes':'Add employee'}</button>
      </div>
    </div>
  </div>`);
  document.getElementById('empName').focus();
}

async function saveEmployee(id){
  if(id && !canDo('editEmployees')) return toast("You don't have permission to edit employees.");
  if(!id && !canDo('addEmployees')) return toast("You don't have permission to add employees.");
  const name = document.getElementById('empName').value.trim();
  const zoneId = document.getElementById('empZone').value;
  if(visibleZoneIds()!==null && !visibleZoneIds().includes(zoneId)) return toast("You can't assign employees outside your zones.");
  const salary = parseFloat(document.getElementById('empSalary').value);
  const pf = parseFloat(document.getElementById('empPf').value);
  const join = document.getElementById('empJoin').value;
  if(!name) return toast('Enter the employee name.');
  if(!zoneId) return toast('Select a zone.');
  if(isNaN(salary) || salary < 0) return toast('Enter a valid monthly salary.');
  if(isNaN(pf) || pf < 0 || pf > 100) return toast('Enter a valid PF percentage (0–100).');

  if(id){
    const e = EMPLOYEES.find(x=>x.id===id);
    const changes = [];
    if(e.name!==name) changes.push('name');
    if(e.zoneId!==zoneId) changes.push('zone');
    if(e.monthlySalary!==salary) changes.push('salary');
    if(e.pfPercent!==pf) changes.push('PF %');
    if(e.joinDate!==join) changes.push('joining date');
    Object.assign(e, { name, zoneId, monthlySalary: salary, pfPercent: pf, joinDate: join });
    await sset('employees', EMPLOYEES);
    await logAction('Updated employee', `${name}${changes.length?' — changed '+changes.join(', '):''}`);
    toast(`${name} updated.`);
  } else {
    EMPLOYEES.push({ id: uid(), name, zoneId, monthlySalary: salary, pfPercent: pf, joinDate: join || null, active: true, createdAt: Date.now() });
    await sset('employees', EMPLOYEES);
    await logAction('Added employee', `${name} (${zoneName(zoneId)})`);
    toast(`${name} added.`);
  }
  closeModal('empModal');
  renderEmployees();
}

async function toggleEmployeeActive(id){
  if(!canDo('editEmployees')) return toast("You don't have permission to edit employees.");
  const e = EMPLOYEES.find(x=>x.id===id);
  if(!e) return;
  const willBeActive = e.active===false;
  if(!willBeActive && !confirm(`Deactivate ${e.name}? Their records stay intact for reports, but they'll be hidden from active lists.`)) return;
  e.active = willBeActive;
  await sset('employees', EMPLOYEES);
  await logAction(willBeActive?'Reactivated employee':'Deactivated employee', e.name);
  renderEmployees();
}
