/* RIMPU dashboard data resilience v1.3.5 */
(function(){
'use strict';
const q=id=>document.getElementById(id);
const text=(v)=>String(v??'');
function safeDate(v){if(!v)return null;const d=new Date(v);return isNaN(d)?null:d}
function days(v){const d=safeDate(v);if(!d)return 9999;return Math.ceil((d-new Date())/86400000)}
function countOpen(a){return (Array.isArray(a)?a:[]).filter(x=>!['SELESAI','BATAL','CLOSED','CANCELLED'].includes(text(x.status).toUpperCase())).length}
function histFromMeters(ms){return (Array.isArray(ms)?ms:[]).filter(m=>m.terakhirPemeliharaan||m.tanggalPemeliharaan||m.lastMaintenance).map(m=>({nomorMeter:m.nomorMeter||m.noMeter||m.nomor||'',tanggal:m.terakhirPemeliharaan||m.tanggalPemeliharaan||m.lastMaintenance,jenis:'Pemeliharaan'}))}
window.renderDashboard=async function(){
 const d=q('dashboard'); if(!d)return;
 d.innerHTML=`<div class="grid"><div class="stat"><small>Total Meter</small><b id="sMeters">…</b></div><div class="stat"><small>Pemeliharaan</small><b id="sHist">…</b></div><div class="stat"><small>Jatuh Tempo</small><b id="sDue">…</b></div><div class="stat"><small>Tugas Terbuka</small><b id="sTasks">…</b></div></div><div id="dashAlerts" style="margin-top:14px"></div><div class="card"><h2>Aktivitas Terbaru</h2><div id="recent">Memuat...</div></div>`;
 if(!window.API){['sMeters','sHist','sDue','sTasks'].forEach(id=>{if(q(id))q(id).textContent='—'});q('recent').innerHTML='<div class="alert danger">URL Web App belum diisi.</div>';return}
 const load=(action,timeout=15000)=>Promise.race([request(action,{params:{username:USER?.username||''},timeout}),new Promise((_,rej)=>setTimeout(()=>rej(new Error(action+' timeout')),timeout+1000))]);
 const results=await Promise.allSettled([load('getMeters'),load('getHistory'),load('getTasks')]);
 const mr=results[0].status==='fulfilled'?results[0].value:null,hr=results[1].status==='fulfilled'?results[1].value:null,tr=results[2].status==='fulfilled'?results[2].value:null;
 if(mr&&mr.ok)window.meters=meters=Array.isArray(mr.data)?mr.data:[]; else window.meters=meters=[];
 if(tr&&tr.ok)window.tasks=tasks=Array.isArray(tr.data)?tr.data:[]; else window.tasks=tasks=[];
 if(hr&&hr.ok)window.history=history=Array.isArray(hr.data)?hr.data:(Array.isArray(hr.rows)?hr.rows:[]); else window.history=history=[];
 const fallback=histFromMeters(meters);
 const hist=history.length?history:fallback;
 q('sMeters').textContent=meters.length;
 q('sHist').textContent=hist.length;
 q('sTasks').textContent=countOpen(tasks);
 const due=meters.filter(x=>x.jatuhTempo&&days(x.jatuhTempo)<=7);
 q('sDue').textContent=due.length;
 q('dashAlerts').innerHTML=due.slice(0,8).map(x=>`<div class="alert ${days(x.jatuhTempo)<0?'danger':''}">⚠ <b>${esc(x.nomorMeter||'')}</b> — ${days(x.jatuhTempo)<0?'terlambat '+Math.abs(days(x.jatuhTempo))+' hari':'jatuh tempo '+esc(x.jatuhTempo)}</div>`).join('');
 q('recent').innerHTML=hist.slice(0,8).map(x=>`<div class="meter-card"><b>${esc(x.nomorMeter||x.noMeter||x[3]||'-')}</b><div>${esc(x.jenis||x.jenisPemeliharaan||x.kondisi||'Pemeliharaan')} · ${esc(x.tanggal||x.tanggalPemeliharaan||x.timestamp||x[1]||'')}</div></div>`).join('')||'<div class="empty">Belum ada riwayat pemeliharaan.</div>';
 const failed=[];if(!mr||!mr.ok)failed.push('MASTER_METER');if(!hr||!hr.ok)failed.push('RIWAYAT_PEMELIHARAAN');if(!tr||!tr.ok)failed.push('PENUGASAN');
 if(failed.length)q('recent').insertAdjacentHTML('afterbegin',`<div class="alert warn">⚠ Data ${failed.join(', ')} belum berhasil dimuat. Angka yang tersedia tetap ditampilkan dari sumber yang berhasil.</div>`);
};
})();
