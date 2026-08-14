const $ = id => document.getElementById(id);
const APP_VERSION = "5.2.0";
let API = localStorage.getItem("simeter_api_url") || "";
let USER = null, meters = [], tasks = [], history = [], currentPage = "dashboard", scanner = null;

window.addEventListener("DOMContentLoaded", () => {
  // Pastikan modal TIDAK pernah muncul pada halaman login.
  const modal = $("modal");
  if (modal) {
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    modal.style.setProperty("display", "none", "important");
  }
  // Bersihkan service worker/cache versi lama yang dapat mempertahankan modal kosong.
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(() => {});
    if (window.caches) caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {});
  }
  $("apiUrl").value = API;
  $("togglePass").onclick = () => { $("loginPass").type = $("loginPass").type === "password" ? "text" : "password"; };
  $("saveApi").onclick = saveApi;
  $("loginBtn").onclick = login;
  $("logoutBtn").onclick = logout;
  $("notifBtn").onclick = showNotifications;
  $("closeModal").onclick = closeModal;
  $("modal").addEventListener("click", e => { if (e.target === $("modal")) closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });
  document.querySelectorAll(".bottom-nav button").forEach(b => b.onclick = () => navigate(b.dataset.page));
  // Pertahankan sesi saat halaman di-refresh. Logout tetap menghapus sesi.
  try {
    const saved = localStorage.getItem("simeter_user");
    if (saved) {
      const u = JSON.parse(saved);
      if (u && u.username && u.role) {
        USER = u;
        showMain();
      }
    }
  } catch (_) {
    localStorage.removeItem("simeter_user");
    USER = null;
  }
});

async function saveApi() {
  API = $("apiUrl").value.trim().replace(/\/+$/, "");
  localStorage.setItem("simeter_api_url", API);
  if (!API) return setLoginMsg("URL Web App belum diisi.");
  setLoginMsg("Mengecek koneksi...");
  try {
    const x = await request("ping");
    if (x && x.ok && x.app === "SIMETER") {
      setLoginMsg("SIMETER API aktif" + (x.version ? " · v" + x.version : ""));
    } else {
      setLoginMsg("API merespons, tetapi bukan API SIMETER.");
    }
  } catch (e) {
    setLoginMsg(e?.name === "AbortError"
      ? "Koneksi API timeout. Pastikan URL /exec benar."
      : (e.message || "Koneksi gagal"));
  }
}

async function request(action, opts = {}) {
  if (!API) throw new Error("URL Web App belum diisi");
  const method = opts.method || "GET";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeout || 20000);
  try {
    if (method === "GET") {
      const qs = new URLSearchParams(opts.params || {}); qs.set("action", action); qs.set("v", APP_VERSION);
      const r = await fetch(API + "?" + qs.toString(), {cache:"no-store",redirect:"follow",signal:controller.signal});
      const t = await r.text();
      try { return JSON.parse(t); } catch (_) { throw new Error("Respons API bukan JSON. Pastikan Web App Apps Script menggunakan URL /exec."); }
    }
    const r = await fetch(API, {method:"POST",redirect:"follow",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action,...(opts.body||{}),_v:APP_VERSION}),cache:"no-store",signal:controller.signal});
    const t = await r.text();
    try { return JSON.parse(t); } catch (_) { throw new Error("Respons API bukan JSON. Pastikan Web App Apps Script menggunakan URL /exec."); }
  } finally { clearTimeout(timer); }
}
async function loginRequest(username,password) {
  const qs = new URLSearchParams({action:"login",username,password,v:APP_VERSION});
  const controller = new AbortController(); const timer = setTimeout(()=>controller.abort(),20000);
  try {
    const r = await fetch(API + "?" + qs.toString(), {cache:"no-store",redirect:"follow",signal:controller.signal});
    const t = await r.text();
    try { return JSON.parse(t); } catch (_) { throw new Error("Backend tidak mengembalikan JSON. Pastikan URL Web App /exec benar dan deployment aktif."); }
  } finally { clearTimeout(timer); }
}
async function testPing(){
  try {
    const x = await request("ping");
    return !!x.ok && x.app === "SIMETER";
  } catch (_) {
    return false;
  }
}
function setLoginMsg(x) { $("loginMsg").textContent = x; }

async function login() {
  const username=$("loginUser").value.trim(), password=$("loginPass").value;
  if(!username||!password)return setLoginMsg("Username dan kata sandi wajib diisi.");
  if(!API)return setLoginMsg("Masukkan URL Web App Google Apps Script pada Pengaturan koneksi.");
  $("loginBtn").disabled=true; setLoginMsg("Memverifikasi akun...");
  try {
    localStorage.removeItem("simeter_user"); USER=null;
    const r=await loginRequest(username,password);
    if(!r||!r.ok||!r.user) throw new Error(r?.error||"Username atau kata sandi salah");
    USER=r.user; localStorage.setItem("simeter_user",JSON.stringify(USER)); setLoginMsg("Login berhasil. Membuka SIMETER..."); showMain();
  } catch(e) { setLoginMsg(e?.name==="AbortError"?"Koneksi API timeout. Periksa URL Web App.":(e.message||"Login gagal")); }
  finally { $("loginBtn").disabled=false; }
}
function logout() { localStorage.removeItem("simeter_user"); USER = null; closeModal(); $("mainView").hidden = true; $("mainView").style.display = "none"; $("loginView").hidden = false; $("loginView").style.display = ""; }
function showMain() { $("loginView").hidden = true; $("loginView").style.display = "none"; $("mainView").hidden = false; $("mainView").style.display = ""; $("roleLine").textContent = (USER?.name || USER?.username || "User") + " · " + (USER?.role || "PETUGAS"); $("userName").textContent = USER?.name || USER?.username || ""; navigate("dashboard"); }
function hideViews() { document.querySelectorAll(".view").forEach(v => v.hidden = true); }
function navigate(page) {
  if (page === "more") return openMore();
  currentPage = page; hideViews();
  const map = { dashboard: "dashboard", meters: "metersView", scan: "scanView", tasks: "tasksView", profile: "profileView", settings: "settingsView", admin: "adminView" };
  const titles = { dashboard: "Ringkasan", meters: "Data Meter", scan: "Scan Meter", tasks: "Tugas", profile: "Profil", settings: "Pengaturan", admin: "Administrasi" };
  $("pageTitle").textContent = titles[page] || "SIMETER";
  if (map[page]) $(map[page]).hidden = false;
  document.querySelectorAll(".bottom-nav button").forEach(b => b.classList.toggle("active", b.dataset.page === page));
  if (page === "dashboard") renderDashboard();
  if (page === "meters") loadMeters();
  if (page === "scan") renderScan();
  if (page === "tasks") loadTasks();
  if (page === "profile") renderProfile();
  if (page === "settings") renderSettings();
  if (page === "admin") openAdmin();
}

function openMore() {
  const isAdmin = ["SUPER_ADMIN", "ADMIN", "SUPERVISOR"].includes(USER?.role);
  showModal(`<h2>Menu Lainnya</h2><div class="actions menu-actions">
    ${isAdmin ? `<button class="secondary" id="modalAdmin">🛡️ Admin</button>` : ""}
    <button class="secondary" id="modalProfile">👤 Profil</button>
    <button class="secondary" id="modalSettings">⚙ Pengaturan</button>
  </div>`);
  if ($("modalAdmin")) $("modalAdmin").onclick = () => { closeModal(); navigate("admin"); };
  $("modalProfile").onclick = () => { closeModal(); navigate("profile"); };
  $("modalSettings").onclick = () => { closeModal(); navigate("settings"); };
}

function renderProfile() {
  $("profileView").innerHTML = `<div class="card"><h2>Profil</h2><div class="details-grid">
    <div class="kv"><small>Nama</small><b>${esc(USER?.name)}</b></div>
    <div class="kv"><small>Username</small><b>${esc(USER?.username)}</b></div>
    <div class="kv"><small>Role</small><b>${esc(USER?.role)}</b></div>
    <div class="kv"><small>Unit</small><b>${esc(USER?.unit || "-")}</b></div>
  </div></div>`;
}

function renderSettings() {
  $("settingsView").innerHTML = `<div class="card"><h2>Koneksi</h2><label>URL Web App<input id="apiEdit" value="${esc(API)}"></label><button id="saveApi2" class="primary">Simpan & Tes Koneksi</button><div id="settingsMsg" class="msg"></div></div>`;
  $("saveApi2").onclick = async () => {
    API = $("apiEdit").value.trim().replace(/\/+$/, ""); localStorage.setItem("simeter_api_url", API);
    $("settingsMsg").textContent = (await testPing()) ? "SIMETER API aktif" : "Koneksi gagal";
  };
}

function openAdmin() {
  hideViews(); $("adminView").hidden = false; $("pageTitle").textContent = "Administrasi";
  $("adminView").innerHTML = `<div class="pill-tabs"><button id="tabUsers" class="active">Pengguna</button><button id="tabTasks">Penugasan</button></div><div id="adminContent"></div>`;
  $("tabUsers").onclick = () => { $("tabUsers").classList.add("active"); $("tabTasks").classList.remove("active"); renderUsersAdmin(); };
  $("tabTasks").onclick = () => { $("tabTasks").classList.add("active"); $("tabUsers").classList.remove("active"); renderAdminTasks(); };
  renderUsersAdmin();
}
async function renderUsersAdmin() {
  $("adminContent").innerHTML = `<div class="card"><h2>Kelola Pengguna</h2><button id="addUserBtn" class="primary">+ Tambah User</button><div id="usersList" class="list">Memuat...</div></div>`;
  $("addUserBtn").onclick = userForm; loadUsers();
}
async function loadUsers() {
  try { const r = await request("getUsers"); $("usersList").innerHTML = (r.data || []).map(u => `<div class="meter-card"><b>${esc(u.name)}</b><div>${esc(u.username)} · ${esc(u.role)} · ${esc(u.unit || "-")}</div></div>`).join("") || '<div class="empty">Belum ada user</div>'; }
  catch (e) { $("usersList").innerHTML = '<div class="alert danger">' + esc(e.message) + '</div>'; }
}
function userForm() {
  showModal(`<h2>Tambah User</h2><div class="form"><label>Username<input id="nu"></label><label>Nama<input id="nn"></label><label>Kata sandi<input id="np" type="password"></label><label>Role<select id="nr"><option>PETUGAS</option><option>ADMIN</option><option>SUPERVISOR</option><option>VIEWER</option></select></label><label>Unit<input id="nunit"></label><button id="createUserBtn" class="primary">Simpan</button></div>`);
  $("createUserBtn").onclick = createUser;
}
async function createUser() { try { const r = await request("saveUser", { method: "POST", body: { username: $("nu").value, name: $("nn").value, password: $("np").value, role: $("nr").value, unit: $("nunit").value, active: true } }); if (!r.ok) throw Error(r.error); closeModal(); loadUsers(); } catch (e) { alert(e.message); } }

async function renderDashboard() {
  $("dashboard").innerHTML = `<div class="grid"><div class="stat"><small>Total Meter</small><b id="sMeters">…</b></div><div class="stat"><small>Pemeliharaan</small><b id="sHist">…</b></div><div class="stat"><small>Jatuh Tempo</small><b id="sDue">…</b></div><div class="stat"><small>Tugas Terbuka</small><b id="sTasks">…</b></div></div><div id="dashAlerts" style="margin-top:14px"></div><div class="card"><h2>Aktivitas Terbaru</h2><div id="recent">Memuat...</div></div>`;
  const recent = $("recent");
  try {
    const [m,h,t] = await Promise.all([
      request("getMeters", {timeout:15000}),
      request("getHistory", {timeout:15000}),
      request("getTasks", {params:{username:USER?.username||""},timeout:15000})
    ]);
    if (!m.ok) throw Error(m.error || "Gagal mengambil data meter");
    if (!h.ok) throw Error(h.error || "Gagal mengambil riwayat");
    if (!t.ok) throw Error(t.error || "Gagal mengambil tugas");
    meters = m.data || []; history = h.data || h.rows || []; tasks = t.data || [];
    $("sMeters").textContent = meters.length;
    $("sHist").textContent = history.length;
    $("sTasks").textContent = tasks.filter(x => x.status !== "SELESAI").length;
    const due = meters.filter(m => m.jatuhTempo && daysUntil(m.jatuhTempo) <= 7).length;
    $("sDue").textContent = due;
    $("dashAlerts").innerHTML = meters.filter(m => m.jatuhTempo && daysUntil(m.jatuhTempo) <= 7).slice(0,5).map(m => `<div class="alert ${daysUntil(m.jatuhTempo) < 0 ? "danger" : ""}">⚠ <b>${esc(m.nomorMeter)}</b> — ${daysUntil(m.jatuhTempo) < 0 ? "terlambat" : "jatuh tempo " + esc(m.jatuhTempo)}</div>`).join("");
    recent.innerHTML = history.slice(0,5).map(x => `<div class="meter-card"><b>${esc(x.nomorMeter)}</b><div>${esc(x.jenis || x.kondisi || "Pemeliharaan")} · ${esc(x.tanggal || x.timestamp || "")}</div></div>`).join("") || '<div class="empty">Belum ada riwayat.</div>';
  } catch(e) {
    $("sMeters").textContent = "0"; $("sHist").textContent = "0"; $("sDue").textContent = "0"; $("sTasks").textContent = "0";
    recent.innerHTML = `<div class="alert danger"><b>Data belum dapat dimuat.</b><br>${esc(e.message || "Koneksi API gagal")}</div><button class="secondary" onclick="navigate('settings')">⚙ Periksa Koneksi</button>`;
  }
}

async function loadMeters() {
  $("metersView").innerHTML = `<div class="toolbar"><input class="search" id="meterFilter" placeholder="Filter nomor meter / pelanggan"><button class="secondary" id="refreshMeters">↻</button></div><div id="meterList">Memuat...</div>`;
  $("refreshMeters").onclick = loadMeters;
  try { const r = await request("getMeters"); meters = r.data || []; renderMeterList(); $("meterFilter").oninput = renderMeterList; }
  catch (e) { $("meterList").innerHTML = '<div class="alert danger">' + esc(e.message) + '</div>'; }
}
function renderMeterList() { const q = ($("meterFilter")?.value || "").toLowerCase(); const a = meters.filter(m => JSON.stringify(m).toLowerCase().includes(q)); $("meterList").innerHTML = a.map(meterCard).join("") || '<div class="empty">Belum ada data meter.</div>'; }
function customerStatus(m) {
  const raw = String(m.statusPelanggan || "").trim();
  if (raw.toUpperCase() === "NON AKTIF") return "Non Aktif";
  if (m.jatuhTempo && daysUntil(m.jatuhTempo) < 0) return "Overdue";
  if (m.terakhirPemeliharaan) return "Normal";
  return raw || "Aktif";
}
function statusClass(status) {
  return status === "Overdue" ? "status-late" : status === "Normal" ? "status-ok" : status === "Non Aktif" ? "status-late" : "status-due";
}
function meterCard(m) {
  const st = customerStatus(m);
  return `<div class="meter-card" data-meter="${esc(m.nomorMeter)}"><div class="meter-head"><div><h3>${esc(m.namaPelanggan || "Meter")}</h3><div>${esc(m.nomorMeter || "-")}</div></div><b class="${statusClass(st)}">● ${esc(st)}</b></div><div class="details-grid"><div class="kv"><small>Interval Pemeliharaan</small><b>${esc(m.intervalHari || 30)} hari</b></div><div class="kv"><small>Jatuh Tempo</small><b>${esc(m.jatuhTempo || "-")}</b></div><div class="kv"><small>Pemeliharaan Terakhir</small><b>${esc(m.terakhirPemeliharaan || "-")}</b></div><div class="kv"><small>Status Pelanggan</small><b>${esc(st)}</b></div></div></div>`;
}

function openMeter(m) {
  const h = history.filter(x => String(x.nomorMeter) === String(m.nomorMeter));
  const st = customerStatus(m);
  showModal(`<h2>${esc(m.namaPelanggan || "Meter")}</h2><div><b>${esc(m.nomorMeter)}</b></div><div class="details-grid"><div class="kv"><small>ID Pelanggan</small><b>${esc(m.idPelanggan || "-")}</b></div><div class="kv"><small>Alamat</small><b>${esc(m.alamat || "-")}</b></div><div class="kv"><small>Kategori</small><b>${esc(m.kategori || "-")}</b></div><div class="kv"><small>Sub Kategori</small><b>${esc(m.subKategori || "-")}</b></div><div class="kv"><small>Merk</small><b>${esc(m.merk || "-")}</b></div><div class="kv"><small>Status Pelanggan</small><b class="${statusClass(st)}">● ${esc(st)}</b></div><div class="kv"><small>Status Aset</small><b>${esc(m.status || "Aktif")}</b></div><div class="kv"><small>Interval Pemeliharaan</small><b>${esc(m.intervalHari || 30)} hari</b></div><div class="kv"><small>Pemeliharaan Terakhir</small><b>${esc(m.terakhirPemeliharaan || "-")}</b></div><div class="kv"><small>Jatuh Tempo</small><b>${esc(m.jatuhTempo || "-")}</b></div><div class="kv"><small>Stand LWBP</small><b>${esc(m.standLWBP || "-")}</b></div><div class="kv"><small>Stand WBP</small><b>${esc(m.standWBP || "-")}</b></div><div class="kv"><small>Stand KVARH</small><b>${esc(m.standKVARH || "-")}</b></div><div class="kv"><small>Stand KWH TOTAL</small><b>${esc(m.standKWHtotal || "-")}</b></div></div><div class="actions"><button id="meterMaintenance" class="primary">🔧 Pemeliharaan</button>${["SUPER_ADMIN","ADMIN"].includes(USER?.role) ? `<button id="meterInterval" class="secondary">⚙ Pengaturan</button>` : ""}</div><h3>Riwayat Maintenance</h3>${h.map(x => `<div class="meter-card"><b>${esc(x.petugas || "-")}</b><div>${esc(x.keterangan || x.hasilPemeriksaan || x.jenis || "")}</div><div class="meta">LWBP ${esc(x.standLWBP || "-")} · WBP ${esc(x.standWBP || "-")} · KVARH ${esc(x.standKVARH || "-")} · KWH TOTAL ${esc(x.standKWHtotal || x.stand || "-")}</div><small>${esc(x.tanggal || x.timestamp || "")}</small></div>`).join("") || '<div class="empty">Belum ada riwayat.</div>'}`);
  $("meterMaintenance").onclick = () => openMaintenance(m.nomorMeter);
  if ($("meterInterval")) $("meterInterval").onclick = () => intervalForm(m);
}

function intervalForm(m) {
  const st = customerStatus(m);
  showModal(`<h2>Pengaturan Meter</h2><div class="form"><label>Nomor Meter<input value="${esc(m.nomorMeter)}" disabled></label><label>Status Pelanggan<select id="customerStatus"><option ${st==='Aktif'?'selected':''}>Aktif</option><option ${st==='Non Aktif'?'selected':''}>Non Aktif</option><option ${st==='Normal'?'selected':''}>Normal</option><option ${st==='Overdue'?'selected':''}>Overdue</option></select></label><label>Interval Pemeliharaan<select id="intervalDays"><option value="30" ${String(m.intervalHari||30)==='30'?'selected':''}>30 hari</option><option value="60" ${String(m.intervalHari)==='60'?'selected':''}>60 hari</option><option value="90" ${String(m.intervalHari)==='90'?'selected':''}>90 hari</option></select></label><button id="saveInterval" class="primary">Simpan Pengaturan</button></div>`);
  $("saveInterval").onclick = async () => { try { const r = await request("updateMeter", { method:"POST", body:{nomorMeter:m.nomorMeter, intervalHari:$("intervalDays").value, statusPelanggan:$("customerStatus").value} }); if(!r.ok) throw Error(r.error); closeModal(); await loadMeters(); alert("Pengaturan berhasil diperbarui."); } catch(e){ alert(e.message); } };
}

function renderScan() { $("scanView").innerHTML = `<div class="scan-box"><h2>Scan Barcode / QR Meter</h2><div id="reader" class="scan-reader"></div><div class="actions"><button id="startScan" class="secondary">📷 Mulai Scan</button><button id="stopScan" class="primary-outline">■ Berhenti</button></div><div id="scanResult"></div></div><div class="card"><h2>Input Manual</h2><div class="form"><label>Nomor Meter<input id="manualMeter"></label><button id="manualGo" class="primary">Lanjut</button></div></div>`; $("startScan").onclick = startScanner; $("stopScan").onclick = stopScanner; $("manualGo").onclick = () => openMaintenance($("manualMeter").value.trim()); startScanner(); }
async function startScanner() { try { if (!window.Html5Qrcode) return; await stopScanner(); scanner = new Html5Qrcode("reader"); await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 240, height: 180 } }, text => { stopScanner(); openMaintenance(text); }); } catch(e) { if ($("scanResult")) $("scanResult").innerHTML = '<div class="alert">' + esc(e.message) + '</div>'; } }
async function stopScanner() { try { if (scanner) { await scanner.stop(); scanner.clear(); scanner = null; } } catch (_) {} }

async function openMaintenance(nomor = "") {
  const m = meters.find(x => String(x.nomorMeter) === String(nomor)) || { nomorMeter: nomor };
  showModal(`<h2>Form Pemeliharaan</h2><div class="form"><label>Nomor Meter<input id="fmMeter" value="${esc(m.nomorMeter || "")}"></label><label>ID Pelanggan<input id="fmId" value="${esc(m.idPelanggan || "")}"></label><label>Jenis<select id="fmJenis"><option>Pemeriksaan meter</option><option>Pemeliharaan rutin</option><option>Perbaikan</option><option>Penggantian</option></select></label><label>Kondisi Meter<select id="fmKondisi"><option>Baik</option><option>Rusak</option><option>Perlu Perbaikan</option></select></label><div class="form-row"><label>Stand LWBP<input id="fmLWBP" type="number" inputmode="decimal" step="any" value="${esc(m.standLWBP || "")}"></label><label>Stand WBP<input id="fmWBP" type="number" inputmode="decimal" step="any" value="${esc(m.standWBP || "")}"></label></div><div class="form-row"><label>Stand KVARH<input id="fmKVARH" type="number" inputmode="decimal" step="any" value="${esc(m.standKVARH || "")}"></label><label>Stand KWH TOTAL<input id="fmKWH" type="number" inputmode="decimal" step="any" value="${esc(m.standKWHtotal || "")}"></label></div><label>Keterangan<textarea id="fmKet"></textarea></label><label>Foto Meter<input id="fmFoto" type="file" accept="image/*" capture="environment"></label><div id="gpsInfo">GPS belum diambil</div><button id="gpsBtn" class="secondary">📍 Ambil GPS</button><button id="saveMaintenanceBtn" class="primary">Simpan Pemeliharaan</button></div>`);
  $("gpsBtn").onclick = getGPS; $("saveMaintenanceBtn").onclick = saveMaintenance;
}
let gps = {};
function getGPS() { navigator.geolocation?.getCurrentPosition(p => { gps = { latitude:p.coords.latitude, longitude:p.coords.longitude, accuracy:p.coords.accuracy }; $("gpsInfo").textContent = `GPS: ${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)} ±${Math.round(gps.accuracy)}m`; }, e => alert(e.message), {enableHighAccuracy:true,timeout:15000}); }
async function saveMaintenance() {
  const file=$("fmFoto").files[0]; let foto=""; if(file) foto=await fileToDataUrl(file);
  const standKWHtotal=$("fmKWH").value;
  const body={nomorMeter:$("fmMeter").value.trim(),idPelanggan:$("fmId").value.trim(),jenis:$("fmJenis").value,kondisi:$("fmKondisi").value,stand:standKWHtotal,standLWBP:$("fmLWBP").value,standWBP:$("fmWBP").value,standKVARH:$("fmKVARH").value,standKWHtotal:standKWHtotal,keterangan:$("fmKet").value,petugas:USER?.name||USER?.username||"",username:USER?.username||"",...gps,foto};
  try { const r=await request("saveMaintenance",{method:"POST",body}); if(!r.ok) throw Error(r.error); closeModal(); alert("Pemeliharaan berhasil disimpan. Status pelanggan menjadi NORMAL dan jatuh tempo dihitung ulang."); navigate("meters"); } catch(e){ alert("Gagal menyimpan: "+e.message); }
}

function fileToDataUrl(f) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); }); }

async function loadTasks() { $("tasksView").innerHTML = `<div class="toolbar">${["SUPER_ADMIN","ADMIN","SUPERVISOR"].includes(USER?.role) ? `<button id="newTaskBtn" class="primary">+ Penugasan Baru</button>` : ""}<button id="refreshTasks" class="secondary">↻</button></div><div id="taskList">Memuat...</div>`; if ($("newTaskBtn")) $("newTaskBtn").onclick = newTask; $("refreshTasks").onclick = loadTasks; try { const params = ["SUPER_ADMIN","ADMIN","SUPERVISOR"].includes(USER?.role) ? {} : { username: USER?.username || "" }; const r = await request("getTasks", { params }); tasks = r.data || []; $("taskList").innerHTML = tasks.map(t => `<div class="card task" data-task="${esc(t.id)}"><div><b>${esc(t.nomorMeter || t.judul || "Tugas")}</b><div>${esc(t.judul || t.keterangan || "")}</div><div class="meta">${esc(t.petugas || t.assignee || "-")} · Jatuh tempo ${esc(t.jatuhTempo || t.dueDate || "-")}</div></div><span class="badge">${esc(t.status || "TERBUKA")}</span></div>`).join("") || '<div class="empty">Tidak ada tugas.</div>'; document.querySelectorAll("[data-task]").forEach(el => el.onclick = () => openTask(tasks.find(t => t.id === el.dataset.task))); } catch(e) { $("taskList").innerHTML = '<div class="alert danger">' + esc(e.message) + '</div>'; } }
function openTask(t) { if (!t) return; showModal(`<h2>${esc(t.judul || "Tugas Pemeliharaan")}</h2><div class="details-grid"><div class="kv"><small>Nomor Meter</small><b>${esc(t.nomorMeter || "-")}</b></div><div class="kv"><small>Petugas</small><b>${esc(t.petugas || t.assignee || "-")}</b></div><div class="kv"><small>Jatuh Tempo</small><b>${esc(t.jatuhTempo || t.dueDate || "-")}</b></div><div class="kv"><small>Status</small><b>${esc(t.status || "TERBUKA")}</b></div></div><div class="card"><b>Keterangan</b><p>${esc(t.keterangan || "-")}</p></div><div class="actions"><button id="taskDo" class="primary">🔧 Kerjakan Pemeliharaan</button></div>`); $("taskDo").onclick = () => { closeModal(); openMaintenance(t.nomorMeter); }; }

async function newTask() {
  try {
    const r = await request("getUsers");
    const users = (r.data || []).filter(u => u.role === "PETUGAS" && u.active !== false);
    if (!users.length) return alert("Belum ada user dengan role PETUGAS.");
    showModal(`<h2>Penugasan Baru</h2><div class="form">
      <label>Nomor Meter<input id="tm" placeholder="Contoh: 24126010982"></label>
      <label>Petugas <small>(bisa pilih lebih dari 1)</small><select id="tu" multiple size="${Math.min(Math.max(users.length,2),6)}">${users.map(u => `<option value="${esc(u.username)}">${esc(u.name)} (${esc(u.username)})</option>`).join("")}</select></label>
      <div class="msg">Tekan Ctrl (komputer) atau pilih beberapa nama di HP untuk penugasan lebih dari satu petugas.</div>
      <label>Tanggal jatuh tempo<input id="td" type="date"></label>
      <label>Judul<input id="tj" value="Pemeliharaan meter"></label>
      <label>Keterangan<textarea id="tk"></textarea></label>
      <button id="saveTaskBtn" class="primary">Simpan Penugasan</button>
    </div>`);
    $("saveTaskBtn").onclick = saveTask;
  } catch(e) { alert(e.message); }
}
async function saveTask() {
  try {
    const select=$("tu");
    const assignees=[...select.selectedOptions].map(o=>o.value);
    if(!assignees.length)return alert("Pilih minimal 1 petugas.");
    const nomor=$("tm").value.trim();
    if(!nomor)return alert("Nomor meter wajib diisi.");
    const r = await request("saveTask", { method: "POST", body: {
      nomorMeter: nomor, judul: $("tj").value, tugas: $("tk").value, assignees,
      dueDate: $("td").value, createdBy: USER?.username || "", status: "TERBUKA"
    }});
    if (!r.ok) throw Error(r.error);
    closeModal();
    await loadTasks();
    alert(`Penugasan berhasil dibuat untuk ${r.count || assignees.length} petugas.`);
  } catch(e) { alert(e.message); }
}
function renderAdminTasks() { $("adminContent").innerHTML = `<div class="card"><h2>Penugasan</h2><button id="adminNewTask" class="primary">+ Penugasan Baru</button><div id="adminTaskList">Memuat...</div></div>`; $("adminNewTask").onclick = newTask; loadAdminTasks(); }
async function loadAdminTasks() { try { const r = await request("getTasks"); const a = r.data || []; $("adminTaskList").innerHTML = a.map(t => `<div class="meter-card"><b>${esc(t.nomorMeter || "-")}</b><div>${esc(t.petugas || t.assignee || "-")} · ${esc(t.judul || "")}</div><small>${esc(t.status || "TERBUKA")} · ${esc(t.jatuhTempo || "-")}</small></div>`).join("") || '<div class="empty">Belum ada penugasan.</div>'; } catch(e) { $("adminTaskList").innerHTML = '<div class="alert danger">' + esc(e.message) + '</div>'; } }
function showNotifications() { const a = meters.filter(m => m.jatuhTempo && daysUntil(m.jatuhTempo) <= 7); showModal(`<h2>Notifikasi</h2>${a.map(m => `<div class="alert ${daysUntil(m.jatuhTempo) < 0 ? "danger" : ""}">⚠ <b>${esc(m.nomorMeter)}</b> — ${daysUntil(m.jatuhTempo) < 0 ? "terlambat" : "jatuh tempo " + esc(m.jatuhTempo)}</div>`).join("") || '<div class="empty">Tidak ada jatuh tempo ≤ 7 hari.</div>'}`); }
function showModal(html) { const modal = $("modal"), body = $("modalBody"); if (!modal || !body || !USER || $("loginView")?.hidden === false) return; body.innerHTML = html || '<div class="empty">Tidak ada informasi.</div>'; modal.hidden = false; modal.setAttribute("aria-hidden", "false"); modal.style.setProperty("display", "grid", "important"); body.scrollTop = 0; requestAnimationFrame(() => { const first = body.querySelector("input,select,textarea,button"); if (first) first.focus({ preventScroll: true }); }); }
function closeModal() { const modal = $("modal"); if (!modal) return; modal.hidden = true; modal.setAttribute("aria-hidden", "true"); modal.style.setProperty("display", "none", "important"); $("modalBody").innerHTML = ""; }
function daysUntil(d) { const a = new Date(); a.setHours(0,0,0,0); const b = new Date(d); b.setHours(0,0,0,0); return Math.ceil((b-a)/86400000); }
function esc(v) { return String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }

document.addEventListener("click", e => {
  const card = e.target.closest(".meter-card[data-meter]");
  if (card && !e.target.closest("button")) { const m = meters.find(x => String(x.nomorMeter) === String(card.dataset.meter)); if (m) openMeter(m); }
});

/* =========================================================
   SIMETER V6 FRONTEND — BERITA ACARA / TTD / PDF
   ========================================================= */

function signatureCanvasHtml(id) {
  return `
    <div class="signature-wrap">
      <canvas id="${id}" class="signature-canvas" width="520" height="180"></canvas>
      <div class="signature-actions">
        <button type="button" class="secondary" onclick="clearSignature('${id}')">Hapus TTD</button>
      </div>
    </div>`;
}

const signaturePads = {};

function initSignature(id) {
  const c = document.getElementById(id);
  if (!c) return;
  const ctx = c.getContext("2d");
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#1f2937";
  let drawing = false;

  const pos = e => {
    const r = c.getBoundingClientRect();
    const p = e.touches ? e.touches[0] : e;
    return {x:(p.clientX-r.left)*c.width/r.width, y:(p.clientY-r.top)*c.height/r.height};
  };
  const start = e => { e.preventDefault(); drawing=true; const p=pos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); };
  const move = e => { if(!drawing)return; e.preventDefault(); const p=pos(e); ctx.lineTo(p.x,p.y); ctx.stroke(); };
  const end = e => { drawing=false; };
  c.addEventListener("mousedown",start); c.addEventListener("mousemove",move); window.addEventListener("mouseup",end);
  c.addEventListener("touchstart",start,{passive:false}); c.addEventListener("touchmove",move,{passive:false}); c.addEventListener("touchend",end);
  signaturePads[id] = c;
}
function clearSignature(id) {
  const c = signaturePads[id] || document.getElementById(id);
  if (c) c.getContext("2d").clearRect(0,0,c.width,c.height);
}
function signatureData(id) {
  const c = signaturePads[id] || document.getElementById(id);
  if (!c) return "";
  const blank = document.createElement("canvas");
  blank.width=c.width; blank.height=c.height;
  if (c.toDataURL() === blank.toDataURL()) return "";
  return c.toDataURL("image/png");
}

async function openBeritaAcara(task) {
  const m = meters.find(x => String(x.nomorMeter) === String(task.nomorMeter)) || {};
  let users = [];
  try { users = (await request("getUsers")).data || []; } catch(_) {}
  const supervisors = users.filter(u => ["SUPERVISOR","ADMIN","SUPER_ADMIN"].includes(u.role) && u.active !== false);

  showModal(`
    <h2>📝 Berita Acara Pemeliharaan</h2>
    <div class="badge">ID Tugas: ${esc(task.id)}</div>
    <div class="form">
      <div class="row">
        <label>Nomor BA<input id="baNomor" value=""></label>
        <label>Tanggal<input id="baTanggal" type="date" value="${new Date().toISOString().slice(0,10)}"></label>
      </div>
      <div class="row">
        <label>ID Pelanggan<input id="baId" value="${esc(m.idPelanggan||"")}" readonly></label>
        <label>Nomor Meter<input id="baMeter" value="${esc(task.nomorMeter||"")}" readonly></label>
      </div>
      <label>Nama Pelanggan<input id="baNama" value="${esc(m.namaPelanggan||"")}" readonly></label>
      <label>Alamat<textarea id="baAlamat">${esc(m.alamat||"")}</textarea></label>
      <label>Jenis Pemeliharaan<select id="baJenis"><option>Pemeliharaan Rutin</option><option>Pemeriksaan</option><option>Perbaikan</option><option>Penggantian</option></select></label>
      <label>Status Pelanggan<select id="baStatus"><option>Aktif</option><option>Non Aktif</option><option>Normal</option><option>Overdue</option></select></label>
      <label>Kondisi KWH Meter<select id="baKwh"><option>Normal</option><option>Baik</option><option>Perlu Perbaikan</option><option>Rusak</option></select></label>
      <label>Kondisi Kubikel/PMCB<select id="baKubikel"><option>Normal</option><option>Baik</option><option>Perlu Perbaikan</option><option>Rusak</option></select></label>

      <h3>CT</h3>
      <div class="row"><label>CT R<input id="baCTR"></label><label>CT S<input id="baCTS"></label></div>
      <label>CT T<input id="baCTT"></label>
      <h3>PT</h3>
      <div class="row"><label>PT R<input id="baPTR"></label><label>PT S<input id="baPTS"></label></div>
      <label>PT T<input id="baPTT"></label>

      <h3>Hasil Pengukuran</h3>
      <div class="row"><label>Tegangan R<input id="baVR" type="number" step="0.01"></label><label>Tegangan S<input id="baVS" type="number" step="0.01"></label></div>
      <label>Tegangan T<input id="baVT" type="number" step="0.01"></label>
      <div class="row"><label>Arus R<input id="baIR" type="number" step="0.01"></label><label>Arus S<input id="baIS" type="number" step="0.01"></label></div>
      <label>Arus T<input id="baIT" type="number" step="0.01"></label>

      <h3>Stand Meter</h3>
      <div class="row"><label>LWBP<input id="baLWBP" type="number" step="0.01"></label><label>WBP<input id="baWBP" type="number" step="0.01"></label></div>
      <div class="row"><label>KVARH<input id="baKVARH" type="number" step="0.01"></label><label>KWH TOTAL<input id="baKWH" type="number" step="0.01"></label></div>

      <label>Kesimpulan<select id="baKesimpulan"><option>Normal / Baik</option><option>Perlu Pemeliharaan</option><option>Perlu Perbaikan</option><option>Perlu Penggantian</option><option>Tidak Dapat Dilakukan</option></select></label>
      <label>Keterangan<textarea id="baKet"></textarea></label>
      <label>Supervisor<select id="baSupervisor"><option value="">Pilih supervisor</option>${supervisors.map(u=>`<option value="${esc(u.username)}">${esc(u.name)} (${esc(u.username)})</option>`).join("")}</select></label>

      <div class="card signature-card">
        <h3>✍️ Tanda Tangan Petugas</h3>
        <p class="muted">Tanda tangan langsung di layar HP.</p>
        ${signatureCanvasHtml("ttdPetugasCanvas")}
      </div>

      <button class="primary big" onclick="saveBeritaAcaraFromForm('${esc(task.id)}')">💾 Simpan & Ajukan</button>
    </div>
  `);
  setTimeout(()=>initSignature("ttdPetugasCanvas"),100);
}

async function saveBeritaAcaraFromForm(idTugas) {
  const signature = signatureData("ttdPetugasCanvas");
  if (!signature) return alert("Tanda tangan petugas wajib diisi.");

  try {
    const r = await request("saveBeritaAcara", {method:"POST", body:{
      idTugas:idTugas,
      idPelanggan:$("baId").value,
      nomorMeter:$("baMeter").value,
      namaPelanggan:$("baNama").value,
      alamat:$("baAlamat").value,
      tanggal:$("baTanggal").value,
      nomorBA:$("baNomor").value,
      unit:USER?.unit||"",
      petugasUsername:USER?.username||"",
      petugas:USER?.name||USER?.username||"",
      supervisorUsername:$("baSupervisor").value,
      supervisor:$("baSupervisor").selectedOptions[0]?.textContent||"",
      jenisPemeliharaan:$("baJenis").value,
      statusPelanggan:$("baStatus").value,
      kondisiKwhMeter:$("baKwh").value,
      kondisiKubikel:$("baKubikel").value,
      kondisiCTR:$("baCTR").value,kondisiCTS:$("baCTS").value,kondisiCTT:$("baCTT").value,
      kondisiPTR:$("baPTR").value,kondisiPTS:$("baPTS").value,kondisiPTT:$("baPTT").value,
      teganganR:$("baVR").value,teganganS:$("baVS").value,teganganT:$("baVT").value,
      arusR:$("baIR").value,arusS:$("baIS").value,arusT:$("baIT").value,
      lwbp:$("baLWBP").value,wbp:$("baWBP").value,kvarh:$("baKVARH").value,kwhTotal:$("baKWH").value,
      kesimpulan:$("baKesimpulan").value,keterangan:$("baKet").value,
      ttdPetugas:signature,waktuTtdPetugas:new Date().toISOString(),statusBA:"DIAJUKAN"
    }});
    if (!r.ok) throw Error(r.error);
    await request("signBeritaAcara",{method:"POST",body:{idBA:r.idBA,role:"PETUGAS",signature:signature,time:new Date().toISOString()}});
    const pdf = await request("createBAPdf",{method:"POST",body:{idBA:r.idBA}});
    if (!pdf.ok) throw Error(pdf.error);
    await request("updateTaskStatus",{method:"POST",body:{id:idTugas,status:"SELESAI"}});
    closeModal();
    alert("Berita Acara tersimpan, PDF dibuat, dan tugas diselesaikan.");
    navigate("tasks");
  } catch(e) {
    alert("Gagal menyimpan Berita Acara: " + e.message);
  }
}

async function completeTaskWithBA(task) {
  await openBeritaAcara(task);
}
