let AUTH=JSON.parse(localStorage.getItem("simeter_auth")||"null");
let ROLE=AUTH?.user?.role||"";
let API=localStorage.getItem("simeter_api_url")||"",history=[],petugas=[],queue=[],gps={},photo="",scanner=null;
const $=id=>document.getElementById(id);
document.addEventListener("DOMContentLoaded",()=>{
 bind(); loadLocal(); if($("apiUrl"))$("apiUrl").value=API; updateNet();
 if(AUTH) showApp(); else showLogin();
 if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
});
function bind(){
 $("loginBtn").onclick=loginUser;$("saveLoginApi").onclick=()=>{API=$("loginApi").value.trim();localStorage.setItem("simeter_api_url",API);$("loginStatus").textContent=API?"URL tersimpan. Silakan login.":"URL belum diisi.";};$("togglePass").onclick=()=>{let i=$("loginPass");i.type=i.type==="password"?"text":"password"};
 $("logoutBtn").onclick=logout;
 $("saveUser").onclick=saveNewUser;

 document.querySelectorAll("[data-page]").forEach(x=>x.onclick=()=>go(x.dataset.page));
 $("more").onclick=()=>$("moreMenu").classList.remove("hidden");$("closeMore").onclick=closeMore;$("moreMenu").querySelector(".shade").onclick=closeMore;
 $("historySearch").oninput=renderHistory;$("reloadHistory").onclick=loadHistory;$("assetSearch").oninput=renderAssets;$("reloadAssets").onclick=()=>{loadHistory()};$("backAssets").onclick=()=>go("assets");
 $("searchMeter").onclick=()=>{$("nomorMeter").value=$("meterNo").value;go("maintenance")};$("meterNo").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();$("nomorMeter").value=$("meterNo").value;go("maintenance")}};
 $("scanStart").onclick=startScanner;$("scanStop").onclick=stopScanner;$("gpsBtn").onclick=getGPS;$("foto").onchange=photoPreview;
 $("maintForm").onsubmit=saveMaintenance;$("resetForm").onclick=resetForm;$("saveApi").onclick=saveAPI;$("syncBtn").onclick=syncQueue;$("saveProfile").onclick=saveProfile;
 window.addEventListener("online",()=>{updateNet();syncQueue()});window.addEventListener("offline",updateNet);
}

function showLogin(){$("loginPage").classList.remove("hidden");$("appShell").classList.add("hidden")}
function showApp(){
  $("loginPage").classList.add("hidden");$("appShell").classList.remove("hidden");
  ROLE=AUTH?.user?.role||"";$("userRole").textContent=(AUTH?.user?.nama||"")+" · "+ROLE;
  applyRoleAccess();
  if($("petugas"))$("petugas").value=AUTH?.user?.nama||localStorage.getItem("petugas_nama")||"";
  if($("unit"))$("unit").value=AUTH?.user?.unit||localStorage.getItem("petugas_unit")||"";
  syncAll();loadPetugas();if(can("SUPER_ADMIN","ADMIN"))loadUsers();
}
async function loginUser(){
  const u=$("loginUser").value.trim(), p=$("loginPass").value;
  if(!u||!p){$("loginStatus").textContent="Username dan password wajib diisi.";return}
  if(!API){$("loginStatus").textContent="Masukkan URL Web App di Pengaturan terlebih dahulu.";return}
  $("loginBtn").disabled=true;$("loginStatus").textContent="Memeriksa...";
  try{
    const d=await get("login",{username:u,password:p});
    if(!d.ok)throw Error(d.error||"Login gagal");
    AUTH=d;ROLE=d.user.role;localStorage.setItem("simeter_auth",JSON.stringify(AUTH));
    $("loginPass").value="";$("loginStatus").textContent="";showApp();
  }catch(e){$("loginStatus").textContent=e.message}
  finally{$("loginBtn").disabled=false}
}
function logout(){AUTH=null;ROLE="";localStorage.removeItem("simeter_auth");showLogin()}
function can(...roles){return roles.includes(ROLE)}
function applyRoleAccess(){
  document.querySelectorAll("[data-page]").forEach(b=>{
    const p=b.dataset.page;
    const allowed =
      (p==="dashboard") ||
      (p==="assets" && can("SUPER_ADMIN","ADMIN","PETUGAS","SUPERVISOR","VIEWER")) ||
      (p==="scan" && can("SUPER_ADMIN","ADMIN","PETUGAS")) ||
      (p==="maintenance" && can("SUPER_ADMIN","ADMIN","PETUGAS")) ||
      (p==="history" && can("SUPER_ADMIN","ADMIN","PETUGAS","SUPERVISOR","VIEWER")) ||
      (p==="tasks" && can("SUPER_ADMIN","ADMIN","PETUGAS","SUPERVISOR")) ||
      (p==="admin" && can("SUPER_ADMIN","ADMIN")) ||
      (p==="profile" && can("SUPER_ADMIN","ADMIN","PETUGAS","SUPERVISOR","VIEWER")) ||
      (p==="settings" && can("SUPER_ADMIN"));
    b.style.display=allowed?"":"none";
  });
  document.querySelectorAll(".super-only").forEach(x=>x.style.display=can("SUPER_ADMIN")?"":"none");
}

function closeMore(){$("moreMenu").classList.add("hidden")}
function go(id){
 closeMore();
 const rules={
  assets:["SUPER_ADMIN","ADMIN","PETUGAS","SUPERVISOR","VIEWER"],
  scan:["SUPER_ADMIN","ADMIN","PETUGAS"],maintenance:["SUPER_ADMIN","ADMIN","PETUGAS"],
  history:["SUPER_ADMIN","ADMIN","PETUGAS","SUPERVISOR","VIEWER"],tasks:["SUPER_ADMIN","ADMIN","PETUGAS","SUPERVISOR"],
  admin:["SUPER_ADMIN","ADMIN"],profile:["SUPER_ADMIN","ADMIN","PETUGAS","SUPERVISOR","VIEWER"],settings:["SUPER_ADMIN"]
 };
 if(rules[id]&&!rules[id].includes(ROLE)){alert("Anda tidak memiliki hak akses ke menu ini.");return}
 document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
 $(id).classList.add("active");scrollTo(0,0);
 if(id==="assets")renderAssets();if(id==="history")loadHistory();if(id==="admin"&&can("SUPER_ADMIN","ADMIN"))loadUsers();
}
function loadLocal(){try{meters=JSON.parse(localStorage.getItem("meters")||"[]");history=JSON.parse(localStorage.getItem("history")||"[]");petugas=JSON.parse(localStorage.getItem("petugas")||"[]");queue=JSON.parse(localStorage.getItem("queue")||"[]")}catch(e){}renderAll()}
function persist(){localStorage.setItem("meters",JSON.stringify(meters));localStorage.setItem("history",JSON.stringify(history));localStorage.setItem("petugas",JSON.stringify(petugas));localStorage.setItem("queue",JSON.stringify(queue))}
function updateNet(){$("net").textContent=navigator.onLine?"● Online":"● Offline";$("net").style.color=navigator.onLine?"#dfffe9":"#ffd4d4";$("sOffline").textContent=queue.length}
function renderAll(){renderHistory();renderTasks();renderRecent();renderAssets();updateStats();updateNet()}
function updateStats(){$("sMeters").textContent=meters.length;$("sMaint").textContent=history.length;$("sBad").textContent=history.filter(x=>/rusak|tidak normal/i.test(x.kondisi||"")).length;$("sOffline").textContent=queue.length}
function renderRecent(){$("recent").innerHTML=history.slice(0,5).map(itemHTML).join("")||'<div class="item">Belum ada data maintenance.</div>'}
function renderMeters(){let q=($("meterSearch").value||"").toLowerCase();let a=meters.filter(x=>Object.values(x).join(" ").toLowerCase().includes(q));$("meterList").innerHTML=a.map(m=>`<div class="item"><b>${esc(m.namaPelanggan||"Tanpa Nama")}</b><small>ID Pelanggan: ${esc(m.idPelanggan)}<br>Meter: ${esc(m.nomorMeter)}<br>${esc(m.alamat)}</small><button class="gray" onclick="useMeter('${attr(m.nomorMeter)}')">Pakai untuk Maintenance</button></div>`).join("")||'<div class="item">Data meter kosong. Isi MASTER_METER pada Google Sheets lalu tekan Sinkron.</div>'}
function renderHistory(){let q=($("historySearch").value||"").toLowerCase();let a=history.filter(x=>Object.values(x).join(" ").toLowerCase().includes(q));$("historyList").innerHTML=a.map(itemHTML).join("")||'<div class="item">Belum ada riwayat.</div>'}
function renderTasks(){let a=history.filter(x=>x.followUp||/perlu|rusak|tidak normal/i.test(x.kondisi||""));$("taskList").innerHTML=a.map(x=>`<div class="item"><b>${esc(x.nomorMeter)}</b><small>${esc(x.namaPelanggan)} · ${esc(x.kondisi)}<br>${esc(x.keterangan||"Perlu tindak lanjut")}</small></div>`).join("")||"<p>Tidak ada tugas follow up.</p>"}
function itemHTML(x){return `<div class="item"><b>${esc(x.nomorMeter||"-")} ${x.pending?"⚠️":""}</b><small>${esc(x.namaPelanggan||"-")} · ${esc(x.jenis||"Maintenance")}<br>${esc(x.tanggal||x.timestamp||"")} · ${esc(x.petugas||"")}</small></div>`}
function useMeter(n){go("maintenance");findMeter(n)}

const DEFAULT_INTERVAL_DAYS = 30;
function getAssets(){
  const map = {};
  history.forEach(x=>{
    const n = String(x.nomorMeter||"").trim();
    if(!n) return;
    if(!map[n]) map[n] = {nomorMeter:n, idPelanggan:x.idPelanggan||"", namaPelanggan:x.namaPelanggan||"", alamat:x.alamat||"", rows:[]};
    map[n].rows.push(x);
    if(!map[n].idPelanggan && x.idPelanggan) map[n].idPelanggan=x.idPelanggan;
    if(!map[n].namaPelanggan && x.namaPelanggan) map[n].namaPelanggan=x.namaPelanggan;
    if(!map[n].alamat && x.alamat) map[n].alamat=x.alamat;
  });
  return Object.values(map).map(a=>{
    a.rows.sort((p,q)=>new Date(q.timestamp||q.tanggal||0)-new Date(p.timestamp||p.tanggal||0));
    const last=a.rows[0]||{};
    const interval=Number(last.intervalHari||last.interval||DEFAULT_INTERVAL_DAYS)||DEFAULT_INTERVAL_DAYS;
    const lastDate=parseDate(last.timestamp||last.tanggal);
    const due=lastDate?new Date(lastDate.getTime()+interval*86400000):null;
    const today=new Date(); today.setHours(0,0,0,0);
    const due0=due?new Date(due):null; if(due0)due0.setHours(0,0,0,0);
    const days=due0?Math.ceil((due0-today)/86400000):null;
    a.last=last; a.interval=interval; a.lastDate=lastDate; a.due=due; a.days=days;
    a.status=days===null?"Belum ada":days<0?"Jatuh Tempo":days<=7?"Segera Jatuh Tempo":/rusak|tidak normal/i.test(last.kondisi||"")?"Tidak Normal":"Normal";
    return a;
  }).sort((a,b)=>(a.days??99999)-(b.days??99999));
}
function parseDate(v){
  if(!v)return null;
  const s=String(v);
  const d=new Date(s);
  if(!isNaN(d))return d;
  const m=s.match(/(\\d{1,2})[\\/-](\\d{1,2})[\\/-](\\d{4})/);
  if(m)return new Date(Number(m[3]),Number(m[2])-1,Number(m[1]));
  return null;
}
function fmtDate(d){return d?d.toLocaleDateString("id-ID",{day:"2-digit",month:"2-digit",year:"numeric"}):"-"}
function assetStatusClass(s){return s==="Normal"?"normal":s==="Jatuh Tempo"?"danger":s==="Segera Jatuh Tempo"?"warn":"neutral"}
function renderAssets(){
  const q=($("assetSearch").value||"").toLowerCase();
  const a=getAssets().filter(x=>(x.nomorMeter+" "+x.idPelanggan+" "+x.namaPelanggan+" "+x.alamat).toLowerCase().includes(q));
  $("assetList").innerHTML=a.map((x,i)=>`
    <button class="asset-card" onclick="openAsset('${attr(x.nomorMeter)}')">
      <div class="asset-top"><div><b>${esc(x.namaPelanggan||"Tanpa Nama")}</b><small>${esc(x.nomorMeter)}</small></div>
      <span class="badge ${assetStatusClass(x.status)}">● ${esc(x.status)}</span></div>
      <div class="asset-grid">
       <div><small>Interval Maintenance</small><b>${x.interval} hari</b></div>
       <div><small>Maintenance Terakhir</small><b>${fmtDate(x.lastDate)}</b></div>
       <div><small>Jadwal Berikutnya</small><b>${fmtDate(x.due)}</b></div>
       <div><small>Status Meter</small><b>${esc(x.last.kondisi||"-")}</b></div>
      </div>
      <small>${esc(x.alamat||"")}</small>
    </button>`).join("")||'<div class="item">Belum ada data aset. Simpan pemeliharaan terlebih dahulu.</div>';
}
function openAsset(n){
  const x=getAssets().find(a=>a.nomorMeter===String(n));
  if(!x)return;
  $("assetDetailCard").innerHTML=`
   <div class="asset-detail">
    <div class="asset-top"><div><h2>${esc(x.namaPelanggan||"Tanpa Nama")}</h2><small>${esc(x.nomorMeter)}</small></div>
    <span class="badge ${assetStatusClass(x.status)}">● ${esc(x.status)}</span></div>
    <div class="asset-grid">
      <div><small>ID Pelanggan</small><b>${esc(x.idPelanggan||"-")}</b></div>
      <div><small>Alamat</small><b>${esc(x.alamat||"-")}</b></div>
      <div><small>Kategori</small><b>Meter</b></div>
      <div><small>Status Aset</small><b>● ${esc(x.status)}</b></div>
      <div><small>Interval Maintenance</small><b>${x.interval} hari</b></div>
      <div><small>Maintenance Terakhir</small><b>${fmtDate(x.lastDate)}</b></div>
      <div><small>Jadwal Berikutnya</small><b>${fmtDate(x.due)}</b></div>
      <div><small>Hitung Mundur</small><b>${x.days===null?"-":x.days<0?Math.abs(x.days)+" hari terlambat":x.days+" hari lagi"}</b></div>
    </div>
    <button class="primary" onclick="useAsset('${attr(x.nomorMeter)}')">🛠️ Buat Pemeliharaan</button>
   </div>`;
  $("assetHistory").innerHTML=x.rows.map(r=>itemHTML(r)).join("")||'<div class="item">Belum ada riwayat.</div>';
  go("assetDetail");
}
function useAsset(n){
  go("maintenance");
  $("nomorMeter").value=n;
  const x=getAssets().find(a=>a.nomorMeter===String(n));
  if(x){$("idPelanggan").value=x.idPelanggan||"";$("custName").value=x.namaPelanggan||"";$("custAddress").value=x.alamat||""}
}

async function saveAPI(){API=$("apiUrl").value.trim();localStorage.setItem("simeter_api_url",API);if(!API){$("apiStatus").textContent="URL belum diisi";return}try{let d=await get("ping");$("apiStatus").textContent=d.message||"SIMETER API aktif";syncAll()}catch(e){$("apiStatus").textContent="Gagal koneksi: "+e.message}}
async function get(action,params={}){if(!API)throw Error("URL API belum diatur");let u=API+"?action="+encodeURIComponent(action);if(AUTH?.token)u+="&token="+encodeURIComponent(AUTH.token);for(const [k,v] of Object.entries(params))u+="&"+encodeURIComponent(k)+"="+encodeURIComponent(v);let r=await fetch(u+"&t="+Date.now(),{cache:"no-store"});if(!r.ok)throw Error("HTTP "+r.status);return r.json()}
async function syncAll(){if(!API||!navigator.onLine)return;try{await loadHistory();await syncQueue()}catch(e){}}
async function loadMeters(){try{let d=await get("getMeters");meters=d.data||[];persist();updateStats()}catch(e){}}
async function loadHistory(){try{let d=await get("getHistory");history=d.data||[];persist();renderHistory();renderRecent();renderTasks();renderAssets();updateStats()}catch(e){}}
async function loadPetugas(){try{let d=await get("getPetugas");petugas=d.data||[];persist();$("petugasList").innerHTML=petugas.map(x=>`<div class="item"><b>${esc(x.namaPetugas)}</b><small>${esc(x.idPetugas)} · ${esc(x.ulp)} · ${esc(x.aktif)}</small></div>`).join("")||"Belum ada data petugas."}catch(e){}}
async function findMeter(n){n=String(n||"").trim();if(!n)return;if(!API&&meters.length===0){$("scanStatus").textContent="Atur URL API dahulu.";return}if(!m&&API)try{let d=await get("meter",{nomorMeter:n});m=d.meter}catch(e){}if(m){fillMeter(m);$("scanStatus").textContent="✓ Meter ditemukan"}else $("scanStatus").textContent="Meter tidak ditemukan di MASTER_METER"}
function fillMeter(m){$("idPelanggan").value=m.idPelanggan||"";$("nomorMeter").value=m.nomorMeter||"";$("custName").textContent=m.namaPelanggan||"-";$("custAddress").textContent=m.alamat||"-";$("meterInfo").classList.remove("hidden");go("maintenance")}
async function startScanner(){if(typeof Html5Qrcode==="undefined"){ $("scanStatus").textContent="Scanner belum siap, coba refresh.";return}$("scanStart").classList.add("hidden");$("scanStop").classList.remove("hidden");scanner=new Html5Qrcode("reader");try{await scanner.start({facingMode:"environment"},{fps:10,qrbox:{width:280,height:160}},async text=>{let n=(String(text).match(/\\d{8,20}/)||[String(text)])[0];await stopScanner();$("meterNo").value=n;findMeter(n)})}catch(e){$("scanStatus").textContent="Kamera gagal: "+e.message;stopScanner()}}
async function stopScanner(){if(scanner){try{await scanner.stop()}catch(e){}try{await scanner.clear()}catch(e){}scanner=null}$("scanStart").classList.remove("hidden");$("scanStop").classList.add("hidden")}
function getGPS(){if(!navigator.geolocation){$("gpsStatus").textContent="GPS tidak didukung";return}$("gpsStatus").textContent="Mengambil lokasi...";navigator.geolocation.getCurrentPosition(p=>{gps={latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy};$("gpsStatus").textContent=`${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)} ±${gps.accuracy.toFixed(1)} m`},e=>$("gpsStatus").textContent="Gagal: "+e.message,{enableHighAccuracy:true,timeout:15000})}
function photoPreview(){let f=$("foto").files[0];if(!f)return;let r=new FileReader();r.onload=e=>{photo=e.target.result;$("fotoPreview").src=photo;$("fotoPreview").classList.remove("hidden")};r.readAsDataURL(f)}
async function saveMaintenance(e){e.preventDefault();if(!$("nomorMeter").value){$("saveStatus").textContent="Scan/cari meter dahulu.";return}let d={token:AUTH?.token||"",action:"saveMaintenance",timestamp:new Date().toISOString(),tanggal:new Date().toLocaleDateString("id-ID"),idPelanggan:$("idPelanggan").value,nomorMeter:$("nomorMeter").value,namaPelanggan:$("custName").value,alamat:$("custAddress").value,jenis:$("jenis").value,intervalHari:30,kondisi:$("kondisi").value,kondisiSegel:$("segel").value,stand:$("stand").value,hasilPemeriksaan:$("hasil").value,keterangan:$("keterangan").value,petugas:localStorage.getItem("petugas_nama")||"",latitude:gps.latitude||"",longitude:gps.longitude||"",accuracy:gps.accuracy||"",foto:photo};try{if(!API||!navigator.onLine)throw Error("offline");let r=await fetch(API,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(d)}),x=await r.json();if(!x.ok)throw Error(x.error||"Gagal");$("saveStatus").textContent="✓ Data berhasil masuk Google Sheets";history.unshift(d);persist();renderAll();resetForm()}catch(err){d.pending=true;queue.push(d);history.unshift(d);persist();$("saveStatus").textContent="⚠ Offline: data disimpan di perangkat dan akan dikirim saat online.";renderAll()}}
async function syncQueue(){if(!API||!navigator.onLine||!queue.length){updateNet();return}let left=[];for(const d of queue){try{let r=await fetch(API,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(d)}),x=await r.json();if(!x.ok)throw Error(x.error||"Gagal")}catch(e){left.push(d)}}queue=left;persist();updateNet();renderAll();if($("syncStatus"))$("syncStatus").textContent=left.length?`Masih ${left.length} data belum terkirim.`:"✓ Semua data offline sudah tersinkron."}
function resetForm(){$("maintForm").reset();$("fotoPreview").classList.add("hidden");photo="";gps={}}
async function saveNewUser(){
 if(!can("SUPER_ADMIN"))return;
 const d={token:AUTH?.token||"",action:"saveUser",username:$("newUsername").value.trim(),nama:$("newName").value.trim(),password:$("newPassword").value,role:$("newRole").value,unit:$("newUnit").value,aktif:"Ya"};
 if(!d.username||!d.password){$("userStatus").textContent="Username dan password wajib diisi.";return}
 try{const r=await fetch(API,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(d)});const x=await r.json();$("userStatus").textContent=x.ok?"✓ Pengguna berhasil dibuat":x.error||"Gagal";if(x.ok){$("newUsername").value="";$("newName").value="";$("newPassword").value="";loadUsers()}}catch(e){$("userStatus").textContent=e.message}
}
async function loadUsers(){try{const d=await get("getUsers");const a=d.data||[];$("userList").innerHTML=a.map(x=>`<div class="item"><b>${esc(x.nama)} · ${esc(x.role)}</b><small>${esc(x.username)} · ${esc(x.unit)} · ${esc(x.aktif)}</small></div>`).join("")||"Belum ada pengguna."}catch(e){}}
function saveProfile(){localStorage.setItem("petugas_nama",$("petugas").value);localStorage.setItem("petugas_unit",$("unit").value);alert("Profil disimpan")}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]) )}function attr(v){return String(v??"").replace(/'/g,"&#39;")}
