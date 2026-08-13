const $ = x => document.getElementById(x);

let api = localStorage.getItem("simeter_api_url") || "";
let gps = {};
let meters = [];
let hist = [];
let qr = null;
let lookupTimer = null;

document.addEventListener("DOMContentLoaded", () => {

  if ($("api")) {
    $("api").value = api;
  }

  tabs();
  events();
  loadLocal();
  render();

  if (navigator.serviceWorker) {
    navigator.serviceWorker.register("sw.js");
  }

});


/* =====================================================
   TAB
   ===================================================== */

function tabs() {

  document.querySelectorAll(".tab").forEach(button => {

    button.onclick = () => {

      stop();

      document
        .querySelectorAll(".tab")
        .forEach(x => x.classList.remove("active"));

      document
        .querySelectorAll(".panel")
        .forEach(x => x.classList.remove("active"));

      button.classList.add("active");

      const target = $(button.dataset.t);

      if (target) {
        target.classList.add("active");
      }

    };

  });

}


/* =====================================================
   EVENTS
   ===================================================== */

function events() {

  $("save").onclick = () => {

    api = $("api").value.trim();

    localStorage.setItem(
      "simeter_api_url",
      api
    );

    $("apiMsg").textContent =
      "URL disimpan.";

  };


  $("test").onclick = test;

  $("scan").onclick = start;

  $("stop").onclick = stop;


  /*
   * PENCARIAN NOMOR METER OTOMATIS
   */

  $("meter").addEventListener(
    "input",
    function () {

      clearTimeout(lookupTimer);

      const nomor = this.value.trim();

      if (!nomor) {

        $("customer").classList.add("hide");

        return;

      }


      /*
       * Tunggu 400 ms setelah pengguna berhenti mengetik
       */

      lookupTimer = setTimeout(
        () => lookup(nomor),
        400
      );

    }
  );


  /*
   * Tetap lakukan pencarian saat keluar dari kolom
   */

  $("meter").addEventListener(
    "blur",
    function () {

      const nomor = this.value.trim();

      if (nomor) {
        lookup(nomor);
      }

    }
  );


  $("getgps").onclick = getgps;

  $("foto").onchange = preview;

  $("form").onsubmit = save;

  $("refreshM").onclick = loadM;

  $("refreshH").onclick = loadH;

  $("searchM").oninput = renderM;

  $("searchH").oninput = renderH;

}


/* =====================================================
   TES KONEKSI
   ===================================================== */

async function test() {

  if (!api) {

    $("apiMsg").textContent =
      "Isi URL /exec dulu.";

    return;

  }


  try {

    const response =
      await fetch(
        api + "?action=ping"
      );

    const data =
      await response.json();

    $("apiMsg").textContent =
      data.message || "SIMETER API aktif";

  } catch (e) {

    $("apiMsg").textContent =
      "Gagal: " + e.message;

  }

}


/* =====================================================
   SCANNER BARCODE / QR
   ===================================================== */

async function start() {

  if (!api) {

    $("scanMsg").textContent =
      "Isi URL /exec dulu.";

    return;

  }


  $("reader").classList.remove("hide");

  $("scan").classList.add("hide");

  $("stop").classList.remove("hide");


  qr =
    new Html5Qrcode("reader");


  try {

    await qr.start(

      {
        facingMode: "environment"
      },

      {
        fps: 10,
        qrbox: {
          width: 250,
          height: 150
        }
      },

      async text => {

        await stop();

        const nomor =
          text.trim();

        $("meter").value =
          nomor;

        await lookup(nomor);

      }

    );

  } catch (e) {

    $("scanMsg").textContent =
      "Kamera gagal dibuka. Izinkan kamera dan gunakan HTTPS.";

    await stop();

  }

}


/* =====================================================
   STOP SCANNER
   ===================================================== */

async function stop() {

  if (qr) {

    try {
      await qr.stop();
    } catch (e) {}

    try {
      await qr.clear();
    } catch (e) {}

    qr = null;

  }


  if ($("reader")) {
    $("reader").classList.add("hide");
  }

  if ($("scan")) {
    $("scan").classList.remove("hide");
  }

  if ($("stop")) {
    $("stop").classList.add("hide");
  }

}


/* =====================================================
   CARI MASTER METER
   ===================================================== */

async function lookup(nomor) {

  nomor =
    String(nomor || "").trim();


  if (!nomor || !api) {
    return;
  }


  $("scanMsg").textContent =
    "Mencari data meter...";


  try {

    const response =
      await fetch(
        api +
        "?action=meter&nomorMeter=" +
        encodeURIComponent(nomor)
      );


    const data =
      await response.json();


    if (
      data.ok &&
      data.meter
    ) {

      /*
       * ID PELANGGAN
       */

      $("id").value =
        data.meter.idPelanggan || "";


      /*
       * NOMOR METER
       */

      $("meter").value =
        data.meter.nomorMeter || nomor;


      /*
       * NAMA PELANGGAN
       */

      $("name").textContent =
        data.meter.namaPelanggan || "-";


      /*
       * ALAMAT
       */

      $("address").textContent =
        data.meter.alamat || "-";


      /*
       * TAMPILKAN DATA PELANGGAN
       */

      $("customer").classList.remove("hide");


      $("scanMsg").textContent =
        "✓ Data meter ditemukan.";

    } else {

      $("customer").classList.add("hide");


      $("scanMsg").textContent =
        "Nomor meter tidak ditemukan di MASTER_METER.";

    }


  } catch (e) {

    $("scanMsg").textContent =
      "Gagal mencari: " + e.message;

  }

}


/* =====================================================
   GPS
   ===================================================== */

function getgps() {

  navigator.geolocation?.getCurrentPosition(

    position => {

      gps = {

        lat:
          position.coords.latitude.toFixed(6),

        lng:
          position.coords.longitude.toFixed(6),

        accuracy:
          position.coords.accuracy.toFixed(1)

      };


      $("gps").textContent =
        `${gps.lat}, ${gps.lng} (±${gps.accuracy}m)`;

    },

    error => {

      $("msg").textContent =
        "GPS: " + error.message;

    },

    {
      enableHighAccuracy: true,
      timeout: 15000
    }

  );

}


/* =====================================================
   FOTO
   ===================================================== */

function preview() {

  const file =
    $("foto").files[0];


  if (!file) {
    return;
  }


  const reader =
    new FileReader();


  reader.onload = event => {

    $("preview").src =
      event.target.result;

    $("preview").classList.remove(
      "hide"
    );

  };


  reader.readAsDataURL(file);

}


/* =====================================================
   SIMPAN PEMELIHARAAN
   ===================================================== */

async function save(event) {

  event.preventDefault();


  const file =
    $("foto").files[0];


  const photo =
    file
      ? await image(file)
      : "";


  const data = {

    action:
      "saveMaintenance",

    timestamp:
      new Date().toISOString(),

    idPelanggan:
      $("id").value.trim(),

    nomorMeter:
      $("meter").value.trim(),

    namaPelanggan:
      $("name").textContent,

    alamat:
      $("address").textContent,

    jenis:
      $("jenis").value,

    kondisi:
      $("kondisi").value,

    stand:
      $("stand").value,

    keterangan:
      $("ket").value,

    latitude:
      gps.lat || "",

    longitude:
      gps.lng || "",

    accuracy:
      gps.accuracy || "",

    foto:
      photo

  };


  try {

    const result =
      await post(data);


    if (
      result.ok === false
    ) {

      throw new Error(
        result.error ||
        "Gagal menyimpan"
      );

    }


    $("msg").textContent =
      "✓ Data berhasil disimpan ke Google Sheets.";


    hist.unshift(data);


    localStorage.setItem(
      "simeter_history",
      JSON.stringify(hist)
    );


    render();


  } catch (error) {

    data.pending = true;


    hist.unshift(data);


    localStorage.setItem(
      "simeter_history",
      JSON.stringify(hist)
    );


    $("msg").textContent =
      "Disimpan offline: " +
      error.message;

  }


  event.target.reset();

  gps = {};

  $("gps").textContent =
    "Belum diambil";

  $("customer").classList.add(
    "hide"
  );

  $("preview").classList.add(
    "hide"
  );

}


/* =====================================================
   POST
   ===================================================== */

async function post(data) {

  const response =
    await fetch(
      api,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "text/plain;charset=utf-8"
        },
        body:
          JSON.stringify(data)
      }
    );


  return response.json();

}


/* =====================================================
   DATA MASTER
   ===================================================== */

async function loadM() {

  if (!api) {
    return;
  }


  const response =
    await fetch(
      api + "?action=getMeters"
    );


  const data =
    await response.json();


  meters =
    data.data || [];


  localStorage.setItem(
    "simeter_meters",
    JSON.stringify(meters)
  );


  renderM();

}


/* =====================================================
   RIWAYAT
   ===================================================== */

async function loadH() {

  if (!api) {
    return;
  }


  const response =
    await fetch(
      api + "?action=getHistory"
    );


  const data =
    await response.json();


  hist =
    data.data || [];


  localStorage.setItem(
    "simeter_history",
    JSON.stringify(hist)
  );


  renderH();

}


/* =====================================================
   LOCAL DATA
   ===================================================== */

function loadLocal() {

  try {

    meters =
      JSON.parse(
        localStorage.getItem(
          "simeter_meters"
        ) || "[]"
      );


    hist =
      JSON.parse(
        localStorage.getItem(
          "simeter_history"
        ) || "[]"
      );

  } catch (e) {}

}


/* =====================================================
   RENDER
   ===================================================== */

function render() {

  renderM();

  renderH();

}


/* =====================================================
   RENDER MASTER
   ===================================================== */

function renderM() {

  const query =
    ($("searchM").value || "")
      .toLowerCase();


  $("meters").innerHTML =

    meters

      .filter(x =>
        JSON.stringify(x)
          .toLowerCase()
          .includes(query)
      )

      .map(x => `

        <div class="item">

          <b>
            ${esc(x.idPelanggan)}
          </b>

          <small>

            Meter:
            ${esc(x.nomorMeter)}

            <br>

            Nama:
            ${esc(x.namaPelanggan)}

            <br>

            Alamat:
            ${esc(x.alamat)}

          </small>

        </div>

      `)

      .join("")

      ||

      "<p>Belum ada data.</p>";

}


/* =====================================================
   RENDER HISTORY
   ===================================================== */

function renderH() {

  const query =
    ($("searchH").value || "")
      .toLowerCase();


  $("hist").innerHTML =

    hist

      .filter(x =>
        JSON.stringify(x)
          .toLowerCase()
          .includes(query)
      )

      .map(x => `

        <div class="item">

          <b>
            ${esc(x.idPelanggan)}
            —
            ${esc(x.jenis)}
          </b>

          <small>

            Meter:
            ${esc(x.nomorMeter)}

            <br>

            ${
              new Date(
                x.timestamp || Date.now()
              ).toLocaleString("id-ID")
            }

            <br>

            ${
              x.pending
                ? "⏳ Offline"
                : "✓ Terkirim"
            }

          </small>

        </div>

      `)

      .join("")

      ||

      "<p>Belum ada riwayat.</p>";

}


/* =====================================================
   ESCAPE HTML
   ===================================================== */

function esc(value) {

  return String(
    value ?? ""
  ).replace(
    /[&<>"']/g,
    match => ({

      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"

    }[match])
  );

}


/* =====================================================
   KOMPRES FOTO
   ===================================================== */

function image(file) {

  return new Promise(
    (resolve, reject) => {

      const reader =
        new FileReader();


      reader.onload = () => {

        const img =
          new Image();


        img.onload = () => {

          const max =
            1200;

          let width =
            img.width;

          let height =
            img.height;


          if (
            width > max
          ) {

            height =
              height * max / width;

            width =
              max;

          }


          const canvas =
            document.createElement(
              "canvas"
            );


          canvas.width =
            width;

          canvas.height =
            height;


          canvas
            .getContext("2d")
            .drawImage(
              img,
              0,
              0,
              width,
              height
            );


          resolve(
            canvas.toDataURL(
              "image/jpeg",
              0.75
            )
          );

        };


        img.src =
          reader.result;

      };


      reader.onerror =
        reject;


      reader.readAsDataURL(
        file
      );

    }
  );

}
