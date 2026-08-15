/* RIMPU/SIMETER - detail aktivitas terbaru */
(function () {
  function val(x, keys, index) {
    if (Array.isArray(x) && index != null && x[index] != null && String(x[index]).trim() !== "") return x[index];
    if (x && !Array.isArray(x)) {
      for (const k of keys) if (x[k] != null && String(x[k]).trim() !== "") return x[k];
    }
    return "-";
  }
  function row(label, value) {
    return `<div class="kv"><small>${window.esc ? esc(label) : label}</small><b>${window.esc ? esc(value) : String(value)}</b></div>`;
  }
  function escSafe(v) {
    if (typeof window.esc === "function") return window.esc(v);
    return String(v == null ? "" : v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  }
  function openDetail(x) {
    if (!x || typeof window.showModal !== "function") return;
    const nomor = val(x,["nomorMeter","meter","noMeter","nomor"],3);
    const tanggal = val(x,["tanggal","timestamp","date","waktu"],1);
    const jenis = val(x,["jenis","jenisPemeliharaan","kegiatan","activity"],null);
    const kondisi = val(x,["kondisi","hasilPemeriksaan","statusMeter","hasil"],9);
    const petugas = val(x,["petugas","namaPetugas","user","username"],null);
    const idPel = val(x,["idPelanggan","idPLN","idCustomer"],null);
    const keterangan = val(x,["keterangan","catatan","deskripsi","notes"],null);
    const lwbp = val(x,["standLWBP","lwbp"],null);
    const wbp = val(x,["standWBP","wbp"],null);
    const kvarh = val(x,["standKVARH","kvarh"],null);
    const kwh = val(x,["standKWHtotal","standKWH","stand","kwh"],null);
    const lat = val(x,["latitude","lat"],null);
    const lng = val(x,["longitude","lng","lon"],null);
    const accuracy = val(x,["accuracy","gpsAccuracy"],null);
    const foto = val(x,["foto","fotoUrl","photo","photoUrl"],null);
    const photo = foto !== "-" && foto ? `<div class="activity-photo"><small>Foto Meter</small><img src="${escSafe(foto)}" alt="Foto meter" loading="lazy" onerror="this.parentElement.style.display='none'"></div>` : "";
    window.showModal(`<h2>Detail Aktivitas</h2><div class="activity-detail-title"><b>${escSafe(jenis)}</b><span>${escSafe(tanggal)}</span></div><div class="details-grid">${row("Nomor Meter",nomor)}${row("ID Pelanggan",idPel)}${row("Jenis Kegiatan",jenis)}${row("Kondisi / Hasil",kondisi)}${row("Petugas",petugas)}${row("Stand LWBP",lwbp)}${row("Stand WBP",wbp)}${row("Stand KVARH",kvarh)}${row("Stand KWH TOTAL",kwh)}${row("Tanggal / Waktu",tanggal)}${row("Latitude",lat)}${row("Longitude",lng)}${row("Akurasi GPS",accuracy)}</div><div class="activity-note"><small>Keterangan</small><div>${escSafe(keterangan)}</div></div>${photo}`);
  }
  function init() {
    document.addEventListener("click", function (e) {
      const card = e.target.closest("#recent .meter-card");
      if (!card || e.target.closest("button")) return;
      const cards = Array.from(document.querySelectorAll("#recent > .meter-card"));
      const index = cards.indexOf(card);
      if (index < 0 || !Array.isArray(window.history) || !window.history[index]) return;
      openDetail(window.history[index]);
    });
    document.addEventListener("keydown", function (e) {
      const card = e.target.closest && e.target.closest("#recent .meter-card");
      if (!card || (e.key !== "Enter" && e.key !== " ")) return;
      e.preventDefault();
      const cards = Array.from(document.querySelectorAll("#recent > .meter-card"));
      const index = cards.indexOf(card);
      if (index >= 0 && Array.isArray(window.history) && window.history[index]) openDetail(window.history[index]);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
