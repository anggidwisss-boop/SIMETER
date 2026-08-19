/* RIMPU Dashboard V2 - premium dashboard for PLN UP3 Bima */
(function(){
  'use strict';
  const escD=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function inject(){
    if(document.getElementById('rimpuDashboardV2Style')) return;
    const s=document.createElement('style'); s.id='rimpuDashboardV2Style';
    s.textContent=`
      #dashboard.rimpu-v2{max-width:1180px;margin:0 auto;padding-bottom:105px}
      .rv2-hero{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin:8px 0 20px}
      .rv2-kicker{display:flex;align-items:center;gap:9px;color:#58708e;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}
      .rv2-kicker img{width:28px;height:28px;object-fit:contain;background:#ffd900;border-radius:6px;padding:2px}
      .rv2-hero h2{margin:5px 0 3px;color:#073d79;font-size:28px;letter-spacing:-.03em}
      .rv2-hero p{margin:0;color:#70839b;font-size:14px}
      .rv2-date{background:#fff;border:1px solid #dce8f4;border-radius:16px;padding:12px 16px;box-shadow:0 8px 24px rgba(16,65,112,.06);text-align:right;min-width:175px}
      .rv2-date small{display:block;color:#8191a5}.rv2-date b{color:#174978;font-size:14px}
      .rv2-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px}
      .rv2-stat{position:relative;overflow:hidden;background:#fff;border:1px solid #dce8f4;border-radius:18px;padding:18px 20px;box-shadow:0 9px 26px rgba(16,65,112,.07);cursor:pointer;transition:.2s}
      .rv2-stat:hover{transform:translateY(-2px);box-shadow:0 14px 32px rgba(16,65,112,.11)}
      .rv2-stat:after{content:"";position:absolute;width:92px;height:92px;border-radius:50%;right:-30px;top:-30px;background:#edf5ff}
      .rv2-stat .ico{position:relative;z-index:1;display:grid;place-items:center;width:38px;height:38px;border-radius:12px;background:#eaf4ff;font-size:19px;margin-bottom:12px}
      .rv2-stat small{display:block;color:#70839a;font-weight:700}.rv2-stat b{display:block;color:#123f77;font-size:29px;margin-top:4px}.rv2-stat span{font-size:11px;color:#8b9aae}
      .rv2-grid{display:grid;grid-template-columns:1.55fr .9fr;gap:16px;align-items:start}
      .rv2-card{background:#fff;border:1px solid #dce8f4;border-radius:18px;box-shadow:0 9px 26px rgba(16,65,112,.06);padding:18px}
      .rv2-card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}.rv2-card-head h3{margin:0;color:#123f77;font-size:17px}.rv2-card-head small{color:#8191a5}
      .rv2-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:11px}
      .rv2-action{border:1px solid #dbe7f3;background:linear-gradient(145deg,#fff,#f7fbff);border-radius:15px;padding:15px 12px;min-height:108px;text-align:left;cursor:pointer;transition:.18s}
      .rv2-action:hover{border-color:#9dc4ed;transform:translateY(-2px);box-shadow:0 8px 20px rgba(16,65,112,.08)}
      .rv2-action .aico{font-size:25px}.rv2-action b{display:block;color:#164776;margin-top:8px}.rv2-action small{display:block;color:#7d8fa4;margin-top:3px;line-height:1.3}
      .rv2-activity{display:grid;gap:9px}.rv2-activity-item{display:flex;gap:11px;align-items:flex-start;padding:11px;border-radius:13px;background:#f7faff;border:1px solid #e4edf6}.rv2-dot{width:9px;height:9px;border-radius:50%;background:#0878c9;margin-top:6px;flex:0 0 auto}.rv2-activity-item b{display:block;color:#214d78;font-size:13px}.rv2-activity-item small{display:block;color:#8494a7;margin-top:3px}.rv2-empty{padding:20px;text-align:center;color:#8191a5;background:#f8fbfe;border-radius:13px}
      .rv2-health{display:grid;gap:10px}.rv2-health-row{display:flex;justify-content:space-between;align-items:center;padding:11px 12px;border-radius:12px;background:#f8fbfe}.rv2-health-row span{color:#647a93;font-size:13px}.rv2-health-row b{color:#164776}.rv2-progress{height:7px;background:#e7eef6;border-radius:10px;overflow:hidden;margin-top:5px}.rv2-progress i{display:block;height:100%;width:0;background:#1686d5;border-radius:10px}
      @media(max-width:900px){.rv2-stats{grid-template-columns:1fr 1fr}.rv2-grid{grid-template-columns:1fr}}
      @media(max-width:600px){#dashboard.rimpu-v2{padding:0 2px 100px}.rv2-hero{align-items:flex-start;flex-direction:column}.rv2-date{width:100%;box-sizing:border-box;text-align:left}.rv2-stats{grid-template-columns:1fr 1fr;gap:9px}.rv2-stat{padding:14px}.rv2-stat b{font-size:24px}.rv2-actions{grid-template-columns:1fr 1fr}.rv2-action{min-height:100px}.rv2-card{padding:14px}}
    `;document.head.appendChild(s);
  }
  function setText(id,v){const e=document.getElementById(id);if(e)e.textContent=v}
  async function renderDashboardV2(){
    inject(); const el=document.getElementById('dashboard'); if(!el)return; el.classList.add('rimpu-v2');
    const now=new Date(); const date=now.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    el.innerHTML=`
      <div class="rv2-hero"><div><div class="rv2-kicker"><img src="assets/pln-logo.svg" alt="PLN"> RIMPU · PLN UP3 BIMA</div><h2>Dashboard Pemeliharaan Meter</h2><p>Monitoring dan pengelolaan pemeliharaan meter transaksi energi.</p></div><div class="rv2-date"><small>Hari ini</small><b>${escD(date)}</b></div></div>
      <div class="rv2-stats">
        <div class="rv2-stat" id="v2Meters" tabindex="0"><div class="ico">▦</div><small>Total Meter</small><b id="v2sMeters">—</b><span>meter terdaftar</span></div>
        <div class="rv2-stat" id="v2Hist" tabindex="0"><div class="ico">🔧</div><small>Pemeliharaan</small><b id="v2sHist">—</b><span>riwayat pekerjaan</span></div>
        <div class="rv2-stat" id="v2Due" tabindex="0"><div class="ico">⏱</div><small>Jatuh Tempo</small><b id="v2sDue">—</b><span>≤ 7 hari</span></div>
        <div class="rv2-stat" id="v2Tasks" tabindex="0"><div class="ico">☷</div><small>Tugas Terbuka</small><b id="v2sTasks">—</b><span>perlu ditindaklanjuti</span></div>
      </div>
      <div class="rv2-grid">
        <div class="rv2-card"><div class="rv2-card-head"><h3>Aksi Cepat</h3><small>Menu utama</small></div><div class="rv2-actions">
          <button class="rv2-action" data-v2="maintenance"><span class="aico">🔧</span><b>Pemeliharaan</b><small>Input pekerjaan meter</small></button>
          <button class="rv2-action" data-v2="meters"><span class="aico">▦</span><b>Data Meter</b><small>Cari & lihat meter</small></button>
          <button class="rv2-action" data-v2="scan"><span class="aico">▣</span><b>Scan Meter</b><small>Scan QR / barcode</small></button>
          <button class="rv2-action" data-v2="tasks"><span class="aico">☷</span><b>Tugas</b><small>Kelola penugasan</small></button>
          <button class="rv2-action" data-v2="ba"><span class="aico">📄</span><b>Berita Acara</b><small>Dokumen pemeliharaan</small></button>
          <button class="rv2-action" data-v2="report"><span class="aico">📊</span><b>Laporan</b><small>Rekap & monitoring</small></button>
        </div></div>
        <div class="rv2-card"><div class="rv2-card-head"><h3>Status Sistem</h3><small id="v2Online">Memeriksa...</small></div><div class="rv2-health">
          <div class="rv2-health-row"><span>Server / API</span><b id="v2ApiStatus">●</b></div>
          <div class="rv2-health-row"><span>Data Meter</span><b id="v2MeterStatus">—</b></div>
          <div class="rv2-health-row"><span>Penugasan</span><b id="v2TaskStatus">—</b></div>
        </div></div>
      </div>
      <div class="rv2-card" style="margin-top:16px"><div class="rv2-card-head"><h3>Aktivitas Terbaru</h3><small>5 aktivitas terakhir</small></div><div id="v2Recent" class="rv2-activity"><div class="rv2-empty">Memuat data...</div></div></div>`;
    const go=p=>{if(p==='maintenance'){if(typeof window.openMaintenance==='function')window.openMaintenance();else navigate('meters')}else if(p==='ba'||p==='report'){navigate(p==='ba'?'tasks':'tasks')}else navigate(p)};
    el.querySelectorAll('[data-v2]').forEach(b=>b.onclick=()=>go(b.dataset.v2));
    async function load(){
      try{
        if(!API)throw Error('URL Web App belum diisi.');
        const [m,h,t]=await Promise.all([request('getMeters',{params:{username:USER?.username||''},timeout:20000}),request('getHistory',{params:{username:USER?.username||''},timeout:20000}),request('getTasks',{params:{username:USER?.username||''},timeout:20000})]);
        const ms=Array.isArray(m?.data)?m.data:[], hs=Array.isArray(h?.data)?h.data:(Array.isArray(h?.rows)?h.rows:[]), ts=Array.isArray(t?.data)?t.data:[];
        const open=ts.filter(x=>!['SELESAI','BATAL'].includes(String(x.status||'').toUpperCase())); const due=ms.filter(x=>x.jatuhTempo&&typeof window.daysUntil==='function'&&window.daysUntil(x.jatuhTempo)<=7);
        setText('v2sMeters',ms.length);setText('v2sHist',hs.length);setText('v2sDue',due.length);setText('v2sTasks',open.length);setText('v2Online','Online');setText('v2ApiStatus','● Aktif');setText('v2MeterStatus',ms.length+' meter');setText('v2TaskStatus',open.length+' terbuka');
        const recent=document.getElementById('v2Recent'); recent.innerHTML=hs.slice(0,5).map(x=>`<div class="rv2-activity-item"><i class="rv2-dot"></i><div><b>${escD(x.nomorMeter||x[3]||'Meter')} · ${escD(x.jenis||x.kondisi||x[9]||'Pemeliharaan')}</b><small>${escD(x.tanggal||x.timestamp||x[1]||'')} ${x.petugas?'· '+escD(x.petugas):''}</small></div></div>`).join('')||'<div class="rv2-empty">Belum ada aktivitas pemeliharaan.</div>';
      }catch(e){setText('v2Online','Offline');setText('v2ApiStatus','● Tidak terhubung');const r=document.getElementById('v2Recent');if(r)r.innerHTML=`<div class="rv2-empty">Data belum dapat dimuat.<br><small>${escD(e.message||'Periksa koneksi API')}</small></div>`}
    }
    load();
    ['v2Meters','v2Hist','v2Due','v2Tasks'].forEach(id=>{const e=document.getElementById(id);if(e){e.onclick=()=>{const map={v2Meters:'meters',v2Hist:'tasks',v2Due:'meters',v2Tasks:'tasks'};navigate(map[id])}}});
  }
  window.renderDashboard=renderDashboardV2;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{});
})();
