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
    if (a === "ping") return json({ok:true,app:"SIMETER",version:"7.0.0",message:"SIMETER API aktif",time:new Date().toISOString()});
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
  } catch (err) {
    return json({ok:false,error:String(err)});
  }
}

function doPost(e) {
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const a = d.action;
    if (a === "setup") return json(setupSheets());
    if (a === "login") return json(login(d.username, d.password));
    if (a === "saveUser") return json(saveUser(d));
    if (a === "saveTask") return json(saveTask(d));
    if (a === "updateTaskStatus") return json(updateTaskStatus(d));
    if (a === "saveBeritaAcara") return json(saveBeritaAcara(d));
    if (a === "signBeritaAcara") return json(signBeritaAcara(d));
    if (a === "createBAPdf") return json(createBAPdf(d.idBA));
    if (a === "updateMeter") return json(updateMeter(d));
    if (a === "saveMaintenance" || a === "save") return json(saveMaintenance(d));
    if (a === "seedAdmin") return json(seedAdmin(true));
    return json({ok:false,error:"Action tidak dikenal: " + a});
  } catch (err) {
    return json({ok:false,error:String(err)});
  }
}

function ss() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function ensure(name, headers) {
  const book = ss();
  let sh = book.getSheetByName(name);
  if (!sh) sh = book.insertSheet(name);

  if (sh.getLastRow() === 0) {
    sh.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight("bold");
  } else {
    // Migrasi header aman: jangan menghapus/menggeser data lama.
    const current = sh.getRange(1,1,1,Math.max(sh.getLastColumn(), headers.length)).getDisplayValues()[0];
    for (let i = 0; i < headers.length; i++) {
      const cur = String(current[i] || "").trim();
      if (!cur) {
        sh.getRange(1, i + 1).setValue(headers[i]).setFontWeight("bold");
      }
    }
  }
  sh.setFrozenRows(1);
  return sh;
}

function setupSheets() {
  ensure(SHEETS.USERS, HEADERS.USERS);
  ensure(SHEETS.MASTER, HEADERS.MASTER);
  ensure(SHEETS.DATA, HEADERS.DATA);
  ensure(SHEETS.TASKS, HEADERS.TASKS);
  ensure(SHEETS.PETUGAS, HEADERS.PETUGAS);
  seedAdmin(false);
  ensureBASheet_();
  return {ok:true,message:"Database SIMETER siap digunakan",version:"7.0.0"};
}

function seedAdmin(force) {
  const sh = ensure(SHEETS.USERS, HEADERS.USERS);
  if (sh.getLastRow() > 1 && !force) {
    return {ok:true,message:"Admin sudah tersedia"};
  }

  const rows = sh.getDataRange().getDisplayValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0] || "").trim().toLowerCase() === "superadmin") {
      return {ok:true,message:"superadmin sudah tersedia"};
    }
  }

  sh.appendRow([
    "superadmin",
    sha256("simeter123"),
    "Super Admin",
    "SUPER_ADMIN",
    "UP3 Bima",
    true
  ]);
  return {ok:true,message:"superadmin dibuat",username:"superadmin",password:"simeter123"};
}

function sha256(s) {
  const d = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(s),
    Utilities.Charset.UTF_8
  );
  return d.map(function(b) {
    return (b < 0 ? b + 256 : b).toString(16).padStart(2,"0");
  }).join("");
}

function login(username, password) {
  setupSheets();

  const u = String(username || "").trim().toLowerCase();
  const hash = sha256(String(password || ""));
  const sh = ss().getSheetByName(SHEETS.USERS);
  const rows = sh.getDataRange().getDisplayValues();

  for (let i = 1; i < rows.length; i++) {
    const dbUsername = String(rows[i][0] || "").trim();
    const dbHash = String(rows[i][1] || "").trim();
    const dbName = String(rows[i][2] || "").trim();
    const dbRole = String(rows[i][3] || "PETUGAS").trim();
    const dbUnit = String(rows[i][4] || "").trim();
    const activeText = String(rows[i][5] === undefined ? true : rows[i][5]).trim().toLowerCase();
    const active = activeText !== "false" && activeText !== "tidak" && activeText !== "nonaktif";

    if (dbUsername.toLowerCase() === u && dbHash.toLowerCase() === hash.toLowerCase() && active) {
      return {
        ok:true,
        user:{
          username:dbUsername,
          name:dbName || dbUsername,
          role:dbRole,
          unit:dbUnit,
          active:true
        }
      };
    }
  }

  return {ok:false,error:"Username atau kata sandi salah"};
}

function getUsers() {
  const sh = ss().getSheetByName(SHEETS.USERS);
  if (!sh || sh.getLastRow() < 2) return {ok:true,data:[]};

  return {
    ok:true,
    data:sh.getDataRange().getDisplayValues().slice(1).map(function(r) {
      return {
        username:r[0],
        name:r[2],
        role:r[3],
        unit:r[4],
        active:String(r[5]).toLowerCase() !== "false" &&
              String(r[5]).toLowerCase() !== "tidak"
      };
    })
  };
}

function saveUser(d) {
  const sh = ensure(SHEETS.USERS, HEADERS.USERS);
  if (!d.username || !d.password) return {ok:false,error:"Username dan password wajib"};

  const username = String(d.username).trim();
  const rows = sh.getDataRange().getDisplayValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim().toLowerCase() === username.toLowerCase()) {
      return {ok:false,error:"Username sudah ada"};
    }
  }

  sh.appendRow([
    username,
    sha256(d.password),
    d.name || username,
    d.role || "PETUGAS",
    d.unit || "",
    d.active !== false
  ]);

  return {ok:true,message:"User berhasil dibuat"};
}

function getPetugas() {
  const sh = ss().getSheetByName(SHEETS.PETUGAS);
  if (!sh || sh.getLastRow() < 2) {
    // Fallback dari USERS role PETUGAS
    return {
      ok:true,
      data:getUsers().data.filter(function(u) {
        return u.role === "PETUGAS" && u.active;
      }).map(function(u) {
        return {idPetugas:u.username,namaPetugas:u.name,unit:u.unit,aktif:true};
      })
    };
  }

  return {
    ok:true,
    data:sh.getDataRange().getDisplayValues().slice(1).map(function(r) {
      return {
        idPetugas:r[0],
        namaPetugas:r[1],
        unit:r[2],
        aktif:String(r[3]).toLowerCase() !== "false" &&
              String(r[3]).toLowerCase() !== "tidak"
      };
    }).filter(function(x){ return x.aktif; })
  };
}

function getMeters() {
  const sh = ss().getSheetByName(SHEETS.MASTER);
  if (!sh || sh.getLastRow() < 2) return {ok:true,data:[]};

  const r = sh.getDataRange().getDisplayValues();
  const rows = r.slice(1);
  const today = new Date();
  today.setHours(0,0,0,0);

  const data = rows.map(function(x, idx) {
    const rawStatusPelanggan = String(x[11] || "").trim();
    const due = x[10] || "";
    let statusPelanggan = rawStatusPelanggan || (x[9] ? "Normal" : "Aktif");
    if (statusPelanggan.toUpperCase() !== "NON AKTIF" && due) {
      const diff = daysUntil(due);
      if (diff < 0) statusPelanggan = "Overdue";
      else if (x[9]) statusPelanggan = "Normal";
      else statusPelanggan = "Aktif";
    }

    return {
      idPelanggan:x[0],
      nomorMeter:x[1],
      namaPelanggan:x[2],
      alamat:x[3],
      kategori:x[4],
      subKategori:x[5],
      merk:x[6],
      status:x[7] || "Aktif",
      intervalHari:x[8] || 30,
      terakhirPemeliharaan:x[9],
      jatuhTempo:x[10],
      statusPelanggan:statusPelanggan,
      standLWBP:x[12] || "",
      standWBP:x[13] || "",
      standKVARH:x[14] || "",
      standKWHtotal:x[15] || ""
    };
  });

  return {ok:true,data:data};
}

function findMeter(n) {
  const meter = getMeters().data.find(function(x) {
    return String(x.nomorMeter).trim() === String(n).trim();
  }) || null;
  return {ok:true,meter:meter};
}

function getHistory() {
  const sh = ss().getSheetByName(SHEETS.DATA);
  if (!sh || sh.getLastRow() < 2) return {ok:true,data:[],rows:[]};

  const v = sh.getDataRange().getDisplayValues().slice(1).reverse().slice(0,500);

  return {
    ok:true,
    rows:v,
    data:v.map(function(r) {
      return {
        timestamp:r[0],
        tanggal:r[1],
        idPelanggan:r[2],
        nomorMeter:r[3],
        namaPelanggan:r[4],
        alamat:r[5],
        stand:r[6],
        kondisi:r[7],
        kondisiSegel:r[8],
        jenis:r[9],
        hasilPemeriksaan:r[10],
        petugas:r[11],
        username:r[12],
        keterangan:r[13],
        latitude:r[14],
        longitude:r[15],
        accuracy:r[16],
        fotoUrl:r[17],
        standLWBP:r[18],
        standWBP:r[19],
        standKVARH:r[20],
        standKWHtotal:r[21]
      };
    })
  };
}

function saveMaintenance(d) {
  const sh = ensure(SHEETS.DATA, HEADERS.DATA);
  const m = findMeter(d.nomorMeter).meter || {};
  let photo = "";

  if (d.foto && String(d.foto).indexOf("data:image") === 0) {
    try {
      const p = String(d.foto).split(",");
      const b = Utilities.base64Decode(p[1]);
      const f = DriveApp.getFolderById(FOLDER_ID).createFile(
        Utilities.newBlob(
          b,
          "image/jpeg",
          "SIMETER_" + d.nomorMeter + "_" +
          Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd_HHmmss") +
          ".jpg"
        )
      );
      photo = f.getUrl();
    } catch (e) {
      photo = "Gagal foto: " + e;
    }
  }

  const now = new Date();
  const tgl = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd");

  const standKWHtotal = d.standKWHtotal || d.stand || "";
  sh.appendRow([
    now,
    tgl,
    d.idPelanggan || m.idPelanggan || "",
    d.nomorMeter || "",
    m.namaPelanggan || "",
    m.alamat || "",
    standKWHtotal,
    d.kondisi || "",
    d.kondisiSegel || "",
    d.jenis || "Pemeriksaan meter",
    d.hasilPemeriksaan || "",
    d.petugas || "",
    d.username || "",
    d.keterangan || "",
    d.latitude || "",
    d.longitude || "",
    d.accuracy || "",
    photo,
    d.standLWBP || "",
    d.standWBP || "",
    d.standKVARH || "",
    standKWHtotal
  ]);

  updateMeterDue(d.nomorMeter, tgl, d);

  return {
    ok:true,
    message:"Data pemeriksaan berhasil disimpan",
    photoUrl:photo
  };
}

function updateMeterDue(n, tgl, d) {
  const sh = ss().getSheetByName(SHEETS.MASTER);
  if (!sh || sh.getLastRow() < 2) return;

  const r = sh.getDataRange().getDisplayValues();
  for (let i = 1; i < r.length; i++) {
    if (String(r[i][1]).trim() === String(n).trim()) {
      const days = parseInt(r[i][8] || 30, 10) || 30;
      const due = parseDateSafe(tgl);
      due.setDate(due.getDate() + days);
      const dueText = Utilities.formatDate(due, Session.getScriptTimeZone(), "yyyy-MM-dd");

      sh.getRange(i + 1, 10, 1, 2).setValues([[tgl, dueText]]);

      // Setelah pemeriksaan selesai, pelanggan menjadi NORMAL kecuali sudah NON AKTIF.
      const currentCustomerStatus = String(r[i][11] || "").trim().toUpperCase();
      if (currentCustomerStatus !== "NON AKTIF") {
        sh.getRange(i + 1, 12).setValue("Normal");
      }

      // Simpan stand terakhir langsung di MASTER_METER agar detail meter selalu menampilkan data terbaru.
      if (d) {
        sh.getRange(i + 1, 13, 1, 4).setValues([[
          d.standLWBP || "",
          d.standWBP || "",
          d.standKVARH || "",
          d.standKWHtotal || d.stand || ""
        ]]);
      }
      break;
    }
  }
}

function updateMeter(d) {
  const sh = ss().getSheetByName(SHEETS.MASTER);
  if (!sh || sh.getLastRow() < 2) return {ok:false,error:"MASTER_METER belum memiliki data"};

  const days = parseInt(d.intervalHari, 10);
  if (![30,60,90].includes(days)) {
    return {ok:false,error:"Interval hanya boleh 30, 60, atau 90 hari"};
  }

  const allowedStatus = ["Aktif","Non Aktif","Normal","Overdue"];
  const requestedStatus = String(d.statusPelanggan || "").trim();
  if (requestedStatus && !allowedStatus.includes(requestedStatus)) {
    return {ok:false,error:"Status pelanggan tidak valid"};
  }

  const rows = sh.getDataRange().getDisplayValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]).trim() === String(d.nomorMeter || "").trim()) {
      sh.getRange(i + 1, 9).setValue(days);

      const last = rows[i][9];
      if (last) {
        const due = parseDateSafe(last);
        due.setDate(due.getDate() + days);
        sh.getRange(i + 1, 11).setValue(
          Utilities.formatDate(due, Session.getScriptTimeZone(), "yyyy-MM-dd")
        );
      }
      if (requestedStatus) sh.getRange(i + 1, 12).setValue(requestedStatus);

      return {ok:true,message:"Pengaturan meter berhasil diperbarui",intervalHari:days,statusPelanggan:requestedStatus || rows[i][11] || "Aktif"};
    }
  }

  return {ok:false,error:"Nomor meter tidak ditemukan"};
}

function saveTask(d) {
  const sh = ensure(SHEETS.TASKS, HEADERS.TASKS);

  const raw = d.assignees != null ? d.assignees : d.assignee;
  const assignees = (Array.isArray(raw) ? raw : [raw])
    .map(function(x){ return String(x || "").trim(); })
    .filter(Boolean);

  if (!assignees.length) return {ok:false,error:"Pilih minimal 1 petugas"};

  const users = getUsers().data;
  const rows = [];
  const errors = [];

  assignees.forEach(function(username) {
    const u = users.find(function(x) {
      return String(x.username).trim().toLowerCase() === username.toLowerCase() &&
             x.active !== false;
    });

    if (!u) {
      errors.push(username);
      return;
    }

    const id =
      "TGS-" +
      Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMddHHmmss") +
      "-" +
      Math.floor(Math.random() * 1000000);

    rows.push([
      id,
      new Date(),
      d.nomorMeter || "",
      d.judul || "Pemeliharaan meter",
      d.tugas || d.keterangan || "",
      u.username,
      u.name,
      d.createdBy || "",
      d.dueDate || "",
      d.status || "TERBUKA"
    ]);
  });

  if (errors.length) {
    return {
      ok:false,
      error:"Petugas tidak ditemukan/tidak aktif: " + errors.join(", ")
    };
  }

  if (rows.length) {
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, 10).setValues(rows);
  }

  return {
    ok:true,
    ids:rows.map(function(r){return r[0];}),
    count:rows.length,
    message:rows.length + " penugasan berhasil dibuat"
  };
}

function getTasks(username) {
  const sh = ss().getSheetByName(SHEETS.TASKS);
  if (!sh || sh.getLastRow() < 2) return {ok:true,data:[]};

  const wanted = String(username || "").trim().toLowerCase();
  const v = sh.getDataRange().getDisplayValues().slice(1).reverse();

  const data = v.filter(function(r) {
    if (!wanted) return true;
    return String(r[5] || "").trim().toLowerCase() === wanted;
  }).map(function(r) {
    const status = r[9] || "TERBUKA";
    const due = r[8] || "";

    return {
      id:r[0],
      timestamp:r[1],
      nomorMeter:r[2],
      judul:r[3],
      keterangan:r[4],
      assignee:r[5],
      petugas:r[6],
      createdBy:r[7],
      dueDate:due,
      jatuhTempo:due,
      status:status,
      hariTersisa:daysUntil(due),
      overdue:isOverdue(due) && status !== "SELESAI"
    };
  });

  return {ok:true,data:data};
}

function updateTaskStatus(d) {
  const sh = ss().getSheetByName(SHEETS.TASKS);
  if (!sh || sh.getLastRow() < 2) return {ok:false,error:"Belum ada tugas"};

  const id = String(d.id || "").trim();
  const status = String(d.status || "").trim().toUpperCase();

  if (!id) return {ok:false,error:"ID tugas wajib"};
  if (!["TERBUKA","DIPROSES","SELESAI","DITUNDA","BATAL"].includes(status)) {
    return {ok:false,error:"Status tidak valid"};
  }

  const rows = sh.getDataRange().getDisplayValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === id) {
      sh.getRange(i + 1, 10).setValue(status);
      return {ok:true,message:"Status tugas diperbarui",status:status};
    }
  }

  return {ok:false,error:"Tugas tidak ditemukan"};
}

/*
 * Notifikasi:
 * H-30, H-14, H-7, H-3, H-1, HARI INI, TERLAMBAT
 * Tugas petugas juga ikut dihitung.
 */
function getNotifications(username) {
  const notifications = [];
  const today = startOfDay(new Date());

  getMeters().data.forEach(function(m) {
    if (!m.jatuhTempo) return;

    const d = parseDateSafe(m.jatuhTempo);
    if (isNaN(d.getTime())) return;

    const diff = Math.round((startOfDay(d) - today) / 86400000);

    let level = "";
    if (diff < 0) level = "OVERDUE";
    else if ([0,1,3,7,14,30].includes(diff)) level = diff === 0 ? "TODAY" : "DUE";

    if (level) {
      notifications.push({
        type:"METER",
        level:level,
        nomorMeter:m.nomorMeter,
        namaPelanggan:m.namaPelanggan,
        jatuhTempo:m.jatuhTempo,
        hariTersisa:diff,
        message:diff < 0
          ? "Pemeliharaan meter terlambat " + Math.abs(diff) + " hari"
          : diff === 0
            ? "Pemeliharaan meter jatuh tempo hari ini"
            : "Pemeliharaan meter jatuh tempo " + diff + " hari lagi"
      });
    }
  });

  const tasks = getTasks(username).data;
  tasks.forEach(function(t) {
    if (t.status === "SELESAI" || t.status === "BATAL" || !t.dueDate) return;

    const diff = daysUntil(t.dueDate);

    if (diff <= 7) {
      notifications.push({
        type:"TASK",
        level:diff < 0 ? "OVERDUE" : diff === 0 ? "TODAY" : "TASK",
        id:t.id,
        nomorMeter:t.nomorMeter,
        judul:t.judul,
        petugas:t.petugas,
        jatuhTempo:t.dueDate,
        hariTersisa:diff,
        message:diff < 0
          ? "Tugas terlambat " + Math.abs(diff) + " hari"
          : diff === 0
            ? "Tugas jatuh tempo hari ini"
            : "Tugas jatuh tempo " + diff + " hari lagi"
      });
    }
  });

  notifications.sort(function(a,b) {
    return Number(a.hariTersisa) - Number(b.hariTersisa);
  });

  return {
    ok:true,
    count:notifications.length,
    data:notifications
  };
}

function getDashboard(username) {
  const meters = getMeters().data;
  const tasks = getTasks(username).data;

  let overdue = 0;
  let today = 0;
  let sevenDays = 0;

  meters.forEach(function(m) {
    if (!m.jatuhTempo) return;
    const d = daysUntil(m.jatuhTempo);

    if (d < 0) overdue++;
    else if (d === 0) today++;
    else if (d <= 7) sevenDays++;
  });

  return {
    ok:true,
    data:{
      totalMeter:meters.length,
      jatuhTempoHariIni:today,
      jatuhTempo7Hari:sevenDays,
      terlambat:overdue,
      tugasSaya:tasks.length,
      tugasTerbuka:tasks.filter(function(t){return t.status==="TERBUKA";}).length,
      tugasDiproses:tasks.filter(function(t){return t.status==="DIPROSES";}).length,
      tugasSelesai:tasks.filter(function(t){return t.status==="SELESAI";}).length
    }
  };
}

function parseDateSafe(value) {
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return new Date(value.getTime());
  }

  const s = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const p = s.split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }

  const d = new Date(s);
  return d;
}

function startOfDay(d) {
  const x = new Date(d.getTime());
  x.setHours(0,0,0,0);
  return x;
}

function daysUntil(value) {
  const d = parseDateSafe(value);
  if (isNaN(d.getTime())) return 999999;
  return Math.round((startOfDay(d) - startOfDay(new Date())) / 86400000);
}

function isOverdue(value) {
  return daysUntil(value) < 0;
}

function json(x) {
  return ContentService
    .createTextOutput(JSON.stringify(x))
    .setMimeType(ContentService.MimeType.JSON);
}


/* =========================================================
   SIMETER V6 — BERITA ACARA + TANDA TANGAN DIGITAL + PDF
   ========================================================= */

const BA_SHEET = "BERITA_ACARA";
const BA_HEADERS = [
  "ID BA","Timestamp","Nomor BA","ID Tugas","ID Pelanggan","Nomor Meter",
  "Nama Pelanggan","Alamat","ULP/Unit","Tanggal","Petugas Username","Petugas",
  "Supervisor Username","Supervisor","Status BA","Jenis Pemeliharaan",
  "Status Pelanggan","Kondisi KWH Meter","Kondisi Kubikel/PMCB",
  "Kondisi CT R","Kondisi CT S","Kondisi CT T",
  "Kondisi PT R","Kondisi PT S","Kondisi PT T",
  "Tegangan R","Tegangan S","Tegangan T",
  "Arus R","Arus S","Arus T",
  "LWBP","WBP","KVARH","KWH TOTAL","Kesimpulan","Keterangan",
  "TTD Petugas","Waktu TTD Petugas","TTD Supervisor","Waktu TTD Supervisor",
  "PDF URL"
];

function ensureBASheet_() {
  const book = ss();
  let sh = book.getSheetByName(BA_SHEET);
  if (!sh) sh = book.insertSheet(BA_SHEET);
  if (sh.getLastRow() === 0) {
    sh.getRange(1,1,1,BA_HEADERS.length).setValues([BA_HEADERS]).setFontWeight("bold");
  }
  sh.setFrozenRows(1);
  return sh;
}

function makeBANumber_() {
  const sh = ensureBASheet_();
  const year = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy");
  const count = Math.max(1, sh.getLastRow());
  return "BA/SIMETER/" + year + "/" + String(count).padStart(4,"0");
}

function saveBeritaAcara(d) {
  const sh = ensureBASheet_();
  const id = "BA-" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMddHHmmss") + "-" + Math.floor(Math.random()*10000);
  const nomorBA = d.nomorBA || makeBANumber_();
  const status = d.statusBA || "DRAFT";
  const now = new Date();

  sh.appendRow([
    id, now, nomorBA, d.idTugas || "", d.idPelanggan || "", d.nomorMeter || "",
    d.namaPelanggan || "", d.alamat || "", d.unit || "", d.tanggal || Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd"),
    d.petugasUsername || "", d.petugas || "", d.supervisorUsername || "", d.supervisor || "",
    status, d.jenisPemeliharaan || "", d.statusPelanggan || "",
    d.kondisiKwhMeter || "", d.kondisiKubikel || "",
    d.kondisiCTR || "", d.kondisiCTS || "", d.kondisiCTT || "",
    d.kondisiPTR || "", d.kondisiPTS || "", d.kondisiPTT || "",
    d.teganganR || "", d.teganganS || "", d.teganganT || "",
    d.arusR || "", d.arusS || "", d.arusT || "",
    d.lwbp || "", d.wbp || "", d.kvarh || "", d.kwhTotal || "",
    d.kesimpulan || "", d.keterangan || "",
    d.ttdPetugas || "", d.waktuTtdPetugas || "",
    d.ttdSupervisor || "", d.waktuTtdSupervisor || "",
    ""
  ]);

  return {ok:true,idBA:id,nomorBA:nomorBA,statusBA:status,message:"Berita Acara tersimpan"};
}

function getBeritaAcara(idBA) {
  const sh = ensureBASheet_();
  const rows = sh.getDataRange().getDisplayValues();
  for (let i=1;i<rows.length;i++) {
    if (String(rows[i][0]).trim() === String(idBA).trim()) {
      return {ok:true,data:baRowToObject_(rows[i])};
    }
  }
  return {ok:false,error:"Berita Acara tidak ditemukan"};
}

function getBeritaAcaraByTask(idTugas) {
  const sh = ensureBASheet_();
  const rows = sh.getDataRange().getDisplayValues().slice(1).reverse();
  const found = rows.find(function(r){ return String(r[3]).trim() === String(idTugas).trim(); });
  return {ok:true,data:found ? baRowToObject_(found) : null};
}

function baRowToObject_(r) {
  return {
    idBA:r[0],timestamp:r[1],nomorBA:r[2],idTugas:r[3],idPelanggan:r[4],nomorMeter:r[5],
    namaPelanggan:r[6],alamat:r[7],unit:r[8],tanggal:r[9],petugasUsername:r[10],petugas:r[11],
    supervisorUsername:r[12],supervisor:r[13],statusBA:r[14],jenisPemeliharaan:r[15],
    statusPelanggan:r[16],kondisiKwhMeter:r[17],kondisiKubikel:r[18],
    kondisiCTR:r[19],kondisiCTS:r[20],kondisiCTT:r[21],
    kondisiPTR:r[22],kondisiPTS:r[23],kondisiPTT:r[24],
    teganganR:r[25],teganganS:r[26],teganganT:r[27],
    arusR:r[28],arusS:r[29],arusT:r[30],
    lwbp:r[31],wbp:r[32],kvarh:r[33],kwhTotal:r[34],
    kesimpulan:r[35],keterangan:r[36],ttdPetugas:r[37],waktuTtdPetugas:r[38],
    ttdSupervisor:r[39],waktuTtdSupervisor:r[40],pdfUrl:r[41]
  };
}

function signBeritaAcara(d) {
  const sh = ensureBASheet_();
  const rows = sh.getDataRange().getDisplayValues();
  for (let i=1;i<rows.length;i++) {
    if (String(rows[i][0]).trim() !== String(d.idBA).trim()) continue;

    if (d.role === "PETUGAS" || d.role === "PETUGAS_TM") {
      sh.getRange(i+1,38,1,2).setValues([[d.signature || "", d.time || new Date()]]);
      sh.getRange(i+1,15).setValue("DIAJUKAN");
      return {ok:true,message:"Tanda tangan petugas tersimpan",statusBA:"DIAJUKAN"};
    }

    if (d.role === "SUPERVISOR" || d.role === "ADMIN" || d.role === "SUPER_ADMIN") {
      sh.getRange(i+1,40,1,2).setValues([[d.signature || "", d.time || new Date()]]);
      sh.getRange(i+1,15).setValue("DISETUJUI");
      return {ok:true,message:"Tanda tangan supervisor tersimpan",statusBA:"DISETUJUI"};
    }

    return {ok:false,error:"Role tidak berwenang menandatangani"};
  }
  return {ok:false,error:"Berita Acara tidak ditemukan"};
}

function createBAPdf(idBA) {
  const found = getBeritaAcara(idBA);
  if (!found.ok) return found;
  const d = found.data;

  const folder = DriveApp.getFolderById(FOLDER_ID);
  const doc = DocumentApp.create(d.nomorBA + " - " + (d.nomorMeter || "Meter"));
  const body = doc.getBody();

  body.appendParagraph("BERITA ACARA PEMELIHARAAN METER").setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(d.nomorBA).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  body.appendParagraph("");

  function p(label, value) {
    body.appendParagraph(label + " : " + (value || "-"));
  }

  body.appendParagraph("A. IDENTITAS PELANGGAN").setHeading(DocumentApp.ParagraphHeading.HEADING2);
  p("ID Pelanggan",d.idPelanggan); p("Nomor Meter",d.nomorMeter); p("Nama Pelanggan",d.namaPelanggan);
  p("Alamat",d.alamat); p("ULP/Unit",d.unit); p("Tanggal",d.tanggal); p("Petugas",d.petugas);

  body.appendParagraph("B. HASIL PEMERIKSAAN").setHeading(DocumentApp.ParagraphHeading.HEADING2);
  p("Jenis Pemeliharaan",d.jenisPemeliharaan); p("Status Pelanggan",d.statusPelanggan);
  p("Kondisi KWH Meter",d.kondisiKwhMeter); p("Kondisi Kubikel/PMCB",d.kondisiKubikel);
  p("CT R",d.kondisiCTR); p("CT S",d.kondisiCTS); p("CT T",d.kondisiCTT);
  p("PT R",d.kondisiPTR); p("PT S",d.kondisiPTS); p("PT T",d.kondisiPTT);

  body.appendParagraph("C. HASIL PENGUKURAN").setHeading(DocumentApp.ParagraphHeading.HEADING2);
  p("Tegangan R / S / T",d.teganganR+" / "+d.teganganS+" / "+d.teganganT);
  p("Arus R / S / T",d.arusR+" / "+d.arusS+" / "+d.arusT);
  p("LWBP",d.lwbp); p("WBP",d.wbp); p("KVARH",d.kvarh); p("KWH TOTAL",d.kwhTotal);

  body.appendParagraph("D. KESIMPULAN").setHeading(DocumentApp.ParagraphHeading.HEADING2);
  p("Kesimpulan",d.kesimpulan); p("Keterangan",d.keterangan);

  body.appendParagraph("");
  body.appendParagraph("E. PENGESAHAN").setHeading(DocumentApp.ParagraphHeading.HEADING2);

  const table = body.appendTable([
    ["PETUGAS PELAKSANA","SUPERVISOR / MENGETAHUI"],
    [d.petugas || "-", d.supervisor || "-"],
    ["Tanda tangan digital:", "Tanda tangan digital:"],
    [d.ttdPetugas ? "[TERTANDA TANGAN]" : "[BELUM TTD]", d.ttdSupervisor ? "[DISETUJUI / TERTANDA TANGAN]" : "[BELUM TTD]"],
    [d.waktuTtdPetugas || "-", d.waktuTtdSupervisor || "-"]
  ]);
  table.setBorderWidth(1);

  doc.saveAndClose();
  const docFile = DriveApp.getFileById(doc.getId());
  const pdfBlob = docFile.getAs(MimeType.PDF).setName(d.nomorBA + ".pdf");
  const pdfFile = folder.createFile(pdfBlob);
  const url = pdfFile.getUrl();

  const sh = ensureBASheet_();
  const rows = sh.getDataRange().getDisplayValues();
  for (let i=1;i<rows.length;i++) {
    if (String(rows[i][0]).trim() === String(idBA).trim()) {
      sh.getRange(i+1,42).setValue(url);
      break;
    }
  }

  // Keep the source Doc in Drive as an editable archive; PDF is the user-facing export.
  return {ok:true,pdfUrl:url,message:"PDF Berita Acara berhasil dibuat"};
}

