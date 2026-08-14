/* SIMETER V8 enhancements: task completion + richer meter cards */
(function () {
  function esc2(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c];
    });
  }

  function install() {
    if (typeof window.openTask !== "function" || typeof window.showModal !== "function") {
      setTimeout(install, 250);
      return;
    }

    // Kartu meter: tampilkan status pelanggan dan 4 stand terakhir.
    window.meterCard = function (m) {
      var st = typeof customerStatus === "function" ? customerStatus(m) : (m.statusPelanggan || "Aktif");
      var cls = typeof statusClass === "function" ? statusClass(st) : "status-due";
      return '<div class="meter-card" data-meter="' + esc2(m.nomorMeter) + '">' +
        '<div class="meter-head"><div><h3>' + esc2(m.namaPelanggan || "Meter") + '</h3><div>' + esc2(m.nomorMeter || "-") + '</div></div>' +
        '<b class="' + cls + '">● ' + esc2(st) + '</b></div>' +
        '<div class="details-grid">' +
        '<div class="kv"><small>ID Pelanggan</small><b>' + esc2(m.idPelanggan || "-") + '</b></div>' +
        '<div class="kv"><small>Interval</small><b>' + esc2(m.intervalHari || 30) + ' hari</b></div>' +
        '<div class="kv"><small>Jatuh Tempo</small><b>' + esc2(m.jatuhTempo || "-") + '</b></div>' +
        '<div class="kv"><small>Pemeliharaan Terakhir</small><b>' + esc2(m.terakhirPemeliharaan || "-") + '</b></div>' +
        '<div class="kv"><small>LWBP</small><b>' + esc2(m.standLWBP || "-") + '</b></div>' +
        '<div class="kv"><small>WBP</small><b>' + esc2(m.standWBP || "-") + '</b></div>' +
        '<div class="kv"><small>KVARH</small><b>' + esc2(m.standKVARH || "-") + '</b></div>' +
        '<div class="kv"><small>KWH TOTAL</small><b>' + esc2(m.standKWHtotal || "-") + '</b></div>' +
        '</div></div>';
    };

    // Tugas: tambahkan tombol Selesai yang langsung membuka BA digital.
    window.openTask = function (t) {
      if (!t) return;
      var done = String(t.status || "TERBUKA").toUpperCase() === "SELESAI";
      var canComplete = !done && typeof window.openBeritaAcara === "function";
      showModal('<h2>' + esc2(t.judul || "Tugas Pemeliharaan") + '</h2>' +
        '<div class="details-grid">' +
        '<div class="kv"><small>Nomor Meter</small><b>' + esc2(t.nomorMeter || "-") + '</b></div>' +
        '<div class="kv"><small>Petugas</small><b>' + esc2(t.petugas || t.assignee || "-") + '</b></div>' +
        '<div class="kv"><small>Jatuh Tempo</small><b>' + esc2(t.jatuhTempo || t.dueDate || "-") + '</b></div>' +
        '<div class="kv"><small>Status</small><b>' + esc2(t.status || "TERBUKA") + '</b></div>' +
        '</div><div class="card"><b>Keterangan</b><p>' + esc2(t.keterangan || "-") + '</p></div>' +
        '<div class="actions">' +
        (done ? '<button class="secondary" disabled>✓ Tugas sudah selesai</button>' :
          '<button id="taskDo2" class="primary">🔧 Kerjakan Pemeliharaan</button>' +
          (canComplete ? '<button id="taskFinish2" class="secondary">✓ Selesai + Berita Acara</button>' : '')) +
        '</div>');

      var doBtn = document.getElementById("taskDo2");
      if (doBtn) doBtn.onclick = function () { closeModal(); openMaintenance(t.nomorMeter); };
      var finishBtn = document.getElementById("taskFinish2");
      if (finishBtn) finishBtn.onclick = function () {
        closeModal();
        if (typeof window.openBeritaAcara === "function") window.openBeritaAcara(t);
      };
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
})();
