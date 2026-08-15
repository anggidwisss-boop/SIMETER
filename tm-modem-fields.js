/* RIMPU TM: tambahan data modem & SIM card pada Form Pemeliharaan Meter TM */
(function(){
  const FIELDS = [
    ['fmNomorModem','Nomor Modem','Masukkan nomor modem'],
    ['fmMerkModem','Merk Modem','Masukkan merk modem'],
    ['fmNomorSimcard','Nomor SIM Card','Masukkan nomor SIM card'],
    ['fmProviderSimcard','Provider SIM Card','Contoh: Telkomsel / Indosat / XL / 3']
  ];

  function E(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  function addFields(){
    const meter=document.getElementById('fmMeter');
    const modal=document.getElementById('modalBody');
    if(!meter || !modal || document.getElementById('fmNomorModem')) return;

    const heading=document.createElement('h3');
    heading.textContent='Data Modem & SIM Card';
    heading.id='tmModemHeading';

    const wrap=document.createElement('div');
    wrap.className='row';
    wrap.innerHTML=`
      <label>Nomor Modem<input id="fmNomorModem" placeholder="Masukkan nomor modem"></label>
      <label>Merk Modem<input id="fmMerkModem" placeholder="Masukkan merk modem"></label>
      <label>Nomor SIM Card<input id="fmNomorSimcard" inputmode="numeric" placeholder="Masukkan nomor SIM card"></label>
      <label>Provider SIM Card<input id="fmProviderSimcard" placeholder="Telkomsel / Indosat / XL / 3"></label>`;

    const firstSection=Array.from(modal.querySelectorAll('h3')).find(h=>h.textContent.trim()==='Data Pelanggan TM');
    if(firstSection){
      firstSection.parentNode.insertBefore(heading,firstSection);
      firstSection.parentNode.insertBefore(wrap,firstSection);
    }else{
      modal.insertBefore(heading,modal.firstChild);
      modal.insertBefore(wrap,heading.nextSibling);
    }
  }

  function installRequestPatch(){
    if(typeof window.request!=='function') return false;
    if(window.__rimpuModemRequestPatched) return true;
    const original=window.request;
    window.request=async function(action,options){
      if(action==='saveMaintenance' && options && options.body){
        const body=options.body;
        const get=id=>(document.getElementById(id)?.value||'').trim();
        const fields={
          nomorModem:get('fmNomorModem'),
          merkModem:get('fmMerkModem'),
          nomorSimcard:get('fmNomorSimcard'),
          providerSimcard:get('fmProviderSimcard')
        };
        Object.assign(body,fields);
        const modemNotes=[
          ['NOMOR MODEM',fields.nomorModem],
          ['MERK MODEM',fields.merkModem],
          ['NOMOR SIM CARD',fields.nomorSimcard],
          ['PROVIDER SIM CARD',fields.providerSimcard]
        ].filter(x=>x[1]).map(x=>x[0]+': '+x[1]);
        if(modemNotes.length){
          body.keterangan=[body.keterangan||'',...modemNotes].filter(Boolean).join('\n');
        }
      }
      return original.apply(this,arguments);
    };
    window.__rimpuModemRequestPatched=true;
    return true;
  }

  function install(){
    addFields();
    installRequestPatch();
    if(!document.getElementById('tmModemFieldsStyle')){
      const st=document.createElement('style');
      st.id='tmModemFieldsStyle';
      st.textContent=`#tmModemHeading{margin-top:18px}.modal-card .row:has(#fmNomorModem){grid-template-columns:1fr 1fr}.modal-card .row:has(#fmNomorModem) label{min-width:0}@media(max-width:700px){.modal-card .row:has(#fmNomorModem){grid-template-columns:1fr}}`;
      document.head.appendChild(st);
    }
  }

  const observer=new MutationObserver(install);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install); else install();
  setInterval(install,1000);
})();
