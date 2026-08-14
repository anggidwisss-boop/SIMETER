SIMETER V8 FINAL - FIX AUTHENTICATION / DASHBOARD

TUJUAN:
- Memperbaiki error "Sesi login tidak valid" setelah login.
- Sesi login disimpan di browser dan tidak dihapus saat refresh.
- Dashboard TIDAK lagi bergantung pada endpoint getDashboard yang rawan beda versi deployment.
- Dashboard mengambil langsung getMeters, getHistory, getTasks.
- Semua request menyertakan username/role sebagai identitas.
- Backend API versi 8.0.0.

FILE GITHUB:
index.html
app.js
style.css
manifest.json
sw.js

FILE APPS SCRIPT:
Code.gs

PEMASANGAN:
1. Apps Script: hapus isi Code.gs lama, paste Code.gs V8.
2. Simpan.
3. Jalankan setupSheets() sekali dan beri izin jika diminta.
4. Deploy > Manage deployments > Edit > New version > Deploy.
5. Pastikan Web app: Execute as Me, Who has access: Anyone.
6. Copy URL /exec.
7. GitHub: replace 5 file frontend dengan file V8.
8. Buka aplikasi > Pengaturan koneksi > masukkan URL /exec > Simpan & Tes Koneksi.
9. Hasil harus: SIMETER API aktif · v8.0.0
10. Jika Chrome/Edge masih menampilkan versi lama, lakukan hard refresh atau hapus data situs untuk GitHub Pages.

AKUN AWAL:
superadmin / simeter123

FITUR YANG TETAP ADA:
- Role SUPER_ADMIN, ADMIN, SUPERVISOR, PETUGAS, VIEWER
- Penugasan multi-petugas
- Status tugas TERBUKA/DIPROSES/SELESAI
- Interval 30/60/90 hari
- Status pelanggan Aktif/Non Aktif/Normal/Overdue
- Stand LWBP/WBP/KVARH/KWH TOTAL
- Berita Acara
- Tanda tangan digital
- PDF


V8.1 PATCH: frontend version check accepts Apps Script backend major version 8. APP_VERSION=8.0.1.
Upload the files in this folder to the repository root. Do not create a nested SIMETER_V8 folder.
