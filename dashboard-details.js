/* SIMETER - kartu Ringkasan dapat disentuh untuk melihat data */
(function () {
  function escSafe(v) {
    if (typeof window.esc === "function") return window.esc(v);
    return String(v == null ? "" : v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  }
  function val(x, keys, index) {
    if (Array.isArray(x) && index != null && x[index] != null && String(x[index]).trim() !== "") return x[index];
    if (x && !Array.isArray(x)) for (const k of keys) if (x[k] != null && String(x[k]).trim() !== "") return x[k];
    return "-";
  }
  function itemRow(label, value) {
    return `<div class="kv"><small>${escSafe(label)}</small><b>${escSafe(value)}</b></div>`;
  }
  function openList(title, subtitle, items, renderer) {
    if (typeof window.showModal !== "function") return;
    const body = items.length ? items.map(renderer).join("") : '<div class="empty">Tidak ada data.</div>';
    window.showModal(`<h2>${escSafe(title)}</h2><p class="muted">${escSafe(subtitle)}</p><div class="dashboard-detail-list">${body}</div>`);
  }
  function meterDetail(m) {
    const st = typeof window.customerStatus === "function" ? window.customerStatus(m) : (m.statusPelanggan || "Aktif");
    return `<div class="meter-card dashboard-detail-item"><b>${escSafe(m.namaPelanggan || "Meter")}</b><div>${escSafe(m.nomorMeter || "-")}</div><div class="details-grid">${itemRow("ID Pelanggan",val(m,["idPelanggan"]))}${itemRow("Merk",val(m,["merk"]))}${itemRow("Status Pelanggan",st)}${itemRow("Jatuh Tempo",val(m,["jatuhTempo"]))}</div></div>`;
  }
  function historyDetail(x) {
    return `<div class="meter-card dashboard-detail-item"><b>${escSafe(val(x,["nomorMeter","meter","noMeter"],3))}</b><div>${escSafe(val(x,["jenis","jenisPemeliharaan","kegiatan"],null))} · ${escSafe(val(x,["tanggal","timestamp","waktu"],1))}</div><div class="details-grid">${itemRow("Petugas",val(x,["petugas","namaPetugas","username"]))}${itemRow("Kondisi",val(x,["kondisi","hasilPemeriksaan","hasil"],9))}${itemRow("Stand LWBP",val(x,["standLWBP","lwbp"]))}${itemRow("Stand WBP",val(x,["standWBP","wbp"]))}${itemRow("Stand KVARH",val(x,["standKVARH","kvarh"]))}${itemRow("Stand KWH TOTAL",val(x,["standKWHtotal","standKWH","stand","kwh"]))}</div><div class="activity-note"><small>Keterangan</small><div>${escSafe(val(x,["keterangan","catatan","deskripsi","notes"]))}</div></div></div>`;
  }
  function dueDetail(m) {
    const d = typeof window.daysUntil === "function" ? window.daysUntil(m.jatuhTempo) : "-";
    return `<div class="meter-card dashboard-detail-item"><b>${escSafe(m.nomorMeter || "-")}</b><div>${escSafe(m.namaPelanggan || "Meter")}</div><div class="details-grid">${itemRow("Jatuh Tempo",val(m,["jatuhTempo"]))}${itemRow("Sisa Hari",d === "-" ? "-" : (d < 0 ? "Terlambat " + Math.abs(d) + " hari" : d + " hari lagi"))}${itemRow("Pemeliharaan Terakhir",val(m,["terakhirPemeliharaan"]))}${itemRow("Interval",(m.intervalHari || 30) + " hari")}</div></div>`;
  }
  function taskDetail(t) {
    return `<div class="card dashboard-detail-item"><b>${escSafe(t.nomorMeter || t.judul || "Tugas")}</b><div>${escSafe(t.judul || t.keterangan || "-")}</div><div class="details-grid">${itemRow("Petugas",val(t,["petugas","assignee"]))}${itemRow("Status",val(t,["status"]))}${itemRow("Jatuh Tempo",val(t,["jatuhTempo","dueDate"]))}</div><div class="activity-note"><small>Keterangan</small><div>${escSafe(val(t,["keterangan","tugas","deskripsi"]))}</div></div></div>`;
  }
  function findId(id) { return document.getElementById(id); }
  function bind() {
    const dashboard = findId("dashboard");
    if (!dashboard || dashboard.dataset.detailBound === "1") return;
    dashboard.dataset.detailBound = "1";
    dashboard.addEventListener("click", function (e) {
      const stat = e.target.closest(".stat");
      if (!stat || !dashboard.contains(stat)) return;
      const id = stat.querySelector("b")?.id;
      if (id === "sMeters") openList("Total Meter", "Daftar seluruh meter yang terdaftar.", Array.isArray(window.meters) ? window.meters : [], meterDetail);
      else if (id === "sHist") openList("Pemeliharaan", "Riwayat pemeriksaan dan pemeliharaan meter.", Array.isArray(window.history) ? window.history : [], historyDetail);
      else if (id === "sDue") {
        const list = (Array.isArray(window.meters) ? window.meters : []).filter(x => x.jatuhTempo && typeof window.daysUntil === "function" && window.daysUntil(x.jatuhTempo) <= 7);
        openList("Jatuh Tempo", "Meter yang jatuh tempo dalam 7 hari atau sudah terlambat.", list, dueDetail);
      } else if (id === "sTasks") {
        const list = (Array.isArray(window.tasks) ? window.tasks : []).filter(x => !["SELESAI","BATAL"].includes(String(x.status || "").toUpperCase()));
        openList("Tugas Terbuka", "Daftar penugasan yang masih terbuka.", list, taskDetail);
      }
    });
    dashboard.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      const stat = e.target.closest(".stat");
      if (!stat) return;
      e.preventDefault(); stat.click();
    });
  }
  function observe() {
    bind();
    const dashboard = findId("dashboard");
    if (dashboard && !dashboard.dataset.detailObserver) {
      dashboard.dataset.detailObserver = "1";
      new MutationObserver(bind).observe(dashboard, {childList:true, subtree:true});
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", observe); else observe();
})();
