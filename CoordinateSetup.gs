/**
 * RIMPU / SIMETER - migrasi kolom koordinat MASTER_METER.
 * Menambahkan Latitude (Q) dan Longitude (R) tanpa mengubah data lama.
 * Jalankan setupCoordinates() sekali dari Apps Script bila deployment lama belum
 * menjalankan setupSheets().
 */
function setupCoordinates() {
  const book = SpreadsheetApp.openById("11F_gO2WPu1aSZSmFdZVi_keT6Gs3EyBVW-1P-dp1Tak");
  let sh = book.getSheetByName("MASTER_METER");
  if (!sh) throw new Error("Sheet MASTER_METER tidak ditemukan");

  if (sh.getMaxColumns() < 18) {
    sh.insertColumnsAfter(sh.getMaxColumns(), 18 - sh.getMaxColumns());
  }

  sh.getRange(1, 17).setValue("Latitude").setFontWeight("bold");
  sh.getRange(1, 18).setValue("Longitude").setFontWeight("bold");
  sh.setFrozenRows(1);
  sh.setColumnWidth(17, 115);
  sh.setColumnWidth(18, 115);

  const last = sh.getLastRow();
  if (last > 1) {
    sh.getRange(2, 17, last - 1, 2).setNumberFormat("0.000000");
  }
  return {ok:true, message:"Kolom Latitude dan Longitude berhasil ditambahkan ke MASTER_METER"};
}
