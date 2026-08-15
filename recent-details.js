/* RIMPU/SIMETER - aktivitas terbaru dapat disentuh untuk melihat detail */
(function () {
  const escSafe = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  function val(x, keys, index) {
    if (Array.isArray(x) && index != null && x[index] != null && String(x[index]).trim() !== "") return x[index];
    if (x && !Array.isArray(x)) for (const k of keys) if (x[k] != null && String(x[k]).trim() !== "") return x[k];
    return "-";
  }
  function row(label, value) { return `<div class="kv"><small>${escSafe(label)}</small><b>${escSafe(value)}</b></div>`; }
  function openDetail(x) {
    if (!x || typeof window.showModal !== "function") return;
    const nomor=val(x,["nomorMeter","meter","noMeter","nomor"],3), tanggal=val(x,["tanggal","timestamp","date","waktu"],1), jenis=val(x,["jenis","jenisPemeliharaan","kegiatan","activity"],null), kondisi=val(x,["kondisi","hasilPemeriksaan","statusMeter","hasil"],9), petugas=val(x,["petugas","namaPetugas","user","username"],null), idPel=val(x,["idPelanggan","idPLN","idCustomer"],null), keterangan=val(x,["keterangan","catatan","deskripsi","notes"],null), lwbp=val(x,["standLWBP","lwbp"],null), wbp=val(x,["standWBP","wbp"],null), kvarh=val(x,["standKVARH","kvarh"],null), kwh=val(x,["standKWHtotal","standKWH","stand","kwh"],null), lat=val(x,["latitude","lat"],null), lng=val(x,["longitude","lng","lon"],null), accuracy=val(x,["accuracy","gpsAccuracy"],null), foto=val(x,["foto","fotoUrl","photo","photoUrl"],null);
    const photo=foto!=="-"&&foto?`<div class="activity-photo"><small>Foto Meter</small><img src="${escSafe(foto)}" alt="Foto meter" loading="lazy" onerror="this.parentElement.style.display='none'"></div>`:"";
    window.showModal(`<h2>Detail Aktivitas</h2><div class="activity-detail-title"><b>${escSafe(jenis)}</b><span>${escSafe(tanggal)}</span></div><div class="details-grid">${row("Nomor Meter",nomor)}${row("ID Pelanggan",idPel)}${row("Jenis Kegiatan",jenis)}${row("Kondisi / Hasil",kondisi)}${row("Petugas",petugas)}${row("Stand LWBP",lwbp)}${row("Stand WBP",wbp)}${row("Stand KVARH",kvarh)}${row("Stand KWH TOTAL",kwh)}${row("Tanggal / Waktu",tanggal)}${row("Latitude",lat)}${row("Longitude",lng)}${row("Akurasi GPS",accuracy)}</div><div class="activity-note"><small>Keterangan</small><div>${escSafe(keterangan)}</div></div>${photo}`);
  }
  async function getHistory() {
    const api=localStorage.getItem("simeter_api_url")||"";
    if(!api) throw new Error("URL API belum tersedia.");
    let user={}; try{user=JSON.parse(localStorage.getItem("simeter_user")||"{}")}catch(_){ }
    const qs=new URLSearchParams({action:"getHistory",v:"8.0.1"});
    if(user.username)qs.set("username",user.username); if(user.role)qs.set("role",user.role);
    const r=await fetch(api.replace(/\/+$/,'')+"?"+qs.toString(),{cache:"no-store",redirect:"follow"});
    const t=await r.text(); let data; try{data=JSON.parse(t)}catch(_){throw new Error("Respons riwayat bukan JSON.")}
    if(!data||!data.ok)throw new Error(data?.error||"Gagal mengambil riwayat aktivitas.");
    return Array.isArray(data.data)?data.data:(Array.isArray(data.rows)?data.rows:[]);
  }
  async function show(card,index){
    card.classList.add("activity-loading");
    try{const h=await getHistory();if(h[index])openDetail(h[index]);else openDetail({nomorMeter:card.querySelector("b")?.textContent||"-",jenis:card.querySelector("div")?.textContent||"-"})}
    catch(err){window.showModal(`<h2>Detail Aktivitas</h2><div class="alert danger">${escSafe(err.message)}</div>`)}
    finally{card.classList.remove("activity-loading")}
  }
  function init(){
    document.addEventListener("click",e=>{const card=e.target.closest("#recent > .meter-card");if(!card||e.target.closest("button"))return;const index=Array.from(document.querySelectorAll("#recent > .meter-card")).indexOf(card);if(index>=0)show(card,index)});
    document.addEventListener("keydown",e=>{if(e.key!=="Enter"&&e.key!==" ")return;const card=e.target.closest&&e.target.closest("#recent > .meter-card");if(card){e.preventDefault();card.click()}});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();
})();
