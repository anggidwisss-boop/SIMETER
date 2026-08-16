(function(){
  const esc2=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  let petugasUsers=[];

  async function getPetugasUsers(){
    try{
      const r=await request('getUsers');
      const a=Array.isArray(r?.data)?r.data:[];
      petugasUsers=a.filter(u=>String(u.role||'').toUpperCase()==='PETUGAS' && u.active!==false);
      return petugasUsers;
    }catch(e){console.warn('Gagal mengambil daftar petugas',e);petugasUsers=[];return [];}
  }

  window.newTask=async function(){
    const users=await getPetugasUsers();
    const options=users.map(u=>`<option value="${esc2(u.username)}">${esc2(u.name||u.username)}${u.unit?` · ${esc2(u.unit)}`:''}</option>`).join('');
    showModal(`<h2>Penugasan Baru</h2><div class="form"><label>Nomor Meter<input id="tnm" inputmode="numeric" placeholder="Nomor meter"></label><label>Judul<input id="tjudul" placeholder="Pemeliharaan meter"></label><label>Petugas<select id="tpetugas"><option value="">-- Pilih Petugas --</option>${options}</select></label><label>Deadline<input id="tdeadline" type="date"></label>${users.length?'':'<div class="alert danger">Belum ada user dengan role PETUGAS aktif. Tambahkan petugas terlebih dahulu.</div>'}<button id="saveTaskBtn" class="primary" ${users.length?'':'disabled'}>Simpan Penugasan</button></div>`);
    const d=$('tdeadline');if(d&&!d.value){const n=new Date();d.value=n.toISOString().slice(0,10);}
    $('saveTaskBtn').onclick=async()=>{const pet=$('tpetugas').value.trim();if(!pet)return alert('Pilih petugas terlebih dahulu.');const nomor=$('tnm').value.trim();if(!nomor)return alert('Nomor meter wajib diisi.');try{const selected=users.find(u=>String(u.username)===pet);const r=await request('saveTask',{method:'POST',body:{nomorMeter:nomor,judul:$('tjudul').value.trim()||'Pemeliharaan meter',assignee:pet,assignees:[pet],petugas:pet,petugasNama:selected?.name||pet,createdBy:USER?.username||'',dueDate:$('tdeadline').value,deadline:$('tdeadline').value,status:'TERBUKA'}});if(!r?.ok)throw Error(r?.error||'Gagal menyimpan penugasan.');if(Number(r.count||0)<1)throw Error('Petugas tidak ditemukan di database. Silakan refresh daftar petugas.');closeModal();if(typeof loadTasks==='function')await loadTasks();alert('Penugasan berhasil dibuat untuk '+(selected?.name||pet)+'.');}catch(e){alert(e.message||'Gagal menyimpan penugasan.');}};
  };

  const style=document.createElement('style');style.textContent=`.weather-task-actions{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}.weather-task-actions button{border:1px solid #d9e5f3!important;border-radius:12px!important;padding:9px 12px!important;font-weight:700!important;background:#f3f7fc!important;color:#155eb8!important;cursor:pointer}.weather-task-actions button:active{transform:scale(.98)}.weather-task-actions span{background:#eef5ff;color:#155eb8;padding:8px 11px;border-radius:999px;font-size:.86em;font-weight:700}#tpetugas{width:100%;min-height:48px;padding:12px;border:1px solid #d9e3ef;border-radius:12px;background:#f8fbff;color:#173e70;font-size:16px}`;document.head.appendChild(style);

  /* FIX: setiap kartu meter harus membuka data meter yang benar, bukan data pelanggan pertama. */
  function openCorrectMeter(m){
    if(!m||typeof showModal!=='function')return;
    const e=v=>esc2(v==null||v===''?'-':v);
    showModal(`<h2>${e(m.namaPelanggan||'Data Meter')}</h2><div class="details-grid"><div class="kv"><small>ID Pelanggan</small><b>${e(m.idPelanggan)}</b></div><div class="kv"><small>Nomor Meter</small><b>${e(m.nomorMeter)}</b></div><div class="kv"><small>Alamat</small><b>${e(m.alamat)}</b></div><div class="kv"><small>Kategori</small><b>${e(m.kategori)}</b></div><div class="kv"><small>Sub Kategori</small><b>${e(m.subKategori)}</b></div><div class="kv"><small>Merk</small><b>${e(m.merk)}</b></div><div class="kv"><small>Status Pelanggan</small><b>${e(m.statusPelanggan||m.status)}</b></div><div class="kv"><small>Status Aset</small><b>${e(m.status)}</b></div><div class="kv"><small>Interval Pemeliharaan</small><b>${e(m.intervalHari)} hari</b></div><div class="kv"><small>Pemeliharaan Terakhir</small><b>${e(m.terakhirPemeliharaan)}</b></div><div class="kv"><small>Jatuh Tempo</small><b>${e(m.jatuhTempo)}</b></div><div class="kv"><small>LWBP</small><b>${e(m.standLWBP)}</b></div><div class="kv"><small>WBP</small><b>${e(m.standWBP)}</b></div><div class="kv"><small>KVARH</small><b>${e(m.standKVARH)}</b></div><div class="kv"><small>KWH TOTAL</small><b>${e(m.standKWHtotal)}</b></div></div>`);
  }
  document.addEventListener('click',function(ev){
    const card=ev.target.closest('.meter-card[data-meter]');
    if(!card)return;
    if(ev.target.closest('button,a,input,select,textarea'))return;
    const no=card.getAttribute('data-meter');
    const list=Array.isArray(window.meters)&&window.meters.length?window.meters:meters;
    const m=(Array.isArray(list)?list:[]).find(x=>String(x.nomorMeter||'').trim()===String(no||'').trim());
    if(m){ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();openCorrectMeter(m);}
  },true);
})();
