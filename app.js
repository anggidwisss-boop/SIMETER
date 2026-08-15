const $ = id => document.getElementById(id);
const APP_VERSION = "8.0.1";
let API = localStorage.getItem("simeter_api_url") || "";
let USER = null, meters = [], tasks = [], history = [], currentPage = "dashboard", scanner = null;

window.addEventListener("DOMContentLoaded", () => {
  const modal = $("modal");
  if (modal) {
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    modal.style.setProperty("display", "none", "important");
  }
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
  // Aktivitas terbaru sekarang dapat disentuh/diklik untuk membuka detail lengkap.
  document.addEventListener("click", e => {
    const card = e.target.closest("#recent .meter-card");
    if (!card || !Array.isArray(history)) return;
    const cards = [...card.parentElement.querySelectorAll(":scope > .meter-card")];
    const index = cards.indexOf(card);
    if (index >= 0 && history[index]) openHistoryDetail(history[index]);
  });
  try {
    const saved = localStorage.getItem("simeter_user");
    if (saved) {
      const u = JSON.parse(saved);
      if (u && u.username) {
        u.role = u.role || "PETUGAS";
        USER = u;
        showMain();
        checkBackendAfterRestore();
      }
    }
  } catch (_) {
    localStorage.removeItem("simeter_user");
    USER = null;
  }
});

async function checkBackendAfterRestore() {
  if (!API || !USER) return;
  try {
    const x = await request("ping", {timeout:10000});
    if (!x || !x.ok || x.app !== "SIMETER") throw new Error("Backend bukan API SIMETER");
    localStorage.setItem("simeter_backend_version", String(x.version || ""));
    if (String(x.version || "").split(".")[0] !== "8") console.warn("SIMETER backend version:", x.version);
  } catch (e) { console.warn("Backend belum terhubung setelah refresh:", e); }
}

async function saveApi() {
  API = $("apiUrl").value.trim().replace(/\/+$/, "");
  localStorage.setItem("simeter_api_url", API);
  if (!API) return setLoginMsg("URL Web App belum diisi.");
  setLoginMsg("Mengecek koneksi...");
  try {
    const x = await request("ping");
    if (x && x.ok && x.app === "SIMETER") setLoginMsg("SIMETER API aktif" + (x.version ? " · v" + x.version : ""));
    else setLoginMsg("API merespons, tetapi bukan API SIMETER.");
  } catch (e) {
    setLoginMsg(e?.name === "AbortError" ? "Koneksi API timeout. Pastikan URL /exec benar." : (e.message || "Koneksi gagal"));
  }
}

async function request(action, opts = {}) {
  if (!API) throw new Error("URL Web App belum diisi");
  const method = opts.method || "GET";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeout || 20000);
  try {
    if (method === "GET") {
      const qs = new URLSearchParams(opts.params || {});
      qs.set("action", action); qs.set("v", APP_VERSION);
      if (USER?.username && !qs.has("username")) qs.set("username", USER.username);
      if (USER?.role && !qs.has("role")) qs.set("role", USER.role);
      const r = await fetch(API + "?" + qs.toString(), {cache:"no-store",redirect:"follow",signal:controller.signal});
      const t = await r.text();
      try { return JSON.parse(t); } catch (_) { throw new Error("Respons API bukan JSON. Pastikan Web App Apps Script menggunakan URL /exec."); }
    }
    const r = await fetch(API, {method:"POST",redirect:"follow",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action,username:USER?.username||"",role:USER?.role||"",...(opts.body||{}),_v:APP_VERSION}),cache:"no-store",signal:controller.signal});
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
async function testPing(){ try { const x = await request("ping"); return !!x.ok && x.app === "SIMETER"; } catch (_) { return false; } }
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
  showModal(`<h2>Menu Lainnya</h2><div class="actions menu-actions">${isAdmin ? `<button class="secondary" id="modalAdmin">🛡️ Admin</button>` : ""}<button class="secondary" id="modalProfile">👤 Profil</button><button class="secondary" id="modalSettings">⚙ Pengaturan</button></div>`);
  if ($("modalAdmin")) $("modalAdmin").onclick = () => { closeModal(); navigate("admin"); };
  $("modalProfile").onclick = () => { closeModal(); navigate("profile"); };
  $("modalSettings").onclick = () => { closeModal(); navigate("settings"); };
}
function renderProfile() { $("profileView").innerHTML = `<div class="card"><h2>Profil</h2><div class="details-grid"><div class="kv"><small>Nama</small><b>${esc(USER?.name)}</b></div><div class="kv"><small>Username</small><b>${esc(USER?.username)}</b></div><div class="kv"><small>Role</small><b>${esc(USER?.role)}</b></div><div class="kv"><small>Unit</small><b>${esc(USER?.unit || "-")}</b></div></div></div>`; }
function renderSettings() { $("settingsView").innerHTML = `<div class="card"><h2>Koneksi</h2><label>URL Web App<input id="apiEdit" value="${esc(API)}"></label><button id="saveApi2" class="primary">Simpan & Tes Koneksi</button><div id="settingsMsg" class="msg"></div></div>`; $("saveApi2").onclick = async () => { API = $("apiEdit").value.trim().replace(/\/+$/, ""); localStorage.setItem("simeter_api_url", API); $("settingsMsg").textContent = (await testPing()) ? "SIMETER API aktif" : "Koneksi gagal"; }; }
function openAdmin() { hideViews(); $("adminView").hidden = false; $("pageTitle").textContent = "Administrasi"; $("adminView").innerHTML = `<div class="pill-tabs"><button id="tabUsers" class="active">Pengguna</button><button id="tabTasks">Penugasan</button></div><div id="adminContent"></div>`; $("tabUsers").onclick = () => { $("tabUsers").classList.add("active"); $("tabTasks").classList.remove("active"); renderUsersAdmin(); }; $("tabTasks").onclick = () => { $("tabTasks").classList.add("active"); $("tabUsers").classList.remove("active"); renderAdminTasks(); }; renderUsersAdmin(); }
async function renderUsersAdmin() { $("adminContent").innerHTML = `<div class="card"><h2>Kelola Pengguna</h2><button id="addUserBtn" class="primary">+ Tambah User</button><div id="usersList" class="list">Memuat...</div></div>`; $("addUserBtn").onclick = userForm; loadUsers(); }
async function loadUsers() { try { const r = await request("getUsers"); $("usersList").innerHTML = (r.data || []).map(u => `<div class="meter-card"><b>${esc(u.name)}</b><div>${esc(u.username)} · ${esc(u.role)} · ${esc(u.unit || "-")}</div></div>`).join("") || '<div class="empty">Belum ada user</div>'; } catch (e) { $("usersList").innerHTML = '<div class="alert danger">' + esc(e.message) + '</div>'; } }
function userForm() { showModal(`<h2>Tambah User</h2><div class="form"><label>Username<input id="nu"></label><label>Nama<input id="nn"></label><label>Kata sandi<input id="np" type="password"></label><label>Role<select id="nr"><option>PETUGAS</option><option>ADMIN</option><option>SUPERVISOR</option><option>VIEWER</option></select></label><label>Unit<input id="nunit"></label><button id="createUserBtn" class="primary">Simpan</button></div>`); $("createUserBtn").onclick = createUser; }
async function createUser() { try { const r = await request("saveUser", { method: "POST", body: { username: $("nu").value, name: $("nn").value, password: $("np").value, role: $("nr").value, unit: $("nunit").value, active: true } }); if (!r.ok) throw Error(r.error); closeModal(); loadUsers(); } catch (e) { alert(e.message); } }

async function renderDashboard() {
  $("dashboard").innerHTML = `<div class="grid"><div class="stat"><small>Total Meter</small><b id="sMeters">…</b></div><div class="stat"><small>Pemeliharaan</small><b id="sHist">…</b></div><div class="stat"><small>Jatuh Tempo</small><b id="sDue">…</b></div><div class="stat"><small>Tugas Terbuka</small><b id="sTasks">…</b></div></div><div id="dashAlerts" style="margin-top:14px"></div><div class="card"><h2>Aktivitas Terbaru</h2><div id="recent">Memuat...</div></div>`;
  const recent = $("recent");
  try {
    if (!API) throw Error("URL Web App belum diisi. Buka Pengaturan → Koneksi.");
    const [m,h,t] = await Promise.all([request("getMeters", {params:{username:USER?.username||""},timeout:20000}),request("getHistory", {params:{username:USER?.username||""},timeout:20000}),request("getTasks", {params:{username:USER?.username||""},timeout:20000})]);
    if (!m || !m.ok) throw Error(m?.error || "Gagal mengambil data meter.");
    if (!h || !h.ok) throw Error(h?.error || "Gagal mengambil riwayat pemeliharaan.");
    if (!t || !t.ok) throw Error(t?.error || "Gagal mengambil penugasan.");
    meters = Array.isArray(m.data) ? m.data : [];
    history = Array.isArray(h.data) ? h.data : (Array.isArray(h.rows) ? h.rows : []);
    tasks = Array.isArray(t.data) ? t.data : [];
    $("sMeters").textContent = meters.length;
    $("sHist").textContent = history.length;
    $("sTasks").textContent = tasks.filter(x => !["SELESAI","BATAL"].includes(String(x.status||"").toUpperCase())).length;
    const due = meters.filter(x => x.jatuhTempo && daysUntil(x.jatuhTempo) <= 7);
    $("sDue").textContent = due.length;
    $("dashAlerts").innerHTML = due.slice(0,8).map(x => `<div class="alert ${daysUntil(x.jatuhTempo)<0?"danger":""}">⚠ <b>${esc(x.nomorMeter||"")}</b> — ${daysUntil(x.jatuhTempo)<0 ? "terlambat " + Math.abs(daysUntil(x.jatuhTempo)) + " hari" : "jatuh tempo " + esc(x.jatuhTempo)}</div>`).join("");
    recent.innerHTML = history.slice(0,5).map(x => `<div class="meter-card recent-activity-item" role="button" tabindex="0" aria-label="Buka detail aktivitas"><b>${esc(x.nomorMeter || x[3] || "-")}</b><div>${esc(x.jenis || x.kondisi || x[9] || "Pemeliharaan")} · ${esc(x.tanggal || x.timestamp || x[1] || "")}</div><small class="tap-hint">👆 Sentuh untuk melihat detail</small></div>`).join("") || '<div class="empty">Belum ada riwayat.</div>';
  } catch(e) {
    $("sMeters").textContent = "—"; $("sHist").textContent = "—"; $("sDue").textContent = "—"; $("sTasks").textContent = "—";
    recent.innerHTML = `<div class="alert danger"><b>Data belum dapat dimuat.</b><br>${esc(e.message || "Koneksi API gagal")}</div><button class="secondary" onclick="navigate('settings')">⚙ Periksa Koneksi</button>`;
  }
}

function historyValue(x, keys, index) {
  if (Array.isArray(x) && index != null && x[index] != null && String(x[index]).trim() !== "") return x[index];
  if (!Array.isArray(x)) {
    for (const k of keys) if (x && x[k] != null && String(x[k]).trim() !== "") return x[k];
  }
  return "-";
}
function historyDetailRow(label, value) { return `<div class="kv"><small>${esc(label)}</small><b>${esc(value)}</b></div>`; }
function openHistoryDetail(x) {
  if (!x) return;
  const nomor = historyValue(x,["nomorMeter","meter","noMeter","nomor"],3);
  const tanggal = historyValue(x,["tanggal","timestamp","date","waktu"],1);
  const jenis = historyValue(x,["jenis","jenisPemeliharaan","kegiatan","activity"],null);
  const kondisi = historyValue(x,["kondisi","hasilPemeriksaan","statusMeter","hasil"],9);
  const petugas = historyValue(x,["petugas","namaPetugas","user","username"],null);
  const idPel = historyValue(x,["idPelanggan","idPLN","idCustomer"],null);
  const keterangan = historyValue(x,["keterangan","catatan","deskripsi","notes"],null);
  const lwbp = historyValue(x,["standLWBP","lwbp"],null);
  const wbp = historyValue(x,["standWBP","wbp"],null);
  const kvarh = historyValue(x,["standKVARH","kvarh"],null);
  const kwh = historyValue(x,["standKWHtotal","standKWH","stand","kwh"],null);
  const lat = historyValue(x,["latitude","lat"],null);
  const lng = historyValue(x,["longitude","lng","lon"],null);
  const accuracy = historyValue(x,["accuracy","gpsAccuracy"],null);
  const foto = historyValue(x,["foto","fotoUrl","photo","photoUrl"],null);
  showModal(`<h2>Detail Aktivitas</h2><div class="activity-detail-title"><b>${esc(jenis)}</b><span>${esc(tanggal)}</span></div><div class="details-grid">${historyDetailRow("Nomor Meter",nomor)}${historyDetailRow("ID Pelanggan",idPel)}${historyDetailRow("Jenis Kegiatan",jenis)}${historyDetailRow("Kondisi / Hasil",kondisi)}${historyDetailRow("Petugas",petugas)}${historyDetailRow("Stand LWBP",lwbp)}${historyDetailRow("Stand WBP",wbp)}${historyDetailRow("Stand KVARH",kvarh)}${historyDetailRow("Stand KWH TOTAL",kwh)}${historyDetailRow("Tanggal / Waktu",tanggal)}${historyDetailRow("Latitude",lat)}${historyDetailRow("Longitude",lng)}${historyDetailRow("Akurasi GPS",accuracy)}</div><div class="activity-note"><small>Keterangan</small><div>${esc(keterangan)}</div></div>${foto && String(foto) !== "-" ? `<div class="activity-photo"><small>Foto Meter</small><img src="${esc(foto)}" alt="Foto meter" loading="lazy" onerror="this.parentElement.style.display='none'"></div>` : ""}`);
}

async function loadMeters() {
  $("metersView").innerHTML = `<div class="toolbar"><input class="search" id="meterFilter" placeholder="Filter nomor meter / pelanggan"><button class="secondary" id="refreshMeters">↻</button></div><div id="meterList">Memuat...</div>`;
  $("refreshMeters").onclick = loadMeters;
  try { const r = await request("getMeters"); meters = r.data || []; renderMeterList(); $("meterFilter").oninput = renderMeterList; }
  catch (e) { $("meterList").innerHTML = '<div class="alert danger">' + esc(e.message) + '</div>'; }
}
function renderMeterList() { const q = ($("meterFilter")?.value || "").toLowerCase(); const a = meters.filter(m => JSON.stringify(m).toLowerCase().includes(q)); $("meterList").innerHTML = a.map(meterCard).join("") || '<div class="empty">Belum ada data meter.</div>'; }
function customerStatus(m) { const raw = String(m.statusPelanggan || "").trim(); if (raw.toUpperCase() === "NON AKTIF") return "Non Aktif"; if (m.jatuhTempo && daysUntil(m.jatuhTempo) < 0) return "Overdue"; if (m.terakhirPemeliharaan) return "Normal"; return raw || "Aktif"; }
function statusClass(status) { return status === "Overdue" ? "status-late" : status === "Normal" ? "status-ok" : status === "Non Aktif" ? "status-late" : "status-due"; }
function meterCard(m) { const st = customerStatus(m); return `<div class="meter-card" data-meter="${esc(m.nomorMeter)}"><div class="meter-head"><div><h3>${esc(m.namaPelanggan || "Meter")}</h3><div>${esc(m.nomorMeter || "-")}</div></div><b class="${statusClass(st)}">● ${esc(st)}</b></div><div class="details-grid"><div class="kv"><small>Interval Pemeliharaan</small><b>${esc(m.intervalHari || 30)} hari</b></div><div class="kv"><small>Jatuh Tempo</small><b>${esc(m.jatuhTempo || "-")}</b></div><div class="kv"><small>Pemeliharaan Terakhir</small><b>${esc(m.terakhirPemeliharaan || "-")}</b></div><div class="kv"><small>Status Pelanggan</small><b>${esc(st)}</b></div></div></div>`; }

function openMeter(m) { const h = history.filter(x => String(x.nomorMeter) === String(m.nomorMeter)); const st = customerStatus(m); showModal(`<h2>${esc(m.namaPelanggan || "Meter")}</h2><div><b>${esc(m.nomorMeter)}</b></div><div class="details-grid"><div class="kv"><small>ID Pelanggan</small><b>${esc(m.idPelanggan || "-")}</b></div><div class="kv"><small>Alamat</small><b>${esc(m.alamat || "-")}</b></div><div class="kv"><small>Kategori</small><b>${esc(m.kategori || "-")}</b></div><div class="kv"><small>Sub Kategori</small><b>${esc(m.subKategori || "-")}</b></div><div class="kv"><small>Merk</small><b>${esc(m.merk || "-")}</b></div><div class="kv"><small>Status Pelanggan</small><b class="${statusClass(st)}">● ${esc(st)}</b></div><div class="kv"><small>Status Aset</small><b>${esc(m.status || "Aktif")}</b></div><div class="kv"><small>Interval Pemeliharaan</small><b>${esc(m.intervalHari || 30)} hari</b></div><div class="kv"><small>Pemeliharaan Terakhir</small><b>${esc(m.terakhirPemeliharaan || "-")}</b></div><div class="kv"><small>Jatuh Tempo</small><b>${esc(m.jatuhTempo || "-")}</b></div><div class="kv"><small>Stand LWBP</small><b>${esc(m.standLWBP || "-")}</b></div><div class="kv"><small>Stand WBP</small><b>${esc(m.standWBP || "-")}</b></div><div class="kv"><small>Stand KVARH</small><b>${esc(m.standKVARH || "-")}</b></div><div class="kv"><small>Stand KWH TOTAL</small><b>${esc(m.standKWHtotal || "-")}</b></div></div><div class="actions"><button id="meterMaintenance" class="primary">🔧 Pemeliharaan</button>${["SUPER_ADMIN","ADMIN"].includes(USER?.role) ? `<button id="meterInterval" class="secondary">⚙ Pengaturan</button>` : ""}</div><h3>Riwayat Maintenance</h3>${h.map(x => `<div class="meter-card"><b>${esc(x.petugas || "-")}</b><div>${esc(x.keterangan || x.hasilPemeriksaan || x.jenis || "")}</div><div class="meta">LWBP ${esc(x.standLWBP || "-")} · WBP ${esc(x.standWBP || "-")} · KVARH ${esc(x.standKVARH || "-")} · KWH TOTAL ${esc(x.standKWHtotal || x.stand || "-")}</div><small>${esc(x.tanggal || x.timestamp || "")}</small></div>`).join("") || '<div class="empty">Belum ada riwayat.</div>'}`); $("meterMaintenance").onclick = () => openMaintenance(m.nomorMeter); if ($("meterInterval")) $("meterInterval").onclick = () => intervalForm(m); }
function intervalForm(m) { const st = customerStatus(m); showModal(`<h2>Pengaturan Meter</h2><div class="form"><label>Nomor Meter<input value="${esc(m.nomorMeter)}" disabled></label><label>Status Pelanggan<select id="customerStatus"><option ${st==='Aktif'?'selected':''}>Aktif</option><option ${st==='Non Aktif'?'selected':''}>Non Aktif</option><option ${st==='Normal'?'selected':''}>Normal</option><option ${st==='Overdue'?'selected':''}>Overdue</option></select></label><label>Interval Pemeliharaan<select id="intervalDays"><option value="30" ${String(m.intervalHari||30)==='30'?'selected':''}>30 hari</option><option value="60" ${String(m.intervalHari)==='60'?'selected':''}>60 hari</option><option value="90" ${String(m.intervalHari)==='90'?'selected':''}>90 hari</option></select></label><button id="saveInterval" class="primary">Simpan Pengaturan</button></div>`); $("saveInterval").onclick = async () => { try { const r = await request("updateMeter", { method:"POST", body:{nomorMeter:m.nomorMeter, intervalHari:$("intervalDays").value, statusPelanggan:$("customerStatus").value} }); if(!r.ok) throw Error(r.error); closeModal(); await loadMeters(); alert("Pengaturan berhasil diperbarui."); } catch(e){ alert(e.message); } }; }
function renderScan() { $("scanView").innerHTML = `<div class="scan-box"><h2>Scan Barcode / QR Meter</h2><div id="reader" class="scan-reader"></div><div class="actions"><button id="startScan" class="secondary">📷 Mulai Scan</button><button id="stopScan" class="primary-outline">■ Berhenti</button></div><div id="scanResult"></div></div><div class="card"><h2>Input Manual</h2><div class="form"><label>Nomor Meter<input id="manualMeter"></label><button id="manualGo" class="primary">Lanjut</button></div></div>`; $("startScan").onclick = startScanner; $("stopScan").onclick = stopScanner; $("manualGo").onclick = () => openMaintenance($("manualMeter").value.trim()); startScanner(); }
async function startScanner() { try { if (!window.Html5Qrcode) return; await stopScanner(); scanner = new Html5Qrcode("reader"); await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 240, height: 180 } }, text => { stopScanner(); openMaintenance(text); }); } catch(e) { if ($("scanResult")) $("scanResult").innerHTML = '<div class="alert">' + esc(e.message) + '</div>'; } }
async function stopScanner() { try { if (scanner) { await scanner.stop(); scanner.clear(); scanner = null; } } catch (_) {} }
async function openMaintenance(nomor = "") { const m = meters.find(x => String(x.nomorMeter) === String(nomor)) || { nomorMeter: nomor }; showModal(`<h2>Form Pemeliharaan</h2><div class="form"><label>Nomor Meter<input id="fmMeter" value="${esc(m.nomorMeter || "")}"></label><label>ID Pelanggan<input id="fmId" value="${esc(m.idPelanggan || "")}"></label><label>Jenis<select id="fmJenis"><option>Pemeriksaan meter</option><option>Pemeliharaan rutin</option><option>Perbaikan</option><option>Penggantian</option></select></label><label>Kondisi Meter<select id="fmKondisi"><option>Baik</option><option>Rusak</option><option>Perlu Perbaikan</option></select></label><div class="form-row"><label>Stand LWBP<input id="fmLWBP" type="number" inputmode="decimal" step="any" value="${esc(m.standLWBP || "")}"></label><label>Stand WBP<input id="fmWBP" type="number" inputmode="decimal" step="any" value="${esc(m.standWBP || "")}"></label></div><div class="form-row"><label>Stand KVARH<input id="fmKVARH" type="number" inputmode="decimal" step="any" value="${esc(m.standKVARH || "")}"></label><label>Stand KWH TOTAL<input id="fmKWH" type="number" inputmode="decimal" step="any" value="${esc(m.standKWHtotal || "")}"></label></div><label>Keterangan<textarea id="fmKet"></textarea></label><label>Foto Meter<input id="fmFoto" type="file" accept="image/*" capture="environment"></label><div id="gpsInfo">GPS belum diambil</div><button id="gpsBtn" class="secondary">📍 Ambil GPS</button><button id="saveMaintenanceBtn" class="primary">Simpan Pemeliharaan</button></div>`); $("gpsBtn").onclick = getGPS; $("saveMaintenanceBtn").onclick = saveMaintenance; }
let gps = {};
function getGPS() { navigator.geolocation?.getCurrentPosition(p => { gps = { latitude:p.coords.latitude, longitude:p.coords.longitude, accuracy:p.coords.accuracy }; $("gpsInfo").textContent = `GPS: ${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)} ±${Math.round(gps.accuracy)}m`; }, e => alert(e.message), {enableHighAccuracy:true,timeout:15000}); }
async function saveMaintenance() { const file=$("fmFoto").files[0]; let foto=""; if(file) foto=await fileToDataUrl(file); const standKWHtotal=$("fmKWH").value; const body={nomorMeter:$("fmMeter").value.trim(),idPelanggan:$("fmId").value.trim(),jenis:$("fmJenis").value,kondisi:$("fmKondisi").value,stand:standKWHtotal,standLWBP:$("fmLWBP").value,standWBP:$("fmWBP").value,standKVARH:$("fmKVARH").value,standKWHtotal:standKWHtotal,keterangan:$("fmKet").value,petugas:USER?.name||USER?.username||"",username:USER?.username||"",...gps,foto}; try { const r=await request("saveMaintenance",{method:"POST",body}); if(!r.ok) throw Error(r.error); closeModal(); alert("Pemeliharaan berhasil disimpan. Status pelanggan menjadi NORMAL dan jatuh tempo dihitung ulang."); navigate("meters"); } catch(e){ alert("Gagal menyimpan: "+e.message); } }
function fileToDataUrl(f) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); }); }

async function loadTasks() { $("tasksView").innerHTML = `<div class="toolbar">${["SUPER_ADMIN","ADMIN","SUPERVISOR"].includes(USER?.role) ? `<button id="newTaskBtn" class="primary">+ Penugasan Baru</button>` : ""}<button id="refreshTasks" class="secondary">↻</button></div><div id="taskList">Memuat...</div>`; if ($("newTaskBtn")) $("newTaskBtn").onclick = newTask; $("refreshTasks").onclick = loadTasks; try { const params = ["SUPER_ADMIN","ADMIN","SUPERVISOR"].includes(USER?.role) ? {} : { username: USER?.username || "" }; const r = await request("getTasks", { params }); if (!r || !r.ok) throw Error(r?.error || "Gagal memuat tugas."); tasks = r.data || []; $("taskList").innerHTML = tasks.map(taskCard).join("") || '<div class="empty">Belum ada tugas.</div>'; } catch(e){ $("taskList").innerHTML='<div class="alert danger">'+esc(e.message)+'</div>'; } }
function taskCard(t) { const s=String(t.status||"OPEN").toUpperCase(); return `<div class="task"><div class="meter-head"><div><b>${esc(t.nomorMeter||t.meter||"-")}</b><div class="meta">${esc(t.judul||t.jenis||"Penugasan")}</div></div><b class="badge">${esc(s)}</b></div><div>${esc(t.petugas||t.assignee||"-")}</div><small>${esc(t.deadline||t.jatuhTempo||"")}</small></div>`; }
function newTask() { showModal(`<h2>Penugasan Baru</h2><div class="form"><label>Nomor Meter<input id="tnm"></label><label>Judul<input id="tjudul"></label><label>Petugas<input id="tpetugas"></label><label>Deadline<input id="tdeadline" type="date"></label><button id="saveTaskBtn" class="primary">Simpan</button></div>`); $("saveTaskBtn").onclick=async()=>{try{const r=await request("saveTask",{method:"POST",body:{nomorMeter:$("tnm").value,judul:$("tjudul").value,petugas:$("tpetugas").value,deadline:$("tdeadline").value,status:"OPEN"}});if(!r.ok)throw Error(r.error);closeModal();loadTasks();}catch(e){alert(e.message)}}; }
function showNotifications(){ showModal(`<h2>Notifikasi</h2><div class="empty">Belum ada notifikasi baru.</div>`); }
function showModal(html) { const m=$("modal"); $("modalBody").innerHTML=html; m.hidden=false; m.setAttribute("aria-hidden","false"); m.style.setProperty("display","flex","important"); }
function closeModal(){ const m=$("modal"); if(!m)return; m.hidden=true; m.setAttribute("aria-hidden","true"); m.style.setProperty("display","none","important"); }
function daysUntil(d){ const x=new Date(d); if(isNaN(x))return 99999; const now=new Date(); now.setHours(0,0,0,0); x.setHours(0,0,0,0); return Math.ceil((x-now)/86400000); }
function esc(v){ return String(v==null?"":v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c])); }
