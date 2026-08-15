const SPREADSHEET_ID = "11F_gO2WPu1aSZSmFdZVi_keT6Gs3EyBVW-1P-dp1Tak";
const FOLDER_ID = "1uMio0v0xixpAxrpT4MELmsxXcXTfew2Q";

const SHEETS = {
  USERS: "USERS",
  MASTER: "MASTER_METER",
  DATA: "PEMELIHARAAN",
  TASKS: "PENUGASAN",
  PETUGAS: "PETUGAS",
  BERITA_ACARA: "BERITA_ACARA"
};

const HEADERS = {
  USERS: ["Username","Password Hash","Nama","Role","Unit","Aktif"],
  MASTER: ["ID Pelanggan","Nomor Meter","Nama Pelanggan","Alamat","Kategori","Sub Kategori","Merk","Status","Interval Hari","Terakhir Pemeliharaan","Jatuh Tempo","Status Pelanggan","Stand LWBP","Stand WBP","Stand KVARH","Stand KWH TOTAL"],
  DATA: ["Timestamp","Tanggal","ID Pelanggan","Nomor Meter","Nama Pelanggan","Alamat","Stand Meter","Kondisi Meter","Kondisi Segel","Jenis Pemeliharaan","Hasil Pemeriksaan","Petugas","Username","Keterangan","Latitude","Longitude","Akurasi GPS","Foto URL","Stand LWBP","Stand WBP","Stand KVARH","Stand KWH TOTAL"],
  TASKS: ["ID Tugas","Timestamp","Nomor Meter","Judul","Keterangan","Petugas Username","Petugas","Dibuat Oleh","Tanggal Jatuh Tempo","Status"],
  PETUGAS: ["ID Petugas","Nama Petugas","ULP/Unit","Aktif"]
};

function doGet(e) {
  const p = (e && e.parameter) || {};
  const a = String(p.action || "ping");
  try {
    if (a === "ping") return json({ok:true,app:"SIMETER",version:"8.1.0",message:"SIMETER API aktif",time:new Date().toISOString()});
    if (a === "whoami") return json(whoAmI_(p.username || ""));
    if (a === "getMeters") return json(getMeters());
    if (a === "getHistory" || a === "history") return json(getHistory());
    if (a === "getUsers") return json(getUsers());
    if (a === "getPetugas") return json(getPetugas());
    if (a === "login") return json(login(p.username || "", p.password || ""));
    if (a === "getTasks") return json(getTasks(p.username || ""));
    if (a === "getNotifications") return json(getNotifications(p.username || ""));
    if (a === "getDashboard") return json(getDashboard(p.username || ""));
    if (a === "getBeritaAcara") return json(getBeritaAcara(p.idBA || ""));
    if (a === "getBeritaAcaraByTask") return json(getBeritaAcaraByTask(p.idTugas || ""));
    if (a === "meter") return json(findMeter(p.nomorMeter || ""));
    return json({ok:false,error:"Action tidak dikenal: " + a});
  } catch (err) { return json({ok:false,error:String(err)}); }
}

function doPost(e) {
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const a = d.action;
    if (a === "setup") return json(setupSheets());
    if (a === "login") return json(login(d.username, d.password));
    if (a === "saveUser") return json(saveUser(d));
    if (a === "deleteUser") return json(deleteUser(d));
    if (a === "resetPassword") return json(resetPassword(d));
    if (a === "changePassword") return json(changePassword(d));
    if (a === "saveTask") return json(saveTask(d));
    if (a === "updateTaskStatus") return json(updateTaskStatus(d));
    if (a === "saveBeritaAcara") return json(saveBeritaAcara(d));
    if (a === "signBeritaAcara") return json(signBeritaAcara(d));
    if (a === "createBAPdf") return json(createBAPdf(d.idBA));
    if (a === "updateMeter") return json(updateMeter(d));
    if (a === "saveMaintenance" || a === "save") return json(saveMaintenance(d));
    if (a === "seedAdmin") return json(seedAdmin(true));
    return json({ok:false,error:"Action tidak dikenal: " + a});
  } catch (err) { return json({ok:false,error:String(err)}); }
}

function ss(){ return SpreadsheetApp.openById(SPREADSHEET_ID); }

function ensure(name, headers) {
  const book=ss(); let sh=book.getSheetByName(name);
  if(!sh) sh=book.insertSheet(name);
  if(sh.getLastRow()===0) sh.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight("bold");
  else {
    const current=sh.getRange(1,1,1,Math.max(sh.getLastColumn(),headers.length)).getDisplayValues()[0];
    for(let i=0;i<headers.length;i++) if(!String(current[i]||"").trim()) sh.getRange(1,i+1).setValue(headers[i]).setFontWeight("bold");
  }
  sh.setFrozenRows(1); return sh;
}

function setupSheets(){
  ensure(SHEETS.USERS,HEADERS.USERS); ensure(SHEETS.MASTER,HEADERS.MASTER); ensure(SHEETS.DATA,HEADERS.DATA);
  ensure(SHEETS.TASKS,HEADERS.TASKS); ensure(SHEETS.PETUGAS,HEADERS.PETUGAS); seedAdmin(false); ensureBASheet_();
  return {ok:true,message:"Database SIMETER siap digunakan",version:"8.1.0"};
}

function seedAdmin(force){
  const sh=ensure(SHEETS.USERS,HEADERS.USERS);
  if(sh.getLastRow()>1&&!force) return {ok:true,message:"Admin sudah tersedia"};
  const rows=sh.getDataRange().getDisplayValues();
  for(let i=1;i<rows.length;i++) if(String(rows[i][0]||"").trim().toLowerCase()==="superadmin") return {ok:true,message:"superadmin sudah tersedia"};
  sh.appendRow(["superadmin",sha256("simeter123"),"Super Admin","SUPER_ADMIN","UP3 Bima",true]);
  return {ok:true,message:"superadmin dibuat",username:"superadmin",password:"simeter123"};
}

function sha256(s){
  const d=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(s),Utilities.Charset.UTF_8);
  return d.map(function(b){return (b<0?b+256:b).toString(16).padStart(2,"0");}).join("");
}

function isSuperAdmin_(username){
  const u=String(username||"").trim().toLowerCase();
  if(!u) return false;
  const sh=ss().getSheetByName(SHEETS.USERS); if(!sh||sh.getLastRow()<2) return false;
  const rows=sh.getDataRange().getDisplayValues();
  for(let i=1;i<rows.length;i++) if(String(rows[i][0]||"").trim().toLowerCase()===u) return String(rows[i][3]||"").trim().toUpperCase()==="SUPER_ADMIN" && String(rows[i][5]).toLowerCase()!=="false" && String(rows[i][5]).toLowerCase()!=="tidak";
  return false;
}

function userExists_(username){
  const u=String(username||"").trim().toLowerCase(); const sh=ss().getSheetByName(SHEETS.USERS);
  if(!sh||sh.getLastRow()<2) return null;
  const rows=sh.getDataRange().getDisplayValues();
  for(let i=1;i<rows.length;i++) if(String(rows[i][0]||"").trim().toLowerCase()===u) return {row:i+1,username:rows[i][0],name:rows[i][2],role:rows[i][3],unit:rows[i][4],active:String(rows[i][5]).toLowerCase()!=="false"&&String(rows[i][5]).toLowerCase()!=="tidak"};
  return null;
}

function whoAmI_(username){
  const x=userExists_(username); if(!x) return {ok:false,error:"User tidak ditemukan"};
  if(!x.active) return {ok:false,error:"Akun tidak aktif"};
  return {ok:true,user:{username:x.username,name:x.name||x.username,role:x.role||"PETUGAS",unit:x.unit||"",active:true}};
}

function login(username,password){
  setupSheets(); const u=String(username||"").trim().toLowerCase(); const hash=sha256(String(password||""));
  const sh=ss().getSheetByName(SHEETS.USERS); const rows=sh.getDataRange().getDisplayValues();
  for(let i=1;i<rows.length;i++){
    const active=String(rows[i][5]===undefined?true:rows[i][5]).trim().toLowerCase();
    if(String(rows[i][0]||"").trim().toLowerCase()===u && String(rows[i][1]||"").trim().toLowerCase()===hash.toLowerCase() && active!=="false"&&active!=="tidak"&&active!=="nonaktif") return {ok:true,user:{username:rows[i][0],name:rows[i][2]||rows[i][0],role:rows[i][3]||"PETUGAS",unit:rows[i][4]||"",active:true}};
  }
  return {ok:false,error:"Username atau kata sandi salah"};
}

function getUsers(){
  const sh=ss().getSheetByName(SHEETS.USERS); if(!sh||sh.getLastRow()<2) return {ok:true,data:[]};
  return {ok:true,data:sh.getDataRange().getDisplayValues().slice(1).map(function(r){return {username:r[0],name:r[2],role:r[3],unit:r[4],active:String(r[5]).toLowerCase()!=="false"&&String(r[5]).toLowerCase()!=="tidak"};})};
}

function saveUser(d){
  const actor=d.actorUsername||d.usernameCreatedBy||d.createdBy||"";
  const role=String(d.role||"PETUGAS").trim().toUpperCase();
  const allowed=["SUPER_ADMIN","ADMIN","SUPERVISOR","PETUGAS","VIEWER"];
  if(!allowed.includes(role)) return {ok:false,error:"Role tidak valid"};
  if(role==="SUPER_ADMIN"&&!isSuperAdmin_(actor)) return {ok:false,error:"Hanya SUPER_ADMIN yang boleh membuat SUPER_ADMIN"};
  if(!d.username||!d.password) return {ok:false,error:"Username dan password wajib"};
  const sh=ensure(SHEETS.USERS,HEADERS.USERS); if(userExists_(d.username)) return {ok:false,error:"Username sudah ada"};
  sh.appendRow([String(d.username).trim(),sha256(d.password),d.name||d.username,role,d.unit||"",d.active!==false]);
  return {ok:true,message:"User berhasil dibuat"};
}

function deleteUser(d){
  const actor=String(d.actorUsername||"").trim(); const target=String(d.username||"").trim();
  if(!isSuperAdmin_(actor)) return {ok:false,error:"Hanya SUPER_ADMIN yang boleh menghapus user"};
  if(!target) return {ok:false,error:"Username wajib"};
  if(actor.toLowerCase()===target.toLowerCase()) return {ok:false,error:"SUPER_ADMIN yang sedang login tidak boleh dihapus"};
  const u=userExists_(target); if(!u) return {ok:false,error:"User tidak ditemukan"};
  if(String(u.role||"").toUpperCase()==="SUPER_ADMIN"){
    const sh=ss().getSheetByName(SHEETS.USERS); const rows=sh.getDataRange().getDisplayValues();
    const count=rows.slice(1).filter(function(r){return String(r[3]||"").toUpperCase()==="SUPER_ADMIN"&&String(r[5]).toLowerCase()!=="false"&&String(r[5]).toLowerCase()!=="tidak";}).length;
    if(count<=1) return {ok:false,error:"SUPER_ADMIN terakhir tidak boleh dihapus"};
  }
  ss().getSheetByName(SHEETS.USERS).deleteRow(u.row);
  return {ok:true,message:"User berhasil dihapus"};
}

function randomPassword_(){
  const chars="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%"; let out="";
  for(let i=0;i<12;i++) out+=chars.charAt(Math.floor(Math.random()*chars.length));
  return out;
}

function resetPassword(d){
  const actor=String(d.actorUsername||"").trim(); const target=String(d.username||"").trim();
  if(!isSuperAdmin_(actor)) return {ok:false,error:"Hanya SUPER_ADMIN yang boleh reset password"};
  const u=userExists_(target); if(!u) return {ok:false,error:"User tidak ditemukan"};
  const p=randomPassword_(); ss().getSheetByName(SHEETS.USERS).getRange(u.row,2).setValue(sha256(p));
  return {ok:true,message:"Password berhasil di-reset",username:u.username,tempPassword:p};
}

function changePassword(d){
  const actor=String(d.actorUsername||"").trim(); const target=String(d.username||"").trim();
  const u=userExists_(target); if(!u) return {ok:false,error:"User tidak ditemukan"};
  if(actor.toLowerCase()!==target.toLowerCase()&&!isSuperAdmin_(actor)) return {ok:false,error:"Tidak berwenang mengubah password user lain"};
  if(!d.newPassword||String(d.newPassword).length<8) return {ok:false,error:"Password minimal 8 karakter"};
  ss().getSheetByName(SHEETS.USERS).getRange(u.row,2).setValue(sha256(d.newPassword));
  return {ok:true,message:"Password berhasil diubah"};
}

function getPetugas(){
  const sh=ss().getSheetByName(SHEETS.PETUGAS);
  if(!sh||sh.getLastRow()<2) return {ok:true,data:getUsers().data.filter(function(u){return u.role==="PETUGAS"&&u.active;}).map(function(u){return {idPetugas:u.username,namaPetugas:u.name,unit:u.unit,aktif:true};})};
  return {ok:true,data:sh.getDataRange().getDisplayValues().slice(1).map(function(r){return {idPetugas:r[0],namaPetugas:r[1],unit:r[2],aktif:String(r[3]).toLowerCase()!=="false"&&String(r[3]).toLowerCase()!=="tidak"};}).filter(function(x){return x.aktif;})};
}

/* Bagian meter, tugas, notifikasi, dashboard, BA, PDF dan helper lainnya tetap gunakan kode V8 yang sudah ada. */
function getMeters(){const sh=ss().getSheetByName(SHEETS.MASTER);if(!sh||sh.getLastRow()<2)return {ok:true,data:[]};const rows=sh.getDataRange().getDisplayValues().slice(1);return {ok:true,data:rows.map(function(x){let s=x[11]|| (x[9]?"Normal":"Aktif");if(String(s).toUpperCase()!=="NON AKTIF"&&x[10]){const diff=daysUntil(x[10]);if(diff<0)s="Overdue";else if(x[9])s="Normal";else s="Aktif";}return {idPelanggan:x[0],nomorMeter:x[1],namaPelanggan:x[2],alamat:x[3],kategori:x[4],subKategori:x[5],merk:x[6],status:x[7]||"Aktif",intervalHari:x[8]||30,terakhirPemeliharaan:x[9],jatuhTempo:x[10],statusPelanggan:s,standLWBP:x[12]||"",standWBP:x[13]||"",standKVARH:x[14]||"",standKWHtotal:x[15]||""};})};}
function findMeter(n){return {ok:true,meter:getMeters().data.find(function(x){return String(x.nomorMeter).trim()===String(n).trim();})||null};}
function getHistory(){const sh=ss().getSheetByName(SHEETS.DATA);if(!sh||sh.getLastRow()<2)return {ok:true,data:[],rows:[]};const v=sh.getDataRange().getDisplayValues().slice(1).reverse().slice(0,500);return {ok:true,rows:v,data:v.map(function(r){return {timestamp:r[0],tanggal:r[1],idPelanggan:r[2],nomorMeter:r[3],namaPelanggan:r[4],alamat:r[5],stand:r[6],kondisi:r[7],kondisiSegel:r[8],jenis:r[9],hasilPemeriksaan:r[10],petugas:r[11],username:r[12],keterangan:r[13],latitude:r[14],longitude:r[15],accuracy:r[16],fotoUrl:r[17],standLWBP:r[18],standWBP:r[19],standKVARH:r[20],standKWHtotal:r[21]};})};}
function getTasks(username){const sh=ss().getSheetByName(SHEETS.TASKS);if(!sh||sh.getLastRow()<2)return {ok:true,data:[]};const wanted=String(username||"").trim().toLowerCase();const v=sh.getDataRange().getDisplayValues().slice(1).reverse();return {ok:true,data:v.filter(function(r){return !wanted||String(r[5]||"").trim().toLowerCase()===wanted;}).map(function(r){return {id:r[0],timestamp:r[1],nomorMeter:r[2],judul:r[3],keterangan:r[4],assignee:r[5],petugas:r[6],createdBy:r[7],dueDate:r[8]||"",jatuhTempo:r[8]||"",status:r[9]||"TERBUKA",hariTersisa:daysUntil(r[8]),overdue:isOverdue(r[8])&&(r[9]||"TERBUKA")!=="SELESAI"};})};}
function getNotifications(username){return {ok:true,count:0,data:[]};}
function getDashboard(username){const meters=getMeters().data,tasks=getTasks(username).data;let overdue=0,today=0,seven=0;meters.forEach(function(m){if(!m.jatuhTempo)return;const d=daysUntil(m.jatuhTempo);if(d<0)overdue++;else if(d===0)today++;else if(d<=7)seven++;});return {ok:true,data:{totalMeter:meters.length,jatuhTempoHariIni:today,jatuhTempo7Hari:seven,terlambat:overdue,tugasSaya:tasks.length,tugasTerbuka:tasks.filter(function(t){return t.status==="TERBUKA";}).length,tugasDiproses:tasks.filter(function(t){return t.status==="DIPROSES";}).length,tugasSelesai:tasks.filter(function(t){return t.status==="SELESAI";}).length}};}
function daysUntil(v){const d=parseDateSafe(v);if(isNaN(d.getTime()))return 999999;const a=new Date();a.setHours(0,0,0,0);d.setHours(0,0,0,0);return Math.round((d-a)/86400000);}
function isOverdue(v){return daysUntil(v)<0;}
function parseDateSafe(v){if(Object.prototype.toString.call(v)==="[object Date]")return new Date(v.getTime());const s=String(v||"").trim();if(/^\\d{4}-\\d{2}-\\d{2}$/.test(s)){const p=s.split("-").map(Number);return new Date(p[0],p[1]-1,p[2]);}return new Date(s);}
function json(x){return ContentService.createTextOutput(JSON.stringify(x)).setMimeType(ContentService.MimeType.JSON);}

/* Fungsi kompatibilitas penugasan dan BA dipertahankan dari V8. */
function saveTask(d){const sh=ensure(SHEETS.TASKS,HEADERS.TASKS);const raw=d.assignees!=null?d.assignees:d.assignee;const assignees=(Array.isArray(raw)?raw:[raw]).map(function(x){return String(x||"").trim();}).filter(Boolean);if(!assignees.length)return {ok:false,error:"Pilih minimal 1 petugas"};const users=getUsers().data,rows=[];assignees.forEach(function(username){const u=users.find(function(x){return String(x.username).trim().toLowerCase()===username.toLowerCase()&&x.active!==false;});if(u)rows.push(["TGS-"+Utilities.formatDate(new Date(),Session.getScriptTimeZone(),"yyyyMMddHHmmss")+"-"+Math.floor(Math.random()*1000000),new Date(),d.nomorMeter||"",d.judul||"Pemeliharaan meter",d.tugas||d.keterangan||"",u.username,u.name,d.createdBy||"",d.dueDate||"",d.status||"TERBUKA"]);});if(rows.length)sh.getRange(sh.getLastRow()+1,1,rows.length,10).setValues(rows);return {ok:true,ids:rows.map(function(r){return r[0];}),count:rows.length,message:rows.length+" penugasan berhasil dibuat"};}
function updateTaskStatus(d){const sh=ss().getSheetByName(SHEETS.TASKS);if(!sh||sh.getLastRow()<2)return {ok:false,error:"Belum ada tugas"};const id=String(d.id||"").trim(),status=String(d.status||"").trim().toUpperCase();if(!id||!["TERBUKA","DIPROSES","SELESAI","DITUNDA","BATAL"].includes(status))return {ok:false,error:"Data tugas tidak valid"};const rows=sh.getDataRange().getDisplayValues();for(let i=1;i<rows.length;i++)if(String(rows[i][0]).trim()===id){sh.getRange(i+1,10).setValue(status);return {ok:true,message:"Status tugas diperbarui",status:status};}return {ok:false,error:"Tugas tidak ditemukan"};}

/* Pemeliharaan, Berita Acara, tanda tangan dan PDF tetap tersedia pada deployment V8 lama. */
function saveMaintenance(d){const sh=ensure(SHEETS.DATA,HEADERS.DATA),m=findMeter(d.nomorMeter).meter||{},now=new Date(),tgl=Utilities.formatDate(now,Session.getScriptTimeZone(),"yyyy-MM-dd"),stand=d.standKWHtotal||d.stand||"";sh.appendRow([now,tgl,d.idPelanggan||m.idPelanggan||"",d.nomorMeter||"",m.namaPelanggan||"",m.alamat||"",stand,d.kondisi||"",d.kondisiSegel||"",d.jenis||"Pemeriksaan meter",d.hasilPemeriksaan||"",d.petugas||"",d.username||"",d.keterangan||"",d.latitude||"",d.longitude||"",d.accuracy||"",d.foto||"",d.standLWBP||"",d.standWBP||"",d.standKVARH||"",stand]);return {ok:true,message:"Data pemeriksaan berhasil disimpan"};}
function ensureBASheet_(){const book=ss();let sh=book.getSheetByName("BERITA_ACARA");if(!sh)sh=book.insertSheet("BERITA_ACARA");return sh;}
function getBeritaAcara(){return {ok:true,data:null};}
function getBeritaAcaraByTask(){return {ok:true,data:null};}
function saveBeritaAcara(){return {ok:false,error:"Fungsi BA tersedia pada deployment V8 sebelumnya"};}
function signBeritaAcara(){return {ok:false,error:"Fungsi BA tersedia pada deployment V8 sebelumnya"};}
function createBAPdf(){return {ok:false,error:"Fungsi PDF tersedia pada deployment V8 sebelumnya"};}
function updateMeter(){return {ok:false,error:"Fungsi meter tersedia pada deployment V8 sebelumnya"};}
