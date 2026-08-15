/* SIMETER - kartu Ringkasan dapat disentuh untuk melihat data lengkap */
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
  function row(label, value) { return `<div class="kv"><small>${escSafe(label)}</small><b>${escSafe(value)}</b></div>`; }
  function openList(title, subtitle, items, renderer) {
    const body = items.length ? items.map(renderer).join("") : '<div class="empty">Tidak ada data.</div>';
    if (typeof window.showModal === "function") window.showModal(`<h2>${escSafe(title)}</h2><p class="muted">${escSafe(subtitle)}</p><div class="dashboard-detail-list">${body}</div>`);
  }
  function meterDetail(m) {
    const st = typeof window.customerStatus === "function" ? window.customerStatus(m) : (m.statusPelanggan || "Aktif");
    return `<div class="meter-card dashboard-detail-item"><b>${escSafe(m.namaPelanggan || "Meter")}</b><div>${escSafe(m.nomorMeter || "-")}</div><div class="details-grid">${row("ID Pelanggan",val(m,["idPelanggan"]))}${row("Alamat",val(m,["alamat"]))}${row("Merk",val(m,["merk"]))}${row("Status Pelanggan",st)}${row("Jatuh Tempo",val(m,["jatuhTempo"]))}</div></div>`;
  }
  function historyDetail(x) {
    return `<div class="meter-card dashboard-detail-item"><b>${escSafe(val(x,["nomorMeter","meter","noMeter"],3))}</b><div>${escSafe(val(x,["jenis","jenisPemeliharaan","kegiatan"],null))} · ${escSafe(val(x,["tanggal","timestamp","waktu"],1))}</div><div class="details-grid">${row("ID Pelanggan",val(x,["idPelanggan","idPLN"]))}${row("Petugas",val(x,["petugas","namaPetugas","username"]))}${row("Kondisi",val(x,["kondisi","hasilPemeriksaan","hasil"],9))}${row("Stand LWBP",val(x,["standLWBP","lwbp"]))}${row("Stand WBP",val(x,["standWBP","wbp"]))}${row("Stand KVARH",val(x,["standKVARH","kvarh"]))}${row("Stand KWH TOTAL",val(x,["standKWHtotal","standKWH","stand","kwh"]))}${row("Latitude",val(x,["latitude","lat"]))}${row("Longitude",val(x,["longitude","lng","lon"]))}</div><div class="activity-note"><small>Keterangan</small><div>${escSafe(val(x,["keterangan","catatan","deskripsi","notes"]))}</div></div></div>`;
  }
  function dueDetail(m) {
    const d = typeof window.daysUntil === "function" ? window.daysUntil(m.jatuhTempo) : "-";
    return `<div class="meter-card dashboard-detail-item"><b>${escSafe(m.nomorMeter || "-")}</b><div>${escSafe(m.namaPelanggan || "Meter")}</div><div class="details-grid">${row("Jatuh Tempo",val(m,["jatuhTempo"]))}${row("Sisa Hari",d === "-" ? "-" : (d < 0 ? "Terlambat " + Math.abs(d) + " hari" : d + " hari lagi"))}${row("Pemeliharaan Terakhir",val(m,["terakhirPemeliharaan"]))}${row("Interval",(m.intervalHari || 30) + " hari")}</div></div>`;
  }
  function taskDetail(t) {
    return `<div class="card dashboard-detail-item"><b>${escSafe(t.nomorMeter || t.judul || "Tugas")}</b><div>${escSafe(t.judul || t.keterangan || "-")}</div><div class="details-grid">${row("Petugas",val(t,["petugas","assignee"]))}${row("Status",val(t,["status"]))}${row("Jatuh Tempo",val(t,["jatuhTempo","dueDate"]))}</div><div class="activity-note"><small>Keterangan</small><div>${escSafe(val(t,["keterangan","tugas","deskripsi"]))}</div></div></div>`;
  }
  async function getData() {
    const user = (() => { try { return JSON.parse(localStorage.getItem("simeter_user") || "null"); } catch (_) { return null; } })();
    const params = { username: user?.username || "" };
    const [m,h,t] = await Promise.all([
      window.request("getMeters", {params}),
      window.request("getHistory", {params}),
      window.request("getTasks", {params})
    ]);
    return {
      meters: Array.isArray(m?.data) ? m.data : [],
      history: Array.isArray(h?.data) ? h.data : (Array.isArray(h?.rows) ? h.rows : []),
      tasks: Array.isArray(t?.data) ? t.data : []
    };
  }
  async function handleStat(stat) {
    const id = stat.querySelector("b")?.id;
    if (!id) return;
    stat.classList.add("loading");
    try {
      const d = await getData();
      if (id === "sMeters") openList("Total Meter", `Total ${d.meters.length} meter terdaftar.`, d.meters, meterDetail);
      else if (id === "sHist") openList("Pemeliharaan", `Total ${d.history.length} riwayat pemeriksaan/pemeliharaan.`, d.history, historyDetail);
      else if (id === "sDue") {
        const list = d.meters.filter(x => x.jatuhTempo && typeof window.daysUntil === "function" && window.daysUntil(x.jatuhTempo) <= 7);
        openList("Jatuh Tempo", `${list.length} meter jatuh tempo dalam 7 hari atau sudah terlambat.`, list, dueDetail);
      } else if (id === "sTasks") {
        const list = d.tasks.filter(x => !["SELESAI","BATAL"].includes(String(x.status || "").toUpperCase()));
        openList("Tugas Terbuka", `${list.length} tugas masih terbuka.`, list, taskDetail);
      }
    } catch (e) {
      if (typeof window.showModal === "function") window.showModal(`<h2>Data belum dapat dimuat</h2><div class="alert danger">${escSafe(e.message || "Koneksi API gagal")}</div>`);
    } finally { stat.classList.remove("loading"); }
  }
  function bind() {
    const dashboard = document.getElementById("dashboard");
    if (!dashboard || dashboard.dataset.detailBound === "1") return;
    dashboard.dataset.detailBound = "1";
    dashboard.addEventListener("click", e => {
      const stat = e.target.closest(".stat");
      if (stat) handleStat(stat);
    });
    dashboard.addEventListener("keydown", e => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const stat = e.target.closest(".stat");
      if (!stat) return;
      e.preventDefault(); handleStat(stat);
    });
  }
  function observe() {
    bind();
    const dashboard = document.getElementById("dashboard");
    if (dashboard && !dashboard.dataset.detailObserver) {
      dashboard.dataset.detailObserver = "1";
      new MutationObserver(bind).observe(dashboard, {childList:true, subtree:true});
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", observe); else observe();
})();
