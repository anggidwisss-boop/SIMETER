/* SIMETER V9 enhancements: task completion + rich TM maintenance form */
(function () {
  function esc2(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c];
    });
  }
  function install() {
    if (typeof window.openTask !== "function" || typeof window.showModal !== "function") { setTimeout(install, 250); return; }
    window.meterCard = function (m) {
      var st = typeof customerStatus === "function" ? customerStatus(m) : (m.statusPelanggan || "Aktif");
      var cls = typeof statusClass === "function" ? statusClass(st) : "status-due";
      return '<div class="meter-card" data-meter="' + esc2(m.nomorMeter) + '"><div class="meter-head"><div><h3>' + esc2(m.namaPelanggan || "Meter") + '</h3><div>' + esc2(m.nomorMeter || "-") + '</div></div><b class="' + cls + '">● ' + esc2(st) + '</b></div><div class="details-grid">' +
        '<div class="kv"><small>ID Pelanggan</small><b>' + esc2(m.idPelanggan || "-") + '</b></div><div class="kv"><small>Interval</small><b>' + esc2(m.intervalHari || 30) + ' hari</b></div><div class="kv"><small>Jatuh Tempo</small><b>' + esc2(m.jatuhTempo || "-") + '</b></div><div class="kv"><small>Pemeliharaan Terakhir</small><b>' + esc2(m.terakhirPemeliharaan || "-") + '</b></div>' +
        '<div class="kv"><small>LWBP</small><b>' + esc2(m.standLWBP || "-") + '</b></div><div class="kv"><small>WBP</small><b>' + esc2(m.standWBP || "-") + '</b></div><div class="kv"><small>KVARH</small><b>' + esc2(m.standKVARH || "-") + '</b></div><div class="kv"><small>KWH TOTAL</small><b>' + esc2(m.standKWHtotal || "-") + '</b></div></div></div>';
    };
    window.openTask = function (t) {
      if (!t) return;
      var done = String(t.status || "TERBUKA").toUpperCase() === "SELESAI";
      showModal('<h2>' + esc2(t.judul || "Tugas Pemeliharaan") + '</h2><div class="details-grid"><div class="kv"><small>Nomor Meter</small><b>' + esc2(t.nomorMeter || "-") + '</b></div><div class="kv"><small>Petugas</small><b>' + esc2(t.petugas || t.assignee || "-") + '</b></div><div class="kv"><small>Jatuh Tempo</small><b>' + esc2(t.jatuhTempo || t.dueDate || "-") + '</b></div><div class="kv"><small>Status</small><b>' + esc2(t.status || "TERBUKA") + '</b></div></div><div class="card"><b>Keterangan</b><p>' + esc2(t.keterangan || "-") + '</p></div><div class="actions">' + (done ? '<button class="secondary" disabled>✓ Tugas sudah selesai</button>' : '<button id="taskDo2" class="primary">🔧 Kerjakan Pemeliharaan</button><button id="taskFinish2" class="secondary">✓ Selesai + Berita Acara</button>') + '</div>');
      var doBtn = document.getElementById("taskDo2"); if (doBtn) doBtn.onclick = function () { closeModal(); openMaintenance(t.nomorMeter); };
      var finishBtn = document.getElementById("taskFinish2"); if (finishBtn) finishBtn.onclick = function () { closeModal(); openBeritaAcara(t); };
    };
    window.openMaintenance = function (nomor) {
      var m = (window.meters || []).find(function (x) { return String(x.nomorMeter) === String(nomor); }) || {nomorMeter:nomor};
      var opts = function(a,s){ return a.map(function(x){ return '<option ' + (x===s?'selected':'') + '>' + esc2(x) + '</option>'; }).join(''); };
      showModal('<h2>🔧 Form Pemeliharaan Meter TM</h2><div class="form">' +
        '<div class="row"><label>Nomor Meter<input id="fmMeter" value="' + esc2(m.nomorMeter||'') + '"></label><label>ID Pelanggan<input id="fmId" value="' + esc2(m.idPelanggan||'') + '"></label></div>' +
        '<label>Nama Pelanggan<input value="' + esc2(m.namaPelanggan||'') + '" readonly></label><label>Alamat<input value="' + esc2(m.alamat||'') + '" readonly></label>' +
        '<div class="row"><label>Status Pelanggan<select id="fmStatus">' + opts(['Aktif','Non Aktif','Normal','Overdue'],m.statusPelanggan||'Aktif') + '</select></label><label>Jenis Pemeliharaan<select id="fmJenis">' + opts(['Pemeriksaan meter','Pemeliharaan rutin','Perbaikan','Penggantian'],'Pemeriksaan meter') + '</select></label></div>' +
        '<div class="row"><label>Kondisi Meter<select id="fmKondisi">' + opts(['Baik','Normal','Perlu Perbaikan','Rusak'],'Baik') + '</select></label><label>Kondisi Segel<select id="fmSegel">' + opts(['Baik','Normal','Perlu Perbaikan','Rusak','Tidak Ada'],'Baik') + '</select></label></div>' +
        '<h3>Data Pelanggan TM</h3><label>Profil Bangunan Pelanggan Tampak Depan<input id="fmBangunan" placeholder="Keterangan bangunan pelanggan"></label><label>Bangunan Kubikel / Tiang PMCB<input id="fmBangunanPMCB" placeholder="Keterangan kondisi bangunan / tiang"></label><label>Kubikel / PMCB<input id="fmKubikel" placeholder="Keterangan kondisi kubikel / PMCB"></label>' +
        '<h3>CT</h3><div class="row"><label>CT R<input id="fmCTR"></label><label>CT S<input id="fmCTS"></label></div><label>CT T<input id="fmCTT"></label>' +
        '<h3>PT</h3><div class="row"><label>PT R<input id="fmPTR"></label><label>PT S<input id="fmPTS"></label></div><label>PT T<input id="fmPTT"></label><label>KWH Meter<input id="fmKWHMeter" placeholder="Keterangan / kondisi KWH meter"></label>' +
        '<h3>Tegangan KWH Meter</h3><div class="row"><label>R<input id="fmVR" type="number" step="0.01" inputmode="decimal"></label><label>S<input id="fmVS" type="number" step="0.01" inputmode="decimal"></label></div><label>T<input id="fmVT" type="number" step="0.01" inputmode="decimal"></label>' +
        '<h3>Arus KWH Meter</h3><div class="row"><label>R<input id="fmIR" type="number" step="0.01" inputmode="decimal"></label><label>S<input id="fmIS" type="number" step="0.01" inputmode="decimal"></label></div><label>T<input id="fmIT" type="number" step="0.01" inputmode="decimal"></label>' +
        '<h3>Stand Meter</h3><div class="row"><label>LWBP<input id="fmLWBP" type="number" step="0.01" inputmode="decimal" value="' + esc2(m.standLWBP||'') + '"></label><label>WBP<input id="fmWBP" type="number" step="0.01" inputmode="decimal" value="' + esc2(m.standWBP||'') + '"></label></div><div class="row"><label>KVARH<input id="fmKVARH" type="number" step="0.01" inputmode="decimal" value="' + esc2(m.standKVARH||'') + '"></label><label>KWH TOTAL<input id="fmKWH" type="number" step="0.01" inputmode="decimal" value="' + esc2(m.standKWHtotal||'') + '"></label></div>' +
        '<label>Kesimpulan<select id="fmKesimpulan">' + opts(['Normal / Baik','Perlu Pemeliharaan','Perlu Perbaikan','Perlu Penggantian','Tidak Dapat Dilakukan'],'Normal / Baik') + '</select></label><label>Catatan / Hasil Pemeriksaan<textarea id="fmKet" rows="4" placeholder="Tuliskan hasil pemeriksaan dan temuan..."></textarea></label>' +
        '<div id="gpsInfo">GPS belum diambil</div><button id="gpsBtn" class="secondary">📍 Ambil GPS</button><button id="saveMaintenanceBtn" class="primary big">💾 Simpan Pemeliharaan</button></div>');
      document.getElementById("gpsBtn").onclick = typeof getGPS === "function" ? getGPS : function(){};
      document.getElementById("saveMaintenanceBtn").onclick = window.saveMaintenanceTM;
    };
    window.saveMaintenanceTM = async function () {
      var v=function(id){var e=document.getElementById(id);return e?e.value.trim():'';}, kwh=v('fmKWH');
      var notes=[['PROFIL BANGUNAN TAMPAK DEPAN',v('fmBangunan')],['BANGUNAN KUBIKEL / TIANG PMCB',v('fmBangunanPMCB')],['KUBIKEL / PMCB',v('fmKubikel')],['KWH METER',v('fmKWHMeter')],['CT R',v('fmCTR')],['CT S',v('fmCTS')],['CT T',v('fmCTT')],['PT R',v('fmPTR')],['PT S',v('fmPTS')],['PT T',v('fmPTT')],['TEGANGAN R',v('fmVR')],['TEGANGAN S',v('fmVS')],['TEGANGAN T',v('fmVT')],['ARUS R',v('fmIR')],['ARUS S',v('fmIS')],['ARUS T',v('fmIT')],['KESIMPULAN',v('fmKesimpulan')],['STATUS PELANGGAN',v('fmStatus')]].filter(function(x){return x[1]!=='';}).map(function(x){return x[0]+': '+x[1];});
      var ket=v('fmKet'); if(ket) notes.push('CATATAN: '+ket);
      var body={nomorMeter:v('fmMeter'),idPelanggan:v('fmId'),jenis:v('fmJenis'),kondisi:v('fmKondisi'),kondisiSegel:v('fmSegel'),hasilPemeriksaan:v('fmKesimpulan'),stand:kwh,standLWBP:v('fmLWBP'),standWBP:v('fmWBP'),standKVARH:v('fmKVARH'),standKWHtotal:kwh,keterangan:notes.join('\n'),petugas:window.USER?.name||window.USER?.username||'',username:window.USER?.username||'',...(window.gps||{})};
      try{var r=await request('saveMaintenance',{method:'POST',body:body});if(!r.ok)throw Error(r.error||'Gagal menyimpan');closeModal();alert('Pemeliharaan tersimpan. Semua data teks pemeriksaan, stand, dan GPS sudah masuk database.');navigate('meters');}catch(e){alert('Gagal menyimpan: '+e.message);}
    };
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install); else install();
})();
