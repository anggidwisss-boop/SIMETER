/* SIMETER FINAL UX PATCH - task completion + customer profile text fields */
(function(){
  const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function install(){
    if(typeof window.showModal!=='function'||typeof window.request!=='function'){setTimeout(install,250);return;}

    // Penugasan: tombol Selesai berdiri sendiri, lalu BA bisa dibuat sesudahnya.
    window.openTask=function(t){
      if(!t)return;
      const done=String(t.status||'TERBUKA').toUpperCase()==='SELESAI';
      showModal(`<h2>📋 ${E(t.judul||'Tugas Pemeliharaan')}</h2>
        <div class="details-grid">
          <div class="kv"><small>Nomor Meter</small><b>${E(t.nomorMeter||'-')}</b></div>
          <div class="kv"><small>Petugas</small><b>${E(t.petugas||t.assignee||'-')}</b></div>
          <div class="kv"><small>Jatuh Tempo</small><b>${E(t.jatuhTempo||t.dueDate||'-')}</b></div>
          <div class="kv"><small>Status</small><b>${E(t.status||'TERBUKA')}</b></div>
        </div>
        <div class="card"><b>Keterangan</b><p>${E(t.keterangan||'-')}</p></div>
        <div class="actions">
          ${done
            ? '<button class="secondary" disabled>✓ Penugasan Selesai</button><button id="taskBA" class="primary">📄 Berita Acara</button>'
            : '<button id="taskDo" class="primary">🔧 Kerjakan Pemeliharaan</button><button id="taskFinish" class="secondary">✓ Tandai Selesai</button><button id="taskBA" class="secondary">📄 Berita Acara</button>'}
        </div>`);
      const doBtn=$('taskDo'); if(doBtn)doBtn.onclick=()=>{closeModal();openMaintenance(t.nomorMeter);};
      const fin=$('taskFinish'); if(fin)fin.onclick=async()=>{
        if(!confirm('Tandai penugasan ini sebagai SELESAI?'))return;
        try{const r=await request('updateTaskStatus',{method:'POST',body:{id:t.id,status:'SELESAI'}});if(!r?.ok)throw Error(r?.error||'Gagal memperbarui tugas');closeModal();await loadTasks();alert('Penugasan berhasil ditandai SELESAI.');}catch(e){alert(e.message)}
      };
      const ba=$('taskBA'); if(ba)ba.onclick=()=>{closeModal();openBeritaAcara(t);};
    };

    // Setelah selesai, tampilkan badge status dan tombol BA pada daftar tugas.
    window.loadTasks=async function(){
      $('tasksView').innerHTML=`<div class="toolbar">${['SUPER_ADMIN','ADMIN','SUPERVISOR'].includes(USER?.role)?'<button id="newTaskBtn" class="primary">+ Penugasan Baru</button>':''}<button id="refreshTasks" class="secondary">↻</button></div><div id="taskList">Memuat...</div>`;
      if($('newTaskBtn'))$('newTaskBtn').onclick=newTask;$('refreshTasks').onclick=loadTasks;
      try{
        const params=['SUPER_ADMIN','ADMIN','SUPERVISOR'].includes(USER?.role)?{}:{username:USER?.username||''};
        const r=await request('getTasks',{params});tasks=r.data||[];
        $('taskList').innerHTML=tasks.map(t=>{const done=String(t.status||'').toUpperCase()==='SELESAI';return `<div class="card task" data-task="${E(t.id)}"><div><b>${E(t.nomorMeter||t.judul||'Tugas')}</b><div>${E(t.judul||t.keterangan||'')}</div><div class="meta">${E(t.petugas||t.assignee||'-')} · Jatuh tempo ${E(t.jatuhTempo||t.dueDate||'-')}</div></div><span class="badge">${done?'SELESAI':E(t.status||'TERBUKA')}</span>${done?'<div class="actions"><button class="secondary taskBAInline">📄 Berita Acara</button></div>':'<div class="actions"><button class="primary taskFinishInline">✓ Selesai</button><button class="secondary taskBAInline">📄 Berita Acara</button></div>'}</div>`}).join('')||'<div class="empty">Tidak ada tugas.</div>';
        document.querySelectorAll('[data-task]').forEach(el=>{const t=tasks.find(x=>String(x.id)===String(el.dataset.task));el.onclick=e=>{if(e.target.closest('button'))return;openTask(t)};const f=el.querySelector('.taskFinishInline');if(f)f.onclick=async e=>{e.stopPropagation();if(!confirm('Tandai penugasan sebagai SELESAI?'))return;try{const z=await request('updateTaskStatus',{method:'POST',body:{id:t.id,status:'SELESAI'}});if(!z?.ok)throw Error(z?.error||'Gagal');await loadTasks();}catch(err){alert(err.message)}};const b=el.querySelector('.taskBAInline');if(b)b.onclick=e=>{e.stopPropagation();openBeritaAcara(t)};});
      }catch(e){$('taskList').innerHTML='<div class="alert danger">'+E(e.message)+'</div>';}
    };
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
