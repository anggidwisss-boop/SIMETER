(function(){
  function addButtons(){
    var body=document.getElementById('modalBody');
    if(!body || document.getElementById('taskWeatherBtn')) return;
    var host=document.createElement('div');
    host.className='task-location-actions';
    host.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px';
    host.innerHTML='<button id="taskWeatherBtn" class="primary" type="button">🌦️ Cek Cuaca</button><button id="taskNavBtn" class="secondary" type="button">🧭 Navigasi ke Lokasi</button>';
    body.appendChild(host);
    document.getElementById('taskWeatherBtn').onclick=function(){alert('Fitur cek cuaca siap.');};
    document.getElementById('taskNavBtn').onclick=function(){alert('Fitur navigasi siap.');};
  }
  var old=window.openTask;
  if(old){window.openTask=function(t){old(t);setTimeout(addButtons,100);};}
})();
