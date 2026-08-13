const $=id=>document.getElementById(id);
let API=localStorage.getItem("simeter_api_url")||"";
let USER=null, meters=[], tasks=[], history=[], currentPage="dashboard", scanner=null;

document.addEventListener("DOMContentLoaded",()=>{
  $("apiUrl").value=API;
  $("togglePass").onclick=()=>{$("loginPass").type=$("loginPass").type==="password"?"text":"password"};
  $("saveApi").onclick=saveApi;
  $("loginBtn").onclick=login;
  $("logoutBtn").onclick=logout;
  $("notifBtn").onclick=showNotifications;
  $("closeModal").onclick=closeModal;
  document.querySelectorAll(".bottom-nav button").forEach(b=>b.onclick=()=>navigate(b.dataset.page));
  const saved=localStorage.getItem("simeter_user");
  if(saved){try{USER=JSON.parse(saved);showMain()}catch{}}
});

function saveApi(){API=$("apiUrl").value.trim().replace(/\/+$/,"");localStorage.setItem("simeter_api_url",API);testPing().then(x=>setLoginMsg(x?"Koneksi berhasil":"Koneksi gagal"));}

async function request(action, opts={}){
  if(!API) throw new Error("URL Web App belum diisi");
  const method=opts.method||"GET";
  if(method==="GET"){
    const u=API+"?action="+encodeURIComponent(action)+(opts.params?"&"+new URLSearchParams(opts.params):"");
    const r=await fetch(u,{cache:"no-store"});
    const t=await r.text();
    try{return JSON.parse(t)}catch{throw new Error("Respons bukan JSON: "+t.slice(0,120))}
  }
  const r=await fetch(API,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action,...(opts.body||{})})});
  const t=await r.text();
  try{return JSON.parse(t)}catch{throw new Error("Respons bukan JSON: "+t.slice(0,120))}
}
async function testPing(){try{const x=await request("ping");return !!x.ok}catch(e){return false}}
function setLoginMsg(x){$("loginMsg").textContent=x}

async function login(){
  const username=$("loginUser").value.trim(), password=$("loginPass").value;
  if(!username||!password){setLoginMsg("Username dan kata sandi wajib diisi.");return}
  $("loginBtn").disabled=true;setLoginMsg("Menghubungkan...");
  try{
    const r=await request("login",{method:"POST",body:{username,password}});
    if(!r.ok) throw new Error(r.error||"Login gagal");
    USER=r.user;localStorage.setItem("simeter_user",JSON.stringify(USER));showMain();
  }catch(e){setLoginMsg(e.message.includes("Failed to fetch")?"Koneksi ke Google Apps Script gagal. Cek URL Web App.":e.message)}
  finally{$("loginBtn").disabled=false}
}
function logout(){localStorage.removeItem("simeter_user");USER=null;$("mainView").hidden=true;$("loginView").hidden=false}
function showMain(){$("loginView").hidden=true;$("mainView").hidden=false;$("roleLine").textContent=(USER?.name||USER?.username||"User")+" · "+(USER?.role||"PETUGAS");$("userName").textContent=USER?.name||USER?.username||"";navigate("dashboard")}
function hideViews(){document.querySelectorAll(".view").forEach(v=>v.hidden=true)}
function navigate(page){
  if(page==="more"){openMore();return}
  currentPage=page;hideViews();
  const map={dashboard:"dashboard",meters:"metersView",scan:"scanView",tasks:"tasksView"};
  $("pageTitle").textContent={dashboard:"Ringkasan",meters:"Data Meter",scan:"Scan Meter",tasks:"Tugas"}[page]||"SIMETER";
  if(map[page]) $(map[page]).hidden=false;
  document.querySelectorAll(".bottom-nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  if(page==="dashboard")renderDashboard();
  if(page==="meters")loadMeters();
  if(page==="scan")renderScan();
  if(page==="tasks")loadTasks();
}
function openMore(){
  showModal(`<h2>Menu Lainnya</h2><div class="actions"><button class="secondary" onclick="navigate('profile');closeModal()">👤 Profil</button>${["SUPER_ADMIN","ADMIN"].includes(USER?.role)?`<button class="secondary" onclick="openAdmin();closeModal()">🛡️ Admin</button>`:""}<button class="secondary" onclick="openSettings();closeModal()">⚙ Pengaturan</button></div>`);
}
function openProfile(){hideViews();$("profileView").hidden=false;$("pageTitle").textContent="Profil";$("profileView").innerHTML=`<div class="card"><h2>Profil</h2><div class="details-grid"><div class="kv"><small>Nama</small><b>${esc(USER?.name)}</b></div><div class="kv"><small>Username</small><b>${esc(USER?.username)}</b></div><div class="kv"><small>Role</small><b>${esc(USER?.role)}</b></div><div class="kv"><small>Unit</small><b>${esc(USER?.unit||"-")}</b></div></div></div>`}
function openSettings(){hideViews();$("settingsView").hidden=false;$("pageTitle").textContent="Pengaturan";$("settingsView").innerHTML=`<div class="card"><h2>Koneksi</h2><label>URL Web App<input id="apiEdit" value="${esc(API)}"></label><button class="primary" onclick="API=$('apiEdit').value.trim().replace(/\\/+$/,'');localStorage.setItem('simeter_api_url',API);testPing().then(x=>alert(x?'SIMETER API aktif':'Koneksi gagal'))">Simpan & Tes</button></div>`}
function openAdmin(){hideViews();$("adminView").hidden=false;$("pageTitle").textContent="Administrasi";$("adminView").innerHTML=`<div class="pill-tabs"><button class="active">Pengguna</button><button onclick="renderAdminTasks()">Penugasan</button></div><div id="adminContent"><div class="card"><h2>Kelola Pengguna</h2><button class="primary" onclick="userForm()">+ Tambah User</button><div id="usersList" class="list"></div></div></div>`;loadUsers()}
async function loadUsers(){try{const r=await request("getUsers");$("usersList").innerHTML=(r.data||[]).map(u=>`<div class="meter-card"><b>${esc(u.name)}</b><div>${esc(u.username)} · ${esc(u.role)} · ${esc(u.unit||"-")}</div></div>`).join("")||'<div class="empty">Belum ada user</div>'}catch(e){$("usersList").innerHTML='<div class="alert danger">'+esc(e.message)+'</div>'}}
function userForm(){showModal(`<h2>Tambah User</h2><div class="form"><label>Username<input id="nu"></label><label>Nama<input id="nn"></label><label>Kata sandi<input id="np" type="password"></label><label>Role<select id="nr"><option>PETUGAS</option><option>ADMIN</option><option>SUPER_ADMIN</option><option>SUPERVISOR</option></select></label><label>Unit<input id="nunit"></label><button class="primary" onclick="createUser()">Simpan</button></div>`)}
async function createUser(){try{const r=await request("saveUser",{method:"POST",body:{username:$("nu").value,name:$("nn").value,password:$("np").value,role:$("nr").value,unit:$("nunit").value,active:true}});if(!r.ok)throw Error(r.error);closeModal();loadUsers()}catch(e){alert(e.message)}}
function renderDashboard(){
  $("dashboard").innerHTML=`<div class="grid"><div class="stat"><small>Total Meter</small><b id="sMeters">…</b></div><div class="stat"><small>Pemeliharaan</small><b id="sHist">…</b></div><div class="stat"><small>Jatuh Tempo</small><b id="sDue">…</b></div><div class="stat"><small>Tugas Terbuka</small><b id="sTasks">…</b></div></div><div id="dashAlerts" style="margin-top:14px"></div><div class="card"><h2>Aktivitas Terbaru</h2><div id="recent">Memuat...</div></div>`;
  Promise.all([request("getMeters"),request("getHistory"),request("getTasks",{params:{username:USER?.username||""}})]).then(([m,h,t])=>{
    meters=m.data||[];history=h.data||h.rows||[];tasks=t.data||[];
    $("sMeters").textContent=meters.length;$("sHist").textContent=history.length;$("sTasks").textContent=tasks.filter(x=>x.status!=="SELESAI").length;
    const due=meters.filter(m=>m.jatuhTempo&&daysUntil(m.jatuhTempo)<=7).length;$("sDue").textContent=due;
    const alerts=meters.filter(m=>m.jatuhTempo&&daysUntil(m.jatuhTempo)<=7).slice(0,5).map(m=>`<div class="alert ${daysUntil(m.jatuhTempo)<0?"danger":""}">⚠ <b>${esc(m.nomorMeter)}</b> — jatuh tempo ${esc(m.jatuhTempo)}</div>`).join("");
    $("dashAlerts").innerHTML=alerts;
    $("recent").innerHTML=(history.slice(0,5).map(x=>`<div class="meter-card"><b>${esc(x.nomorMeter)}</b><div>${esc(x.jenis||x.kondisi||"Pemeliharaan")} · ${esc(x.tanggal||x.timestamp||"")}</div></div>`).join(""))||'<div class="empty">Belum ada riwayat.</div>';
  }).catch(e=>$("recent").innerHTML='<div class="alert danger">'+esc(e.message)+'</div>');
}
async function loadMeters(){
  $("metersView").innerHTML=`<div class="toolbar"><input class="search" id="meterFilter" placeholder="Filter nomor meter / pelanggan"><button class="secondary" onclick="loadMeters()">↻</button></div><div id="meterList">Memuat...</div>`;
  try{const r=await request("getMeters");meters=r.data||[];renderMeterList();$("meterFilter").oninput=renderMeterList}catch(e){$("meterList").innerHTML='<div class="alert danger">'+esc(e.message)+'</div>'}
}
function renderMeterList(){const q=($("meterFilter")?.value||"").toLowerCase();const a=meters.filter(m=>JSON.stringify(m).toLowerCase().includes(q));$("meterList").innerHTML=a.map(m=>meterCard(m)).join("")||'<div class="empty">Belum ada data meter.</div>'}
function meterCard(m){const d=m.jatuhTempo?daysUntil(m.jatuhTempo):null;const cls=d!==null&&d<0?"status-late":d!==null&&d<=7?"status-due":"status-ok";return `<div class="meter-card" onclick='openMeter(${JSON.stringify(m)})'><div class="meter-head"><div><h3>${esc(m.namaPelanggan||"Meter")}</h3><div>${esc(m.nomorMeter||"-")}</div></div><b class="${cls}">● ${d===null?"Aktif":d<0?"Terlambat":d<=7?"Segera":"Normal"}</b></div><div class="details-grid"><div class="kv"><small>Interval</small><b>${esc(m.intervalHari||30)} hari</b></div><div class="kv"><small>Jatuh Tempo</small><b>${esc(m.jatuhTempo||"-")}</b></div><div class="kv"><small>Terakhir</small><b>${esc(m.terakhirPemeliharaan||"-")}</b></div><div class="kv"><small>Status</small><b>${esc(m.status||"Aktif")}</b></div></div></div>`}
function openMeter(m){const h=history.filter(x=>x.nomorMeter===m.nomorMeter);showModal(`<h2>${esc(m.namaPelanggan||"Meter")}</h2><div>${esc(m.nomorMeter)}</div><div class="details-grid"><div class="kv"><small>Kategori</small><b>${esc(m.kategori||"-")}</b></div><div class="kv"><small>Sub Kategori</small><b>${esc(m.subKategori||"-")}</b></div><div class="kv"><small>Merk</small><b>${esc(m.merk||"-")}</b></div><div class="kv"><small>Status</small><b>${esc(m.status||"Aktif")}</b></div><div class="kv"><small>Interval Pemeliharaan</small><b>${esc(m.intervalHari||30)} hari</b></div><div class="kv"><small>Jatuh Tempo</small><b>${esc(m.jatuhTempo||"-")}</b></div></div><h3>Riwayat Maintenance</h3>${h.map(x=>`<div class="meter-card"><b>${esc(x.petugas||"-")}</b><div>${esc(x.keterangan||x.hasilPemeriksaan||"")}</div><small>${esc(x.tanggal||x.timestamp||"")}</small></div>`).join("")||'<div class="empty">Belum ada riwayat.</div>'}`)}
function renderScan(){$("scanView").innerHTML=`<div class="scan-box"><h2>Scan Barcode / QR Meter</h2><div id="reader" class="scan-reader"></div><div class="actions"><button class="secondary" onclick="startScanner()">📷 Mulai Scan</button><button class="primary-outline" onclick="stopScanner()">■ Berhenti</button></div><div id="scanResult"></div></div><div class="card"><h2>Input Manual</h2><div class="form"><label>Nomor Meter<input id="manualMeter"></label><button class="primary" onclick="openMaintenance($('manualMeter').value)">Lanjut</button></div></div>`;startScanner()}
async function startScanner(){try{if(!window.Html5Qrcode)return;scanner=new Html5Qrcode("reader");await scanner.start({facingMode:"environment"},{fps:10,qrbox:{width:240,height:180}},text=>{stopScanner();openMaintenance(text)})}catch(e){$("scanResult").innerHTML='<div class="alert">'+esc(e.message)+'</div>'}}
async function stopScanner(){try{if(scanner){await scanner.stop();scanner.clear();scanner=null}}catch{}}
async function openMaintenance(nomor=""){const m=meters.find(x=>String(x.nomorMeter)===String(nomor))||{nomorMeter:nomor};showModal(`<h2>Form Pemeliharaan</h2><div class="form"><label>Nomor Meter<input id="fmMeter" value="${esc(m.nomorMeter||"")}"></label><label>ID Pelanggan<input id="fmId" value="${esc(m.idPelanggan||"")}"></label><label>Jenis<select id="fmJenis"><option>Pemeriksaan meter</option><option>Pemeliharaan rutin</option><option>Perbaikan</option><option>Penggantian</option></select></label><label>Kondisi Meter<select id="fmKondisi"><option>Baik</option><option>Rusak</option><option>Perlu Perbaikan</option></select></label><label>Stand Meter<input id="fmStand" type="number"></label><label>Keterangan<textarea id="fmKet"></textarea></label><label>Foto Meter<input id="fmFoto" type="file" accept="image/*" capture="environment"></label><div id="gpsInfo">GPS belum diambil</div><button class="secondary" onclick="getGPS()">📍 Ambil GPS</button><button class="primary" onclick="saveMaintenance()">Simpan Pemeliharaan</button></div>`)}
let gps={};
function getGPS(){navigator.geolocation?.getCurrentPosition(p=>{gps={latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy};$("gpsInfo").textContent=`GPS: ${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)} ±${Math.round(gps.accuracy)}m`},e=>alert(e.message),{enableHighAccuracy:true,timeout:15000})}
async function saveMaintenance(){
  const file=$("fmFoto").files[0];let foto="";
  if(file){foto=await fileToDataUrl(file)}
  const body={nomorMeter:$("fmMeter").value.trim(),idPelanggan:$("fmId").value.trim(),jenis:$("fmJenis").value,kondisi:$("fmKondisi").value,stand:$("fmStand").value,keterangan:$("fmKet").value,petugas:USER?.name||USER?.username||"",username:USER?.username||"",...gps,foto};
  try{const r=await request("saveMaintenance",{method:"POST",body});if(!r.ok)throw Error(r.error);closeModal();alert("Pemeliharaan berhasil disimpan.");navigate("meters")}catch(e){alert("Gagal menyimpan: "+e.message)}}
function fileToDataUrl(f){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f)})}
async function loadTasks(){ $("tasksView").innerHTML=`<div class="toolbar"><button class="primary" onclick="newTask()">+ Penugasan Baru</button><button class="secondary" onclick="loadTasks()">↻</button></div><div id="taskList">Memuat...</div>`;try{const r=await request("getTasks",{params:{username:USER?.username||""}});tasks=r.data||[];$("taskList").innerHTML=tasks.map(t=>`<div class="card task"><div><b>${esc(t.nomorMeter||t.judul||"Tugas")}</b><div>${esc(t.judul||t.keterangan||"")}</div><div class="meta">${esc(t.petugas||t.assignee||"-")} · ${esc(t.jatuhTempo||t.dueDate||"-")}</div></div><span class="badge">${esc(t.status||"TERBUKA")}</span></div>`).join("")||'<div class="empty">Tidak ada tugas.</div>'}catch(e){$("taskList").innerHTML='<div class="alert danger">'+esc(e.message)+'</div>'}}
async function newTask(){try{const r=await request("getUsers");const users=(r.data||[]).filter(u=>u.role==="PETUGAS"&&u.active!==false);showModal(`<h2>Penugasan Baru</h2><div class="form"><label>Nomor Meter<input id="tm"></label><label>Petugas<select id="tu">${users.map(u=>`<option value="${esc(u.username)}">${esc(u.name)} (${esc(u.username)})</option>`).join("")}</select></label><label>Tanggal jatuh tempo<input id="td" type="date"></label><label>Keterangan<textarea id="tk"></textarea></label><button class="primary" onclick="saveTask()">Simpan Penugasan</button></div>`)}catch(e){alert(e.message)}}
async function saveTask(){try{const r=await request("saveTask",{method:"POST",body:{nomorMeter:$("tm").value,tugas:$("tk").value,assignee:$("tu").value,dueDate:$("td").value,createdBy:USER?.username,status:"TERBUKA"}});if(!r.ok)throw Error(r.error);closeModal();loadTasks();alert("Penugasan masuk ke akun petugas.")}catch(e){alert(e.message)}}
function renderAdminTasks(){loadTasks()}
function showNotifications(){const a=meters.filter(m=>m.jatuhTempo&&daysUntil(m.jatuhTempo)<=7);showModal(`<h2>Notifikasi</h2>${a.map(m=>`<div class="alert ${daysUntil(m.jatuhTempo)<0?"danger":""}">⚠ ${esc(m.nomorMeter)} — ${daysUntil(m.jatuhTempo)<0?"terlambat":`jatuh tempo ${m.jatuhTempo}`}</div>`).join("")||'<div class="empty">Tidak ada jatuh tempo ≤ 7 hari.</div>'}`)}
function showModal(html){$("modalBody").innerHTML=html;$("modal").hidden=false}
function closeModal(){$("modal").hidden=true;$("modalBody").innerHTML=""}
function daysUntil(d){const a=new Date();a.setHours(0,0,0,0);const b=new Date(d);b.setHours(0,0,0,0);return Math.ceil((b-a)/86400000)}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
