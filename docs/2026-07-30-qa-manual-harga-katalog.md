# QA manual — fitur "Pakai harga katalog"

**Untuk:** `feat/real-price-grounded-parse` | **Tanggal:** 30 Juli 2026

Tes otomatis sudah lulus 1.125, tapi **semuanya memakai SDK palsu (mock)**. Itu membuktikan
logikanya benar, bukan bahwa API Anthropic menerima permintaan kita. QA manual ini yang menutup
celah itu — jadi **B1 dan B2 adalah pemeriksaan terpenting di seluruh daftar ini.**

Isi kolom Hasil dengan ✅ / ❌ + catatan.

---

## Persiapan

| # | Langkah | Harapan | Hasil |
|---|---|---|---|
| P1 | `pnpm install` lalu `pnpm dev` | Server jalan tanpa error | |
| P2 | Cek `.env.local`: **`ANTHROPIC_API_KEY` terpasang, `ANTHROPIC_AUTH_TOKEN` TIDAK** | Hanya satu yang terisi | |
| P3 | Login sebagai **admin**, buka `/estimate/new` | Estimator muncul | |

> **P2 penting dan baru.** SDK 0.115 mengirim kedua header kalau keduanya terpasang, dan API
> menolaknya dengan **401**. Versi lama tidak begitu. Kalau muncul 401 di B1, periksa ini dulu
> sebelum mencurigai kode.

---

## A. Jalur lama tidak berubah (paling kritis)

Kalau ada satu bagian pun di sini yang gagal, **berhenti** — artinya fitur baru merusak alat
kerja yang sudah dipakai sehari-hari.

| # | Langkah | Harapan | Hasil |
|---|---|---|---|
| A1 | Lihat area di bawah kotak input | Ada centang **"Pakai harga katalog (lebih lambat)"**, keadaan **MATI** | |
| A2 | Tanpa menyentuh centang, ketik `umroh 9 malam makkah 4 malam madinah standard quad 4 orang` → **Hitung Estimasi** | Estimasi keluar dalam ~3-5 detik, seperti biasa | |
| A3 | Ulangi A2 dengan **⌘/Ctrl+Enter** | Sama — shortcut tetap jalan | |
| A4 | Coba beberapa input yang biasa Kakak pakai | Semua berperilaku seperti sebelum ada fitur ini | |
| A5 | Buat estimasi, simpan, buka lagi dari dashboard | Angkanya sama, tidak ada yang aneh | |

---

## B. Jalur baru benar-benar bekerja

**Ini yang belum pernah diuji sama sekali** — tes otomatis tidak bisa menyentuhnya.

| # | Langkah | Harapan | Hasil |
|---|---|---|---|
| B1 | Centang **"Pakai harga katalog"**, ketik `hotel Madinah standard di bawah 900 SAR bulan Maret, jalan kaki ke Nabawi, 4 orang 9 malam makkah 4 malam madinah` → Hitung | **Tidak error.** Estimasi keluar, lebih lambat (~15-20 detik) | |
| B2 | Di hasil B1, baca area **"Catatan:"** | Ada baris menyebut **angka SAR/malam** + **nama katalognya** (mis. "Sumber: Katalog 1448H") | |
| B3 | Cek hotel Madinah yang dipilih — apakah tarif Maret-nya benar-benar di bawah 900 SAR? | Ya. **Kalau tidak, inti fitur ini gagal** | |
| B4 | Bandingkan: input sama, centang **mati** | Boleh beda pilihan hotel. Yang penting versi centang-nyala patuh pada batas 900 SAR | |
| B5 | Ketik `Kayan Hotel bulan November 4 orang` dengan centang nyala | Catatan menyebut tarif November Kayan + sumbernya | |

### B6 — Uji fallback QUAD (jangan dilewat)

Ini pengaman yang paling mahal kalau salah — kalau fallback disamarkan sebagai tarif asli,
harganya bisa **~30% terlalu murah**.

| # | Langkah | Harapan | Hasil |
|---|---|---|---|
| B6a | Cari di `docs/data/real-hotel-prices-2027.csv` satu hotel yang **hanya punya tarif QUAD** untuk suatu bulan | Dapat nama + bulannya | |
| B6b | Minta hotel itu, bulan itu, **kamar DOUBLE**, centang nyala | Catatan berbunyi kurang-lebih: *"katalog tidak punya tarif DOUBLE bulan X, jadi tarif QUAD dipakai sebagai pengganti lalu disesuaikan… Ini bukan tarif DOUBLE asli dari katalog"* | |
| B6c | Pastikan catatan itu **tidak** menyebutnya sebagai tarif DOUBLE dari katalog | Perbedaannya tertulis jelas | |

### B7 — Bulan tanpa data katalog

| # | Langkah | Harapan | Hasil |
|---|---|---|---|
| B7 | Minta bulan yang tidak ada di katalog, centang nyala | Estimasi **tetap keluar**, dan catatan bilang memakai **tarif estimasi**, bukan katalog. Tidak boleh error, tidak boleh mengarang angka | |

---

## C. Akses & kuota

| # | Langkah | Harapan | Hasil |
|---|---|---|---|
| C1 | Login sebagai user **non-admin**, buka `/estimate/new` | Estimator tidak terlihat (gerbang lama) | |
| C2 | Non-admin buka estimasi **miliknya sendiri** di `/estimate/[id]`, klik "Tulis ulang dari nol" | Kotak input muncul, tapi **centang harga katalog TIDAK ADA** | |
| C3 | Sebagai admin, jalankan jalur enhanced ~3× | Semua berhasil | |
| C4 | Cek tabel `activity_logs`, cari `event = 'ai_parse_enhanced'` | Ada satu baris per panggilan, memuat jumlah token | |
| C5 | Cek baris log jalur **normal** | Metadata-nya **tidak** punya penanda `enhanced` — sama seperti sebelum fitur ini ada | |

> **C2 adalah celah nyata yang tertangkap saat pembangunan.** `EstimatorClient` dipasang di dua
> halaman, bukan satu. Kalau centang muncul di sini, gerbangnya bocor.

### C6 — Kuota (opsional, butuh 25 panggilan)

| # | Langkah | Harapan | Hasil |
|---|---|---|---|
| C6 | Jalankan enhanced 25× dalam satu hari, lalu coba ke-26 | Ditolak dengan pesan: **"Batas harga katalog harian tercapai (25/25). Pakai mode biasa atau coba lagi besok."** | |
| C7 | Setelah tertolak, hilangkan centang lalu Hitung lagi | Jalur normal **tetap jalan** — kuota tidak memblokir kerja biasa | |

Kalau tidak ingin menghabiskan 25 panggilan: ubah sementara `ENHANCED_PARSE_DAILY_CAP` di
`lib/ai/parse-usage.ts` jadi `2`, uji, lalu **kembalikan ke 25**.

---

## D. Saat ada yang salah

| # | Langkah | Harapan | Hasil |
|---|---|---|---|
| D1 | Matikan internet, jalankan enhanced | Pesan galat yang bisa dibaca — bukan halaman putih atau spinner selamanya | |
| D2 | Ulangi D1 lalu cek `activity_logs` | **Tetap ada baris log** meski panggilannya gagal | |
| D3 | Kembalikan internet, ulangi | Berhasil normal | |

---

## E. Tampilan

| # | Langkah | Harapan | Hasil |
|---|---|---|---|
| E1 | Lebar HP (< 640px) | Centang + teks bantunya terbaca, tidak menabrak tombol | |
| E2 | Lebar tablet (640-1023px) | Rapi. **Band ini berulang kali jadi sumber bug layout di repo ini** | |
| E3 | Lebar desktop (≥ 1024px) | Rapi | |
| E4 | Catatan provenance yang panjang | Teksnya membungkus, tidak terpotong | |

---

## Kalau ada yang gagal

| Gejala | Kemungkinan penyebab |
|---|---|
| **401** di B1 | `ANTHROPIC_API_KEY` **dan** `ANTHROPIC_AUTH_TOKEN` sama-sama terpasang (lihat P2) |
| "Claude returned non-JSON response" di B1 | Jawaban terpotong. Cek `ENHANCED_PARSE_MAX_TOKENS` masih `8000`, bukan `1024` |
| Enhanced secepat jalur normal & tanpa catatan provenance | AI mungkin tidak memanggil tool. Cek `thinking: { type: "adaptive" }` — bukan `disabled` |
| B3 gagal (batas budget dilanggar) | Inti fitur. Jangan di-commit; laporkan input persisnya |
| B6 tidak membedakan fallback | Risiko harga salah ~30%. Jangan di-commit |
| Centang muncul di C2 | Gerbang admin bocor. Jangan di-commit |
| Galat tipe merah di IDE tapi `npx tsc --noEmit` bersih | Cache TS server basi. `Cmd+Shift+P` → **Developer: Reload Window** |

---

## Sebelum commit

- [ ] Bagian **A** semuanya ✅ (jalur lama utuh)
- [ ] **B1, B2, B3** ✅ (fiturnya benar-benar bekerja dan patuh batas budget)
- [ ] **B6** ✅ (fallback QUAD tertulis jelas)
- [ ] **C1, C2** ✅ (gerbang admin di **kedua** halaman)
- [ ] `npx vitest run` → 1.125 lulus / 3 gagal (tiga itu pra-ada)
- [ ] `npx tsc --noEmit` → hanya 3 sumber galat lama

**Tiga kegagalan tes yang dianggap normal:** dua tes `webinar-umroh-mandiri` (bergantung
tanggal) dan `middleware.test.ts` (membandingkan dengan hasil build `.next` yang tidak ada).
Ketiganya gagal identik meski seluruh fitur ini dilepas.
