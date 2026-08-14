/* SIMETER FINAL UX PATCH - monitoring penugasan + download PDF BA */
(function(){
  const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ADMIN_ROLES=['SUPER_ADMIN','ADMIN','SUPERVISOR'];

  async function getTasksView(){
    if(ADMIN_ROLES.includes(USER?.role)){
      // Jangan gunakan request(): request() otomatis menambahkan username.
      // Untuk admin/supervisor kita memang ingin seluruh penugasan.
      const q=new URLSearchParams({action:'getTasks',v:(typeof APP_VERSION!=='undefined'?APP_VERSION:'8.0.1')});
      const r=await fetch(API+'?'+q.toString(),{cache:'no-store',redirect:'follow'});
      const txt=await r.text();
      return JSON.parse(txt);
    }
    return await request('getTasks',{params:{username:USER?.username||''}});
  }

  async function getBA(task){
    const r=await request('getBeritaAcaraByTask',{params:{idTugas:task.id}});
    return r&&r.ok?r.data:null;
  }

  window.downloadBA=async function(task){
    try{
      const ba=await getBA(task);
      if(ba&&ba.pdfUrl){
        window.open(ba.pdfUrl,'_blank','noopener');
        return;
      }
      if(ba){
        alert('Berita Acara sudah ada, tetapi PDF belum dibuat. Buka Berita Acara lalu simpan kembali untuk membuat PDF.');
      }else{
        alert('Belum ada Berita Acara untuk penugasan ini.');
      }
    }catch(e){alert('Gagal mengambil PDF BA: '+(e.message||e));}
  };

  window.openTask=function(t){
    if(!t)return;
    const done=String(t.status||'TERBUKA').toUpperCase()==='SELESAI';
    showModal(`<h2>📋 ${E(t.judul||'Tugas Pemeliharaan')}</h2>
      <div class="details-grid">
        <div class="kv"><small>Nomor Meter</small><b>${E(t.nomorMeter||'-')}</b></div>
        <div class="kv"><small>Petugas</small><b>${E(t.petugas||t.assignee||'-')}</b></div>
        <div class="kv"><small>Dibuat Oleh</small><b>${E(t.createdBy||'-')}</b></div>
        <div class="kv"><small>Jatuh Tempo</small><b>${E(t.jatuhTempo||t.dueDate||'-')}</b></div>
        <div class="kv"><small>Status</small><b>${E(t.status||'TERBUKA')}</b></div>
      </div>
      <div class="card"><b>Keterangan</b><p>${E(t.keterangan||'-')}</p></div>
      <div class="actions">
        ${done?'':'<button id="taskDo" class="primary">🔧 Kerjakan Pemeliharaan</button><button id="taskFinish" class="secondary">✓ Tandai Selesai</button>'}
        <button id="taskBA" class="secondary">📄 Berita Acara</button>
        <button id="taskPDF" class="primary">⬇ Download PDF BA</button>
      </div>
      <div id="baInfo" class="msg">Memeriksa Berita Acara...</div>`);

    const doBtn=$('taskDo');
    if(doBtn)doBtn.onclick=()=>{closeModal();openMaintenance(t.nomorMeter);};
    const fin=$('taskFinish');
    if(fin)fin.onclick=async()=>{
      if(!confirm('Tandai penugasan ini sebagai SELESAI?'))return;
      try{
        const r=await request('updateTaskStatus',{method:'POST',body:{id:t.id,status:'SELESAI'}});
        if(!r?.ok)throw Error(r?.error||'Gagal memperbarui tugas');
        closeModal();await loadTasks();alert('Penugasan berhasil ditandai SELESAI.');
      }catch(e){alert(e.message||e)}
    };
    const baBtn=$('taskBA'); if(baBtn)baBtn.onclick=()=>{closeModal();openBeritaAcara(t);};
    const pdfBtn=$('taskPDF'); if(pdfBtn)pdfBtn.onclick=()=>downloadBA(t);

    getBA(t).then(ba=>{
      const info=$('baInfo');
      if(!info)return;
      if(ba&&ba.pdfUrl){
        info.innerHTML='<b>📄 PDF BA tersedia</b><br><a class="primary" href="'+E(ba.pdfUrl)+'" target="_blank" rel="noopener">⬇ Buka / Download PDF</a><div class="meta">Nomor BA: '+E(ba.nomorBA||'-')+' · Status: '+E(ba.statusBA||'-')+'</div>';
      }else if(ba){
        info.innerHTML='<b>📝 Berita Acara tersedia</b><br>PDF belum tersedia.';
      }else{
        info.innerHTML='<span class="muted">Belum ada Berita Acara.</span>';
      }
    }).catch(()=>{const info=$('baInfo');if(info)info.innerHTML='<span class="muted">Belum dapat memeriksa BA.</span>';});
  };

  window.loadTasks=async function(){
    $('tasksView').innerHTML=`<div class="toolbar">${ADMIN_ROLES.includes(USER?.role)?'<button id="newTaskBtn" class="primary">+ Penugasan Baru</button>':''}<button id="refreshTasks" class="secondary">↻</button></div><div id="taskList">Memuat...</div>`;
    if($('newTaskBtn'))$('newTaskBtn').onclick=newTask;
    $('refreshTasks').onclick=loadTasks;
    try{
      const r=await getTasksView();
      if(!r||!r.ok)throw Error(r?.error||'Gagal mengambil penugasan.');
      tasks=r.data||[];
      $('taskList').innerHTML=tasks.map(t=>{
        const done=String(t.status||'').toUpperCase()==='SELESAI';
        return `<div class="card task" data-task="${E(t.id)}">
          <div><b>${E(t.nomorMeter||t.judul||'Tugas')}</b><div>${E(t.judul||t.keterangan||'')}</div>
          <div class="meta">${E(t.petugas||t.assignee||'-')} · Dibuat oleh ${E(t.createdBy||'-')} · Jatuh tempo ${E(t.jatuhTempo||t.dueDate||'-')}</div></div>
          <span class="badge">${done?'✓ SELESAI':E(t.status||'TERBUKA')}</span>
          <div class="actions">
            ${done?'':'<button class="primary taskFinishInline">✓ Selesai</button>'}
            <button class="secondary taskBAInline">📄 Berita Acara</button>
            <button class="secondary taskPDFInline">⬇ PDF BA</button>
          </div>
        </div>`;
      }).join('')||'<div class="empty">Tidak ada tugas.</div>';

      document.querySelectorAll('[data-task]').forEach(el=>{
        const t=tasks.find(x=>String(x.id)===String(el.dataset.task));
        el.onclick=e=>{if(e.target.closest('button'))return;openTask(t);};
        const f=el.querySelector('.taskFinishInline');
        if(f)f.onclick=async e=>{e.stopPropagation();if(!confirm('Tandai penugasan sebagai SELESAI?'))return;try{const z=await request('updateTaskStatus',{method:'POST',body:{id:t.id,status:'SELESAI'}});if(!z?.ok)throw Error(z?.error||'Gagal');await loadTasks();}catch(err){alert(err.message)}};
        const b=el.querySelector('.taskBAInline');if(b)b.onclick=e=>{e.stopPropagation();openBeritaAcara(t);};
        const p=el.querySelector('.taskPDFInline');if(p)p.onclick=e=>{e.stopPropagation();downloadBA(t);};
      });
    }catch(e){$('taskList').innerHTML='<div class="alert danger">'+E(e.message||e)+'</div>';}
  };

  // Monitor penugasan pada menu Administrasi.
  window.loadAdminTasks=async function(){
    try{
      const r=await getTasksView();
      if(!r||!r.ok)throw Error(r?.error||'Gagal mengambil penugasan.');
      const a=r.data||[];
      const total=a.length, open=a.filter(x=>String(x.status||'').toUpperCase()==='TERBUKA').length, done=a.filter(x=>String(x.status||'').toUpperCase()==='SELESAI').length, process=a.filter(x=>String(x.status||'').toUpperCase()==='DIPROSES').length;
      $('adminTaskList').innerHTML=`<div class="grid"><div class="stat"><small>Total</small><b>${total}</b></div><div class="stat"><small>Terbuka</small><b>${open}</b></div><div class="stat"><small>Diproses</small><b>${process}</b></div><div class="stat"><small>Selesai</small><b>${done}</b></div></div><div class="toolbar"><button id="adminRefreshTasks" class="secondary">↻ Refresh</button></div>`+
        (a.map(t=>`<div class="meter-card"><div class="meter-head"><div><b>${E(t.nomorMeter||'-')}</b><div>${E(t.judul||'-')}</div><small>Petugas: ${E(t.petugas||t.assignee||'-')} · Dibuat oleh: ${E(t.createdBy||'-')}</small></div><b class="badge">${E(t.status||'TERBUKA')}</b></div><div class="meta">Jatuh tempo: ${E(t.jatuhTempo||t.dueDate||'-')}</div><div class="actions"><button class="secondary adminBA" data-id="${E(t.id)}">📄 BA</button><button class="secondary adminPDF" data-id="${E(t.id)}">⬇ PDF BA</button></div></div>`).join('')||'<div class="empty">Belum ada penugasan.</div>');
      $('adminRefreshTasks').onclick=loadAdminTasks;
      document.querySelectorAll('.adminBA').forEach(b=>b.onclick=()=>{const t=a.find(x=>String(x.id)===String(b.dataset.id));if(t)openBeritaAcara(t);});
      document.querySelectorAll('.adminPDF').forEach(b=>b.onclick=()=>{const t=a.find(x=>String(x.id)===String(b.dataset.id));if(t)downloadBA(t);});
    }catch(e){$('adminTaskList').innerHTML='<div class="alert danger">'+E(e.message||e)+'</div>';}
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
