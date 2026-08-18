/* RIMPU FINAL METER UI: one action row + configurable interval list */
(function(){
  'use strict';
  const E=v=>typeof window.esc==='function'?window.esc(v==null||v===''?'-':v):String(v??'-').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ADMIN=['SUPER_ADMIN','ADMIN','SUPERVISOR'];
  const KEY='rimpu_interval_options';
  const DEFAULTS=[7,14,30,45,60,90,180,365];
  function opts(){
    try{
      const a=JSON.parse(localStorage.getItem(KEY)||'null');
      if(Array.isArray(a)&&a.length)return [...new Set(a.map(Number).filter(n=>Number.isInteger(n)&&n>0&&n<=3650))].sort((a,b)=>a-b);
    }catch(_){ }
    return DEFAULTS.slice();
  }
  function saveOpts(a){localStorage.setItem(KEY,JSON.stringify(a));}
  function validCoord(m){const lat=Number(m?.latitude),lon=Number(m?.longitude);return Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=-90&&lat<=90&&lon>=-180&&lon<=180;}
  function meterByNo(no){return (Array.isArray(window.meters)?window.meters:[]).find(x=>String(x.nomorMeter||'').trim()===String(no||'').trim())||null;}
  function navigation(m){
    const lat=Number(m?.latitude),lon=Number(m?.longitude),address=String(m?.alamat||'').trim();
    const destination=validCoord(m)?`${lat},${lon}`:address;
    if(!destination)return alert('Titik koordinat/alamat meter belum tersedia.');
    const q=encodeURIComponent(destination);
    showModal(`<h2>🧭 Pilih Navigasi</h2><div class="card"><div class="weather-location">📍 ${E(address||destination)}${validCoord(m)?`<br><small>MASTER_METER: ${lat.toFixed(6)}, ${lon.toFixed(6)}</small>`:''}</div><div class="actions nav-choice-actions"><button id="navGoogle" class="primary">🗺️ Google Maps</button><button id="navOther" class="secondary">📍 Aplikasi lainnya</button></div></div>`);
    $('navGoogle').onclick=()=>{window.location.href='https://www.google.com/maps/dir/?api=1&destination='+q;};
    $('navOther').onclick=()=>{window.location.href=validCoord(m)?`geo:${lat},${lon}?q=${lat},${lon}`:`geo:0,0?q=${q}`;};
  }
  function weather(m){
    const body=$('modalBody');
    if(!body)return;
    if(!validCoord(m)){
      body.innerHTML=`<h2>🌦️ Cuaca Lokasi Kerja</h2><div class="alert danger">Titik koordinat belum tersedia pada MASTER_METER untuk meter ${E(m?.nomorMeter||'-')}.</div><div class="actions"><button id="wNav" class="secondary">🧭 Navigasi</button></div>`;
      $('wNav').onclick=()=>navigation(m);return;
    }
    body.innerHTML='<div class="weather-loading">🌦️ Mengambil perkiraan cuaca...</div>';
    const icon=c=>{c=Number(c);if(c===0)return'☀️';if(c<=3)return'🌤️';if(c<=48)return'🌫️';if(c<=55)return'🌦️';if(c<=82)return'🌧️';if(c<=86)return'❄️';return'⛈️'};
    const text=c=>({0:'Cerah',1:'Cerah berawan',2:'Sebagian berawan',3:'Berawan',45:'Berkabut',48:'Kabut tebal',51:'Gerimis ringan',53:'Gerimis',55:'Gerimis lebat',61:'Hujan ringan',63:'Hujan sedang',65:'Hujan lebat',80:'Hujan singkat',81:'Hujan singkat',82:'Hujan sangat lebat',95:'Badai petir',96:'Badai petir + hujan es',99:'Badai petir + hujan es'}[Number(c)]||'Kondisi tidak diketahui');
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(m.latitude)}&longitude=${encodeURIComponent(m.longitude)}&timezone=auto&forecast_days=3&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m`,{cache:'no-store'})
      .then(r=>{if(!r.ok)throw Error('Layanan cuaca tidak merespons.');return r.json()})
      .then(j=>{const c=j.current||{},h=j.hourly||{},times=h.time||[];let i=times.findIndex(x=>new Date(x)>=new Date());if(i<0)i=0;const p=h.precipitation_probability?.[i]??0;const risk=Number(c.weather_code)>=95||p>=80||Number(c.wind_speed_10m)>=45?'danger':p>=50||Number(c.wind_speed_10m)>=30||Number(c.weather_code)>=61?'warn':'ok';const riskText=risk==='danger'?'🔴 TIDAK DISARANKAN':risk==='warn'?'🟡 WASPADA':'🟢 CUKUP AMAN';const rows=[0,1,2,3,4,5].map(n=>{const x=Math.min(i+n,Math.max(times.length-1,0));return `<div class="weather-hour"><b>${new Date(times[x]).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</b><span>${icon(h.weather_code?.[x])} ${Math.round(h.temperature_2m?.[x]??0)}°C</span><span>🌧️ ${h.precipitation_probability?.[x]??0}%</span><span>💨 ${Math.round(h.wind_speed_10m?.[x]??0)} km/j</span></div>`}).join('');body.innerHTML=`<h2>🌦️ Cuaca Lokasi Kerja</h2><div class="weather-location">📍 ${E(m.alamat||'Lokasi meter')}<br><small>MASTER_METER: ${Number(m.latitude).toFixed(6)}, ${Number(m.longitude).toFixed(6)}</small></div><div class="weather-main"><div class="weather-icon">${icon(c.weather_code)}</div><div><b>${Math.round(c.temperature_2m??0)}°C</b><div>${E(text(c.weather_code))}</div></div></div><div class="weather-grid"><div><small>Kelembapan</small><b>${c.relative_humidity_2m??'-'}%</b></div><div><small>Peluang hujan</small><b>${p}%</b></div><div><small>Angin</small><b>${Math.round(c.wind_speed_10m??0)} km/j</b></div><div><small>Terasa</small><b>${Math.round(c.apparent_temperature??c.temperature_2m??0)}°C</b></div></div><div class="weather-status ${risk}"><b>${riskText}</b><div>Kondisi cuaca untuk pertimbangan pekerjaan lapangan.</div></div><h3>Perkiraan beberapa jam ke depan</h3><div class="weather-hours">${rows}</div><div class="actions"><button id="wNav2" class="secondary">🧭 Navigasi ke Lokasi</button><button id="wRefresh" class="primary">↻ Perbarui Cuaca</button></div>`;$('wNav2').onclick=()=>navigation(m);$('wRefresh').onclick=()=>weather(m);})
      .catch(e=>{body.innerHTML=`<h2>🌦️ Cuaca Lokasi Kerja</h2><div class="alert danger">${E(e.message||e)}</div><div class="actions"><button id="wNav3" class="secondary">🧭 Navigasi</button></div>`;$('wNav3').onclick=()=>navigation(m);});
  }
  function intervalSettings(m){
    const list=opts(),current=Number(m?.intervalHari)||30;
    showModal(`<h2>⚙ Pengaturan Interval Pemeliharaan</h2><div class="form"><label>Nomor Meter<input value="${E(m?.nomorMeter||'')}" readonly></label><label>Interval untuk meter ini<select id="rimpuIntervalSelect">${list.map(n=>`<option value="${n}" ${n===current?'selected':''}>${n} hari</option>`).join('')}<option value="CUSTOM">Custom...</option></select></label><label id="rimpuCustomWrap" style="display:none">Interval custom (hari)<input id="rimpuCustomInterval" type="number" min="1" max="3650" step="1"></label><hr><label>Daftar interval yang tersedia (hari)<input id="rimpuIntervalList" value="${E(list.join(', '))}" placeholder="Contoh: 7,14,30,45,60,90,180,365"></label><div class="msg">Masukkan angka dipisahkan koma. Daftar ini dapat disesuaikan sesuai kebutuhan.</div><div class="actions"><button id="saveIntervalList" class="secondary">💾 Simpan Daftar</button><button id="saveMeterInterval" class="primary">✓ Terapkan ke Meter</button></div></div>`);
    const sel=$('rimpuIntervalSelect'),custom=$('rimpuCustomWrap');sel.onchange=()=>custom.style.display=sel.value==='CUSTOM'?'block':'none';
    $('saveIntervalList').onclick=()=>{const a=[...new Set(($('rimpuIntervalList').value||'').split(/[,;\s]+/).map(Number).filter(n=>Number.isInteger(n)&&n>0&&n<=3650))].sort((a,b)=>a-b);if(!a.length)return alert('Isi minimal satu interval yang valid.');saveOpts(a);alert('Daftar interval tersimpan: '+a.join(', ')+' hari.');intervalSettings(m);};
    $('saveMeterInterval').onclick=async()=>{let n=Number(sel.value);if(sel.value==='CUSTOM')n=Number($('rimpuCustomInterval').value);if(!Number.isInteger(n)||n<1||n>3650)return alert('Interval harus 1–3650 hari.');const b=$('saveMeterInterval');b.disabled=true;try{let r=await request('updateMeter',{method:'POST',body:{nomorMeter:m.nomorMeter,intervalHari:n}});if(!r?.ok){try{r=await request('setAssetInterval',{method:'POST',body:{nomorMeter:m.nomorMeter,intervalHari:n}})}catch(_){}}if(!r?.ok)throw Error(r?.error||'Gagal menyimpan interval.');m.intervalHari=n;closeModal();if(typeof window.loadMeters==='function')await window.loadMeters();alert('Interval meter '+m.nomorMeter+' menjadi '+n+' hari.');}catch(e){alert(e.message||e);b.disabled=false;}};
  }
  function openMeterFinal(m){
    const h=(Array.isArray(window.history)?window.history:[]).filter(x=>String(x.nomorMeter||'')===String(m.nomorMeter||''));
    const st=typeof window.customerStatus==='function'?window.customerStatus(m):(m.statusPelanggan||'Aktif');
    showModal(`<h2>${E(m.namaPelanggan||'Meter')}</h2><div><b>${E(m.nomorMeter||'-')}</b></div><div class="details-grid"><div class="kv"><small>ID Pelanggan</small><b>${E(m.idPelanggan||'-')}</b></div><div class="kv"><small>Alamat</small><b>${E(m.alamat||'-')}</b></div><div class="kv"><small>Kategori</small><b>${E(m.kategori||'-')}</b></div><div class="kv"><small>Sub Kategori</small><b>${E(m.subKategori||'-')}</b></div><div class="kv"><small>Merk</small><b>${E(m.merk||'-')}</b></div><div class="kv"><small>Status Pelanggan</small><b>${E(st)}</b></div><div class="kv"><small>Status Aset</small><b>${E(m.status||'Aktif')}</b></div><div class="kv"><small>Interval Pemeliharaan</small><b>${E(m.intervalHari||30)} hari</b></div><div class="kv"><small>Pemeliharaan Terakhir</small><b>${E(m.terakhirPemeliharaan||'-')}</b></div><div class="kv"><small>Jatuh Tempo</small><b>${E(m.jatuhTempo||'-')}</b></div><div class="kv"><small>Stand LWBP</small><b>${E(m.standLWBP||'-')}</b></div><div class="kv"><small>Stand WBP</small><b>${E(m.standWBP||'-')}</b></div><div class="kv"><small>Stand KVARH</small><b>${E(m.standKVARH||'-')}</b></div><div class="kv"><small>Stand KWH TOTAL</small><b>${E(m.standKWHtotal||'-')}</b></div><div class="kv"><small>Latitude</small><b>${E(m.latitude||'-')}</b></div><div class="kv"><small>Longitude</small><b>${E(m.longitude||'-')}</b></div></div><div class="actions" id="rimpuMeterActions"><button id="meterMaintenanceFinal" class="primary">🔧 Pemeliharaan</button>${ADMIN.includes(String(window.USER?.role||'').toUpperCase())?'<button id="meterIntervalFinal" class="secondary">⚙ Pengaturan Interval</button>':''}<button id="meterWeatherFinal" class="primary">🌦️ Cek Cuaca</button><button id="meterNavigationFinal" class="secondary">🧭 Navigasi</button></div><h3>Riwayat Maintenance</h3>${h.map(x=>`<div class="meter-card"><b>${E(x.petugas||'-')}</b><div>${E(x.keterangan||x.hasilPemeriksaan||x.jenis||'')}</div><div class="meta">LWBP ${E(x.standLWBP||'-')} · WBP ${E(x.standWBP||'-')} · KVARH ${E(x.standKVARH||'-')} · KWH TOTAL ${E(x.standKWHtotal||x.stand||'-')}</div><small>${E(x.tanggal||x.timestamp||'')}</small></div>`).join('')||'<div class="empty">Belum ada riwayat.</div>'}`);
    $('meterMaintenanceFinal').onclick=()=>{if(typeof window.openMaintenance==='function')window.openMaintenance(m.nomorMeter);};
    if($('meterIntervalFinal'))$('meterIntervalFinal').onclick=()=>intervalSettings(m);
    $('meterWeatherFinal').onclick=()=>weather(m);
    $('meterNavigationFinal').onclick=()=>navigation(m);
  }
  window.openMeter=openMeterFinal;
  const st=document.createElement('style');st.textContent='#rimpuMeterActions{display:grid!important;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}.nav-choice-actions{margin-top:14px}.rimpuMeterActions button{min-height:44px}@media(max-width:520px){#rimpuMeterActions{grid-template-columns:1fr 1fr}}';document.head.appendChild(st);
})();