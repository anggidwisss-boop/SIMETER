(function(){
  function add(){
    var body=document.getElementById('modalBody');
    if(!body||document.getElementById('taskWeatherBtn'))return;
    var host=document.createElement('div');host.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px';
    host.innerHTML='<button id="taskWeatherBtn" class="primary" type="button">🌦️ Cek Cuaca</button><button id="taskNavBtn" class="secondary" type="button">🧭 Navigasi ke Lokasi</button>';
    body.appendChild(host);
    document.getElementById('taskNavBtn').onclick=function(){
      navigator.geolocation.getCurrentPosition(function(p){window.open('https://www.google.com/maps/search/?api=1&query='+p.coords.latitude+','+p.coords.longitude,'_blank')},function(){alert('GPS belum tersedia pada perangkat.')});
    };
    document.getElementById('taskWeatherBtn').onclick=function(){
      if(!navigator.geolocation)return alert('GPS tidak tersedia.');
      navigator.geolocation.getCurrentPosition(function(p){
        fetch('https://api.open-meteo.com/v1/forecast?latitude='+p.coords.latitude+'&longitude='+p.coords.longitude+'&current=temperature_2m,weather_code,wind_speed_10m&hourly=precipitation_probability&timezone=auto')
        .then(function(r){return r.json()}).then(function(j){
          var c=j.current||{};alert('Cuaca lokasi perangkat\\n'+(c.temperature_2m??'-')+'°C\\nKode cuaca: '+(c.weather_code??'-')+'\\nAngin: '+(c.wind_speed_10m??'-')+' km/j');
        }).catch(function(){alert('Cuaca belum dapat diambil.');});
      },function(){alert('GPS belum tersedia pada perangkat.');});
    };
  }
  var obs=new MutationObserver(add);obs.observe(document.body,{subtree:true,childList:true});setTimeout(add,500);
})();
