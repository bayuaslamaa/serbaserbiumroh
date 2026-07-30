# Fitur "Pakai harga katalog" — ringkasan pekerjaan

**Tanggal:** 30 Juli 2026
**Branch:** `feat/real-price-grounded-parse`
**Rencana:** `docs/plans/2026-07-29-001-feat-real-price-grounded-parse-plan.md`
**Status:** keempat unit selesai, **belum di-commit**, belum diuji ke API sungguhan

---

## Ringkas dalam tiga kalimat

Sebelum ini, AI memilih hotel **tanpa pernah melihat harga aslinya** — ia hanya diberi tanda
"hotel ini ada di katalog" (ya/tidak), sementara angka sebenarnya baru dihitung setelah AI
selesai memilih. Sekarang ada satu centang opsional yang membuat AI bisa *membaca* tarif katalog
per bulan dan per tipe kamar, lalu memilih hotel berdasarkan angka itu. Kalau centangnya mati,
semuanya berjalan persis seperti sebelumnya.

---

## Masalah yang diperbaiki

Bayangkan Kakak menyuruh seseorang memilih hotel dengan aturan: *"yang di bawah 900 SAR bulan
Maret"* — tapi orang itu hanya diberi daftar nama hotel plus catatan "harganya ada di buku",
tanpa boleh membuka bukunya. Ia akan menebak.

Itu yang terjadi di sistem lama:

| | Yang AI lihat | Yang sebenarnya ada |
|---|---|---|
| Sebelum | `Kayan Hotel — real=true` | Kayan Hotel, Maret, QUAD: 620 SAR (Katalog 1448H) |

Akibatnya AI bisa **memilih** hotel yang ada di katalog, tapi tidak bisa memilih yang **lebih
murah**, dan tidak tahu kalau pilihannya melampaui batas budget yang Kakak sebut.

Masalah kedua: seluruh daftar 111 hotel dikirim ke AI **setiap kali** dipanggil (~5.500-6.500
token, hanya ~1.500 yang bisa di-cache). Mahal, dan tetap tidak menyelesaikan masalah pertama.

---

## Yang dibangun

Empat lapisan, dari paling dalam ke yang Kakak lihat:

### U1 — Naikkan versi SDK Anthropic

`0.36.3` → `0.115.0`. Membosankan tapi wajib: di versi lama, folder `helpers/` yang berisi
mesin pemanggil tool **tidak ada sama sekali**, jadi U2 secara harfiah tidak bisa dibangun.

Setelah upgrade, satu direktif `@ts-expect-error` di `lib/ai/parse.ts` jadi tidak terpakai lagi
(TypeScript sendiri yang melaporkannya) — bukti bahwa tipenya benar-benar sudah menyusul.

### U2 — Dua "tool" agar AI bisa membaca harga

Ini inti perbaikannya. Alih-alih menjejalkan 111 hotel ke prompt, AI sekarang punya dua
kemampuan yang bisa ia panggil sendiri saat perlu:

| Tool | Fungsinya | Contoh |
|---|---|---|
| `cari_hotel` | Cari hotel sesuai kriteria | "Madinah, bintang 4, di bawah 900 SAR bulan Maret, jalan kaki" |
| `harga_hotel` | Tanya harga satu hotel | "Kayan Hotel, bulan November, kamar QUAD" |

**Setiap hasil membawa asal-usulnya.** Ini bagian yang paling banyak menuntut perubahan: kolom
`source_label` (nama katalognya, mis. "Katalog Emaar 2027") sebenarnya sudah ada di database,
tapi hilang saat data dirakit ke memori. Jadi kami harus melebarkan bentuk datanya sampai
nama katalog itu ikut terbawa ke jawaban.

Tiga jenis jawaban yang **wajib bisa dibedakan**:

| Jenis | Arti | Kenapa penting |
|---|---|---|
| `catalogue_exact` | Katalog punya tarif untuk bulan **dan** tipe kamar yang diminta | Angka paling terpercaya |
| `catalogue_quad_fallback` | Katalog tidak punya tarif tipe itu, jadi tarif QUAD dipakai lalu disesuaikan | **Bukan** tarif asli tipe tersebut — harus dikatakan |
| `estimate` | Tidak ada tarif katalog untuk bulan itu | Angka perkiraan, bukan dari katalog |

Kalau ketiganya dianggap sama, harganya salah. Tarif katalog sudah mengandung tipe kamarnya,
jadi kalau pengali kamar ikut dikenakan di atasnya, kamar DOUBLE bisa keluar **~30% lebih murah**
dari seharusnya.

`cari_hotel` juga selalu melaporkan `total_matches` dan `truncated`. Alasannya: hasilnya dibatasi
jumlahnya, dan tanpa laporan itu AI bisa bilang *"yang termurah adalah X"* dari daftar yang
sudah terpotong — dan jawaban salah yang terdengar yakin tidak bisa dibedakan dari yang benar.

### U3 — Jalur "enhanced" di dalam parser

`parseEstimate` sekarang punya cabang opsional. Centang mati ⇒ jalur lama, tanpa perubahan sama
sekali. Centang hidup ⇒ AI boleh memanggil kedua tool di atas.

**Yang membuat ini aman:** apa pun cabangnya, hasilnya lewat **pipeline koreksi yang sama** —
pemangkasan rute transport yang mustahil, koreksi maskapai, konversi "20 hari" jadi jumlah malam,
validasi ID hotel. Tidak ada yang dilewati atau diduplikasi.

Tiga jebakan yang gagal tanpa suara, semuanya sudah dijaga tes:

1. **Thinking tidak boleh mewarisi `disabled`.** Sonnet 5 dengan thinking mati jadi enggan
   memanggil tool — Kakak membayar jalur mahal dan menerima jawaban jalur murah, tanpa ada yang
   terlihat salah.
2. **`max_tokens` naik 1024 → 8000.** Angka itu membatasi thinking **plus** teks jawaban, jadi
   1024 akan memotong JSON di tengah. Gejalanya muncul sebagai "parse error", bukan "kehabisan
   token" — orang akan mencari bug di tempat yang salah.
3. **`total_matches: 0` adalah jawaban sah, bukan error.** Kalau dianggap gagal, kota/tier yang
   tidak punya hotel konkret jadi tidak bisa diestimasi sama sekali.

Pengamannya: **maksimal 25 kali per operator per hari**, dihitung dari log yang sudah ada (tanpa
tabel baru). Ini pengaman dari loop nyasar, bukan jatah kerja — pemakaian normal diperkirakan
5-15 kali sehari.

### U4 — Sakelarnya

Satu centang di sebelah tombol Hitung Estimasi:

> ☐ **Pakai harga katalog (lebih lambat)**
> Hotel dipilih dari tarif katalog asli untuk bulan yang diminta. Berguna saat ada batas budget
> atau bulan tertentu. Perlu ~15-20 detik.

Detik-detiknya sengaja ditulis. Operator yang tidak tahu akan menunggu lebih lama akan
menganggapnya hang lalu me-reload — dan itu membakar satu kuota untuk apa-apa.

**Provenance muncul di area "Catatan:" yang sudah ada**, bukan di panel baru. Contohnya:

```
Makkah Olayan Ajyad: 1400 SAR/malam — tarif katalog DOUBLE bulan Maret.
Sumber: Katalog Emaar 2027.

Madinah Kayan Hotel: 620 SAR/malam — katalog tidak punya tarif DOUBLE bulan
Maret, jadi tarif QUAD dipakai sebagai pengganti lalu disesuaikan ke DOUBLE.
Ini bukan tarif DOUBLE asli dari katalog. Sumber: Katalog 1448H.
```

Catatan ini **dihitung oleh kode, bukan ditulis AI.** Kalau AI yang menulisnya, itu jadi klaim
yang tidak bisa diperiksa — padahal seluruh nilai jalur ini justru pada angkanya yang bisa
diperiksa.

---

## Angka verifikasi

| | Sebelum | Sesudah |
|---|---|---|
| Tes lulus | 1.017 | **1.125** (+108) |
| Tes gagal | 2-3 (pra-ada) | 3 (pra-ada yang sama) |
| Sumber galat TypeScript | 3 (pra-ada) | 3 (sama, tidak ada baru) |

**Tiga kegagalan itu bukan dari pekerjaan ini** dan sudah dibuktikan: dua tes halaman webinar
bergantung tanggal, satu `middleware.test.ts` membandingkan dengan hasil build `.next` yang
sudah tidak ada di folder. Ketiganya gagal identik meski seluruh perubahan ini dilepas.

**Tes-tesnya bukan hijau kosong.** Setiap pengaman penting diuji dengan cara dilumpuhkan dulu:

| Yang dilumpuhkan | Tes yang gagal |
|---|---|
| Fallback QUAD disamarkan jadi hit persis | 4 |
| Thinking enhanced diubah jadi `disabled` | 1 |
| `max_tokens` diturunkan ke 1024 | 2 |
| Toggle dinyalakan default | 5 |
| Baris `thinking` dihapus dari jalur normal | 1 |

---

## Keputusan yang perlu Kakak ketahui

**1. Model tetap `claude-sonnet-5`, bukan Opus.** Memilih hotel dari daftar pendek di bawah
batas budget itu seleksi terbatas, bukan penalaran berat. Opus 5 berharga 1,7× lipat untuk
kemampuan yang tidak terpakai di sini.

**2. Kuota harian gagal **terbuka** kalau query penghitungnya error.** Artinya kalau database
bermasalah saat menghitung kuota, permintaan tetap diteruskan. Ini pilihan sadar — langkah
berikutnya menyentuh database yang sama, jadi tidak mungkin membocorkan biaya diam-diam,
sementara gagal-tertutup akan membuat satu gangguan kecil mematikan fitur. Kalau Kakak mau
sebaliknya, itu satu baris.

**3. Toggle-nya bertahan setelah "Tulis ulang dari nol".** Asumsinya operator yang sengaja
meminta harga katalog kemungkinan ingin mengulang dalam mode yang sama. Ini penilaian, bukan
permintaan Kakak — mudah diubah.

**4. Ada satu celah keamanan yang tertangkap saat pembangunan.** `EstimatorClient` ternyata
dipasang di **dua** halaman, bukan satu: `/estimate/new` (admin saja) dan `/estimate/[id]`
(pemilik estimasi, termasuk non-admin). Kalau hanya mengandalkan gerbang halaman pertama,
toggle khusus admin akan terlihat oleh non-admin — yang lalu membuang klik untuk 403 yang sudah
pasti. Sekarang kemampuannya diteruskan eksplisit dari kedua halaman, default **mati**.

---

## Yang belum dilakukan

| | Kenapa |
|---|---|
| **Belum ada panggilan API sungguhan** | Seluruh tes memakai SDK yang dipalsukan (mock). Itu membuktikan logikanya, **bukan** bahwa API-nya menerima permintaan kita. Ini gerbang yang rencananya sendiri tuntut, dan masih terbuka. |
| **Belum di-commit** | Sesuai permintaan Kakak. |
| **Plafon 20 detik belum terukur** | Butuh panggilan sungguhan. |
| **Belum dijalankan ke database produksi** | Tidak ada perubahan skema, jadi tidak ada migrasi — tapi kuota membaca `activityLogs` yang nyata. |

Satu hal yang layak dicek di lingkungan produksi: SDK 0.115 mengirim **dua** header kalau
`ANTHROPIC_API_KEY` **dan** `ANTHROPIC_AUTH_TOKEN` sama-sama terpasang, dan API menolaknya
dengan 401. Versi lama tidak berperilaku begitu.

---

## Berkas yang tersentuh

**Baru**

```
lib/ai/tools/hotel-price.ts          harga_hotel
lib/ai/tools/hotel-search.ts         cari_hotel
lib/ai/enhanced-prompt.ts            prompt jalur enhanced (tanpa daftar hotel)
lib/ai/parse-usage.ts                kuota + pencatatan
lib/estimate/hotel-distance.ts       parser jarak (dipindah dari parse.ts)
```

**Diubah**

```
types/index.ts                       bentuk realMonthlyPrices + RealHotelPrice
lib/estimate/hotel-pricing.ts        resolveHotelSar mengembalikan sourceLabel
lib/budget/calculate.ts              fetchPricingConfig membawa sourceLabel
lib/ai/parse.ts                      cabang enhanced + catatan provenance
app/api/estimate/parse/route.ts      terima & gerbangi flag enhanced
components/estimator/InputPanel.tsx        toggle
components/estimator/EstimatorClient.tsx   teruskan flag + tangani 403/429
app/(dashboard)/estimate/new/page.tsx      canUseEnhancedParse={isAdmin}
app/(dashboard)/estimate/[id]/page.tsx     canUseEnhancedParse (celah #4 di atas)
package.json, pnpm-lock.yaml               SDK 0.115.0
```

Plus 8 berkas tes baru/diperluas.

---

## Langkah berikutnya

1. **QA manual** — ikuti `docs/2026-07-30-qa-manual-harga-katalog.md`. Ini yang menutup celah
   "belum ada panggilan sungguhan".
2. **Commit** setelah QA lulus.
3. **Tinjau kuota 25/hari** dari `activityLogs` setelah dua minggu pemakaian nyata. Kalau
   operator menabraknya saat kerja normal, yang salah angkanya — bukan cara kerja mereka.
