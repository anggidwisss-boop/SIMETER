const $ = id => document.getElementById(id);
const APP_VERSION = "4.0.0";
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
  // V4 tidak otomatis membuka aplikasi dari sesi browser lama. Login harus eksplisit.
  localStorage.removeItem("simeter_user");
  USER = null;
});

function saveApi() {
  API = $("apiUrl").value.trim().replace(/\/+$/, "");
  localStorage.setItem("simeter_api_url", API);
  testPing().then(x => setLoginMsg(x ? "SIMETER API aktif" : "Koneksi gagal"));
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
      try { return JSON.parse(t); } catch (_) { throw new Error("Respons API bukan JSON. Deploy Code.gs V4 terbaru."); }
    }
    const r = await fetch(API, {method:"POST",redirect:"follow",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action,...(opts.body||{}),_v:APP_VERSION}),cache:"no-store",signal:controller.signal});
    const t = await r.text();
    try { return JSON.parse(t); } catch (_) { throw new Error("Respons API bukan JSON. Deploy Code.gs V4 terbaru."); }
  } finally { clearTimeout(timer); }
}
async function loginRequest(username,password) {
  const qs = new URLSearchParams({action:"login",username,password,v:APP_VERSION});
  const controller = new AbortController(); const timer = setTimeout(()=>controller.abort(),20000);
  try {
    const r = await fetch(API + "?" + qs.toString(), {cache:"no-store",redirect:"follow",signal:controller.signal});
    const t = await r.text();
    try { return JSON.parse(t); } catch (_) { throw new Error("Backend belum menggunakan Code.gs V4. Deploy versi baru Apps Script."); }
  } finally { clearTimeout(timer); }
}
async function testPing(){ try { const x=await request("ping"); return !!x.ok && x.app==="SIMETER" && x.version==="4.0.0"; } catch(_){ return false; }}
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
function logout() { localStorage.removeItem("simeter_user"); USER = null; closeModal(); $("mainView").hidden = true; $("loginView").hidden = false; }
function showMain() { $("loginView").hidden = true; $("mainView").hidden = false; $("roleLine").textContent = (USER?.name || USER?.username || "User") + " · " + (USER?.role || "PETUGAS"); $("userName").textContent = USER?.name || USER?.username || ""; navigate("dashboard"); }
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

function renderDashboard() {
  $("dashboard").innerHTML = `<div class="grid"><div class="stat"><small>Total Meter</small><b id="sMeters">…</b></div><div class="stat"><small>Pemeliharaan</small><b id="sHist">…</b></div><div class="stat"><small>Jatuh Tempo</small><b id="sDue">…</b></div><div class="stat"><small>Tugas Terbuka</small><b id="sTasks">…</b></div></div><div id="dashAlerts" style="margin-top:14px"></div><div class="card"><h2>Aktivitas Terbaru</h2><div id="recent">Memuat...</div></div>`;
  Promise.all([request("getMeters"), request("getHistory"), request("getTasks", { params: { username: USER?.username || "" } })]).then(([m,h,t]) => {
    meters = m.data || []; history = h.data || h.rows || []; tasks = t.data || [];
    $("sMeters").textContent = meters.length; $("sHist").textContent = history.length; $("sTasks").textContent = tasks.filter(x => x.status !== "SELESAI").length;
    const due = meters.filter(m => m.jatuhTempo && daysUntil(m.jatuhTempo) <= 7).length; $("sDue").textContent = due;
    $("dashAlerts").innerHTML = meters.filter(m => m.jatuhTempo && daysUntil(m.jatuhTempo) <= 7).slice(0,5).map(m => `<div class="alert ${daysUntil(m.jatuhTempo) < 0 ? "danger" : ""}">⚠ <b>${esc(m.nomorMeter)}</b> — ${daysUntil(m.jatuhTempo) < 0 ? "terlambat" : "jatuh tempo " + esc(m.jatuhTempo)}</div>`).join("");
    $("recent").innerHTML = history.slice(0,5).map(x => `<div class="meter-card"><b>${esc(x.nomorMeter)}</b><div>${esc(x.jenis || x.kondisi || "Pemeliharaan")} · ${esc(x.tanggal || x.timestamp || "")}</div></div>`).join("") || '<div class="empty">Belum ada riwayat.</div>';
  }).catch(e => $("recent").innerHTML = '<div class="alert danger">' + esc(e.message) + '</div>');
}

async function loadMeters() {
  $("metersView").innerHTML = `<div class="toolbar"><input class="search" id="meterFilter" placeholder="Filter nomor meter / pelanggan"><button class="secondary" id="refreshMeters">↻</button></div><div id="meterList">Memuat...</div>`;
  $("refreshMeters").onclick = loadMeters;
  try { const r = await request("getMeters"); meters = r.data || []; renderMeterList(); $("meterFilter").oninput = renderMeterList; }
  catch (e) { $("meterList").innerHTML = '<div class="alert danger">' + esc(e.message) + '</div>'; }
}
function renderMeterList() { const q = ($("meterFilter")?.value || "").toLowerCase(); const a = meters.filter(m => JSON.stringify(m).toLowerCase().includes(q)); $("meterList").innerHTML = a.map(meterCard).join("") || '<div class="empty">Belum ada data meter.</div>'; }
function meterCard(m) { const d = m.jatuhTempo ? daysUntil(m.jatuhTempo) : null; const cls = d !== null && d < 0 ? "status-late" : d !== null && d <= 7 ? "status-due" : "status-ok"; return `<div class="meter-card" data-meter="${esc(m.nomorMeter)}"><div class="meter-head"><div><h3>${esc(m.namaPelanggan || "Meter")}</h3><div>${esc(m.nomorMeter || "-")}</div></div><b class="${cls}">● ${d === null ? "Aktif" : d < 0 ? "Terlambat" : d <= 7 ? "Segera" : "Normal"}</b></div><div class="details-grid"><div class="kv"><small>Interval</small><b>${esc(m.intervalHari || 30)} hari</b></div><div class="kv"><small>Jatuh Tempo</small><b>${esc(m.jatuhTempo || "-")}</b></div><div class="kv"><small>Terakhir</small><b>${esc(m.terakhirPemeliharaan || "-")}</b></div><div class="kv"><small>Status</small><b>${esc(m.status || "Aktif")}</b></div></div></div>`; }

function openMeter(m) {
  const h = history.filter(x => String(x.nomorMeter) === String(m.nomorMeter));
  showModal(`<h2>${esc(m.namaPelanggan || "Meter")}</h2><div><b>${esc(m.nomorMeter)}</b></div><div class="details-grid"><div class="kv"><small>ID Pelanggan</small><b>${esc(m.idPelanggan || "-")}</b></div><div class="kv"><small>Alamat</small><b>${esc(m.alamat || "-")}</b></div><div class="kv"><small>Kategori</small><b>${esc(m.kategori || "-")}</b></div><div class="kv"><small>Sub Kategori</small><b>${esc(m.subKategori || "-")}</b></div><div class="kv"><small>Merk</small><b>${esc(m.merk || "-")}</b></div><div class="kv"><small>Status Aset</small><b>${esc(m.status || "Aktif")}</b></div><div class="kv"><small>Interval Pemeliharaan</small><b>${esc(m.intervalHari || 30)} hari</b></div><div class="kv"><small>Pemeliharaan Terakhir</small><b>${esc(m.terakhirPemeliharaan || "-")}</b></div><div class="kv"><small>Jatuh Tempo</small><b>${esc(m.jatuhTempo || "-")}</b></div></div><div class="actions"><button id="meterMaintenance" class="primary">🔧 Pemeliharaan</button>${["SUPER_ADMIN","ADMIN"].includes(USER?.role) ? `<button id="meterInterval" class="secondary">⚙ Atur Interval</button>` : ""}</div><h3>Riwayat Maintenance</h3>${h.map(x => `<div class="meter-card"><b>${esc(x.petugas || "-")}</b><div>${esc(x.keterangan || x.hasilPemeriksaan || x.jenis || "")}</div><small>${esc(x.tanggal || x.timestamp || "")}</small></div>`).join("") || '<div class="empty">Belum ada riwayat.</div>'}`);
  $("meterMaintenance").onclick = () => openMaintenance(m.nomorMeter);
  if ($("meterInterval")) $("meterInterval").onclick = () => intervalForm(m);
}

function intervalForm(m) { showModal(`<h2>Atur Interval Pemeliharaan</h2><div class="form"><label>Nomor Meter<input value="${esc(m.nomorMeter)}" disabled></label><label>Interval (hari)<input id="intervalDays" type="number" min="1" value="${esc(m.intervalHari || 30)}"></label><button id="saveInterval" class="primary">Simpan Interval</button></div>`); $("saveInterval").onclick = async () => { try { const r = await request("updateMeter", { method: "POST", body: { nomorMeter: m.nomorMeter, intervalHari: $("intervalDays").value } }); if (!r.ok) throw Error(r.error); closeModal(); loadMeters(); alert("Interval berhasil diperbarui."); } catch(e) { alert(e.message); } }; }

function renderScan() { $("scanView").innerHTML = `<div class="scan-box"><h2>Scan Barcode / QR Meter</h2><div id="reader" class="scan-reader"></div><div class="actions"><button id="startScan" class="secondary">📷 Mulai Scan</button><button id="stopScan" class="primary-outline">■ Berhenti</button></div><div id="scanResult"></div></div><div class="card"><h2>Input Manual</h2><div class="form"><label>Nomor Meter<input id="manualMeter"></label><button id="manualGo" class="primary">Lanjut</button></div></div>`; $("startScan").onclick = startScanner; $("stopScan").onclick = stopScanner; $("manualGo").onclick = () => openMaintenance($("manualMeter").value.trim()); startScanner(); }
async function startScanner() { try { if (!window.Html5Qrcode) return; await stopScanner(); scanner = new Html5Qrcode("reader"); await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 240, height: 180 } }, text => { stopScanner(); openMaintenance(text); }); } catch(e) { if ($("scanResult")) $("scanResult").innerHTML = '<div class="alert">' + esc(e.message) + '</div>'; } }
async function stopScanner() { try { if (scanner) { await scanner.stop(); scanner.clear(); scanner = null; } } catch (_) {} }

async function openMaintenance(nomor = "") { const m = meters.find(x => String(x.nomorMeter) === String(nomor)) || { nomorMeter: nomor }; showModal(`<h2>Form Pemeliharaan</h2><div class="form"><label>Nomor Meter<input id="fmMeter" value="${esc(m.nomorMeter || "")}"></label><label>ID Pelanggan<input id="fmId" value="${esc(m.idPelanggan || "")}"></label><label>Jenis<select id="fmJenis"><option>Pemeriksaan meter</option><option>Pemeliharaan rutin</option><option>Perbaikan</option><option>Penggantian</option></select></label><label>Kondisi Meter<select id="fmKondisi"><option>Baik</option><option>Rusak</option><option>Perlu Perbaikan</option></select></label><label>Stand Meter<input id="fmStand" type="number"></label><label>Keterangan<textarea id="fmKet"></textarea></label><label>Foto Meter<input id="fmFoto" type="file" accept="image/*" capture="environment"></label><div id="gpsInfo">GPS belum diambil</div><button id="gpsBtn" class="secondary">📍 Ambil GPS</button><button id="saveMaintenanceBtn" class="primary">Simpan Pemeliharaan</button></div>`); $("gpsBtn").onclick = getGPS; $("saveMaintenanceBtn").onclick = saveMaintenance; }
let gps = {};
function getGPS() { navigator.geolocation?.getCurrentPosition(p => { gps = { latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }; $("gpsInfo").textContent = `GPS: ${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)} ±${Math.round(gps.accuracy)}m`; }, e => alert(e.message), { enableHighAccuracy: true, timeout: 15000 }); }
async function saveMaintenance() { const file = $("fmFoto").files[0]; let foto = ""; if (file) foto = await fileToDataUrl(file); const body = { nomorMeter: $("fmMeter").value.trim(), idPelanggan: $("fmId").value.trim(), jenis: $("fmJenis").value, kondisi: $("fmKondisi").value, stand: $("fmStand").value, keterangan: $("fmKet").value, petugas: USER?.name || USER?.username || "", username: USER?.username || "", ...gps, foto }; try { const r = await request("saveMaintenance", { method: "POST", body }); if (!r.ok) throw Error(r.error); closeModal(); alert("Pemeliharaan berhasil disimpan."); navigate("meters"); } catch(e) { alert("Gagal menyimpan: " + e.message); } }
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
