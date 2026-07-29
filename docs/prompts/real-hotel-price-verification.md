# Prompt: Verifikasi CSV harga real terhadap katalog (audit)

Prompt untuk **mengaudit** file CSV harga real (mis.
[`docs/data/real-hotel-prices-2027.csv`](../data/real-hotel-prices-2027.csv)) terhadap
katalog sumbernya (PDF/gambar): cek tiap harga cocok atau tidak, dan beri catatan.

Pasangan: prompt ekstraksi ada di [`real-hotel-price-extraction.md`](./real-hotel-price-extraction.md).

## Cara pakai

1. **Lampirkan katalog** (PDF/gambar) ke Claude.
2. **Tempel baris CSV** yang mau dicek (idealnya hanya hotel yang tercakup katalog itu — CSV Kakak
   berisi banyak hotel dari beberapa katalog).
3. Baca laporan: fokus ke bagian **"PERLU DIPERBAIKI"** dan **"USULAN KOREKSI CSV"**.

## Yang penting dipahami

- CSV sudah **forecast-filled** (12 bulan terisi), tapi katalog biasanya hanya memuat sebagian bulan.
  Sel bulan yang **tidak ada di katalog** ditandai **FORECAST — tak bisa diverifikasi**, bukan error.
- Basis harga sama seperti ekstraksi: **SAR / satu kamar / malam**, sesuai kolom `room_type` baris itu.
  Kalau katalog per-orang, bandingkan setelah dikali kapasitas kamar, dan sebutkan.
- Satu hotel kini bisa punya beberapa baris (QUAD/TRIPLE/DOUBLE/QUINT). Cocokkan tiap baris ke
  KOLOM tipe kamar yang sesuai di katalog — jangan bandingkan baris DOUBLE dengan kolom QUAD.
- Prompt memaksa AI **tidak menebak**: hanya menandai "cocok"/"beda" bila angka bulan itu benar-benar
  terbaca di katalog.

---

## Prompt (salin mulai dari sini)

````text
Kamu adalah auditor harga hotel Umroh. Kamu diberi (1) katalog resmi (PDF/gambar) dan
(2) baris-baris CSV harga yang sudah tersimpan di sistem. Tugasmu: BANDINGKAN tiap harga
di CSV dengan katalog, lalu laporkan mana yang cocok, beda, atau tak bisa dicek.
JANGAN mengubah data — kamu hanya memeriksa dan memberi catatan. JANGAN menebak: kalau
sebuah angka tidak terbaca jelas di katalog, katakan begitu.

## KONTEKS PENTING
- Kolom: `room_type` (QUAD|TRIPLE|DOUBLE|QUINT, kosong = QUAD) lalu jan_sar..dec_sar
  (angka SAR untuk 1 kamar dari tipe itu, per malam).
- CSV ini sudah "forecast-filled": banyak bulan diisi perkiraan, PADAHAL katalog mungkin
  hanya memuat sebagian bulan. Karena itu:
  - Bulan yang ADA di katalog → verifikasi (cocok / beda).
  - Bulan yang TIDAK ADA di katalog → tandai "FORECAST (tak ada pembanding)". Ini BUKAN error.
- Basis harga = SAR per satu kamar per malam, sesuai `room_type`. Jika katalog memakai harga PER
  ORANG, kalikan kapasitas kamar dulu sebelum membandingkan, dan sebutkan konversinya.
- Baris TRIPLE/DOUBLE memang lebih murah dari QUAD — itu BUKAN temuan. Yang temuan: urutan
  terbalik (DOUBLE > TRIPLE atau TRIPLE > QUAD) untuk hotel & bulan yang sama.

## ATURAN PENILAIAN per sel bulan (untuk hotel yang ada di katalog)
- COCOK: angka CSV = angka katalog (untuk bulan itu).
- COCOK (dibulatkan): selisih kecil ≤ 1% atau ≤ 10 SAR (akibat pembulatan) — masih dianggap oke,
  tapi sebutkan kedua angkanya.
- BEDA: selisih lebih besar. Laporkan angka CSV vs angka katalog.
- HILANG di CSV: katalog memuat harga bulan itu, tapi sel CSV kosong.
- FORECAST: katalog tidak memuat bulan itu, CSV terisi → tidak bisa diverifikasi (bukan error).
- TIDAK JELAS: angka di katalog tidak terbaca pasti → jangan tebak, minta cek manual.
- CATATAN BASIS/SATUAN: jika perlu konversi per-orang→per-kamar atau mata uang, sebutkan.

## PENANGANAN HOTEL
- Cocokkan hotel CSV ke hotel katalog berdasarkan nama (abaikan beda kapital/spasi/ejaan ringan).
- Hotel di CSV yang TIDAK muncul di katalog ini → daftarkan di bagian "TIDAK TERCAKUP", jangan dinilai.
- Hotel di katalog yang TIDAK ada di CSV → sebutkan singkat di "ADA DI KATALOG, TAK ADA DI CSV".

## OUTPUT (urut)

### 1. RINGKASAN
Satu paragraf/angka: jumlah hotel CSV dicek, berapa cocok penuh, berapa punya minimal satu BEDA/HILANG,
berapa hotel tidak tercakup katalog. Sebutkan basis harga katalog (per kamar / per orang) yang kamu pakai.

### 2. DETAIL PER HOTEL (hanya hotel yang ada di katalog)
Untuk tiap hotel, tabel ringkas HANYA untuk bulan yang RELEVAN (ada di katalog, atau BEDA/HILANG):
  Hotel — city/tier — room_type
  | bulan | CSV | katalog | status |
Bulan-bulan yang statusnya FORECAST boleh diringkas satu baris (mis. "mar,apr,may,... = FORECAST").

### 3. PERLU DIPERBAIKI
Daftar SEL yang BEDA atau HILANG saja (buang yang cocok & forecast). Format:
  - <label> — <bulan>: CSV=<x> → katalog=<y>  (selisih <z>)
Kalau tidak ada, tulis "Tidak ada — semua nilai katalog cocok".

### 4. USULAN KOREKSI CSV (opsional)
Blok ```csv berisi HANYA baris hotel yang perlu dikoreksi, sudah diperbaiki mengikuti katalog
(pertahankan header, kolom room_type, dan semua 12 kolom bulan; sel forecast/tak berubah tetap
seperti CSV asli).
Header: city,tier,label,room_type,jan_sar,feb_sar,mar_sar,apr_sar,may_sar,jun_sar,jul_sar,aug_sar,sep_sar,oct_sar,nov_sar,dec_sar

### 5. TIDAK TERCAKUP / TIDAK JELAS
- Hotel CSV yang tidak ada di katalog ini.
- Hotel katalog yang tidak ada di CSV.
- Angka yang TIDAK JELAS terbaca dan perlu cek manual.

## CSV YANG DICEK
<<TEMPEL BARIS CSV DI SINI — sertakan baris header>>

## KATALOG
<<Lampirkan PDF/gambar katalog sumbernya.>>
````
