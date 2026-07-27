# Runbook: Go-Live SEO Foundation

Panduan operasional untuk menyelesaikan langkah manual setelah branch `feat/seo-foundation` mendarat. Semua langkah di bawah dikerjakan **di luar repo** — tidak ada yang otomatis lewat `git merge`, dan tidak ada CI yang memeriksanya.

Dibuat: 2026-07-26
Terkait: `docs/plans/2026-07-26-002-feat-seo-foundation-plan.md`

> **Catatan hosting.** Produksi berjalan di **Vercel** (`www.serbaserbiumroh.id`), bukan VPS Dokploy. `docs/ops/runbook.md` masih menjelaskan topologi Dokploy lama dan tidak berlaku untuk langkah-langkah di sini.

---

## Prasyarat

Langkah 4 di bawah baru dikerjakan **setelah** tiga hal ini tuntas. Urutannya mengikat, bukan saran.

| # | Langkah | Kenapa harus lebih dulu |
|---|---|---|
| 1 | Pastikan migrasi mana yang sudah diterapkan di produksi | `drizzle/migrations/meta/` di-gitignore, jadi journal-nya tidak ada di repo. Penomoran migrasi juga sudah duplikat (`0000`, `0001`, `0002` masing-masing dua kali). Cek langsung ke database, jangan mengandalkan `drizzle-kit`. |
| 2 | Terapkan migrasi `slug`, verifikasi kolomnya ada, **baru** merge | Vercel auto-deploy begitu merge. Kode baru membaca `hotel_prices.slug` tanpa penangkap error di `app/(public)/hotel-nusuk/page.tsx` — halaman dengan konten terbanyak dan satu-satunya yang terindeks. Deploy sebelum migrasi = halaman itu 500 untuk pengunjung dan Googlebot. |
| 3 | Jalankan `pnpm backfill:hotel-slugs` (dry-run dulu, lalu `--apply`) | Tanpa ini `slug` NULL di semua baris, 87 halaman hotel tidak terbit, dan sitemap kehilangan 87 URL. |

Verifikasi prasyarat sebelum lanjut:

```bash
# Kolom slug ada dan nullable
psql "$DATABASE_URL" -c "SELECT column_name, is_nullable FROM information_schema.columns
  WHERE table_name = 'hotel_prices' AND column_name = 'slug';"

# Setiap baris punya slug, dan semuanya unik
psql "$DATABASE_URL" -c "SELECT COUNT(*) AS total, COUNT(slug) AS ada_slug,
  COUNT(DISTINCT slug) AS unik FROM hotel_prices;"
```

Ketiga angka harus sama. Kalau `ada_slug` masih 0, backfill belum jalan — jangan lanjut.

---

## 4a. Impor konten FAQ

Halaman `/faq` saat ini menampilkan "FAQ belum tersedia". CMS-nya berfungsi; isinya yang belum pernah diisi.

> **Jebakan yang paling sering bikin bingung.**
> `app/api/admin/faqs/import/confirm/route.ts:121` menyisipkan setiap baris dengan `isPublished: false`, sedangkan halaman publik hanya menampilkan yang terbit.
> **Impor saja tidak membuat halaman FAQ terisi.** Setiap item harus diterbitkan setelahnya.

### Langkah

1. Login sebagai **ADMIN**, buka `/admin/content/faqs`
2. Buka `docs/data/faq-seed.csv` — 18 pertanyaan, 6 grup
3. Salin **seluruh isi file, termasuk baris header** `group,question,answer`
4. Tempel ke textarea pada panel **"Import FAQ CSV"**
5. Klik **Preview** — endpoint ini tidak menulis apa pun ke database. Yang diharapkan:
   - 18 baris berstatus *create*
   - 6 grup baru: Umroh Mandiri, Biaya, Visa, Hotel, Transportasi, Persiapan
   - 0 error
6. Kalau preview bersih, klik **Konfirmasi Import**
7. **Terbitkan setiap item.** Di tabel FAQ, klik tombol publikasi pada tiap baris. Tidak ada endpoint bulk — `PUT /api/admin/faqs/{id}` hanya menerima satu id, jadi ini 18 klik.

### Verifikasi

```bash
curl -s https://www.serbaserbiumroh.id/faq | grep -c "FAQPage"
```

- `1` → structured data terbit, langkah selesai
- `0` → belum ada item yang diterbitkan (schema sengaja tidak dirender saat kosong, supaya markup tidak mengklaim konten yang tidak ada)

Cek juga jumlah pertanyaan yang tampil:

```bash
curl -s https://www.serbaserbiumroh.id/faq | grep -o "FAQ belum tersedia" | head -1
```

Kosong = sudah terisi.

---

## 4b. Google Search Console

Kerjakan **setelah** prasyarat 1-3 tuntas. Submit sitemap sebelum backfill jalan berarti Google mengambil sitemap tanpa 87 URL hotel, lalu Anda menunggu siklus crawl berikutnya agar mereka masuk.

### Verifikasi domain

Gunakan **metode DNS**, bukan file HTML atau meta tag. Verifikasi DNS bertahan meski situs di-redeploy atau pindah host; verifikasi berbasis file bisa hilang.

1. Buka [search.google.com/search-console](https://search.google.com/search-console)
2. **Add property** → pilih tipe **Domain** (bukan "URL prefix")
3. Isi `serbaserbiumroh.id` — properti tipe Domain mencakup apex, www, dan seluruh subdomain sekaligus
4. Google memberi satu record TXT. Tambahkan di penyedia DNS tempat domain didaftarkan — bukan di Vercel, kecuali nameserver-nya memang diarahkan ke Vercel
5. Sebelum klik Verify, pastikan sudah propagasi:

   ```bash
   dig +short TXT serbaserbiumroh.id | grep google-site-verification
   ```

6. Klik **Verify**

### Submit sitemap

1. Menu **Sitemaps**
2. Isi `sitemap.xml`
3. Submit

Status yang diharapkan setelah beberapa jam: **Success**, dengan jumlah URL ditemukan sekitar 100.

```bash
# Cek sendiri sebelum submit
curl -sI https://www.serbaserbiumroh.id/sitemap.xml | grep -i "^HTTP\|content-type"
curl -s https://www.serbaserbiumroh.id/sitemap.xml | grep -c "<loc>"
curl -s https://www.serbaserbiumroh.id/sitemap.xml | grep -c "hotel-nusuk"
```

Target: `200` + `application/xml`, sekitar 100 `<loc>`, dan ~87 di antaranya `hotel-nusuk`. Kalau hitungan hotel 0, backfill belum jalan atau build belum mengambil data terbaru — jangan submit dulu.

### Percepat crawl awal

Menu **URL Inspection** → masukkan URL → **Request Indexing**. Prioritas, berurutan:

1. `https://www.serbaserbiumroh.id/`
2. `https://www.serbaserbiumroh.id/panduan/panduan-umroh-mandiri`
3. `https://www.serbaserbiumroh.id/hotel-nusuk`
4. `https://www.serbaserbiumroh.id/visa`
5. `https://www.serbaserbiumroh.id/cerita-jamaah`

Kuota harian terbatas, jadi jangan habiskan untuk halaman hotel individual — biarkan sitemap yang menanganinya.

---

## 4c. Redirect apex 307 → 308

Saat ini apex me-redirect ke www dengan **307 (sementara)**. Untuk SEO, sinyal permanen lebih tepat: 308 mengalihkan otoritas tautan ke host kanonis, 307 tidak.

### Langkah

1. Vercel Dashboard → pilih project → **Settings → Domains**
2. Akan terlihat `serbaserbiumroh.id` dan `www.serbaserbiumroh.id`
3. Pastikan **`www.serbaserbiumroh.id` ditandai Primary**
4. Pastikan apex diatur me-redirect ke www

Saat konfigurasinya benar, Vercel otomatis mengeluarkan **308 Permanent**.

### Verifikasi

```bash
curl -sI https://serbaserbiumroh.id/ | grep -i "^HTTP\|^location"
```

Target:

```
HTTP/2 308
location: https://www.serbaserbiumroh.id/
```

**Kalau masih 307:** kemungkinan besar arah redirect-nya terbalik — apex yang jadi Primary. Tukar Primary-nya. **Jangan** menambah redirect manual di `next.config.mjs`; redirect level domain Vercel berjalan sebelum aplikasi dan lebih murah.

---

## Checklist akhir

Jalankan setelah keempat langkah selesai.

```bash
BASE=https://www.serbaserbiumroh.id

# Jalur crawl
curl -sI $BASE/robots.txt  | grep -i "^HTTP\|content-type"   # 200, text/plain
curl -sI $BASE/sitemap.xml | grep -i "^HTTP\|content-type"   # 200, application/xml

# Apex permanen
curl -sI https://serbaserbiumroh.id/ | grep -i "^HTTP"        # 308

# Rute terproteksi tetap terkunci
curl -s -o /dev/null -w "%{http_code}\n" $BASE/dashboard      # 307 ke /login
curl -s -o /dev/null -w "%{http_code}\n" $BASE/admin/pricing  # 307 ke /login

# PDF bisa diunduh tanpa login
curl -s -o /dev/null -w "%{http_code}\n" $BASE/pdf/panduan-umroh-mandiri.pdf  # 200

# Panduan terbaca crawler
curl -s $BASE/panduan/panduan-umroh-mandiri | wc -w           # > 1000

# FAQ terbit
curl -s $BASE/faq | grep -c "FAQPage"                          # 1

# Sampel halaman hotel
curl -s -o /dev/null -w "%{http_code}\n" $BASE/hotel-nusuk/<slug-nyata>  # 200
```

Terakhir, jalankan beranda, satu halaman hotel, satu cerita jamaah, dan `/faq` melalui [Rich Results Test](https://search.google.com/test/rich-results). Semua harus terdeteksi tanpa error.

---

## Yang dipantau minggu-minggu pertama

| Sinyal | Di mana | Yang dicari |
|---|---|---|
| Error 5xx pada `/hotel-nusuk` | Vercel function logs | Muncul segera setelah deploy = migrasi belum jalan. Ini kegagalan paling keras dan paling cepat terlihat |
| `Could not read hotel slugs` | Vercel build logs | Muncul setelah migrasi + backfill tuntas = build tidak bisa mengakses database. Gejalanya senyap: build sukses, 0 halaman hotel ter-prerender |
| Rasio indexing `/hotel-nusuk/*` | Search Console → Pages | Banyak yang mandek di "Discovered — currently not indexed" = risiko *doorway page* terwujud. **Ambang dari rencana: bila di bawah 50% setelah 6 minggu, hentikan penambahan halaman dan perkaya yang ada** |
| Server error (5xx) | Search Console → Pages | Googlebot sendiri yang kena — lebih buruk daripada satu pengguna, karena bisa menunda crawl ulang |
| Manual actions | Search Console → Security & Manual Actions | Structured data sengaja dibatasi ke BreadcrumbList/FAQPage/Article. Manual action soal structured data berarti ada disiplin yang bocor |
| Status fetch sitemap | Search Console → Sitemaps | "Success" vs "Couldn't fetch" — sinyal pertama bahwa Google benar-benar bisa mengambilnya |

---

## Rollback

| Situasi | Aman? | Catatan |
|---|---|---|
| Rollback deploy kode, migrasi tetap terpasang | **Ya** | Kode lama tidak menyentuh `.slug`. Kolom nullable yang menganggur tidak berbahaya. Ini jalur rollback yang benar bila masalahnya ada di kode |
| Drop kolom + constraint | Ya, sebelum ada URL yang di-crawl | `ALTER TABLE hotel_prices DROP CONSTRAINT hotel_prices_slug_unique;` lalu `DROP COLUMN slug;` |
| Mengosongkan slug lalu backfill ulang | **Tidak, setelah Google meng-crawl** | Penyelesaian tabrakan slug bergantung pada baris mana yang masih NULL saat itu. Backfill ulang **tidak dijamin** memberi slug yang sama ke hotel yang sama — sebuah URL yang sudah terindeks bisa diam-diam berpindah ke hotel lain. Perlakukan "backfill sudah jalan dan sudah di-crawl" sebagai pintu satu arah: perbaiki maju dengan `UPDATE` per baris, jangan bulk rollback |

---

## Pekerjaan lanjutan yang tercatat

Bukan bagian dari go-live, tapi jangan hilang:

- **Journal migrasi di-gitignore** (`drizzle/migrations/meta/`) dan penomoran migrasi duplikat. Checkout baru tidak punya cara andal untuk tahu migrasi mana yang tertunda. Perlu keputusan: commit `meta/`, atau tetapkan `db:push` sebagai satu-satunya mekanisme resmi
- **`hotel_listings.slug` diketik manual admin**, sementara join overlay memakai slug hasil generate. Dua ruang identitas yang tidak berkaitan — overlay jarang menempel, dan slug yang kebetulan sama bisa menempelkan catatan hotel yang salah. Perbaikan durable: foreign key ke `hotel_prices.id`
- **Fail-safe build menelan semua error tanpa sinyal.** Deploy bisa mengirim sitemap tanpa 87 URL, hijau sepenuhnya, tanpa ada yang tahu. Pertimbangkan mempersempit catch ke error konektivitas saja, plus pemeriksaan pasca-build
- **`docs/ops/runbook.md` masih menjelaskan Dokploy** padahal produksi di Vercel, dan masih berstatus aktif
- **Dua test webinar gagal** sejak sebelum branch ini (`"Ahad, 14 Juni 2026"` vs halaman yang menulis `"Selasa, 16 Juni 2026"`)
