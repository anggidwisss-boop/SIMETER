/* RIMPU: restore Maintenance + Interval settings + navigation app chooser */
(function(){
  'use strict';
  const E=v=>typeof esc==='function'?esc(v==null||v===''?'-':v):String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ADMIN=['SUPER_ADMIN','ADMIN'];
  function coordValid(lat,lon){const a=Number(lat),b=Number(lon);return Number.isFinite(a)&&Number.isFinite(b)&&a>=-90&&a<=90&&b>=-180&&b<=180;}
  function currentMeter(){
    const body=document.getElementById('modalBody');
    if(!body)return null;
    const vals=body.querySelectorAll('.kv');
    let no='';
    vals.forEach(k=>{const s=k.querySelector('small'),b=k.querySelector('b');if(s&&b&&/Nomor Meter/i.test(s.textContent||''))no=(b.textContent||'').trim();});
    if(!no)return null;
    return (Array.isArray(window.meters)?window.meters:[]).find(m=>String(m.nomorMeter||'').trim()===no)||{nomorMeter:no};
  }
  function openNavigation(m){
    const lat=Number(m?.latitude),lon=Number(m?.longitude),address=m?.alamat||'';
    const destination=coordValid(lat,lon)?lat+','+lon:address;
    if(!destination)return alert('Titik koordinat/alamat meter belum tersedia.');
    const q=encodeURIComponent(destination);
    const body=document.getElementById('modalBody');
    if(!body)return;
    body.innerHTML=`<h2>🧭 Pilih Navigasi</h2><div class="card"><div class="weather-location">📍 ${E(address||destination)}${coordValid(lat,lon)?`<br><small>MASTER_METER: ${lat.toFixed(6)}, ${lon.toFixed(6)}</small>`:''}</div><div class="actions nav-choice-actions"><button id="navGoogle" class="primary">🗺️ Google Maps</button><button id="navOther" class="secondary">📍 Aplikasi lainnya</button></div><div class="msg">Google Maps membuka rute langsung. “Aplikasi lainnya” menampilkan aplikasi navigasi yang tersedia di HP.</div></div>`;
    const g=document.getElementById('navGoogle');
    if(g)g.onclick=()=>{window.location.href='https://www.google.com/maps/dir/?api=1&destination='+q;};
    const o=document.getElementById('navOther');
    if(o)o.onclick=()=>{
      try{
        if(coordValid(lat,lon)) window.location.href='geo:'+lat+','+lon+'?q='+lat+','+lon;
        else window.location.href='geo:0,0?q='+q;
      }catch(e){alert('Aplikasi navigasi tidak tersedia pada perangkat.');}
    };
  }
  function openInterval(m){
    const current=Number(m?.intervalHari)||30;
    showModal(`<h2>⚙ Pengaturan Interval Pemeliharaan</h2><div class="form"><label>Nomor Meter<input value="${E(m?.nomorMeter||'')}" readonly></label><label>Interval Pemeliharaan (hari)<input id="intervalHariEdit" type="number" min="1" max="3650" step="1" value="${current}"></label><div class="msg">Jatuh tempo akan mengikuti tanggal pemeliharaan terakhir + interval baru.</div><button id="saveIntervalBtn" class="primary big">💾 Simpan Interval</button></div>`);
    const b=document.getElementById('saveIntervalBtn');
    if(b)b.onclick=async()=>{
      const n=Number(document.getElementById('intervalHariEdit')?.value);
      if(!Number.isInteger(n)||n<1||n>3650)return alert('Interval harus berupa bilangan hari 1–3650.');
      b.disabled=true;
      try{
        const r=await request('updateMeter',{method:'POST',body:{nomorMeter:m.nomorMeter,intervalHari:n}});
        if(!r?.ok)throw Error(r?.error||'Gagal menyimpan interval.');
        m.intervalHari=n;
        alert('Interval pemeliharaan berhasil disimpan: '+n+' hari.');
        closeModal();
        if(typeof loadMeters==='function')await loadMeters();
      }catch(e){alert(e.message||e);b.disabled=false;}
    };
  }
  function enhance(){
    const body=document.getElementById('modalBody');if(!body)return;
    if(!/Interval Pemeliharaan/i.test(body.textContent||''))return;
    if(body.querySelector('#rimpuMaintenanceActions'))return;
    const m=currentMeter();if(!m)return;
    const oldActions=body.querySelector('.actions');
    const wrap=document.createElement('div');
    wrap.id='rimpuMaintenanceActions';
    wrap.className='actions';
    wrap.innerHTML='<button id="rimpuMaintenance" class="primary">🔧 Pemeliharaan</button>'+(ADMIN.includes(String(window.USER?.role||'').toUpperCase())?'<button id="rimpuInterval" class="secondary">⚙ Atur Interval</button>':'')+'<button id="rimpuWeather" class="primary">🌦️ Cek Cuaca</button><button id="rimpuNavigation" class="secondary">🧭 Navigasi</button>';
    if(oldActions)oldActions.replaceWith(wrap);else body.appendChild(wrap);
    const pm=document.getElementById('rimpuMaintenance');if(pm)pm.onclick=()=>{if(typeof window.openMaintenance==='function')window.openMaintenance(m.nomorMeter);else alert('Form pemeliharaan belum tersedia. Refresh aplikasi.');};
    const pi=document.getElementById('rimpuInterval');if(pi)pi.onclick=()=>openInterval(m);
    const pw=document.getElementById('rimpuWeather');if(pw)pw.onclick=()=>{if(typeof window.__rimpuShowWeather==='function')window.__rimpuShowWeather({nomorMeter:m.nomorMeter,alamat:m.alamat});else alert('Fitur cuaca belum siap.');};
    const pn=document.getElementById('rimpuNavigation');if(pn)pn.onclick=()=>openNavigation(m);
    const st=document.createElement('style');st.textContent='#rimpuMaintenanceActions{display:grid!important;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}#rimpuMaintenanceActions button{min-height:44px}@media(max-width:520px){#rimpuMaintenanceActions{grid-template-columns:1fr 1fr}}.nav-choice-actions{margin-top:14px}';document.head.appendChild(st);
  }
  function watch(){
    const body=document.getElementById('modalBody');if(!body){setTimeout(watch,250);return;}
    const mo=new MutationObserver(()=>setTimeout(enhance,30));mo.observe(body,{childList:true,subtree:true});
    setTimeout(enhance,50);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();
})();
