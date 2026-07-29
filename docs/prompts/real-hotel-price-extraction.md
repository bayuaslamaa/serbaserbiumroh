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

- **Satuan `*_sar` = SAR untuk satu kamar per malam, sesuai kolom `room_type` baris itu.** Baris `QUAD` sebasis dengan `base_sar_per_night` hotel; baris `TRIPLE`/`DOUBLE` wajar lebih murah, `QUINT` lebih mahal.
- **Satu hotel = beberapa baris**, satu per tipe kamar yang dicantumkan katalog (`QUAD`, `TRIPLE`, `DOUBLE`, `QUINT`). Kolom `room_type` boleh dikosongkan dan otomatis dibaca sebagai `QUAD`, sehingga CSV lama tanpa kolom ini tetap bisa diimpor.
- **Harga per tipe kamar dipakai apa adanya.** Kalau katalog memuat harga DOUBLE, sistem memakai angka itu langsung — rasio global (Quint 1.15 / Triple 0.85 / Double 0.7) TIDAK ikut dikalikan. Salah menaruh harga per-orang di baris tipe kamar akan langsung merusak kuotasi.
- **Harga real bersifat musiman (per bulan).** Estimasi hanya memakai harga real bila input menyebut bulan (`travelMonth`). Bulan yang dikosongkan otomatis fallback ke harga estimasi.
- `sourceLabel` (nama katalog) diisi **saat impor**, bukan di CSV → satu batch impor = satu katalog. Impor tiap katalog terpisah agar provenansnya jelas.
- Untuk katalog tebal/rumit, proses **satu katalog (atau satu hotel) per sesi** agar AI tidak mencampur harga antar hotel.
- Aturan angka importer: bilangan bulat, pemisah ribuan boleh (`"1,300"`), tapi **bukan** desimal (`1300.0`) / notasi ilmiah (`1e3`) / simbol mata uang / rentang.

## Forecast bulan kosong (opsional)

Prompt menghasilkan **dua blok CSV**: (1) **hanya nilai katalog asli**, dan (2) **12 bulan terisi**
dengan bulan kosong diperkirakan dari pola musiman. Gunakan yang mana:

- **Impor blok "dari katalog"** bila ingin konservatif — bulan tanpa data tetap fallback ke estimasi lama.
- **Impor blok "dengan forecast"** bila ingin cakupan real lebih penuh.

> ⚠️ Nilai forecast yang diimpor akan tampil dengan badge **"harga real"** sama seperti harga katalog asli
> (UI tidak membedakan forecast vs katalog). Jika ingin jejaknya jelas, impor blok forecast sebagai
> **batch terpisah** dengan `sourceLabel` berbeda, mis. `"Katalog Emaar 2027 (forecast)"`.

---

## Prompt (salin mulai dari sini)

````text
Kamu adalah asisten transkripsi katalog harga hotel Umroh (Makkah & Madinah).
Tugasmu: baca katalog (PDF/gambar) yang dilampirkan dan ubah menjadi CSV harga
"real" untuk diimpor ke sistem estimasi. Akurasi mutlak — LEBIH BAIK MENGOSONGKAN
atau MELAPORKAN daripada menebak.

## OUTPUT (selalu tiga bagian, urut)

Header CSV untuk Bagian 1 & 2 PERSIS ini (semua 12 kolom bulan, walau sebagian kosong):

city,tier,label,room_type,jan_sar,feb_sar,mar_sar,apr_sar,may_sar,jun_sar,jul_sar,aug_sar,sep_sar,oct_sar,nov_sar,dec_sar

### Bagian 1 — Blok CSV "DARI KATALOG" (nilai asli saja)
Satu blok ```csv. HANYA isi sel bulan yang benar-benar tercantum di katalog. Bulan lain kosong.
Ini yang aman diimpor sebagai harga real otoritatif.

### Bagian 2 — Blok CSV "DENGAN FORECAST" (opsional, 12 bulan terisi)
Satu blok ```csv terpisah. Salin semua nilai katalog dari Bagian 1, lalu ISI bulan yang kosong
dengan forecast mengikuti "ATURAN FORECAST" di bawah. Jika sebuah hotel tidak punya cukup sinyal
untuk forecast, biarkan selnya tetap kosong (jangan dipaksa). Blok ini untuk dipertimbangkan
manusia — nilainya bukan dari katalog.

### Bagian 3 — "PERLU REVIEW & CATATAN FORECAST"
Daftar poin: (a) asumsi/konversi yang kamu ambil, harga ambigu, hotel di katalog yang TIDAK ada di
Daftar Hotel, mata uang non-SAR, harga per-paket/per-orang yang tak bisa dikonversi bersih; dan
(b) SETIAP sel forecast di Bagian 2 — sebutkan hotel, bulan, angka, metode (interpolasi/rasio
pembanding), dan bulan/harga acuannya. Kalau tidak ada yang perlu direview, tulis "Tidak ada".

## ATURAN NILAI (kolom bulan)
- Satuan WAJIB: SAR untuk sewa SATU KAMAR per MALAM, sesuai `room_type` baris itu.
  Untuk baris QUAD, angkanya harus SEBASIS dengan kolom "base_sar" di Daftar Hotel — pakai itu
  sebagai patokan sanity-check. Kalau hasilmu meleset jauh (mis. ~4x lebih kecil), kemungkinan
  katalog memakai harga PER ORANG → konversi ke per-kamar (×4 untuk quad) DAN catat di
  Bagian 3. Kalau ragu apakah per-orang atau per-kamar, JANGAN tebak — kosongkan sel itu
  dan laporkan.
- Baris TRIPLE/DOUBLE **sengaja lebih kecil** dari base_sar dan itu BUKAN error — jangan
  "dikoreksi" naik agar mendekati base_sar. Yang wajib benar: DOUBLE ≤ TRIPLE ≤ QUAD ≤ QUINT
  untuk hotel dan bulan yang sama. Kalau katalog melanggar urutan itu, laporkan di Bagian 3.
- Hanya bilangan bulat. Pemisah ribuan boleh ("1,300") tapi JANGAN desimal ("1300.0"),
  notasi ilmiah ("1e3"), simbol mata uang, atau rentang ("2500-3000"). Kalau katalog
  memberi rentang, pilih satu angka wakil dan jelaskan pilihannya di Bagian 3.
- Di Bagian 1, isi HANYA bulan yang ada datanya di katalog. Bulan tanpa data → biarkan KOSONG
  (sistem otomatis fallback ke harga estimasi untuk bulan itu). Pengisian bulan kosong hanya
  dilakukan di Bagian 2 sesuai ATURAN FORECAST.

## ATURAN city & tier (nilai pasti, huruf besar)
- city: MAKKAH atau MADINAH
- tier: ECONOMY | STANDARD | PELATARAN | PREMIUM
Ambil city & tier dari Daftar Hotel yang cocok, BUKAN menebak dari katalog.

## ATURAN label (pencocokan hotel — paling kritis)
- Nilai "label" HARUS disalin PERSIS dari kolom "label" di Daftar Hotel di bawah.
- Cocokkan hotel di katalog ke Daftar Hotel berdasarkan nama (abaikan beda kapital/
  spasi/tanda baca). Satu baris CSV = satu hotel yang cocok.
- Jika hotel di katalog TIDAK ada padanannya di Daftar Hotel: JANGAN buat baris untuknya.
  Tulis di Bagian 3 (sistem hanya menempel harga ke hotel yang sudah terdaftar).

## ATURAN room_type (kolom baru — satu hotel jadi beberapa baris)
- Nilai pasti, huruf besar: `QUAD` | `TRIPLE` | `DOUBLE` | `QUINT`. Kosong = `QUAD`.
- Petakan istilah katalog: `DBL`/`Double` → DOUBLE; `TRP`/`TRPL`/`Triple` → TRIPLE;
  `QUAD`/`Quad` → QUAD; `QUINT`/`Pent` → QUINT. **Jangan tulis singkatan katalog apa adanya** —
  `DBL` akan ditolak importer sebagai row error.
- Buat satu baris per tipe kamar yang BENAR-BENAR dicantumkan katalog untuk hotel itu.
  Kebanyakan katalog hanya memuat DBL/TRPL/QUAD; sebagian (mis. Saif Al Yamani, Al Manara)
  juga memuat QUINT.
- **JANGAN menurunkan tipe yang tidak dicetak katalog.** Kalau katalog tak punya kolom QUINT,
  jangan buat baris QUINT — sistem otomatis memakai harga QUAD × rasio global untuk tipe itu.
- Suite / Junior Suite / Executive Suite / Royal Suite **diabaikan** — sistem belum punya tipe itu.
  Sebut di Bagian 3 kalau katalog memuatnya.

## ATURAN bulan / musim
- Petakan tanggal/musim katalog ke nomor bulan (Feb=feb_sar, dst).
- Rentang tanggal dalam satu bulan → isi bulan itu.
- **Satu bulan dicakup beberapa periode → pilih periode yang menutupi PALING BANYAK HARI di
  bulan itu.** Ini aturan yang sudah dipakai kolom QUAD di
  [`real-hotel-prices-2027.csv`](../data/real-hotel-prices-2027.csv); memakai aturan lain
  (mis. "periode yang memuat tanggal 15") membuat baris TRIPLE/DOUBLE baru tidak sebaris
  dengan baris QUAD yang sudah ada. Contoh: periode 09/07–16/07 dan 16/07–30/07 sama-sama
  menyentuh Juli, tapi yang kedua menutupi 14 hari Juli vs 7 hari → pakai yang kedua.
  Sebutkan alternatifnya di Bagian 3 kalau selisihnya > 10%.
- Periode yang membentang beberapa bulan (mis. "20 Des–10 Jan") → isi SEMUA bulan yang
  tercakup dengan harga yang sama (des_sar dan jan_sar), dan catat di Bagian 3.
- **Semua tipe kamar satu hotel wajib memakai pemetaan bulan yang sama.** DOUBLE dan QUAD
  hotel yang sama harus mengambil dari periode yang sama untuk bulan yang sama.

## ATURAN FORECAST (hanya untuk Bagian 2 — mengisi bulan kosong dari pola)
Tujuan: memperkirakan harga bulan yang TIDAK tercantum di katalog, dari pola musiman yang terlihat.
Ini perkiraan, bukan data katalog — semua sel forecast WAJIB dicatat di Bagian 3.
- **Basis utama = pola hotel itu sendiri.** Interpolasi di antara dua bulan yang diketahui pada hotel
  yang SAMA (mis. May kosong tapi Apr & Jun ada → ambil nilai di antaranya mengikuti tren).
- **Tanpa bulan pengapit** (mis. satu kuartal penuh kosong): pakai bentuk pola musiman hotel-hotel
  LAIN di tier/kota yang sama pada katalog ini sebagai rasio, lalu skalakan ke level harga hotel ini.
- **Kenali musim Umroh:** puncak sekitar Ramadan (umumnya Feb–Mar) dan libur akhir tahun (Des);
  low season sekitar musim panas (Jun–Aug). Nilai forecast JANGAN melebihi puncak yang diketahui
  atau di bawah lembah yang diketahui untuk hotel itu, kecuali polanya sangat jelas.
- **Bulatkan** ke angka wajar (mis. kelipatan 5/10 SAR).
- **Jangan forecast bila sinyal kurang:** hotel punya < 2 bulan terisi DAN tidak ada hotel pembanding
  sejenis → biarkan sel itu kosong di Bagian 2 juga.
- Ikuti semua ATURAN NILAI (satuan, format angka) yang sama seperti nilai katalog.

### Forecast baris TRIPLE / DOUBLE / QUINT
Jangan forecast tipe kamar memakai rasio global. Pakai **selisih per kasur milik hotel itu sendiri**,
diambil dari bulan berkatalog yang PALING DEKAT:

    TRIPLE(bulan kosong) = QUAD(bulan itu) − (QUAD − TRIPLE) di bulan berkatalog terdekat
    DOUBLE(bulan kosong) = QUAD(bulan itu) − (QUAD − DOUBLE) di bulan berkatalog terdekat

Selisih ini **beda tiap hotel dan bisa beda tiap periode** — AZKA Al-Safa naik +50, lalu +75, lalu
+85 sepanjang tiga periodenya, sedangkan Maysan Al Mashaer tetap +80 di keenam periodenya. Karena
itu ambil selisih dari bulan terdekat, bukan satu angka tetap per hotel.

Jarak bulan dihitung melingkar (Desember bertetangga dengan Januari). **Kalau dua bulan berkatalog
sama-sama terdekat**, pakai yang bulannya lebih awal, dan sebutkan pilihan itu di Bagian 3 — mis.
Januari berjarak 5 bulan dari Juni maupun Agustus, dan aturan ini memilih Juni.

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
