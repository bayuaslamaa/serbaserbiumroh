# Runbook: Database Dummy lewat Neon Branch

Panduan membuat database dummy dengan **branch Neon**, lalu memakainya untuk menguji perubahan skema dan import harga tanpa menyentuh produksi. Langkah pembuatan branch dikerjakan **di Neon Console** (di luar repo); sisanya lewat script yang sudah ada.

Dibuat: 2026-07-28
Terkait: `docs/plans/2026-07-28-001-feat-per-room-type-real-prices-plan.md` (U7)

> **Kenapa branch, bukan salinan lokal.** Database ini memuat data pribadi nyata: 572 baris `users` + 572 `accounts` (email, hash password, token OAuth Google), 1.642 `community_join_requests`, dan 36.926 `visitor_logs`. Branch Neon tetap berada di dalam batas keamanan Neon. `pg_dump` ke laptop memindahkan semuanya ke disk tanpa proteksi itu — jangan lakukan kecuali memang ada alasannya.

---

## 1. Buat branch di Neon Console

Buka [console.neon.tech](https://console.neon.tech) → pilih project ini (region `eu-central-1`, endpoint produksi `ep-silent-hat-aliylrik`).

- Tab **Branches** → **New Branch** / **Create branch**
- **Parent branch**: branch produksi (biasanya `main` atau `production`)
- **Include data**: pilih *current point in time* / *head* — ini yang menyalin datanya
- **Name**: yang jelas, misal `dummy-roomtype`

Branch Neon bersifat copy-on-write: pembuatannya instan dan tidak menggandakan storage.

## 2. Ambil connection string branch

Di halaman branch tersebut, buka widget **Connect** / **Connection string**. Pastikan selector **Branch** menunjuk `dummy-roomtype`, bukan parent-nya.

**Ambil koneksi direct, bukan pooled.** Kalau hostname mengandung `-pooler`, buang bagian itu (atau matikan toggle *Pooled connection*):

```
ep-xxxx-pooler.c-3.eu-central-1.aws.neon.tech   <- pooled, untuk runtime app
ep-xxxx.c-3.eu-central-1.aws.neon.tech          <- direct, untuk DDL/migration
```

Semua langkah di bawah adalah DDL dan transaksi panjang; lewat pooler (PgBouncer) itu bisa bermasalah.

## 3. Tukar `DATABASE_URL` di `.env.local`

Jangan hapus baris produksinya — komentari saja, supaya gampang balik dan tidak salah arah:

```bash
# DATABASE_URL=<punya produksi — jangan dihapus>
DATABASE_URL=<connection string branch, direct>
```

Semua script (`db:push`, `db:migrate`, `import:real-prices`) membaca `.env.local`, jadi cukup satu baris ini yang ditukar.

## 4. Pastikan benar-benar di branch — sebelum menulis apa pun

Ini langkah paling penting di runbook ini. Jalankan **sebelum** perintah apa pun yang menulis:

```bash
set -a; . ./.env.local; set +a
grep -E '^DATABASE_URL=' .env.local | sed -E 's|.*@([^/?]+).*|host: \1|'
psql "$DATABASE_URL" -qAt -c "select count(*) from real_hotel_prices;"
```

Kriteria lolos — **hanya ada satu yang benar-benar membedakan**:

- **hostname harus BERBEDA dari `ep-silent-hat-aliylrik`** (endpoint produksi). Ini satu-satunya pembeda.

> **Jangan pakai jumlah baris sebagai bukti kamu di branch.** Branch Neon itu salinan — `real_hotel_prices` berjumlah 804 di branch **dan** di produksi. Angka 804 hanya membuktikan datanya ikut tersalin, bukan bahwa kamu sedang menunjuk salinannya. Kalau `.env.local` ternyata masih mengarah ke produksi, semua pemeriksaan berbasis jumlah baris tetap "lolos" — lalu langkah 7 menulis ke produksi.

Kalau hostname masih `ep-silent-hat-aliylrik`, **berhenti** dan ulangi langkah 3.

Sesudah langkah 5 selesai, ada pembeda kedua yang lebih kuat dan bisa dipakai kapan saja: kolom `room_type` hanya ada di branch, belum di produksi.

```bash
psql "$DATABASE_URL" -qAt -c "
select case when count(*) = 1 then 'BRANCH (room_type ada)' else 'PRODUKSI — JANGAN MENULIS' end
from information_schema.columns
where table_name = 'real_hotel_prices' and column_name = 'room_type';"
```

## 5. Terapkan perubahan skema

Repo ini punya dua jalur, dan mana yang benar belum pasti — journal drizzle hanya memuat 5 entri sementara direktori migrasi berisi 18 berkas `.sql`, jadi `0003`–`0012` tidak tercatat di journal. Branch inilah tempat mengetahuinya dengan aman.

Coba `db:push` lebih dulu (mendiff skema langsung, mengabaikan journal):

```bash
pnpm db:push
```

Kalau mau menguji jalur migrasi resminya:

```bash
pnpm db:migrate
```

> **Jangan jalankan `db:migrate` di produksi sebelum terbukti di branch.** Journal mulai dari idx 0 = `0000_mature_zzzax` (skema awal). Di database yang sudah terisi, itu berpotensi merusak.

## 6. Verifikasi skema

```sql
-- kolom ada, default QUAD
select column_name, data_type, column_default, is_nullable
from information_schema.columns
where table_name = 'real_hotel_prices' and column_name = 'room_type';

-- unique key sudah bertiga kolom
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'real_hotel_prices'::regclass and contype = 'u';

-- 804 baris lama terisi QUAD, tidak ada yang kosong
select room_type, count(*) from real_hotel_prices group by room_type;
```

Yang diharapkan: `room_type` bertipe `text` default `'QUAD'`, constraint memuat `(hotel_price_id, month, room_type)`, dan seluruh 804 baris ber-`room_type = QUAD`.

## 7. Import harga per tipe kamar

Dry-run dulu — tidak menulis apa pun:

```bash
pnpm import:real-prices docs/data/real-hotel-prices-2027.csv
```

Diharapkan: `89 rows -> 67 hotels matched, 892 month-prices to write, 0 unmatched, 0 rows with errors`.

Kalau cocok, baru terapkan:

```bash
pnpm import:real-prices docs/data/real-hotel-prices-2027.csv \
  --source "Katalog 1448H (AZKA + Maysan/MIG)" --apply
```

Lalu blok forecast sebagai **batch terpisah dengan label berbeda** — supaya provenansnya bisa dibedakan dari harga katalog asli:

```bash
pnpm import:real-prices docs/data/real-hotel-prices-2027-roomtype-forecast.csv \
  --source "Katalog 1448H (forecast per-bed)" --apply
```

Diharapkan: `22 rows -> 11 hotels matched, 176 month-prices to write`.

## 8. Verifikasi hasil import — ini bagian yang paling berharga

Fungsi `applyRealHotelPricing` **belum punya test otomatis** (temuan #1 di code review). Kalau conflict target-nya salah, baris DOUBLE akan menimpa baris QUAD tanpa suara. Branch ini kesempatan membuktikannya secara empiris.

```sql
-- 1. Jumlah total: 804 -> 892 (setelah katalog) -> 1068 (setelah forecast)
select count(*) from real_hotel_prices;

-- 2. Sebaran per tipe kamar
select room_type, count(*) from real_hotel_prices group by room_type order by 1;

-- 3. BUKTI KUNCI: satu hotel, satu bulan, tiga tipe kamar sebagai baris terpisah
--    AZKA Al Safa, Juli. Katalog: QUAD 700 / TRIPLE 625 / DOUBLE 550.
select p.label, r.month, r.room_type, r.sar_per_night, r.source_label
from real_hotel_prices r
join hotel_prices p on p.id = r.hotel_price_id
where p.label = 'AZKA Al Safa' and r.month = 7
order by r.sar_per_night desc;

-- 4. Tidak ada harga QUAD yang tertimpa harga tipe lain:
--    DOUBLE harus <= TRIPLE <= QUAD untuk hotel & bulan yang sama
select p.label, r.month,
       max(case when r.room_type='DOUBLE' then r.sar_per_night end) as dbl,
       max(case when r.room_type='TRIPLE' then r.sar_per_night end) as trp,
       max(case when r.room_type='QUAD'   then r.sar_per_night end) as quad
from real_hotel_prices r
join hotel_prices p on p.id = r.hotel_price_id
group by p.label, r.month
having max(case when r.room_type='DOUBLE' then r.sar_per_night end)
     > max(case when r.room_type='QUAD'   then r.sar_per_night end)
order by 1, 2;
```

Query 3 harus memberi **tiga baris** (700 / 625 / 550), bukan satu. Query 4 harus mengembalikan **nol baris** — kalau ada isinya, conflict target-nya salah dan harga QUAD sudah tertimpa.

## 9. Uji lewat browser

```bash
pnpm dev
```

Buka `/estimate/new` (butuh login admin), lalu untuk hotel yang tercakup katalog — misal AZKA Al Safa, bulan Juli:

- Ganti tipe kamar **Quad → Double**: badge harga di picker harus berubah 700 → 550, dan total ikut turun
- Rincian biaya tetap menampilkan badge **"harga real"**
- Baris rumus tidak lagi memuat `× 0.7` (rasio global dilewati, jadi dilaporkan sebagai 1)
- Hotel yang tidak tercakup katalog harganya tidak berubah sama sekali

## 10. Selesai — balikkan dan bersihkan

```bash
# .env.local: aktifkan kembali baris produksi, komentari yang branch
```

Verifikasi ulang dengan langkah 4 (hostname harus kembali `ep-silent-hat-aliylrik`).

Lalu **hapus branch-nya** di Neon Console → tab **Branches** → branch `dummy-roomtype` → **Delete**.

Dua alasan: branch ikut menghitung quota, dan salinan data pribadi yang menganggur itu utang yang tidak perlu disimpan.

---

## Kalau ada masalah

| Gejala | Sebab | Tindakan |
|---|---|---|
| `db:push` menggantung atau DDL gagal | Pakai koneksi pooled | Buang `-pooler` dari hostname (langkah 2) |
| `db:migrate` mencoba menerapkan `0000_mature_zzzax` | Journal drift — idx 0 adalah skema awal | Pakai `db:push`; jangan lanjut ke produksi lewat `db:migrate` |
| Dry-run melaporkan `unmatched` | Label CSV tidak cocok dengan `hotel_prices.label` | Perbaiki label di CSV, bukan di database |
| Query 4 mengembalikan baris | Conflict target salah / migrasi belum jalan | Berhenti. Jangan import ke produksi — ini persis kegagalan yang dicegah temuan #1 |
| Jumlah baris bukan 892/1068 | Import ganda atau skema belum berubah | Cek langkah 6 dulu, lalu hitung ulang |
| Ragu sedang menunjuk branch atau produksi | Jumlah baris identik di keduanya | Pakai cek hostname, atau cek keberadaan kolom `room_type` (langkah 4) |

## Catatan keamanan

- Branch ini berisi **data pribadi asli**. Jangan dipakai sebagai sumber seed lokal, jangan di-`pg_dump` ke disk, jangan dibagikan connection string-nya.
- Jangan commit `.env.local` yang berisi connection string branch.
- Setelah selesai, hapus branch-nya (langkah 10).
