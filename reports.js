function initPage(){ if(!requirePermission('viewReports')) return; renderReportsPage(); }

function renderReportsPage(){
  const month = todayYYYYMM();
  const zoneOpts = `<option value="all">All zones</option>` + visibleZones().map(z=>`<option value="${z.id}">${esc(z.name)}</option>`).join('');
  document.getElementById('reportsBody').innerHTML = `
  <div class="toolbar">
    <div class="field" style="margin:0;flex:1;min-width:130px;"><label>Month</label><input type="month" id="repMonth" value="${month}"></div>
    <div class="field" style="margin:0;flex:1;min-width:130px;"><label>Zone</label><select id="repZone">${zoneOpts}</select></div>
    <button class="btn btn-brass" style="width:100%;" onclick="generateReport()">Generate report</button>
  </div>
  <div id="reportArea"></div>`;
}

let LAST_REPORT = null;

async function generateReport(){
  const month = document.getElementById('repMonth').value || todayYYYYMM();
  const zoneId = document.getElementById('repZone').value;

  let list = visibleEmployees().filter(e=>e.active!==false);
  if(zoneId!=='all') list = list.filter(e=>e.zoneId===zoneId);

  const rows = [];
  for(const e of list){
    const data = await sget(attKey(e.id, month)) || {};
    const calc = computeSalary(e, data, month);
    rows.push({ emp: e, zone: zoneName(e.zoneId), ...calc });
  }
  LAST_REPORT = { month, zoneId, zoneLabel: zoneId==='all'?'All zones':zoneName(zoneId), rows };

  const area = document.getElementById('reportArea');
  if(rows.length===0){
    area.innerHTML = `<div class="card"><div class="empty"><div class="big">No employees to report</div>Try a different zone filter, or add employees first.</div></div>`;
    return;
  }
  const totalNet = rows.reduce((a,r)=>a+r.net,0);
  area.innerHTML = `
  <div class="card">
    <div class="section-head">
      <h2>${monthLabel(month)} · ${LAST_REPORT.zoneLabel}</h2>
      <div style="display:flex;gap:8px;width:100%;">
        <button class="btn btn-outline btn-sm" style="flex:1;" onclick="exportExcel()">Export Excel</button>
        <button class="btn btn-outline btn-sm" style="flex:1;" onclick="exportPDF()">Export PDF</button>
      </div>
    </div>
    <p class="scroll-hint">← Swipe sideways to see more columns →</p>
    <table><thead><tr>
      <th>Employee</th><th>Zone</th><th>Present</th><th>Half</th><th>Absent</th><th>Leave</th>
      <th>Gross</th><th>PF</th><th>Net payable</th>
    </tr></thead><tbody>
      ${rows.map(r=>`<tr>
        <td><b>${esc(r.emp.name)}</b></td>
        <td><span class="zonetag">${esc(r.zone)}</span></td>
        <td class="num-cell positive">${r.P}</td>
        <td class="num-cell">${r.H}</td>
        <td class="num-cell deduction">${r.A}</td>
        <td class="num-cell">${r.L}</td>
        <td class="num-cell">${inr(r.gross)}</td>
        <td class="num-cell deduction">${inr(r.pf)}</td>
        <td class="num-cell"><b>${inr(r.net)}</b></td>
      </tr>`).join('')}
    </tbody>
    <tfoot><tr><td colspan="8" style="text-align:right;font-weight:600;padding:10px;">Total net payable</td><td class="num-cell" style="font-weight:700;">${inr(totalNet)}</td></tr></tfoot>
    </table>
    <p class="helptext">Salary basis: ${SETTINGS.salaryDayBasis==='calendar' ? 'actual calendar days in the month' : SETTINGS.salaryDayBasis+'-day fixed month'}. Half-days count as 0.5. Absent and leave days are unpaid. PF is calculated on the earned (present-day) amount, not the full monthly salary — adjust this convention with your accountant if needed.</p>
  </div>`;
}

async function exportExcel(){
  if(!LAST_REPORT) return;
  const { month, zoneLabel, rows } = LAST_REPORT;
  const data = rows.map(r=>({
    'Employee': r.emp.name, 'Zone': r.zone, 'Present': r.P, 'Half-day': r.H, 'Absent': r.A, 'Leave': r.L,
    'Gross Earned (₹)': Number(r.gross.toFixed(2)), 'PF Deducted (₹)': Number(r.pf.toFixed(2)), 'Net Payable (₹)': Number(r.net.toFixed(2))
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Salary Report');
  const fname = `Venkateshwara_Salary_${month}_${zoneLabel.replace(/\s+/g,'')}.xlsx`;
  XLSX.writeFile(wb, fname);
  await logAction('Generated report (Excel)', `${monthLabel(month)} — ${zoneLabel}`);
  toast('Excel report downloaded.');
}

async function exportPDF(){
  if(!LAST_REPORT) return;
  const { month, zoneLabel, rows } = LAST_REPORT;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text('Venkateshwara Agency — Salary Report', 14, 16);
  doc.setFontSize(10);
  doc.text(`${monthLabel(month)} · ${zoneLabel}`, 14, 23);
  doc.autoTable({
    startY: 28,
    head: [['Employee','Zone','P','H','A','L','Gross (₹)','PF (₹)','Net (₹)']],
    body: rows.map(r=>[r.emp.name, r.zone, r.P, r.H, r.A, r.L, r.gross.toFixed(2), r.pf.toFixed(2), r.net.toFixed(2)]),
    styles: { fontSize: 8.5 },
    headStyles: { fillColor: [24,35,56] }
  });
  const totalNet = rows.reduce((a,r)=>a+r.net,0);
  const finalY = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(10);
  doc.text(`Total net payable: Rs. ${totalNet.toFixed(2)}`, 14, finalY);
  const fname = `Venkateshwara_Salary_${month}_${zoneLabel.replace(/\s+/g,'')}.pdf`;
  doc.save(fname);
  await logAction('Generated report (PDF)', `${monthLabel(month)} — ${zoneLabel}`);
  toast('PDF report downloaded.');
}
