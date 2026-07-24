# QA Test Scenarios — Estimator & Fitur "Harga Satuan"

Tanggal: 2026-07-19
Fitur yang diuji: kolom **Harga satuan** (unit price) yang bisa diedit + auto-recompute Total /orang, di atas fitur manual override yang sudah ada.

Cara pakai: buka form estimasi, tempel **Input** tiap skenario ke kotak "Deskripsi Perjalanan", klik **Hitung Estimasi**, lalu kerjakan langkah di kolom **Yang diuji**. Isi **Skor (1–5)** + catatan di tiap baris.

> Catatan: nilai Rupiah pasti bergantung kurs & harga live di database, jadi fokus penilaian ke **(a) hasil parse benar** dan **(b) perilaku edit harga satuan** — bukan angka rupiah persis.

## Data referensi (dari seed — bisa beda kalau admin sudah update)

Kurs: **SAR 1 = Rp 4.700** · **USD 1 = Rp 17.300**

| Tier | Madinah (SAR/mlm) | Makkah (SAR/mlm) |
|------|-------------------|------------------|
| Ekonomi | 450 (Hotel Ekonomi) | 800 (Hotel Ekonomi) |
| Standard | 650 (Grand Plaza Badr Maqam) | 1.300 (Safwa Tower 3) |
| Pelataran | 2.000 (Pelataran Nabawi) | 3.500 (Pelataran Haram) |
| Premium | 3.500 (Bintang 5) | 6.000 (Bintang 5) |

Maskapai: Budget (Lion/AirAsia) 12,5jt · Standard (Batik/Saudia) 14,5jt · Garuda 17jt · Business 25jt
Layanan: Visa $165 · Siskopatuh Rp200rb · Tasreh Raudhah SAR 25 · Transport SAR 325 (÷pax) · Tour Makkah/Madinah SAR 150 (÷pax)
Kamar (pengali): Quad ×1.0 (4/kmr) · Triple ×1.25 (3/kmr) · Double ×1.5 (2/kmr) · Single ×2.8 (1/kmr)

---

## 10 Skenario

### S1 — Jamaah solo, pertama kali, cari termurah
**Input:**
> Assalamualaikum, saya mau umroh sendirian bulan Oktober, carikan yang paling hemat aja ya. Kira-kira berapa?

**Ekspektasi parse:** pax 1 · bulan Okt · hotel Ekonomi · maskapai Budget · Quad · layanan default (visa+siskopatuh+transport).
**Yang diuji:** Harga satuan hotel muncul dalam **SAR** (450/800). Edit harga satuan Madinah 450 → 500, pastikan **Total /orang** ikut naik proporsional dan caption formula berubah jadi "SAR 500 × …".
**Skor: __/5** — catatan:

### S2 — Pasangan suami-istri, sekamar berdua
**Input:**
> 12 hari untuk 2 orang suami istri, bulan November, kamar berdua aja, hotel standar, Saudia.

**Ekspektasi:** pax 2 · Double (×1.5) · Standard · maskapai Standard · bulan Nov.
**Yang diuji:** Hotel tidak punya badge ÷pax. Edit harga satuan Makkah 1.300 → 1.500 → Total naik. Lalu edit **Total /orang** langsung ke angka lain → badge "manual" muncul, harga satuan balik ke angka katalog (1.300). Klik reset (↺) → kembali otomatis.
**Skor: __/5** — catatan:

### S3 — Keluarga 4 orang, quad (baseline)
**Input:**
> 9 hari, 4 pax sekeluarga, quad, hotel standard Makkah + Madinah, Maret, visa + transport aja.

**Ekspektasi:** pax 4 · Quad · Standard · layanan hanya Visa + Transport · bulan Mar.
**Yang diuji:** Baris **Transport** punya badge ÷4. Edit harga satuan Transport SAR 325 → 400, pastikan nilai per orang naik sesuai (tetap dibagi 4). Total grup = Total/orang × 4.
**Skor: __/5** — catatan:

### S4 — Rombongan besar 10 orang + tour
**Input:**
> Rombongan 10 orang bulan Desember, hotel standard, quad, transport full rute, tambah tour ziarah Makkah dan Madinah.

**Ekspektasi:** pax 10 · Quad · Transport + Tour Makkah + Tour Madinah (semua ÷pax) · bulan Des.
**Yang diuji:** 3 baris ber-badge ÷10. Ini menguji **edit harga satuan pada baris ÷pax** — edit harga satuan Tour Makkah SAR 150 → 200 dan pastikan Total per orang naik proporsional (bukan malah jadi angka mentah). Cek Total grup = per orang × 10.
**Skor: __/5** — catatan:

### S5 — Ramadhan (peak season), dekat Haram
**Input:**
> Umroh pas Ramadhan buat 2 orang, mau yang dekat banget sama Masjidil Haram / pelataran, kamar double, Garuda.

**Ekspektasi:** bulan = Ramadhan (perkiraan Feb/Mar 2027) · hotel Pelataran · Double · Garuda · pax 2.
**Yang diuji:** Harga musiman kalau ada (harga Ramadhan mungkin beda dari base). Harga satuan pelataran besar (2.000/3.500). Edit ke SAR 4.000 → cek angka besar tampil rapi (tidak terpotong) dan Total ikut.
**Skor: __/5** — catatan:

### S6 — Orang tua lansia, minta nyaman & lengkap
**Input:**
> Orang tua saya 2 orang sudah sepuh, tolong yang nyaman bintang 5 dekat masjid, 14 hari, kamar double, langsung Garuda, lengkap semua layanan termasuk tasreh raudhah.

**Ekspektasi:** pax 2 · Premium · Double · Garuda · semua layanan (visa, siskopatuh, tasreh, transport, tour) · ~4+10 malam.
**Yang diuji:** Baris **Tasreh** (SAR 25) muncul — edit harga satuannya SAR 25 → 30 (nilai kecil, cek pembulatan). Sembunyikan (×) satu baris layanan → Total turun, baris tampil dicoret. Kembalikan lagi.
**Skor: __/5** — catatan:

### S7 — Sudah punya tiket sendiri (tanpa pesawat) + biaya tambahan
**Input:**
> Saya sudah punya tiket sendiri, cuma butuh hotel + visa + handling di sana. Ekonomi, quad, 8 hari, 3 orang.

**Ekspektasi:** maskapai NONE (Penerbangan Rp 0) · hotel Ekonomi · Quad · pax 3 · visa (+transport).
**Yang diuji:** Baris Penerbangan bernilai 0 (IDR) — harga satuannya tetap bisa diedit (baris IDR, faktor 1). Lalu klik **+ Tambah baris**, buat custom "Handling Rp 500.000": cek baris custom hanya punya **satu** field yang bisa diedit (Harga satuan = mirror read-only, Total yang diketik). Cek Total bertambah.
**Skor: __/5** — catatan:

### S8 — Sebut nama hotel spesifik
**Input:**
> 2 pax, Nov, Madinah 4 malam di Kayan Hotel, Makkah 8 malam di Olayan Ajyad, double, fullboard, Saudia, visa + siskopatuh + transport, tanpa tour.

**Ekspektasi:** hotel Madinah = Kayan, hotel Makkah = Olayan Ajyad (match by nama) · Double · Nov · tanpa tour.
**Yang diuji:** Label baris menampilkan nama hotel spesifik. Harga satuan = SAR sesuai hotel tsb. Edit harga satuan Makkah → Total & caption ikut. Klik **Salin** → cek teks salinan memuat nilai hasil edit.
**Skor: __/5** — catatan:

### S9 — Minta harga pesawat spesifik (override nilai langsung)
**Input:**
> Estimasi 4 orang, 9 hari, standard, quad, Saudia, visa + transport. Tapi pesawat tolong pakai 13 juta ya, saya dapat promo.

**Ekspektasi:** params standard; harga pesawat kemungkinan perlu **diedit manual** ke Rp 13.000.000 (parse mungkin tidak set angka manual — ini menguji edit **Total /orang** langsung).
**Yang diuji:** Edit **Total /orang** baris Penerbangan → 13.000.000. Badge "manual" muncul, harga satuan tetap tampil angka katalog. Pastikan mengedit Total menghapus override harga satuan (kalau sebelumnya ada) — konsistensi kolom.
**Skor: __/5** — catatan:

### S10 — Nego harga hotel (INTI fitur baru)
**Input:**
> 3 orang, 12 hari, standard, triple, Garuda, lengkap. Hotel Makkah saya sudah nego dapat SAR 1.150 per malam, tolong pakai harga itu.

**Ekspektasi:** pax 3 · Triple (×1.25) · Standard · Garuda · lengkap.
**Yang diuji:** Inti fitur — edit **Harga satuan** Makkah dari 1.300 → **1.150**. Pastikan: (1) Total /orang turun proporsional, (2) caption formula jadi "SAR 1.150 × 12 malam × … ÷ 3 orang", (3) badge "manual", (4) klik reset (↺) kembali ke 1.300. Bandingkan: apakah lebih intuitif nego lewat harga satuan vs. lewat Total?
**Skor: __/5** — catatan:

---

## Cakupan matriks (untuk memastikan tidak ada yang terlewat)

| Aspek | Skenario |
|-------|----------|
| Semua tier hotel | S1 Eko, S2/S3 Std, S5 Pelataran, S6 Premium |
| Semua tipe kamar | S1 Quad, S2 Double, S10 Triple, (Single — tambahkan bila perlu) |
| Maskapai incl NONE | S1 Budget, S2 Std, S5/S6 Garuda, S7 NONE |
| Layanan ÷pax | S3 Transport, S4 Tour+Transport |
| Layanan nilai kecil (Tasreh) | S6 |
| Musiman (travelMonth) | S3, S5 (Ramadhan) |
| Hotel spesifik by nama | S8 |
| **Edit harga satuan → auto value** | S1, S2, S3, S4, S5, S8, S10 |
| **Edit harga satuan baris ÷pax** | S4 |
| **Override nilai langsung (idr)** | S2, S9 |
| **Baris IDR nilai 0 tetap editable** | S7 |
| Custom row (mirror read-only) | S7 |
| Sembunyikan/reset baris | S6, S2, S10 |
| Format angka besar tidak terpotong | S5 |

## Template penilaian (isi setelah testing)

Untuk tiap skenario: Skor 1–5 (1=salah/berat, 5=sempurna) + catatan singkat "apa yang meleset".
Yang paling ingin aku tahu darimu:
1. Apakah **parse** (AI mengisi hotel/kamar/maskapai/layanan/bulan) sering meleset? Skenario mana?
2. Apakah **edit harga satuan** terasa intuitif & angkanya benar?
3. Ada perilaku membingungkan (mis. baris custom, baris ÷pax, angka 0)?
