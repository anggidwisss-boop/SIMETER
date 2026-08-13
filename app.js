const CONFIG={apiUrl:localStorage.getItem("simeter_api_url")||""};

const $=id=>document.getElementById(id);
let gps={lat:"",lng:""};
let meters=[];
let history=[];
let deferredPrompt=null;

document.addEventListener("DOMContentLoaded",()=>{
  $("apiUrl").value=CONFIG.apiUrl;
  bindTabs(); bindForm(); bindGPS(); bindPhoto(); bindSettings();
  bindSearch(); updateOnline(); loadLocal(); renderAll();
  if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(console.error);
});

window.addEventListener("online",updateOnline); window.addEventListener("offline",updateOnline);
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("installBtn").classList.remove("hidden")});
$("installBtn").onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();deferredPrompt=null;$("installBtn").classList.add("hidden")};

function bindTabs(){document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".tab-panel").forEach(x=>x.classList.remove("active"));b.classList.add("active");$("tab-"+b.dataset.tab).classList.add("active");})}
function bindForm(){$("maintenanceForm").addEventListener("submit",saveMaintenance)}
function bindGPS(){$("gpsBtn").onclick=()=>{if(!navigator.geolocation){showMsg("formMessage","GPS tidak tersedia di perangkat ini.");return} $("gpsBtn").disabled=true;navigator.geolocation.getCurrentPosition(p=>{gps={lat:p.coords.latitude.toFixed(6),lng:p.coords.longitude.toFixed(6)};$("gpsText").textContent=`${gps.lat}, ${gps.lng}`;$("gpsBtn").disabled=false},e=>{showMsg("formMessage","GPS gagal: "+e.message);$("gpsBtn").disabled=false},{enableHighAccuracy:true,timeout:15000,maximumAge:0})}}
function bindPhoto(){$("foto").onchange=()=>{const f=$("foto").files[0];if(!f)return;const r=new FileReader();r.onload=e=>{$("preview").src=e.target.result;$("preview").classList.remove("hidden")};r.readAsDataURL(f)}}
function bindSettings(){$("saveSettings").onclick=()=>{const url=$("apiUrl").value.trim();localStorage.setItem("simeter_api_url",url);CONFIG.apiUrl=url;showMsg("apiMessage","URL berhasil disimpan.");};$("testApi").onclick=testApi;$("clearLocal").onclick=()=>{if(confirm("Hapus semua data offline di perangkat ini?")){localStorage.removeItem("simeter_meters");localStorage.removeItem("simeter_history");loadLocal();renderAll();toast("Data offline dihapus.")}};$("refreshMeters").onclick=loadMeters;$("refreshHistory").onclick=loadHistory}
function bindSearch(){$("meterSearch").oninput=renderMeters;$("historySearch").oninput=renderHistory}
function updateOnline(){const on=navigator.onLine;$("onlineStatus").textContent=on?"● Online":"● Offline";$("onlineStatus").style.color=on?"#087443":"#b54708"}
function showMsg(id,msg){$(id).textContent=msg}
function toast(msg){$("toast").textContent=msg;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2500)}

function loadLocal(){try{meters=JSON.parse(localStorage.getItem("simeter_meters")||"[]");history=JSON.parse(localStorage.getItem("simeter_history")||"[]")}catch{meters=[];history=[]}}
function saveLocal(){localStorage.setItem("simeter_meters",JSON.stringify(meters));localStorage.setItem("simeter_history",JSON.stringify(history));renderAll()}
function renderAll(){renderMeters();renderHistory();$("statMeters").textContent=meters.length;$("statMaintenance").textContent=history.length;$("statOffline").textContent=history.filter(x=>x.pending).length}

async function saveMaintenance(e){
  e.preventDefault();
  const btn=e.submitter; btn.disabled=true;
  const f=$("foto").files[0];
  let foto="";
  if(f){try{foto=await resizeImage(f,1200,.75)}catch{}}
  const data={
    action:"saveMaintenance",
    timestamp:new Date().toISOString(),
    idPelanggan:$("idPelanggan").value.trim(),
    nomorMeter:$("nomorMeter").value.trim(),
    jenis:$("jenis").value,
    kondisi:$("kondisi").value,
    stand:$("stand").value,
    keterangan:$("keterangan").value.trim(),
    latitude:gps.lat, longitude:gps.lng,
    foto:foto
  };
  if(!data.idPelanggan){showMsg("formMessage","ID Pelanggan wajib diisi.");btn.disabled=false;return}
  history.unshift({...data,pending:true});
  saveLocal();
  try{
    if(!CONFIG.apiUrl) throw new Error("URL Apps Script belum diisi.");
    const res=await apiPost(data);
    if(res.ok!==false){history[0].pending=false;saveLocal();showMsg("formMessage","Data berhasil dikirim ke Google Sheets.");}
    else throw new Error(res.message||"Gagal menyimpan.");
  }catch(err){showMsg("formMessage","Disimpan offline. Belum terkirim: "+err.message)}
  e.target.reset();gps={lat:"",lng:""};$("gpsText").textContent="Belum diambil";$("preview").classList.add("hidden");btn.disabled=false;
}

async function testApi(){if(!CONFIG.apiUrl){showMsg("apiMessage","Isi URL Apps Script terlebih dahulu.");return}showMsg("apiMessage","Menguji koneksi...");try{const r=await fetch(CONFIG.apiUrl+"?action=ping",{redirect:"follow"});const j=await r.json();showMsg("apiMessage",j.message||"Koneksi berhasil.")}catch(e){showMsg("apiMessage","Koneksi gagal: "+e.message)}}

async function apiPost(payload){const r=await fetch(CONFIG.apiUrl,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(payload),redirect:"follow"});return await r.json()}

async function loadMeters(){
  if(!CONFIG.apiUrl){toast("Isi URL Apps Script di Pengaturan.");return}
  try{const r=await fetch(CONFIG.apiUrl+"?action=getMeters",{redirect:"follow"});const j=await r.json();if(Array.isArray(j.data)){meters=j.data;saveLocal();toast("Data meter diperbarui.")}}catch(e){toast("Gagal mengambil data meter: "+e.message)}
}
async function loadHistory(){
  if(!CONFIG.apiUrl){toast("Isi URL Apps Script di Pengaturan.");return}
  try{const r=await fetch(CONFIG.apiUrl+"?action=getHistory",{redirect:"follow"});const j=await r.json();if(Array.isArray(j.data)){history=j.data;saveLocal();toast("Riwayat diperbarui.")}}catch(e){toast("Gagal mengambil riwayat: "+e.message)}
}
function renderMeters(){
  const q=($("meterSearch").value||"").toLowerCase();const arr=meters.filter(x=>JSON.stringify(x).toLowerCase().includes(q));
  $("meterList").innerHTML=arr.length?arr.map(x=>`<div class="item"><b>${esc(x.idPelanggan||x.ID_PELANGGAN||"-")}</b><small>Meter: ${esc(x.nomorMeter||x.NO_METER||"-")}<br>Keterangan: ${esc(x.keterangan||"-")}</small></div>`).join(""):"<p class='hint'>Belum ada data meter.</p>";
}
function renderHistory(){
  const q=($("historySearch").value||"").toLowerCase();const arr=history.filter(x=>JSON.stringify(x).toLowerCase().includes(q));
  $("historyList").innerHTML=arr.length?arr.map(x=>`<div class="item"><b>${esc(x.idPelanggan||"-")} — ${esc(x.jenis||"-")}</b><small>${formatDate(x.timestamp)}<br>Kondisi: ${esc(x.kondisi||"-")} | Stand: ${esc(x.stand||"-")}<br>Lokasi: ${esc(x.latitude||"-")}, ${esc(x.longitude||"-")}<br>${x.pending?"⏳ Menunggu dikirim":"✓ Terkirim"}</small></div>`).join(""):"<p class='hint'>Belum ada riwayat.</p>";
}
function formatDate(v){try{return new Date(v).toLocaleString("id-ID")}catch{return v||"-"}}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function resizeImage(file,max,quality){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>{const img=new Image();img.onload=()=>{let w=img.width,h=img.height;if(w>max){h=Math.round(h*max/w);w=max}const c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(img,0,0,w,h);resolve(c.toDataURL("image/jpeg",quality))};img.onerror=reject;img.src=r.result};r.onerror=reject;r.readAsDataURL(file)})}

// Kirim ulang data yang masih pending saat koneksi kembali.
window.addEventListener("online",async()=>{for(const x of history.filter(x=>x.pending)){try{if(!CONFIG.apiUrl)break;const r=await apiPost({...x});if(r.ok!==false)x.pending=false}catch{}}saveLocal()});
