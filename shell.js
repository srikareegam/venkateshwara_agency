const NAV = [
  {id:'dashboard',   label:'Dashboard',           ic:'◆', href:'dashboard.html',  bottom:true},
  {id:'daily',       label:'Daily',                ic:'✓', href:'daily.html',      bottom:true},
  {id:'employees',   label:'Employees',            ic:'☺', href:'employees.html',  bottom:true},
  {id:'reports',     label:'Reports',              ic:'▧', href:'reports.html',    bottom:true},
  {id:'zones',       label:'Zones',                ic:'▤', href:'zones.html',      bottom:false},
  {id:'attendance',  label:'Monthly Attendance',   ic:'☷', href:'attendance.html', bottom:false},
  {id:'history',     label:'History',              ic:'⏱', href:'history.html',    bottom:false},
  {id:'account',     label:'Account',              ic:'⚙', href:'account.html',    bottom:false},
];
const SECONDARY_IDS = NAV.filter(n=>!n.bottom).map(n=>n.id);

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
  let role = null;
  if(user.email && user.email.toLowerCase() === OWNER_EMAIL.toLowerCase()) role = 'owner';
  else if(user.email && user.email.toLowerCase() === SUPERVISOR_EMAIL.toLowerCase()) role = 'supervisor';
  if(!role){
    await auth.signOut();
    window.location.href = 'index.html';
    return null;
  }
  session = { role, username: user.email };
  await loadAllData();
  renderShellChrome(activeId);
  return session;
}

function renderShellChrome(activeId){
  const title = (NAV.find(n=>n.id===activeId) || {}).label || 'Venkateshwara Agency';

  const topbarSlot = document.getElementById('topbarSlot');
  if(topbarSlot){
    topbarSlot.innerHTML = `
      <h1>${esc(title)}</h1>
      <div class="userpill">
        <span class="role-chip">${session.role}</span>
        <div class="who"><b>${esc(session.username)}</b><span>${session.role}</span></div>
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
        ${NAV.map(n=>`<a class="navitem ${activeId===n.id?'active':''}" href="${n.href}"><span class="ic">${n.ic}</span><span>${esc(n.label)}</span></a>`).join('')}
      </div>
      <div class="sidebar-foot">
        Signed in as<br><b style="color:#E9E4D6;">${esc(session.username)}</b> · ${session.role}<br><br>
        <button class="btn btn-outline btn-sm" style="width:100%;color:#E9E4D6;border-color:rgba(255,255,255,0.25);" onclick="doSignOut()">Sign out</button>
      </div>`;
  }

  const bottomSlot = document.getElementById('bottomNavSlot');
  if(bottomSlot){
    const primary = NAV.filter(n=>n.bottom);
    const moreActive = SECONDARY_IDS.includes(activeId);
    bottomSlot.innerHTML = primary.map(n=>
      `<a class="${activeId===n.id?'active':''}" href="${n.href}"><span class="bnic">${n.ic}</span><span>${esc(n.label)}</span></a>`
    ).join('') + `<button class="morebtn ${moreActive?'active':''}" onclick="toggleSheet(true)"><span class="bnic">⋯</span><span>More</span></button>`;
  }

  const sheetContent = document.getElementById('sheetContent');
  if(sheetContent){
    const secondary = NAV.filter(n=>!n.bottom);
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
    auth.signOut().then(()=>{ window.location.href = 'index.html'; });
  });
}

/* register the service worker once per page (harmless if it re-registers) */
if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((e) => console.error('SW registration failed', e));
  });
}
