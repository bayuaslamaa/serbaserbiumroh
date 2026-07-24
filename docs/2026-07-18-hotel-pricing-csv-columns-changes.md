# Perubahan `hotel-prices-seasonal-2027.csv` — Kolom Baru & Harga Musiman

**Tanggal:** 2026-07-18
**File terdampak:** `hotel-prices-seasonal-2027.csv`
**Status:** untuk direview tim
**Konteks:** riset harga OTA + penerapan pola musiman + penambahan hotel dari AZKA pricelist

---

## 1. Ringkasan

Perubahan ini menyentuh **satu file data** (`hotel-prices-seasonal-2027.csv`), bukan kode aplikasi. Tiga hal yang dilakukan:

1. **Menambah 4 kolom baru** untuk jejak sumber & tingkat akurasi harga.
2. **Menulis ulang harga bulanan** (`jan_sar`–`dec_sar`) untuk 106 hotel memakai pola musiman yang di-anchor ke harga OTA nyata (menggantikan template flat per-tier lama).
3. **Menambah 3 hotel** dari AZKA pricelist (PDF) dan menandai 2 hotel yang tidak punya data harga.

Total baris data sekarang: **111** (108 hotel lama + 3 hotel AZKA), semua konsisten **26 kolom**.

---

## 2. Kolom baru (4)

Ditambahkan di ujung kanan, setelah `dec_sar`:

| Kolom | Isi | Contoh |
|---|---|---|
| `ref_current_sar` | Harga referensi low-season (musim panas, per kamar double) dalam SAR yang dipakai sebagai anchor kurva | `566` |
| `ref_source` | Asal angka referensi | `OTA re-riset low-season (validated)` |
| `ref_url` | URL sumber untuk verifikasi | `https://www.kayak.com/...` |
| `akurasi` | Tingkat keandalan baris | `estimasi-musiman` |

### Nilai `akurasi`

| Nilai | Arti | Jumlah baris |
|---|---|---|
| `estimasi-musiman` | Anchor = harga OTA tervalidasi; bulanan dihitung dari pola musiman | 103 |
| `estimasi-dari-pricelist` | Hotel AZKA; anchor = rate asli PDF (Jun–Aug), bulan lain diestimasi | 3 |
| `estimasi-kasar` | Anchor = proxy/estimasi kasar (baris nama-jaringan atau tanpa harga langsung) | 3 |
| `tidak-akurat` | Nol data harga di semua sumber; seluruh harga dikosongkan | 2 |

Baris `tidak-akurat`: **Maysal al Talaqo** dan **Al fouad Tower** (keduanya Makkah).
Baris `estimasi-kasar`: **Elaf Group** & **Emaar Group** (nama jaringan, bukan 1 hotel) + **Emaar Al Taqwa** (tanpa harga langsung).

---

## 3. Perubahan data

### 3a. Rebuild harga bulanan (106 hotel)

Kolom `jan_sar`–`dec_sar` sebelumnya adalah **template flat per-tier** (semua "MAKKAH PREMIUM" identik, dst). Sekarang tiap hotel punya kurva sendiri:

```
harga_bulan = anchor_low_season × multiplier_bulan  (dibulatkan ke kelipatan 5)
```

`base_sar_per_night` di-set = anchor low-season.

### 3b. Hotel AZKA baru (3)

Dari `AZKA HOTEL PRICE LIST.pdf` (rate asli 2026, hanya Jun–Aug):

| Hotel | Tier | Jarak | Anchor (Jun) | Catatan |
|---|---|---|---|---|
| AZKA Al Safa | PELATARAN | 150m/3min | 520 | full board incl (rate PDF DBL) |
| AZKA Al Maqam | PELATARAN | 40m/1min | 550 | full board incl, terdekat |
| Saif Al Yamani | ECONOMY | 500m/7min | 150 | room only, tanpa full board |

Jun–Aug memakai rate PDF langsung; bulan lain diestimasi dengan multiplier yang sama.

### 3c. Baris tidak akurat (2)

Untuk hotel yang tidak ditemukan di OTA manapun, seluruh harga (`base_sar_per_night` + 12 bulan) **dikosongkan** dan ditandai `tidak-akurat`, agar tidak ada angka palsu.

---

## 4. Metodologi harga musiman

Multiplier relatif terhadap titik terendah musim panas (anchor = 1.0×). Dikalibrasi dari data pasar hotel Makkah + artikel umroh (BeyondMakkah, UmrahCompanions, dll).

| Bulan | Multiplier | Alasan (kalender 2027) |
|---|---|---|
| Jan | 1.65 | Winter high, pra-Ramadan |
| **Feb** | **2.60** | Ramadan 1448H mulai ~18 Feb — puncak |
| **Mar** | **2.40** | Ramadan + i'tikaf (10 hari terakhir bisa 3–5×) |
| Apr | 1.35 | Turun pasca-Eid |
| Mei | 2.00 | Musim Hajji — umroh terbatas/tutup (lihat risiko #6) |
| Jun | 1.00 | Low season pasca-Hajji (anchor) |
| Jul | 1.05 | Terendah, musim panas |
| Aug | 1.10 | Low season |
| Sep | 1.15 | Mulai naik |
| Oct | 1.30 | Naik menuju winter |
| Nov | 1.45 | High season mulai |
| Des | 1.80 | Puncak musim dingin / liburan |

**Anchor** diperoleh dari 2 putaran riset OTA paralel (Kayak, momondo, Tripadvisor, HotelsCombined, dll), memilih **harga tipikal low-season per kamar** (bukan harga "mulai dari" termurah), dengan koreksi anomali (mis. Al Mokhtara Gharbi 645→260, Al Olayan 831→240, Emaar Forum 45→110).

---

## 5. Dampak ke kode (hasil review terhadap importer)

File ini dikonsumsi oleh `lib/admin/hotel-pricing-import.ts` (`parseHotelPricingCsv`) dan harga bulanan dipakai `resolveHotelSar(config, travelMonth)` di `lib/budget/calculate.ts`.

| # | Severity | Temuan |
|---|---|---|
| 1 | P1 | **2 baris `tidak-akurat` akan DITOLAK importer.** `base_sar_per_night` wajib angka positif (`parsePositiveInteger` → `null` untuk kosong) ⇒ status `invalid`. Hotel tersebut tak bisa masuk app selama harga kosong. |
| 2 | P2 | **Baris `estimasi-kasar` "Elaf Group" & "Emaar Group" akan terimpor sebagai hotel nyata & bisa menyesatkan** — keduanya nama jaringan, bukan 1 hotel. Bisa muncul di pilihan user. |
| 3 | P3 | **4 kolom baru diabaikan importer** (aman, tidak memecah parse) **tetapi tidak persist ke DB** — metadata `akurasi`/`ref_*` hanya hidup di CSV. |
| — | OK | Semua nilai integer positif (kelipatan 5) lolos validasi; file seragam 26 kolom (parse bersih); dalam batas `MAX_ROWS=500` & `MAX_BYTES=256KB`. |

---

## 6. Risiko / catatan yang harus diketahui

1. **Confidence anchor tidak merata.** Budget WebSearch beberapa agen riset habis; sejumlah anchor (ditandai CONF L saat riset) bertumpu pada snippet agregator, bukan quote tanggal-spesifik. Ini **estimasi terarah**, bukan harga live 2027.
2. **Mei = musim Hajji.** Angka `2.0×` mengesankan kamar bookable, padahal umroh internasional biasanya ditangguhkan akhir April–Mei. `resolveHotelSar(..., travelMonth=5)` mengembalikan angka itu apa adanya → estimasi Mei bisa menyesatkan.
3. **Full-board vs room-only.** Bulanan AZKA Safa/Maqam termasuk makan; multiplier (dari data pasar room-only) diterapkan ke basis full-board → sedikit melebihkan puncak.
4. **Konsistensi minor.** Untuk beberapa hotel `base_sar_per_night` ≠ `jun_sar` (mis. 566 vs 565) karena `jun` dibulatkan ke kelipatan 5 sedangkan base tidak.
5. **Tanpa timestamp provenance.** Harga referensi bersifat titik-waktu (2026); CSV tidak menyimpan tanggal pengambilan, jadi kesegaran tidak bisa dinilai kemudian.

---

## 7. Keputusan terbuka (butuh input tim)

1. **Baris 87 & 98 (kosong)** — biarkan tertolak importer (sengaja dikecualikan) **atau** beri harga placeholder tier-median agar bisa masuk?
2. **Baris "Elaf Group" & "Emaar Group"** — hapus/rename ke hotel nyata agar tidak dipilih user sebagai entitas jaringan?
3. **Metadata `akurasi`/`ref_*`** — cukup di CSV saja, atau perlu diperluas ke skema DB + importer agar terlihat di app?
4. **Multiplier musiman** — apakah puncak Ramadan (2.6×) & musim dingin (1.8×) sesuai ekspektasi bisnis, atau perlu disetel?

---

## 8. Cara verifikasi cepat

```bash
# Validasi struktur (semua 26 kolom) & distribusi akurasi
python3 - <<'PY'
import csv
from collections import Counter
rows=[r for r in csv.reader(open('hotel-prices-seasonal-2027.csv')) if any(c.strip() for c in r)]
print('kolom/baris:', Counter(len(r) for r in rows))
h=rows[0]; ai=h.index('akurasi')
print('akurasi   :', Counter(r[ai] for r in rows[1:]))
PY
```
