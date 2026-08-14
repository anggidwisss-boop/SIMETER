const SPREADSHEET_ID="11F_gO2WPu1aSZSmFdZVi_keT6Gs3EyBVW-1P-dp1Tak";
const FOLDER_ID="1uMio0v0xixpAxrpT4MELmsxXcXTfew2Q";
const SHEETS={USERS:"USERS",MASTER:"MASTER_METER",DATA:"PEMELIHARAAN",TASKS:"PENUGASAN",PETUGAS:"PETUGAS"};

function doGet(e){
  const p=e?.parameter||{}, a=p.action||"ping";
  try{
    if(a==="ping")return json({ok:true,app:"SIMETER",version:"4.0.0",message:"SIMETER API aktif",time:new Date().toISOString()});
    if(a==="getMeters")return json(getMeters());
    if(a==="getHistory"||a==="history")return json(getHistory());
    if(a==="getUsers")return json(getUsers());
    if(a==="login")return json(login(String(p.username||""),String(p.password||"")));
    if(a==="getTasks")return json(getTasks(p.username||""));
    if(a==="meter")return json(findMeter(p.nomorMeter||""));
    return json({ok:false,error:"Action tidak dikenal: "+a});
  }catch(err){return json({ok:false,error:String(err)})}
}
function doPost(e){
  try{
    const d=JSON.parse(e?.postData?.contents||"{}"),a=d.action;
    if(a==="setup")return json(setupSheets());
    if(a==="login")return json(login(d.username,d.password));
    if(a==="saveUser")return json(saveUser(d));
    if(a==="saveTask")return json(saveTask(d));
    if(a==="updateMeter")return json(updateMeter(d));
    if(a==="saveMaintenance"||a==="save")return json(saveMaintenance(d));
    return json({ok:false,error:"Action tidak dikenal: "+a});
  }catch(err){return json({ok:false,error:String(err)})}
}
function ss(){return SpreadsheetApp.openById(SPREADSHEET_ID)}
function ensure(name,headers){
  const s=ss();let sh=s.getSheetByName(name);if(!sh)sh=s.insertSheet(name);
  if(sh.getLastRow()===0)sh.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight("bold");
  sh.setFrozenRows(1);return sh;
}
function setupSheets(){
  ensure(SHEETS.USERS,["Username","Nama","Password Hash","Role","Unit","Aktif"]);
  ensure(SHEETS.MASTER,["ID Pelanggan","Nomor Meter","Nama Pelanggan","Alamat","Kategori","Sub Kategori","Merk","Status","Interval Hari","Terakhir Pemeliharaan","Jatuh Tempo"]);
  ensure(SHEETS.DATA,["Timestamp","Tanggal","ID Pelanggan","Nomor Meter","Nama Pelanggan","Alamat","Stand Meter","Kondisi Meter","Kondisi Segel","Jenis Pemeliharaan","Hasil Pemeriksaan","Petugas","Username","Keterangan","Latitude","Longitude","Akurasi GPS","Foto URL"]);
  ensure(SHEETS.TASKS,["ID Tugas","Timestamp","Nomor Meter","Judul","Keterangan","Petugas Username","Petugas","Dibuat Oleh","Tanggal Jatuh Tempo","Status"]);
  ensure(SHEETS.PETUGAS,["ID Petugas","Nama Petugas","ULP/Unit","Aktif"]);
  seedAdmin();
  return {ok:true,message:"Database SIMETER siap digunakan"};
}
function seedAdmin(){
  const sh=ss().getSheetByName(SHEETS.USERS);if(sh.getLastRow()>1)return;
  sh.appendRow(["superadmin","Super Admin",sha256("simeter123"),"SUPER_ADMIN","",true]);
}
function sha256(s){const d=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(s),Utilities.Charset.UTF_8);return d.map(b=>(b<0?b+256:b).toString(16).padStart(2,"0")).join("")}
function login(username,password){
  setupSheets();
  const u=String(username||"").trim().toLowerCase();
  const hash=sha256(String(password||""));
  const rows=ss().getSheetByName(SHEETS.USERS).getDataRange().getDisplayValues();
  for(let i=1;i<rows.length;i++){
    const active=String(rows[i][5]===undefined?true:rows[i][5]).trim().toLowerCase()!=="false";
    if(String(rows[i][0]||"").trim().toLowerCase()===u && String(rows[i][2]||"").trim().toLowerCase()===hash && active){
      return {ok:true,user:{username:String(rows[i][0]).trim(),name:String(rows[i][1]||rows[i][0]).trim(),role:String(rows[i][3]||"PETUGAS").trim(),unit:String(rows[i][4]||"").trim()}};
    }
  }
  return {ok:false,error:"Username atau kata sandi salah"};
}
function getUsers(){const sh=ss().getSheetByName(SHEETS.USERS);if(!sh||sh.getLastRow()<2)return{ok:true,data:[]};return{ok:true,data:sh.getDataRange().getDisplayValues().slice(1).map(r=>({username:r[0],name:r[1],role:r[3],unit:r[4],active:String(r[5]).toLowerCase()!=="false"}))}}
function saveUser(d){const sh=ensure(SHEETS.USERS,["Username","Nama","Password Hash","Role","Unit","Aktif"]);if(!d.username||!d.password)return{ok:false,error:"Username dan password wajib"};const rows=sh.getDataRange().getDisplayValues();for(let i=1;i<rows.length;i++)if(rows[i][0]===d.username)return{ok:false,error:"Username sudah ada"};sh.appendRow([d.username,d.name||d.username,sha256(d.password),d.role||"PETUGAS",d.unit||"",d.active!==false]);return{ok:true}}
function getMeters(){
  const sh=ss().getSheetByName(SHEETS.MASTER);
  if(sh && sh.getLastRow()>=2){
    const r=sh.getDataRange().getDisplayValues().slice(1)
      .filter(x=>String(x[1]||"").trim()!=="")
      .map(x=>({idPelanggan:x[0],nomorMeter:x[1],namaPelanggan:x[2],alamat:x[3],kategori:x[4],subKategori:x[5],merk:x[6],status:x[7]||"Aktif",intervalHari:x[8]||30,terakhirPemeliharaan:x[9],jatuhTempo:x[10]}));
    if(r.length) return{ok:true,data:r};
  }

  // Jika MASTER_METER masih kosong, bangun daftar meter dari PEMELIHARAAN
  // agar data lama tetap tampil. Data tidak ditulis ke MASTER sampai user
  // mengisinya; ini hanya fallback pembacaan.
  const ph=ss().getSheetByName(SHEETS.DATA);
  if(!ph || ph.getLastRow()<2) return{ok:true,data:[]};
  const rows=ph.getDataRange().getDisplayValues().slice(1);
  const map={};
  rows.forEach(r=>{
    const meter=String(r[3]||"").trim();
    if(!meter) return;
    if(!map[meter]) map[meter]={
      idPelanggan:r[2]||"", nomorMeter:meter, namaPelanggan:r[4]||"",
      alamat:r[5]||"", kategori:"", subKategori:"", merk:"", status:"Aktif",
      intervalHari:30, terakhirPemeliharaan:r[1]||"", jatuhTempo:""
    };
    if(r[1]) map[meter].terakhirPemeliharaan=r[1];
  });
  const data=Object.keys(map).map(k=>{
    const m=map[k];
    if(m.terakhirPemeliharaan){
      const d=parseDateSafe(m.terakhirPemeliharaan);
      if(!isNaN(d.getTime())){
        d.setDate(d.getDate()+Number(m.intervalHari||30));
        m.jatuhTempo=Utilities.formatDate(d,Session.getScriptTimeZone(),"yyyy-MM-dd");
      }
    }
    return m;
  });
  return{ok:true,data:data,source:"PEMELIHARAAN_FALLBACK"};
}
function findMeter(n){return{ok:true,meter:getMeters().data.find(x=>String(x.nomorMeter).trim()===String(n).trim())||null}}
function getHistory(){const sh=ss().getSheetByName(SHEETS.DATA);if(!sh||sh.getLastRow()<2)return{ok:true,data:[],rows:[]};const v=sh.getDataRange().getDisplayValues().slice(1).reverse().slice(0,500);return{ok:true,rows:v,data:v.map(r=>({timestamp:r[0],tanggal:r[1],idPelanggan:r[2],nomorMeter:r[3],namaPelanggan:r[4],alamat:r[5],stand:r[6],kondisi:r[7],kondisiSegel:r[8],jenis:r[9],hasilPemeriksaan:r[10],petugas:r[11],username:r[12],keterangan:r[13],latitude:r[14],longitude:r[15],accuracy:r[16],fotoUrl:r[17]}))}}
function saveMaintenance(d){
  const sh=ensure(SHEETS.DATA,["Timestamp","Tanggal","ID Pelanggan","Nomor Meter","Nama Pelanggan","Alamat","Stand Meter","Kondisi Meter","Kondisi Segel","Jenis Pemeliharaan","Hasil Pemeriksaan","Petugas","Username","Keterangan","Latitude","Longitude","Akurasi GPS","Foto URL"]);
  let m=findMeter(d.nomorMeter).meter||{};let photo="";
  if(d.foto&&String(d.foto).indexOf("data:image")===0){try{const p=String(d.foto).split(",");const b=Utilities.base64Decode(p[1]);const f=DriveApp.getFolderById(FOLDER_ID).createFile(Utilities.newBlob(b,"image/jpeg","SIMETER_"+d.nomorMeter+"_"+Utilities.formatDate(new Date(),Session.getScriptTimeZone(),"yyyyMMdd_HHmmss")+".jpg"));photo=f.getUrl()}catch(e){photo="Gagal foto: "+e}}
  const now=new Date(),tgl=Utilities.formatDate(now,Session.getScriptTimeZone(),"yyyy-MM-dd");
  sh.appendRow([now,tgl,d.idPelanggan||m.idPelanggan||"",d.nomorMeter||"",m.namaPelanggan||"",m.alamat||"",d.stand||"",d.kondisi||"",d.kondisiSegel||"",d.jenis||"Pemeriksaan meter",d.hasilPemeriksaan||"",d.petugas||"",d.username||"",d.keterangan||"",d.latitude||"",d.longitude||"",d.accuracy||"",photo]);
  updateMeterDue(d.nomorMeter,tgl);
  return{ok:true,message:"Data pemeriksaan berhasil disimpan",photoUrl:photo};
}
function updateMeterDue(n,tgl){
  const sh=ss().getSheetByName(SHEETS.MASTER);if(!sh||sh.getLastRow()<2)return;
  const r=sh.getDataRange().getDisplayValues();for(let i=1;i<r.length;i++)if(String(r[i][1]).trim()===String(n).trim()){const days=parseInt(r[i][8]||30,10)||30;const due=new Date(tgl);due.setDate(due.getDate()+days);sh.getRange(i+1,10,1,2).setValues([[tgl,Utilities.formatDate(due,Session.getScriptTimeZone(),"yyyy-MM-dd")]]);break}
}
function getTasks(username){
  const sh=ss().getSheetByName(SHEETS.TASKS);
  if(!sh||sh.getLastRow()<2)return{ok:true,data:[]};
  const wanted=String(username||"").trim().toLowerCase();
  const v=sh.getDataRange().getDisplayValues().slice(1).reverse();
  const data=v.filter(r=>{
    if(!wanted)return true;
    const assigned=String(r[5]||"").trim().toLowerCase();
    return assigned===wanted;
  }).map(r=>({
    id:r[0],timestamp:r[1],nomorMeter:r[2],judul:r[3],keterangan:r[4],
    assignee:r[5],petugas:r[6],createdBy:r[7],dueDate:r[8],jatuhTempo:r[8],status:r[9]||"TERBUKA"
  }));
  return{ok:true,data:data};
}

function saveTask(d){
  const sh=ensure(SHEETS.TASKS,["ID Tugas","Timestamp","Nomor Meter","Judul","Keterangan","Petugas Username","Petugas","Dibuat Oleh","Tanggal Jatuh Tempo","Status"]);
  const raw=d.assignees!=null?d.assignees:d.assignee;
  const assignees=(Array.isArray(raw)?raw:[raw]).map(x=>String(x||"").trim()).filter(Boolean);
  if(!assignees.length)return{ok:false,error:"Pilih minimal 1 petugas"};
  const users=getUsers().data;
  const rows=[];const errors=[];
  assignees.forEach(username=>{
    const u=users.find(x=>String(x.username).trim().toLowerCase()===username.toLowerCase() && x.active!==false);
    if(!u){errors.push(username);return;}
    const id="TGS-"+Utilities.formatDate(new Date(),Session.getScriptTimeZone(),"yyyyMMddHHmmss")+"-"+Math.floor(Math.random()*100000);
    rows.push([id,new Date(),d.nomorMeter||"",d.judul||"Pemeliharaan meter",d.tugas||d.keterangan||"",u.username,u.name,d.createdBy||"",d.dueDate||"",d.status||"TERBUKA"]);
  });
  if(errors.length)return{ok:false,error:"Petugas tidak ditemukan/tidak aktif: "+errors.join(", ")};
  if(rows.length)sh.getRange(sh.getLastRow()+1,1,rows.length,10).setValues(rows);
  return{ok:true,ids:rows.map(r=>r[0]),count:rows.length};
}
function updateMeter(d){
  const sh=ss().getSheetByName(SHEETS.MASTER);
  if(!sh||sh.getLastRow()<2)return{ok:false,error:"MASTER_METER belum memiliki data"};
  const days=parseInt(d.intervalHari,10);
  if(!Number.isFinite(days)||days<1)return{ok:false,error:"Interval harus berupa angka minimal 1 hari"};
  const rows=sh.getDataRange().getDisplayValues();
  for(let i=1;i<rows.length;i++){
    if(String(rows[i][1]).trim()===String(d.nomorMeter||"").trim()){
      sh.getRange(i+1,9).setValue(days);
      const last=rows[i][9];
      if(last){
        const due=new Date(last);
        if(!isNaN(due.getTime())){
          due.setDate(due.getDate()+days);
          sh.getRange(i+1,11).setValue(Utilities.formatDate(due,Session.getScriptTimeZone(),"yyyy-MM-dd"));
        }
      }
      return{ok:true,message:"Interval meter berhasil diperbarui"};
    }
  }
  return{ok:false,error:"Nomor meter tidak ditemukan"};
}

function json(x){return ContentService.createTextOutput(JSON.stringify(x)).setMimeType(ContentService.MimeType.JSON)}
