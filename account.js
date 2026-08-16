function initPage(){ if(!requireOwner()) return; renderAccount(); }

function renderAccount(){
  document.getElementById('accountBody').innerHTML = `
  <div class="card">
    <h2 style="font-family:var(--font-display);font-size:16px;margin-top:0;">Owner password</h2>
    <p class="helptext" style="margin-top:0;">Sends a password reset link to ${esc(OWNER_EMAIL)}.</p>
    <button class="btn btn-outline" style="width:100%;" onclick="sendReset()">Send reset link</button>
  </div>
  <div class="card">
    <h2 style="font-family:var(--font-display);font-size:16px;margin-top:0;">Supervisor accounts</h2>
    <p class="helptext" style="margin-top:0;">Supervisor usernames, passwords, zone assignments and permissions are managed on the <a href="supervisors.html" style="color:var(--brass);font-weight:600;">Supervisors</a> page.</p>
  </div>
  <div class="card">
    <h2 style="font-family:var(--font-display);font-size:16px;margin-top:0;">Salary settings</h2>
    <div class="row">
      <div class="field">
        <label>Salary day basis</label>
        <select id="setBasis">
          <option value="calendar" ${SETTINGS.salaryDayBasis==='calendar'?'selected':''}>Actual calendar days in the month</option>
          <option value="30" ${String(SETTINGS.salaryDayBasis)==='30'?'selected':''}>Fixed 30-day month</option>
          <option value="26" ${String(SETTINGS.salaryDayBasis)==='26'?'selected':''}>Fixed 26-day month</option>
        </select>
        <div class="helptext">Used to work out each employee's per-day rate from their monthly salary.</div>
      </div>
      <div class="field">
        <label>Default PF % for new employees</label>
        <input type="number" id="setDefaultPf" min="0" max="100" step="0.5" value="${SETTINGS.defaultPfPercent}">
      </div>
    </div>
    <button class="btn btn-primary" style="width:100%;" onclick="saveSettings()">Save settings</button>
  </div>`;
}

async function sendReset(){
  try{
    await auth.sendPasswordResetEmail(OWNER_EMAIL);
    await logAction('Requested password reset', `owner account (${OWNER_EMAIL})`);
    toast(`Reset link sent to ${OWNER_EMAIL}.`);
  }catch(e){
    toast(`Couldn't send reset email: ${e.message || 'unknown error'}`);
  }
}

async function saveSettings(){
  const basis = document.getElementById('setBasis').value;
  const defPf = parseFloat(document.getElementById('setDefaultPf').value);
  if(isNaN(defPf) || defPf<0 || defPf>100) return toast('Enter a valid default PF %.');
  SETTINGS = { salaryDayBasis: basis==='calendar'?'calendar':Number(basis), defaultPfPercent: defPf };
  await sset('settings', SETTINGS);
  await logAction('Updated salary settings', `Basis: ${basis}, Default PF: ${defPf}%`);
  toast('Settings saved.');
}
