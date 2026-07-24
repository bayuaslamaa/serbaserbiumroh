# Prompt: Transkripsi katalog harga hotel (PDF/gambar) → CSV harga real

Prompt siap-pakai untuk mengubah katalog harga hotel Umroh (PDF atau gambar)
menjadi CSV yang bisa diimpor ke `real_hotel_prices` lewat endpoint admin
`POST /api/admin/pricing/real-hotel-import/confirm`.

Template CSV kosong: [`docs/templates/real-hotel-prices-template.csv`](../templates/real-hotel-prices-template.csv).

## Cara pakai

1. **Isi "Daftar Hotel Terdaftar"** di dalam prompt dengan `city | tier | label | base_sar`
   dari hotel yang sudah ada di database (halaman admin hotel, atau ekspor CSV hotel-pricing).
   Ini yang membuat `label` cocok dan basis harga benar — tanpa ini banyak baris jadi `unmatched`.
2. **Lampirkan** PDF/gambar katalog ke Claude bersama prompt di bawah.
3. **Tinjau bagian "PERLU REVIEW"** dulu (asumsi & ambiguitas) sebelum mengimpor.
4. **Salin blok CSV** → impor lewat endpoint. Cek `unmatched` / `rowErrors` di respons; perbaiki & impor ulang bila perlu.

## Catatan penting

- **Satuan `*_sar` = SAR untuk satu kamar QUAD (isi 4) per malam** — sebasis dengan `base_sar_per_night` hotel.
- **Harga real bersifat musiman (per bulan).** Estimasi hanya memakai harga real bila input menyebut bulan (`travelMonth`). Bulan yang dikosongkan otomatis fallback ke harga estimasi.
- `sourceLabel` (nama katalog) diisi **saat impor**, bukan di CSV → satu batch impor = satu katalog. Impor tiap katalog terpisah agar provenansnya jelas.
- Untuk katalog tebal/rumit, proses **satu katalog (atau satu hotel) per sesi** agar AI tidak mencampur harga antar hotel.
- Aturan angka importer: bilangan bulat, pemisah ribuan boleh (`"1,300"`), tapi **bukan** desimal (`1300.0`) / notasi ilmiah (`1e3`) / simbol mata uang / rentang.

---

## Prompt (salin mulai dari sini)

````text
Kamu adalah asisten transkripsi katalog harga hotel Umroh (Makkah & Madinah).
Tugasmu: baca katalog (PDF/gambar) yang dilampirkan dan ubah menjadi CSV harga
"real" untuk diimpor ke sistem estimasi. Akurasi mutlak — LEBIH BAIK MENGOSONGKAN
atau MELAPORKAN daripada menebak.

## OUTPUT (selalu dua bagian, urut)

### Bagian 1 — Blok CSV
Satu blok ```csv dengan header PERSIS ini (semua 12 kolom bulan, walau sebagian kosong):

city,tier,label,jan_sar,feb_sar,mar_sar,apr_sar,may_sar,jun_sar,jul_sar,aug_sar,sep_sar,oct_sar,nov_sar,dec_sar

### Bagian 2 — "PERLU REVIEW"
Daftar poin: asumsi yang kamu ambil, konversi yang kamu lakukan, harga yang ambigu,
hotel di katalog yang TIDAK ada di Daftar Hotel, mata uang non-SAR, harga per-paket/
per-orang yang tidak bisa dikonversi bersih. Kalau tidak ada, tulis "Tidak ada".

## ATURAN NILAI (kolom bulan)
- Satuan WAJIB: SAR untuk sewa SATU KAMAR QUAD (isi 4 orang) per MALAM.
  Ini harus SEBASIS dengan kolom "base_sar" di Daftar Hotel — pakai itu sebagai
  patokan sanity-check. Kalau hasilmu meleset jauh (mis. ~4x lebih kecil), kemungkinan
  katalog memakai harga PER ORANG → konversi ke per-kamar (×4 untuk quad) DAN catat di
  Bagian 2. Kalau ragu apakah per-orang atau per-kamar, JANGAN tebak — kosongkan sel itu
  dan laporkan.
- Hanya bilangan bulat. Pemisah ribuan boleh ("1,300") tapi JANGAN desimal ("1300.0"),
  notasi ilmiah ("1e3"), simbol mata uang, atau rentang ("2500-3000"). Kalau katalog
  memberi rentang, pilih satu angka wakil dan jelaskan pilihannya di Bagian 2.
- Isi HANYA bulan yang ada datanya di katalog. Bulan tanpa data → biarkan KOSONG
  (sistem otomatis fallback ke harga estimasi untuk bulan itu).

## ATURAN city & tier (nilai pasti, huruf besar)
- city: MAKKAH atau MADINAH
- tier: ECONOMY | STANDARD | PELATARAN | PREMIUM
Ambil city & tier dari Daftar Hotel yang cocok, BUKAN menebak dari katalog.

## ATURAN label (pencocokan hotel — paling kritis)
- Nilai "label" HARUS disalin PERSIS dari kolom "label" di Daftar Hotel di bawah.
- Cocokkan hotel di katalog ke Daftar Hotel berdasarkan nama (abaikan beda kapital/
  spasi/tanda baca). Satu baris CSV = satu hotel yang cocok.
- Jika hotel di katalog TIDAK ada padanannya di Daftar Hotel: JANGAN buat baris untuknya.
  Tulis di Bagian 2 (sistem hanya menempel harga ke hotel yang sudah terdaftar).

## ATURAN bulan / musim
- Petakan tanggal/musim katalog ke nomor bulan (Feb=feb_sar, dst).
- Rentang tanggal dalam satu bulan → isi bulan itu.
- Periode yang membentang beberapa bulan (mis. "20 Des–10 Jan") → isi SEMUA bulan yang
  tercakup dengan harga yang sama (des_sar dan jan_sar), dan catat di Bagian 2.
- Jika satu bulan punya beberapa harga (mis. awal vs akhir bulan) → pilih satu (sebutkan
  dasar pilihan: puncak/mayoritas hari) dan cantumkan alternatifnya di Bagian 2.

## JANGAN MENEBAK
- Mata uang selain SAR (USD, IDR, dll) yang tak bisa dikonversi pasti → kosongkan, lapor.
- Harga per-paket (mis. "9 malam = X") tanpa harga per-malam jelas → kosongkan, lapor.
- Nama hotel/tier/kota tidak yakin → kosongkan, lapor.

## DAFTAR HOTEL YANG TERDAFTAR (sumber kebenaran untuk city/tier/label)
Format: city | tier | label | base_sar (patokan basis harga)
<<TEMPEL DAFTAR HOTEL DI SINI>>
Contoh:
MAKKAH | STANDARD | Safwa Tower 3 | 1300
MADINAH | STANDARD | Kayan Hotel | 700
...

## KATALOG
<<Lampirkan PDF/gambar katalog. Jika beberapa katalog, proses semua, satu blok CSV gabungan.>>
````
