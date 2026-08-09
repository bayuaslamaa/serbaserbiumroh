# Koreksi kerja — harga katalog & halaman /pricelist-hotel

**Tanggal:** 9 Agustus 2026
**Untuk:** Kakak, atau siapa pun (manusia/AI) yang Kakak minta memeriksa.

Dokumen ini ada supaya pekerjaan saya bisa **dijatuhkan**, bukan disetujui.
Saya sudah salah beberapa kali di sesi ini — daftarnya ada di bagian 4 — jadi
anggap setiap klaim di bawah sebagai **dugaan yang perlu diuji**, bukan hasil.

Semua pekerjaan di bawah **belum di-push dan belum masuk `main`.**

---

## 0. Cara pakai

Ada dua bagian yang berdiri sendiri. Kerjakan yang mana pun lebih mendesak:

| Bagian | Isi | Risiko kalau salah |
|---|---|---|
| **A. Data harga** | `docs/data/real-hotel-prices-2027.csv`, belum di-commit | Kuotasi ke jamaah salah — langsung rugi uang |
| **B. Halaman /pricelist-hotel** | Branch `feat/pricelist-hotel-page`, 6 commit | Bug tampilan / kebocoran akses |

**Bagian A jauh lebih mendesak.** Kode yang salah ketahuan saat dipakai; harga
yang salah ketahuan setelah jamaah membayar.

Kalau memakai AI: salin blok prompt di bagian 5, lampirkan katalog dari
`docs/pricelist/`, dan **jangan** beri tahu kesimpulan saya lebih dulu.

---

## 1. Bagian A — apa yang berubah di CSV

Seluruh perubahan ada dalam satu diff yang belum di-commit:

```
git diff docs/data/real-hotel-prices-2027.csv
```

Berkas naik dari 89 ke 98 baris (67 hotel). Perubahannya datang dua gelombang.

### Gelombang 1 — dari katalog edisi Juli

Katalog Juni berhenti 12/09/2026. Tiga katalog Juli menjangkau jauh lebih
panjang, jadi September ke belakang berubah:

- **Koreksi September, 6 hotel Makkah.** Bukan penambahan — perbaikan. Edisi
  Juli menambah periode `12/09–25/09` yang lebih panjang dari `05/09–12/09`,
  sehingga pemenang bulan September berpindah. Contoh: Snood Ajyad 480 → 555.
- **Okt–Des jadi data nyata**, sebelumnya forecast. Beberapa **turun** —
  Maysan Al Mashaer Des 920 → 870, Anjum 1.160 → 985 — karena forecast lama
  mengasumsikan lonjakan akhir tahun yang tidak ada di katalog.
- **9 baris tipe kamar baru** (Anjum, Movenpick, Al Olayan, Mira Ajyad).

### Gelombang 2 — koreksi hasil audit (hari ini, 50 sel)

| Hotel | Bulan | Dari | Jadi | Sebab |
|---|---|---|---|---|
| Waqaf Uthman Ben Affan | jul–jan | 540…900 | 650…1.010 | baris dibangun dari katalog **musim 1447H** |
| Al Mokhtara International | jul–jan | 480…830 | 580…890 | idem |
| Al Mokhtara Golden | jul | 400 | 510 | sel Juli dari pita pertama 1447H |
| Rawdit Al Mokhtara | jul | 390 | 510 | idem |
| Mokhtara Plaza | jul | 410 | 530 | idem |
| Elaf Taiba | des | 1.175 | 1.105 | satu-satunya periode Des yang berharga |
| Al Olayan Ajyad | feb | 1.395 | 980 | periode `5 Jan–6 Feb` yang sama dengan Jan |
| Movenpick, Al Olayan, Mira Ajyad | jan/feb/jun/jul | kosong | terisi | baris tipe kamar tertinggal dari baris QUAD-nya |
| Maysan Altaqwa, Grand Plaza Badr al maqom, Grand Plaza Al Madina | feb, semua tipe kamar yang tersedia | forecast/kosong | tarif katalog Jan–7 Feb | periode katalog masih mencakup 7 hari Februari |
| Anjum | jun, DOUBLE/TRIPLE | 595/715 | kosong | katalog baru mulai 30 Juli; Juni tidak punya dukungan sumber |

---

## 2. Bagian A — cara memeriksanya

### Aturan yang saya pakai (uji juga aturannya, bukan hanya angkanya)

1. **Satuan: SAR, satu kamar, per malam**, sesuai `room_type` baris itu.
2. **Penyusutan bulan:** kalau beberapa periode menyentuh satu bulan, bulan itu
   mengambil periode yang menutupi **hari terbanyak**. Bukan periode yang memuat
   tanggal 15.
3. **Penyusutan dihitung atas gabungan periode semua katalog** yang mencakup
   hotel itu — bukan per katalog. Periode Juli yang menutupi 2 hari kalah dari
   periode edisi Juni yang menutupi 14 hari.
4. **Bulan tanpa data katalog dibiarkan forecast** dan bukan kesalahan.

### Tiga jebakan yang membuat pemeriksa keliru

**Musim.** Tidak semua berkas di `docs/pricelist/` adalah musim 1448H:

| Berkas | Musim | Rentang |
|---|---|---|
| `Hotel Rates 1448 H - Mekkah 29 July & Madinah 23 Juli` | 1448H | 30/07/26 – 07/02/27 |
| `(Makka Hotel 2026) … 31 July 2026` | 1448H | 01/08/26 – 09/06/27 |
| `(Madina Hotel 2026) … 28 July 2026` | 1448H | 01/08/26 – 06/04/27 |
| `AZKA HOTEL PRICE LIST` | 1448H | 20/06/26 – 01/09/26 |
| **`Price list umrah far East 1_compressed…`** | **1447H** | **11/07/25 – 12/02/26** |
| **`للعرض RAMADAN PRICES…`** | **1447H** | **12/02/26 – 18/04/26** |

Dua yang terakhir **satu musim lebih awal**. Itulah sumber kesalahan terbesar
yang ditemukan audit. Kalau menemukan baris yang cocok dengan dua berkas itu,
baris itu kemungkinan salah musim.

**Markup grosir.** PT Alharmain menjual ulang inventaris Maysan dengan
**+50 SAR/kamar/malam** — konsisten di sembilan hotel × tiga tipe kamar × dua
edisi. Itu margin, bukan salah transkripsi. CSV sengaja memakai tarif
**langsung** setiap kali ada. Jangan "memperbaikinya" ke angka grosir.

**Rencana makan.** Sistem menganggap semua tarif **sudah termasuk fullboard**.
Sebagian katalog memuat RO (room only), BB, atau HB. Bandingkan hanya yang
sebasis. Katalog `(International Makka Hotel 2026) 21 July` seluruhnya BB/RO/HB
— **sengaja tidak saya impor** karena alasan ini.

### Yang paling mungkin masih salah

Urut dari yang paling saya ragukan:

1. **Sel Februari–Mei mana pun.** Hampir tidak ada katalog menjangkau ke sana;
   itu forecast. Ramadan 1448H mulai ±8 Februari 2027 dan **katalognya tidak
   ada di folder ini**.
2. **AZKA Al Safa & Al Maqam, Okt–Des.** AZKA sendiri berhenti 1 September.
   Satu-satunya pembanding adalah lembar grosir, dan Desember di CSV ~20% di
   atas apa pun yang tercetak.
3. **Hotel yang cuma punya 1–2 bulan berkatalog** — Taiba Front, Sanabel,
   Kayan International, Wardat Alrayan, Wrdat Alsaadah. Sisanya tebakan.
4. **Borj Al Mokhtara.** Padanannya ke "Al Mokhtara Tower" adalah **inferensi**
   dari arti nama, tidak tercetak. Saya **tidak** mengoreksi 7 sel-nya.
5. **`Jiwar Al Sana`** — semua katalog mencetak "Jiwar Al **Saha**". Harganya
   cocok, jadi hotelnya benar; namanya kemungkinan salah ketik.

---

## 3. Bagian B — halaman /pricelist-hotel

Branch `feat/pricelist-hotel-page`, enam commit di atas `main` (`03a9530`).
Halaman baru di `/pricelist-hotel`, **hanya untuk user yang sudah login**,
menampilkan tarif katalog apa adanya dari tabel `real_hotel_prices`.

```
git log --oneline 03a9530..HEAD
git diff 03a9530 -- . ':!docs/data'
```

**Belum dijalankan: impor CSV terkoreksi ke basis data (U0).** Pemeriksaan
read-only menemukan basis data target saat ini sudah berisi 1.068 baris dan
empat tipe kamar (DOUBLE, TRIPLE, QUAD, QUINT), dengan pembaruan terakhir
29 Juli 2026. Namun 50 koreksi audit di atas belum diterapkan. Runbook-nya ada di
`docs/ops/neon-branch-dummy-db.md` — perhatikan peringatannya: **verifikasi
target lewat hostname, bukan jumlah baris**, karena `real_hotel_prices` punya
jumlah baris identik di branch maupun produksi.

### Yang layak diperiksa

- **Akses.** Buka `/pricelist-hotel` dalam mode penyamaran → harus mendarat di
  `/login`. Masuk sebagai user biasa (bukan admin) → halaman harus tampil sama
  seperti untuk admin.
- **Sel kosong.** Bulan tanpa data harus terlihat kosong dengan glif redup —
  bukan `0`, bukan tanda hubung yang terbaca seperti tarif, bukan sel benar-benar
  kosong. Dua belas baris bulan harus selalu tampil.
- **Tidak boleh ada rupiah di mana pun.** Halaman ini hanya SAR.
- **Pilih bulan** → daftar menciut jadi satu baris per hotel. Coba juga bulan
  yang tidak dicakup hotel mana pun — dulu itu merender tabel tanpa kolom harga
  sama sekali; sudah diperbaiki, tapi layak dicek ulang.
- **375px.** Tabel harus menggulir di dalam wadahnya, bukan menggulirkan halaman.

### Keputusan yang saya ambil dan mungkin Kakak tidak setujui

- **Akses "semua user login" adalah soal bentuk halaman, bukan kerahasiaan.**
  Dipilih setelah tahu pendaftaran Google terbuka bebas — lalu ternyata premis
  di bawahnya salah: `docs/data/real-hotel-prices-2027.csv` dan berkas forecast
  per-bed-nya **terbit di repo GitHub publik**. Diverifikasi 9 Agustus 2026:
  API mengembalikan `private: false`, dan URL mentahnya HTTP 200 dengan angka
  yang sama, tanpa sesi dan tanpa akun. Kakak memilih membiarkannya, dengan
  alasan daftar harga hotel bukan rahasia dagang.

  Konsekuensi untuk pemeriksa: **jangan menilai gerbang login halaman ini
  sebagai kontrol kerahasiaan.** Ia menjaga penyajian — supaya angka pemasok
  tidak masuk navigasi publik dan hasil pencarian — bukan menjaga datanya.
  Empat berkas harga lain juga terbit, tapi semuanya turunan OTA (harga tayang
  Agoda/Booking), jadi tidak membocorkan apa pun yang belum publik.
- **Mode bulan tidak diurutkan termurah-dulu.** Tipe kamar adalah basis berbeda;
  satu pengurutan lintas kolom akan memeringkat berdasarkan basis mana yang
  kebetulan ada. Kalau mau termurah-dulu, perlu basis yang ditetapkan.
- **`sourceLabel` ditampilkan apa adanya** plus legenda, tanpa badge "forecast".
  Tidak ada kolom penanda di skema, dan mencocokkan substring akan mengubah satu
  salah ketik jadi tarif yang terbaca otoritatif.

---

## 4. Kesalahan saya yang sudah terbukti di sesi ini

Ini bukan basa-basi — ini kalibrasi. Semua ditemukan orang/agen lain, bukan
oleh saya:

| Klaim saya | Kenyataan |
|---|---|
| "Saif Al Yamani harganya per-orang, kuotasi meleset 4×" | Katalog mencetaknya sebagai *flat rate* per kamar. Masalah sebenarnya **RO vs FB**. |
| "Baris Millennium 400 SAR tanpa sumber" | Ada sumbernya — Millenium Makkah Al Naseem, 4★, FB, cocok tujuh bulan. Yang salah **tier**-nya. |
| "Grand Zowar ≡ Diyafa itu kesalahan salin" | Saya pakai katalog **1447H**. Katalog 1448H mencetak keduanya identik. |
| "Hotfix `26f16f9` preseden menyembunyikan harga katalog" | Yang disembunyikan harga **IDR turunan estimasi**, bukan `real_hotel_prices`. |
| "Omission + komentar adalah satu-satunya proteksi sitemap" | `lib/seo/__tests__/routes.test.ts` sudah menjaganya secara mekanis. |
| "Kopling transitif di luar jangkauan pemindaian sumber" | Bisa. 15 berkas dari halaman, 8 dari klien. |
| Verification Contract saya | **Tidak punya baris build.** Branch sempat tidak bisa di-build sambil lolos semua gerbang yang saya definisikan. |

Pola yang berulang: **saya menyimpulkan dari kemiripan** — nama mirip, angka
mirip, dua dari tiga cocok — lalu berhenti sebelum memverifikasi yang ketiga.
Kalau Kakak hanya punya waktu memeriksa satu hal, periksa klaim saya yang
bersandar pada kecocokan nama atau kecocokan sebagian.

---

## 5. Prompt siap-tempel

Salin blok ini ke AI, lampirkan katalog yang relevan dari `docs/pricelist/`,
dan **jangan** sertakan kesimpulan saya.

````text
Kamu auditor harga hotel Umroh. Tugasmu MENJATUHKAN sebuah berkas data, bukan
menyetujuinya. Berkas ini baru saja diubah oleh AI lain; asumsikan ada kesalahan
dan carilah. Melaporkan "semua cocok" tanpa menunjukkan apa yang kamu uji tidak
berguna.

## Yang diperiksa
docs/data/real-hotel-prices-2027.csv (belum di-commit; `git diff` menunjukkan
seluruh perubahannya). Kolom: city, tier, label, room_type, jan_sar..dec_sar.

## Aturan
- Satuan WAJIB: SAR, SATU KAMAR, per MALAM, sesuai room_type baris itu.
- Penyusutan bulan: bila beberapa periode menyentuh satu bulan, bulan itu
  mengambil periode yang menutupi HARI TERBANYAK. Bukan periode yang memuat
  tanggal 15.
- Hitung penyusutan atas GABUNGAN periode dari semua katalog yang mencakup hotel
  itu, bukan per katalog. Periode 2 hari kalah dari periode 14 hari.
- Bulan yang tidak dicakup katalog mana pun = FORECAST, bukan kesalahan. Jangan
  laporkan sebagai temuan.
- Urutan wajib: DOUBLE <= TRIPLE <= QUAD <= QUINT untuk hotel & bulan yang sama.

## Tiga jebakan — abaikan ini dan laporanmu akan salah
1. MUSIM. Periksa musim setiap katalog SEBELUM membandingkan. Beberapa berkas di
   folder ini musim 1447H (Jul 2025 - Apr 2026), sementara CSV menargetkan 1448H
   (Jun/Jul 2026 - Feb 2027). Katalog musim salah akan berbeda di mana-mana, dan
   itu bukan kesalahan CSV — itu pembanding yang salah. Sebutkan musim dan
   rentang tanggal setiap berkas yang kamu pakai.
2. MARKUP GROSIR. Bila satu hotel & periode berbeda antara dua katalog, cek
   apakah selisihnya konstan di banyak hotel dari penerbit yang sama. Kalau ya
   itu margin, bukan salah ketik. Laporkan polanya.
3. RENCANA MAKAN. Sistem menganggap tarif sudah termasuk FULLBOARD. Katalog yang
   memuat RO/BB/HB tidak sebasis. Sebutkan basis setiap angka yang kamu kutip.

## Yang harus kamu kerjakan
Untuk setiap hotel, HANYA untuk bulan yang benar-benar dihargai katalog:
  bulan | CSV | katalog | status (COCOK / BEDA / HILANG / TIDAK JELAS)
Ringkas bulan forecast dalam satu baris.

Lalu:
- PERLU DIPERBAIKI: hanya sel BEDA dan HILANG, format
  `<label> — <bulan>: CSV=<x> -> katalog=<y>`. Kalau tidak ada, katakan begitu.
- TIDAK TERCAKUP: hotel CSV yang tidak ada di katalog mana pun, dan hotel
  katalog yang tidak ada di CSV.
- TIDAK YAKIN: apa pun yang tidak terbaca pasti, dan setiap tempat kamu
  MENYIMPULKAN alih-alih MEMBACA — terutama padanan nama hotel yang tidak
  identik.

## Jangan menebak
Mata uang selain SAR yang tak bisa dikonversi pasti, harga per-paket tanpa tarif
per-malam jelas, nama hotel yang tidak yakin -> kosongkan dan laporkan. Lebih
baik "tidak bisa saya pastikan" daripada angka yang salah.

## Katalog
<<lampirkan berkas dari docs/pricelist/>>
````

---

## 6. Kalau ingin ringkas

Tiga hal yang paling berharga untuk Kakak periksa sendiri, berurut:

1. **Movenpick Madinah.** Edisi 15 Juni (berlabel "SUPERIOR ROOM") memberi
   1.180; edisi 28 Juli tanpa label kamar memberi 1.620 — selisih ~37%,
   penerbit sama, malam sama. Bisa kenaikan tarif, bisa kelas kamar berbeda.
   **Belum saya ubah.** Ini butuh satu pertanyaan ke pemasok.
2. **Empat baris berbasis salah.** Saif Al Yamani dan Dar Al-Naeem room-only;
   Kayan International, Wardat Alrayan, Wrdat Alsaadah pakai lembar datar tanpa
   keterangan makan; Makarem adalah suite RO, bukan kamar quad. Semuanya akan
   mengkuotasi terlalu murah. **Belum saya ubah** — menaikkannya ke basis FB
   adalah keputusan kebijakan.
3. **Impor U0** sebelum halaman `/pricelist-hotel` dianggap benar. Sampai itu
   jalan, halaman menampilkan impor multi-tipe kamar dari 29 Juli, bukan CSV
   yang sudah dikoreksi pada audit ini.
