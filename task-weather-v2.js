(function(){
  var E=function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});};
  var text=function(c){return({0:'Cerah',1:'Cerah berawan',2:'Sebagian berawan',3:'Berawan',45:'Berkabut',48:'Kabut tebal',51:'Gerimis ringan',53:'Gerimis',55:'Gerimis lebat',61:'Hujan ringan',63:'Hujan sedang',65:'Hujan lebat',71:'Salju ringan',73:'Salju',75:'Salju lebat',80:'Hujan singkat',81:'Hujan singkat',82:'Hujan sangat lebat',95:'Badai petir',96:'Badai petir + hujan es',99:'Badai petir + hujan es'}[Number(c)]||'Kondisi tidak diketahui');};
  var icon=function(c){c=Number(c);if(c===0)return'☀️';if(c<=3)return'🌤️';if(c<=48)return'🌫️';if(c<=55)return'🌦️';if(c<=82)return'🌧️';if(c<=86)return'❄️';return'⛈️';};
  var safety=function(code,prob,wind){code=Number(code||0);prob=Number(prob||0);wind=Number(wind||0);if(code>=95||prob>=80||wind>=45)return{c:'danger',t:'🔴 TIDAK DISARANKAN',n:'Periksa kembali kondisi keselamatan sebelum berangkat.'};if(prob>=50||wind>=30||code>=61)return{c:'warn',t:'🟡 WASPADA',n:'Siapkan perlengkapan hujan dan perhatikan kondisi lapangan.'};return{c:'ok',t:'🟢 CUKUP AMAN',n:'Kondisi cuaca relatif mendukung pekerjaan lapangan.'};};
  function meterNo(){var b=document.getElementById('modalBody');if(!b)return'';var all=b.querySelectorAll('.kv');for(var i=0;i<all.length;i++){var s=all[i].querySelector('small');if(s&&/Nomor Meter/i.test(s.textContent)){var x=all[i].querySelector('b');return x?x.textContent.trim():'';}}return'';}
  async function locationForTask(){
    var no=meterNo(),ms=window.meters||[],m=ms.find(function(x){return String(x.nomorMeter)===String(no);})||{};
    if(!ms.length){try{var mr=await request('getMeters');ms=mr.data||[];window.meters=ms;m=ms.find(function(x){return String(x.nomorMeter)===String(no);})||{};}catch(_) {}}
    var hs=window.history||[];
    if(!hs.length){try{var hr=await request('getHistory');hs=hr.data||hr.rows||[];window.history=hs;}catch(_) {}}
    var cand=hs.filter(function(x){return String(x.nomorMeter||x[3]||'')===String(no)&&x.latitude&&x.longitude;});
    var last=cand[cand.length-1];
    if(last)return{lat:Number(last.latitude),lon:Number(last.longitude),address:m.alamat||last.alamat||('Meter '+no)};
    if(m.latitude&&m.longitude)return{lat:Number(m.latitude),lon:Number(m.longitude),address:m.alamat||('Meter '+no)};
    var address=String(m.alamat||'').trim();
    if(address){try{var u='https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(address)+'&count=1&language=id&format=json';var r=await fetch(u);var j=await r.json();var z=j.results&&j.results[0];if(z)return{lat:Number(z.latitude),lon:Number(z.longitude),address:z.name||address};}catch(_) {}}
    return{lat:null,lon:null,address:address||('Meter '+no)};
  }
  function nav(loc){if(loc.lat!=null&&loc.lon!=null){window.location.href='geo:'+loc.lat+','+loc.lon+'?q='+loc.lat+','+loc.lon;}else if(loc.address){window.open('https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(loc.address),'_blank');}else{alert('Lokasi pekerjaan belum tersedia.');}}
  async function show(){
    var body=document.getElementById('modalBody');if(!body)return;
    body.innerHTML='<div style="padding:28px;text-align:center;color:#52708f">🌦️ Mengambil perkiraan cuaca lokasi kerja...</div>';
    try{
      var loc=await locationForTask();
      if(loc.lat==null||loc.lon==null)throw Error('Koordinat lokasi kerja belum tersedia untuk meter ini.');
      var url='https://api.open-meteo.com/v1/forecast?latitude='+encodeURIComponent(loc.lat)+'&longitude='+encodeURIComponent(loc.lon)+'&timezone=auto&forecast_days=2&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m';
      var r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('Layanan cuaca tidak merespons.');var j=await r.json(),c=j.current||{},h=j.hourly||{};
      var now=Date.now(),idx=(h.time||[]).findIndex(function(x){return new Date(x).getTime()>=now;});if(idx<0)idx=0;
      var prob=(h.precipitation_probability||[])[idx]||0,st=safety(c.weather_code,prob,c.wind_speed_10m);
      var rows=[0,1,2,3,4,5].map(function(k){var q=Math.min(idx+k,(h.time||[]).length-1);return '<div class="weather-hour"><b>'+new Date(h.time[q]).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})+'</b><span>'+icon(h.weather_code[q])+' '+Math.round(h.temperature_2m[q])+'°C</span><span>🌧️ '+(h.precipitation_probability[q]||0)+'%</span><span>💨 '+Math.round(h.wind_speed_10m[q]||0)+' km/j</span></div>';}).join('');
      body.innerHTML='<h2>🌦️ Cuaca Lokasi Kerja</h2><div class="weather-location">📍 '+E(loc.address)+'</div><div class="weather-main"><div class="weather-icon">'+icon(c.weather_code)+'</div><div><b>'+Math.round(c.temperature_2m)+'°C</b><div>'+E(text(c.weather_code))+'</div></div></div><div class="weather-grid"><div><small>Kelembapan</small><b>'+(c.relative_humidity_2m==null?'-':c.relative_humidity_2m)+'%</b></div><div><small>Peluang hujan</small><b>'+prob+'%</b></div><div><small>Angin</small><b>'+Math.round(c.wind_speed_10m||0)+' km/j</b></div><div><small>Terasa</small><b>'+Math.round(c.apparent_temperature==null?c.temperature_2m:c.apparent_temperature)+'°C</b></div></div><div class="weather-status '+st.c+'"><b>'+st.t+'</b><div>'+st.n+'</div></div><h3>Perkiraan beberapa jam ke depan</h3><div class="weather-hours">'+rows+'</div><div class="actions"><button id="twNav" class="primary">🧭 Navigasi ke Lokasi</button><button id="twRefresh" class="secondary">↻ Perbarui Cuaca</button></div><small class="weather-source">Data prakiraan: Open-Meteo · berdasarkan koordinat lokasi kerja.</small>';
      document.getElementById('twNav').onclick=function(){nav(loc);};document.getElementById('twRefresh').onclick=show;
    }catch(e){body.innerHTML='<h2>🌦️ Cuaca Lokasi Kerja</h2><div class="alert danger">'+E(e.message||e)+'</div><div class="actions"><button id="twNavFail" class="primary">🧭 Navigasi ke Lokasi</button></div>';document.getElementById('twNavFail').onclick=async function(){nav(await locationForTask());};}
  }
  function add(){
    var body=document.getElementById('modalBody');if(!body||document.getElementById('taskWeatherBtn'))return;
    var host=document.createElement('div');host.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px';
    host.innerHTML='<button id="taskWeatherBtn" class="primary" type="button">🌦️ Cek Cuaca</button><button id="taskNavBtn" class="secondary" type="button">🧭 Navigasi ke Lokasi</button>';body.appendChild(host);
    document.getElementById('taskWeatherBtn').onclick=show;
    document.getElementById('taskNavBtn').onclick=async function(){nav(await locationForTask());};
  }
  var obs=new MutationObserver(add);obs.observe(document.body,{subtree:true,childList:true});setTimeout(add,500);
})();
