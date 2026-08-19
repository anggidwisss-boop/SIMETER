/* RIMPU dashboard counter fix v1.3.4 */
(function(){
'use strict';
function el(id){return document.getElementById(id)}
function put(id,n){const x=el(id);if(x)x.textContent=String(n)}
async function loadOne(action){return await request(action,{params:{username:window.USER?.username||''},timeout:12000})}
async function fixedDashboard(){
 const d=el('dashboard'); if(!d)return;
 d.innerHTML=`<div class="grid"><div class="stat"><small>Total Meter</small><b id="sMeters">0</b></div><div class="stat"><small>Pemeliharaan</small><b id="sHist">0</b></div><div class="stat"><small>Jatuh Tempo</small><b id="sDue">0</b></div><div class="stat"><small>Tugas Terbuka</small><b id="sTasks">0</b></div></div><div id="dashAlerts" style="margin-top:14px"></div><div class="card"><h2>Aktivitas Terbaru</h2><div id="recent">Memuat...</div></div>`;
 if(!window.API && !localStorage.getItem('simeter_api_url')){el('recent').innerHTML='<div class="alert danger">URL Web App belum diisi. Buka Pengaturan → Koneksi.</div>';return}
 const jobs=[['getMeters','meters'],['getHistory','history'],['getTasks','tasks']];
 await Promise.all(jobs.map(async ([action,type])=>{
   try{
    const r=await loadOne(action);
    if(!r||!r.ok)throw Error(r?.error||action+' gagal');
    const data=Array.isArray(r.data)?r.data:(Array.isArray(r.rows)?r.rows:[]);
    window[type]=data;
    if(type==='meters')put('sMeters',data.length);
    if(type==='history')put('sHist',data.length);
    if(type==='tasks')put('sTasks',data.filter(x=>!['SELESAI','BATAL'].includes(String(x.status||'').toUpperCase())).length);
    if(type==='meters'){
      const due=data.filter(x=>x.jatuhTempo&&typeof window.daysUntil==='function'&&window.daysUntil(x.jatuhTempo)<=7);
      put('sDue',due.length);
      el('dashAlerts').innerHTML=due.slice(0,8).map(x=>`<div class="alert">⚠ <b>${esc(x.nomorMeter||'')}</b> — ${esc(x.jatuhTempo||'')}</div>`).join('');
    }
    if(type==='history')el('recent').innerHTML=data.slice(0,5).map(x=>`<div class="meter-card"><b>${esc(x.nomorMeter||x[3]||'-')}</b><div>${esc(x.jenis||x.kondisi||'Pemeliharaan')} · ${esc(x.tanggal||x.timestamp||x[1]||'')}</div></div>`).join('')||'<div class="empty">Belum ada riwayat.</div>';
   }catch(e){console.warn('Dashboard '+action,e);}
 }));
}
window.renderDashboardFixed=fixedDashboard;
const oldNavigate=window.navigate;
window.navigate=function(page){if(page==='dashboard'){currentPage='dashboard';hideViews();el('pageTitle').textContent='Ringkasan';el('dashboard').hidden=false;fixedDashboard();document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));return}return oldNavigate.apply(this,arguments)};
})();
