function initPage(){ renderZones(); }

function renderZones(){
  document.getElementById('zonesBody').innerHTML = `
  <div class="toolbar">
    <button class="btn btn-brass" onclick="openZoneModal()">+ Add zone</button>
  </div>
  <div class="card">
    ${ZONES.length===0 ? `<div class="empty"><div class="big">No zones yet</div>Add the areas your employees work in — e.g. North Zone, Market Zone.</div>` : `
    <p class="scroll-hint">← Swipe sideways to see more columns →</p>
    <table><thead><tr><th>Zone name</th><th>Active employees</th><th>Created</th><th></th></tr></thead><tbody>
      ${ZONES.map(z=>`
      <tr>
        <td><b>${esc(z.name)}</b></td>
        <td class="mono">${empCountForZone(z.id)}</td>
        <td class="mono" style="font-size:12px;color:var(--muted);white-space:nowrap;">${fmtTs(z.createdAt)}</td>
        <td style="text-align:right;"><button class="btn btn-danger btn-sm" onclick="deleteZone('${z.id}')">Delete</button></td>
      </tr>`).join('')}
    </tbody></table>`}
  </div>`;
}

function openZoneModal(){
  document.body.insertAdjacentHTML('beforeend', `
  <div class="modal-bg" id="zoneModal">
    <div class="modal">
      <h3>Add zone</h3>
      <div class="field"><label>Zone name</label><input id="newZoneName" placeholder="e.g. South Zone"></div>
      <div class="modal-actions">
        <button class="btn btn-outline" onclick="closeModal('zoneModal')">Cancel</button>
        <button class="btn btn-primary" style="width:auto;" onclick="addZone()">Add zone</button>
      </div>
    </div>
  </div>`);
  document.getElementById('newZoneName').focus();
}

async function addZone(){
  const name = document.getElementById('newZoneName').value.trim();
  if(!name) return toast('Enter a zone name.');
  if(ZONES.some(z=>z.name.toLowerCase()===name.toLowerCase())) return toast('That zone already exists.');
  ZONES.push({ id: uid(), name, createdAt: Date.now() });
  await sset('zones', ZONES);
  await logAction('Added zone', name);
  closeModal('zoneModal');
  renderZones();
  toast(`Zone "${name}" added.`);
}

async function deleteZone(id){
  const z = ZONES.find(z=>z.id===id);
  if(!z) return;
  const count = empCountForZone(id);
  if(count > 0) return toast(`Can't delete "${z.name}" — ${count} active employee(s) are assigned to it.`);
  if(!confirm(`Delete zone "${z.name}"? This cannot be undone.`)) return;
  ZONES = ZONES.filter(x=>x.id!==id);
  await sset('zones', ZONES);
  await logAction('Deleted zone', z.name);
  renderZones();
  toast(`Zone "${z.name}" deleted.`);
}
