/* RIMPU loader: final meter UI. The previous patch duplicated weather/navigation buttons. */
(function(){
  'use strict';
  if(window.__rimpuMeterFinalLoaded)return;
  window.__rimpuMeterFinalLoaded=true;
  const s=document.createElement('script');
  s.src='meter-ui-final.js?v=20260818-3';
  s.async=false;
  s.onload=()=>console.log('RIMPU final meter UI aktif');
  s.onerror=()=>console.warn('RIMPU final meter UI gagal dimuat');
  document.head.appendChild(s);
})();