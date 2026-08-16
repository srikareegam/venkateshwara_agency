const NAV = [
  {id:'dashboard',   label:'Dashboard',           ic:'◆', href:'dashboard.html',    bottom:true},
  {id:'daily',       label:'Daily',                ic:'✓', href:'daily.html',        bottom:true,  perm:'dailyAttendance'},
  {id:'employees',   label:'Employees',            ic:'☺', href:'employees.html',    bottom:true},
  {id:'reports',     label:'Reports',              ic:'▧', href:'reports.html',      bottom:true,  perm:'viewReports'},
  {id:'zones',       label:'Zones',                ic:'▤', href:'zones.html',        bottom:false, ownerOnly:true},
  {id:'attendance',  label:'Monthly Attendance',   ic:'☷', href:'attendance.html',   bottom:false, perm:'monthlyAttendance'},
  {id:'supervisors', label:'Supervisors',          ic:'⚒', href:'supervisors.html',  bottom:false, ownerOnly:true},
  {id:'history',     label:'History',              ic:'⏱', href:'history.html',      bottom:false, perm:'viewHistory'},
  {id:'account',     label:'Account',              ic:'⚙', href:'account.html',      bottom:false, ownerOnly:true},
];
const SECONDARY_IDS = NAV.filter(n=>!n.bottom).map(n=>n.id);

function navAllowed(item){
  if(!item) return false;
  if(session.role === 'owner') return true;
  if(item.ownerOnly) return false;
  if(item.perm && !canDo(item.perm)) return false;
  return true;
}

async function initShell(activeId){
  if(typeof CONFIG_IS_PLACEHOLDER !== 'undefined' && CONFIG_IS_PLACEHOLDER){
    document.body.innerHTML = `<div class="loading-screen" style="flex-direction:column;gap:10px;padding:30px;text-align:center;">
      <b>Firebase isn't configured yet.</b>
      <span>Open <code>firebase-init.js</code> and paste in your project's config values.</span>
    </div>`;
    return null;
  }
  const user = await waitForAuthUser();
  if(!user){ window.location.href = 'index.html'; return null; }
  const email = (user.email||'').toLowerCase();

  if(email === OWNER_EMAIL.toLowerCase()){
    session = { role: 'owner', username: user.email, name: 'Owner' };
  } else if(email === SUPERVISOR_POOL_EMAIL.toLowerCase()){
    const supervisorId = localStorage.getItem('vk_supervisor_id');
    const supervisors = await sget('supervisors') || [];
    const sup = supervisorId ? supervisors.find(s=>s.id===supervisorId && s.active!==false) : null;
    if(!sup){
      localStorage.removeItem('vk_supervisor_id');
      await auth.signOut();
      window.location.href = 'index.html';
      return null;
    }
    session = { role:'supervisor', supervisorId: sup.id, username: sup.username, name: sup.name,
      zoneIds: sup.zoneIds || [], permissions: {...DEFAULT_PERMISSIONS, ...(sup.permissions||{})} };
  } else {
    await auth.signOut();
    window.location.href = 'index.html';
    return null;
  }

  await loadAllData();

  if(!navAllowed(NAV.find(n=>n.id===activeId))){
    window.location.href = 'dashboard.html';
    return null;
  }

  renderShellChrome(activeId);
  return session;
}

function renderShellChrome(activeId){
  const title = (NAV.find(n=>n.id===activeId) || {}).label || 'Venkateshwara Agency';
  const visibleNav = NAV.filter(navAllowed);
  const displayName = session.role==='owner' ? session.username : (session.name || session.username);
  const roleLabel = session.role==='owner' ? 'owner' : 'supervisor';

  const topbarSlot = document.getElementById('topbarSlot');
  if(topbarSlot){
    topbarSlot.innerHTML = `
      <h1>${esc(title)}</h1>
      <div class="userpill">
        <span class="role-chip">${roleLabel}</span>
        <div class="who"><b>${esc(displayName)}</b><span>${roleLabel}</span></div>
        <button class="btn btn-outline btn-sm" onclick="doSignOut()">Sign out</button>
      </div>`;
  }

  const sidebarSlot = document.getElementById('sidebarSlot');
  if(sidebarSlot){
    sidebarSlot.innerHTML = `
      <div class="brand">
        <div class="emblem">V</div>
        <div class="brand-text"><div class="t1">Venkateshwara</div><div class="t2">Agency Register</div></div>
      </div>
      <div>
        ${visibleNav.map(n=>`<a class="navitem ${activeId===n.id?'active':''}" href="${n.href}"><span class="ic">${n.ic}</span><span>${esc(n.label)}</span></a>`).join('')}
      </div>
      <div class="sidebar-foot">
        Signed in as<br><b style="color:#E9E4D6;">${esc(displayName)}</b> · ${roleLabel}<br><br>
        <button class="btn btn-outline btn-sm" style="width:100%;color:#E9E4D6;border-color:rgba(255,255,255,0.25);" onclick="doSignOut()">Sign out</button>
      </div>`;
  }

  const bottomSlot = document.getElementById('bottomNavSlot');
  if(bottomSlot){
    const primary = visibleNav.filter(n=>n.bottom);
    const moreActive = SECONDARY_IDS.includes(activeId);
    bottomSlot.innerHTML = primary.map(n=>
      `<a class="${activeId===n.id?'active':''}" href="${n.href}"><span class="bnic">${n.ic}</span><span>${esc(n.label)}</span></a>`
    ).join('') + `<button class="morebtn ${moreActive?'active':''}" onclick="toggleSheet(true)"><span class="bnic">⋯</span><span>More</span></button>`;
  }

  const sheetContent = document.getElementById('sheetContent');
  if(sheetContent){
    const secondary = visibleNav.filter(n=>!n.bottom);
    sheetContent.innerHTML = `
      <div class="sheet-handle"></div>
      ${secondary.map(n=>`<a class="${activeId===n.id?'active':''}" href="${n.href}"><span class="sic">${n.ic}</span>${esc(n.label)}</a>`).join('')}
      <hr>
      <button class="sheet-item signout-item" onclick="doSignOut()"><span class="sic">⏻</span>Sign out</button>`;
  }
}

function toggleSheet(open){
  const ov = document.getElementById('sheetOverlay');
  if(ov) ov.classList.toggle('open', open);
}

function doSignOut(){
  logAction('Signed out').then(()=>{
    localStorage.removeItem('vk_supervisor_id');
    auth.signOut().then(()=>{ window.location.href = 'index.html'; });
  });
}

/* register the service worker once per page (harmless if it re-registers) */
if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((e) => console.error('SW registration failed', e));
  });
}
