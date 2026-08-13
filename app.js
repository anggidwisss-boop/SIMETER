const $ = x => document.getElementById(x);

let api = localStorage.getItem("simeter_api_url") || "";
let gps = {};
let meters = [];
let hist = [];
let qr = null;
let lookupTimer = null;

document.addEventListener("DOMContentLoaded", () => {
  if ($("api")) $("api").value = api;
  tabs(); events(); loadLocal(); render();
  if (navigator.serviceWorker) navigator.serviceWorker.register("sw.js").catch(() => {});
  if (api) test();
});

function tabs() {
  document.querySelectorAll(".tab").forEach(btn => {
    btn.onclick = () => {
      stopScanner();
      document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
      document.querySelectorAll(".panel").forEach(x => x.classList.remove("active"));
      btn.classList.add("active");
      const panel = $(btn.dataset.t);
      if (panel) panel.classList.add("active");
    };
  });
}

function events() {
  if ($("save")) $("save").onclick = saveApi;
  if ($("test")) $("test").onclick = test;
  if ($("scan")) $("scan").onclick = startScanner;
  if ($("stop")) $("stop").onclick = stopScanner;
  if ($("meter")) {
    $("meter").addEventListener("input", () => {
      clearTimeout(lookupTimer);
      const nomor = $("meter").value.trim();
      if (!nomor) { hideCustomer(); return; }
      lookupTimer = setTimeout(() => lookupMeter(nomor), 400);
    });
    $("meter").addEventListener("change", () => lookupMeter($("meter").value.trim()));
  }
  if ($("getgps")) $("getgps").onclick = getGPS;
  if ($("foto")) $("foto").onchange = previewPhoto;
  if ($("form")) $("form").onsubmit = saveMaintenance;
  if ($("refreshM")) $("refreshM").onclick = loadMeters;
  if ($("refreshH")) $("refreshH").onclick = loadHistory;
  if ($("searchM")) $("searchM").oninput = renderMeters;
  if ($("searchH")) $("searchH").oninput = renderHistory;
}

function saveApi() {
  api = $("api").value.trim();
  if (!api) { if ($("apiMsg")) $("apiMsg").textContent = "URL Web App belum diisi."; return; }
  localStorage.setItem("simeter_api_url", api);
  if ($("apiMsg")) $("apiMsg").textContent = "URL Web App berhasil disimpan.";
  test();
}

async function test() {
  if (!api) { if ($("apiMsg")) $("apiMsg").textContent = "Isi URL Web App /exec terlebih dahulu."; return; }
  try {
    const response = await fetch(api + "?action=ping&t=" + Date.now(), {cache:"no-store"});
    const data = await response.json();
    if ($("apiMsg")) $("apiMsg").textContent = data.ok ? "✓ " + (data.message || "SIMETER API aktif") : "API tidak aktif.";
  } catch (err) {
    if ($("apiMsg")) $("apiMsg").textContent = "Gagal koneksi: " + err.message;
  }
}

async function startScanner() {
  if (!api) { if ($("scanMsg")) $("scanMsg").textContent = "Isi URL Web App terlebih dahulu."; return; }
  if (typeof Html5Qrcode === "undefined") {
    if ($("scanMsg")) $("scanMsg").textContent = "Modul scanner belum tersedia. Pastikan index.html memuat library html5-qrcode.";
    return;
  }
  if ($("reader")) $("reader").classList.remove("hide");
  if ($("scan")) $("scan").classList.add("hide");
  if ($("stop")) $("stop").classList.remove("hide");
  if ($("scanMsg")) $("scanMsg").textContent = "Arahkan kamera ke barcode / QR meter...";
  try {
    qr = new Html5Qrcode("reader");
    await qr.start({facingMode:"environment"}, {fps:10, qrbox:{width:280,height:180}}, async decodedText => {
      const nomor = extractMeterNumber(decodedText);
      await stopScanner();
      if ($("meter")) $("meter").value = nomor;
      await lookupMeter(nomor);
    });
  } catch (err) {
    if ($("scanMsg")) $("scanMsg").textContent = "Kamera gagal dibuka. Pastikan izin kamera diberikan.";
    await stopScanner();
  }
}

function extractMeterNumber(value) {
  value = String(value || "").trim();
  if (/^\d{6,20}$/.test(value)) return value;
  const match = value.match(/\d{8,20}/);
  return match ? match[0] : value;
}

async function stopScanner() {
  if (qr) { try { await qr.stop(); } catch(e) {} try { await qr.clear(); } catch(e) {} qr = null; }
  if ($("reader")) $("reader").classList.add("hide");
  if ($("scan")) $("scan").classList.remove("hide");
  if ($("stop")) $("stop").classList.add("hide");
}

async function lookupMeter(nomorMeter) {
  nomorMeter = String(nomorMeter || "").trim();
  if (!nomorMeter) { hideCustomer(); return; }
  if (!api) { if ($("scanMsg")) $("scanMsg").textContent = "URL Web App belum disimpan."; return; }
  if ($("scanMsg")) $("scanMsg").textContent = "Mencari data meter...";
  try {
    const response = await fetch(api + "?action=meter&nomorMeter=" + encodeURIComponent(nomorMeter) + "&t=" + Date.now(), {cache:"no-store"});
    const data = await response.json();
    if (data && data.ok && data.meter) {
      if ($("id")) $("id").value = data.meter.idPelanggan || "";
      if ($("meter")) $("meter").value = data.meter.nomorMeter || nomorMeter;
      setField("name", data.meter.namaPelanggan || "");
      setField("address", data.meter.alamat || "");
      if ($("customer")) $("customer").classList.remove("hide");
      if ($("scanMsg")) $("scanMsg").textContent = "✓ Data meter ditemukan otomatis.";
      if ($("jenis")) $("jenis").focus();
      return;
    }
    if ($("id")) $("id").value = "";
    setField("name", ""); setField("address", "");
    if ($("customer")) $("customer").classList.remove("hide");
    if ($("scanMsg")) $("scanMsg").textContent = "⚠ Nomor meter belum ada di MASTER_METER.";
  } catch (err) {
    if ($("scanMsg")) $("scanMsg").textContent = "Gagal mengambil data master: " + err.message;
  }
}

function setField(id, value) {
  const el = $(id); if (!el) return;
  if ("value" in el) el.value = value; else el.textContent = value || "-";
}
function getField(id) {
  const el = $(id); if (!el) return "";
  return "value" in el ? el.value : el.textContent;
}
function hideCustomer() {
  if ($("id")) $("id").value = "";
  setField("name", ""); setField("address", "");
  if ($("customer")) $("customer").classList.add("hide");
}

function getGPS() {
  if (!navigator.geolocation) { if ($("msg")) $("msg").textContent = "Perangkat tidak mendukung GPS."; return; }
  if ($("gps")) $("gps").textContent = "Mengambil lokasi...";
  navigator.geolocation.getCurrentPosition(position => {
    gps = {lat:position.coords.latitude.toFixed(6), lng:position.coords.longitude.toFixed(6), accuracy:position.coords.accuracy.toFixed(1)};
    if ($("gps")) $("gps").textContent = gps.lat + ", " + gps.lng + " (±" + gps.accuracy + " m)";
  }, error => { if ($("gps")) $("gps").textContent = "GPS gagal: " + error.message; }, {enableHighAccuracy:true,timeout:15000,maximumAge:0});
}

function previewPhoto() {
  const file = $("foto") && $("foto").files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => { if ($("preview")) { $("preview").src=e.target.result; $("preview").classList.remove("hide"); } };
  reader.readAsDataURL(file);
}

async function saveMaintenance(event) {
  event.preventDefault();
  if (!api) { if ($("msg")) $("msg").textContent = "URL Web App belum disimpan."; return; }
  const file = $("foto") && $("foto").files[0];
  const photo = file ? await imageToBase64(file) : "";
  const data = {
    action:"saveMaintenance", timestamp:new Date().toISOString(), tanggal:new Date().toLocaleDateString("id-ID"),
    idPelanggan:$("id") ? $("id").value.trim() : "", nomorMeter:$("meter") ? $("meter").value.trim() : "",
    namaPelanggan:getField("name"), alamat:getField("address"), jenis:$("jenis") ? $("jenis").value : "",
    kondisi:$("kondisi") ? $("kondisi").value : "", kondisiSegel:$("kondisiSegel") ? $("kondisiSegel").value : "",
    stand:$("stand") ? $("stand").value : "", hasilPemeriksaan:$("hasilPemeriksaan") ? $("hasilPemeriksaan").value : "",
    petugas:$("petugas") ? $("petugas").value : "", keterangan:$("ket") ? $("ket").value : "",
    latitude:gps.lat||"", longitude:gps.lng||"", accuracy:gps.accuracy||"", foto:photo
  };
  if (!data.nomorMeter) { if ($("msg")) $("msg").textContent = "⚠ Nomor meter belum diisi."; return; }
  try {
    if ($("msg")) $("msg").textContent = "Menyimpan data...";
    const result = await post(data);
    if (result.ok === false) throw new Error(result.error || "Gagal menyimpan");
    if ($("msg")) $("msg").textContent = "✓ Data berhasil disimpan ke Google Sheets.";
    data.pending=false; hist.unshift(data); localStorage.setItem("simeter_history",JSON.stringify(hist)); renderHistory();
    if ($("form")) $("form").reset(); gps={}; if ($("gps")) $("gps").textContent="Belum diambil"; if ($("preview")) $("preview").classList.add("hide"); hideCustomer(); await loadHistory();
  } catch(error) {
    data.pending=true; hist.unshift(data); localStorage.setItem("simeter_history",JSON.stringify(hist)); renderHistory();
    if ($("msg")) $("msg").textContent="⚠ Internet gagal. Data disimpan sementara secara offline.";
  }
}

async function post(data) {
  const response = await fetch(api,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(data)});
  return response.json();
}

async function loadMeters() {
  if (!api) return;
  try { const response=await fetch(api+"?action=getMeters&t="+Date.now(),{cache:"no-store"}); const data=await response.json(); meters=data.data||[]; localStorage.setItem("simeter_meters",JSON.stringify(meters)); renderMeters(); } catch(e){console.log(e);}
}
async function loadHistory() {
  if (!api) return;
  try { const response=await fetch(api+"?action=getHistory&t="+Date.now(),{cache:"no-store"}); const data=await response.json(); hist=data.data||[]; localStorage.setItem("simeter_history",JSON.stringify(hist)); renderHistory(); } catch(e){console.log(e);}
}
function loadLocal(){try{meters=JSON.parse(localStorage.getItem("simeter_meters")||"[]");hist=JSON.parse(localStorage.getItem("simeter_history")||"[]");}catch(e){meters=[];hist=[];}}
function render(){renderMeters();renderHistory();}
function renderMeters(){if(!$("meters"))return;const q=( $("searchM")?$("searchM").value:"" ).toLowerCase();$("meters").innerHTML=meters.filter(x=>JSON.stringify(x).toLowerCase().includes(q)).map(x=>`<div class="item"><b>${esc(x.idPelanggan)}</b><small>Meter: ${esc(x.nomorMeter)}<br>Nama: ${esc(x.namaPelanggan)}<br>Alamat: ${esc(x.alamat)}</small></div>`).join("")||"<p>Belum ada data.</p>";}
function renderHistory(){if(!$("hist"))return;const q=( $("searchH")?$("searchH").value:"" ).toLowerCase();$("hist").innerHTML=hist.filter(x=>JSON.stringify(x).toLowerCase().includes(q)).map(x=>`<div class="item"><b>${esc(x.idPelanggan)} — ${esc(x.jenis||x.kondisi||"")}</b><small>Meter: ${esc(x.nomorMeter)}<br>${esc(x.timestamp||"")}<br>${x.pending?"⏳ Offline":"✓ Terkirim"}</small></div>`).join("")||"<p>Belum ada riwayat.</p>";}
function esc(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));}
function imageToBase64(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>{const image=new Image();image.onload=()=>{let width=image.width,height=image.height,max=1200;if(width>max){height=height*max/width;width=max;}const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;canvas.getContext("2d").drawImage(image,0,0,width,height);resolve(canvas.toDataURL("image/jpeg",0.75));};image.onerror=reject;image.src=reader.result;};reader.onerror=reject;reader.readAsDataURL(file);});}
