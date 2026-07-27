# PRD — Umroh Planner (Serba Serbi Umroh)

**Product Requirements Document — v3 (konsolidasi menyeluruh)**
Dibuat: 2026-07-26 · Branch acuan: `feat/estimate-update` · Commit acuan: `3c50a97`

> **Status dokumen.** v3 menggantikan `docs/PRD-umroh-budget-estimator-updated.md` (v2, 2026-05-12) dan `docs/FEATURES.md` (2026-06-11). Kedua dokumen itu sudah tertinggal ±2,5 bulan dan tidak memuat: layanan non-estimator (`/layanan`, `/badalin`, `/visa`, `/transportasi`), revamp estimator, manual override, real price layer, room-type multiplier fix, visitor stats, dan navbar IA baru.
>
> **Cara membaca.** Dokumen ini adalah *product knowledge* — sumber kebenaran tentang apa yang produk ini lakukan hari ini, mengapa keputusannya diambil, dan di mana batasnya. Bagian teknis (§5–§11) ditulis agar engineer bisa langsung bekerja; bagian produk (§1–§4) bisa dibaca tim non-teknis.
>
> **Provenance.** §3–§11 diverifikasi langsung terhadap kode pada commit acuan. §13 (deployment) dan sebagian §12 dirangkum dari plan dokumen dan belum diverifikasi terhadap server produksi.

---

## 1. Ringkasan Produk

### 1.1 Apa ini

**Umroh Planner** adalah web app milik **Serba Serbi Umroh (SSU)** untuk membantu calon jamaah merencanakan **umroh mandiri** — berangkat tanpa paket travel, dengan komponen biaya yang disusun sendiri.

Produk berdiri di atas dua kaki:

1. **Budget Estimator** (internal/admin-first) — mesin perhitungan biaya umroh yang menerima input bahasa natural Bahasa Indonesia, mengubahnya jadi parameter terstruktur lewat AI, lalu menghasilkan rincian biaya per orang dan per rombongan yang bisa diedit manual dan dikirim ke jamaah lewat WhatsApp/PDF.
2. **Public site & katalog layanan** (marketing + funnel) — halaman publik yang membangun kepercayaan (panduan, cerita jamaah, FAQ, direktori hotel, komunitas) dan menyalurkan permintaan ke enam layanan berbayar SSU lewat WhatsApp.

### 1.2 Masalah yang diselesaikan

Umroh mandiri jauh lebih murah daripada paket travel, tapi calon jamaah kesulitan menjawab: *"kalau saya berangkat November, 12 hari, berdua, hotel dekat Haram — habisnya berapa?"* Jawaban itu butuh data hotel per musim, harga tiket, visa, transport, dan aritmetika okupansi kamar yang tidak dikuasai orang awam.

Estimator menjawab pertanyaan itu dalam hitungan detik. Sisi publik menjawab pertanyaan lanjutan ("aman nggak?", "gimana caranya?") dan mengeksekusi kebutuhan operasionalnya (visa, transport, hotel, badal).

### 1.3 Positioning

- **Bukan** OTA, bukan travel agent berizin PPIU, bukan payment gateway.
- Estimator adalah **alat bantu perencanaan**, bukan quotation mengikat dan bukan jaminan booking.
- Semua transaksi layanan berakhir di **WhatsApp**, ditangani manusia. Tidak ada checkout di aplikasi.

### 1.4 Tujuan produk

| # | Tujuan |
|---|---|
| G1 | Estimasi biaya umroh mandiri yang cepat, transparan, dan itemized — dari satu kalimat bahasa natural. |
| G2 | Angka yang cukup akurat untuk dikirim ke jamaah: harga hotel nyata (bukan taruhan), harga musiman, dan kemampuan koreksi manual. |
| G3 | Admin bisa menjaga data harga tetap realistis tanpa developer (inline edit + import CSV). |
| G4 | Halaman publik yang membangun kepercayaan dan menyalurkan traffic ke layanan SSU. |
| G5 | Satu sumber angka untuk semua permukaan — layar, WhatsApp, PDF harus sama persis. |

### 1.5 Non-goals (eksplisit di luar cakupan)

- Pemrosesan pembayaran / checkout.
- Booking atau jaminan ketersediaan kamar/tiket.
- Scraping OTA live atau sinkronisasi ketersediaan real-time.
- Jaminan approval hotel oleh Nusuk/supplier.
- Geocoding presisi atau validasi rute jalan kaki.
- UI multi-bahasa di luar copy Indonesia-first.
- Attendance tracking, reminder email, kalender, atau CRM untuk webinar.
- Upload gambar via admin UI (aset kendaraan dll. bersifat statis di repo).

---

## 2. Pengguna & Peran

| Peran | Akses | Yang mereka lakukan |
|---|---|---|
| **Visitor (anonim)** | Semua halaman publik | Baca panduan/FAQ/cerita, lihat direktori hotel & harga layanan, submit form komunitas, hubungi WhatsApp. |
| **User terdaftar** (`role = USER`) | Publik + `/dashboard`, `/estimate/*` | Lihat & buat estimasi tersimpan, lihat link RSVP webinar, ekspor PDF/WhatsApp. |
| **Admin** (`role = ADMIN`) | Semua + `/admin/*` | Kelola harga (hotel, maskapai, kurs, service fee), import CSV, kelola konten (FAQ, hotel listing, cerita jamaah), review permintaan komunitas, lihat statistik pengunjung. |

**Catatan akses estimator.** `/estimate/new` dijaga `requireAuth()` — **user terdaftar mana pun** bisa masuk, bukan hanya admin. (Plan manual-override menyebut estimator "admin-gated"; kode saat ini tidak demikian. Ini perlu keputusan produk — lihat §15.)

Autentikasi: NextAuth v5 dengan dua jalur — kredensial (email + bcrypt) dan Google OAuth. Role disematkan di JWT.

---

## 3. Peta Fitur — Seluruh Permukaan

### 3.1 Halaman publik (tanpa login)

| Route | Isi |
|---|---|
| `/` | Homepage: hero + tiga angka social proof, promo webinar, kartu seksi, cerita jamaah unggulan. |
| `/layanan` | Katalog enam layanan SSU dengan harga "mulai dari". |
| `/visa` | Layanan visa umroh mandiri — dua tier (USD 165 & USD 190), CTA WhatsApp + link aplikasi visa eksternal. |
| `/badalin` | Layanan badal umroh (mulai Rp 1,8 juta) — 3 langkah proses + grid video dokumentasi YouTube nyata + sertifikat. |
| `/transportasi` | Kalkulator sewa transportasi: 4 armada (Sedan, Staria 7-seater, HiAce 12-seater, GMC Yukon) × ~12 rute, harga SAR + konversi IDR (kurs bisa diubah pengguna), pemilih admin (Nurul/Bayu), CTA WhatsApp. |
| `/hotel-nusuk` | Direktori hotel terverifikasi Nusuk: filter kota/tier/jarak, harga baseline IDR/malam, popup disclaimer. |
| `/hotel` | Alias/pengarah ke direktori hotel. |
| `/panduan`, `/panduan/[slug]` | Panduan umroh berbasis MDX + viewer PDF. |
| `/cerita-jamaah`, `/cerita-jamaah/[slug]` | Cerita jamaah nyata: budget, itinerary harian, packing list; bisa di-*prefill* ke estimator lewat query param. |
| `/faq` | FAQ terkelompok, dikelola admin. |
| `/komunitas` | Form gabung komunitas WhatsApp Umroh Mandiri (anonim boleh). |
| `/webinar-umroh-mandiri` | Halaman webinar; link RSVP hanya tampil setelah login. |
| `/login` | Login kredensial + Google. |

### 3.2 Halaman terautentikasi

| Route | Isi |
|---|---|
| `/dashboard` | Daftar estimasi tersimpan + preview FAQ. |
| `/estimate/new` | Estimator: input naratif, chip editor, rincian biaya live, total sticky, preview WhatsApp. |
| `/estimate/[id]` | Detail estimasi tersimpan + edit + ekspor PDF/WhatsApp. |

### 3.3 Halaman admin (`role = ADMIN`)

| Route | Isi |
|---|---|
| `/admin/pricing` | Kurs, harga hotel (base + bulanan + metadata jarak + URL OTA), harga maskapai (multi-opsi per tier + default + bulanan), service fee; import CSV hotel/maskapai/real-price. |
| `/admin/content/faqs` | CRUD grup & item FAQ, publish/draft, import CSV. |
| `/admin/content/hotels` | CRUD direktori Hotel Nusuk. |
| `/admin/content/stories` | CRUD cerita jamaah + publish toggle + import CSV. |
| `/admin/community-requests` | Review permintaan gabung komunitas, flag duplikat, status, catatan internal. |
| `/admin/users` | Daftar user + role. |
| `/admin/visitor-stats` | Statistik pengunjung unik. |

### 3.4 Enam layanan berbayar (katalog `lib/services/catalog.ts`)

| Layanan | Harga tampil | Tujuan |
|---|---|---|
| Visa Umroh | Mulai USD 165 | `/visa` |
| **Badalin — Badal Umroh** (BARU) | Mulai Rp 1,8 jt | `/badalin` |
| Sewa Transportasi | Mulai SAR 170 | `/transportasi` |
| Booking Hotel | Mulai Rp 900 rb/malam | `/hotel-nusuk` |
| Jasa Booking HHR (kereta cepat Haramain) | +Rp 100 rb/orang (di luar tiket) | WhatsApp langsung |
| Muthowwif (pendamping ibadah) | Mulai Rp 1,4 jt/sesi | WhatsApp langsung |

Nomor WhatsApp admin utama: `6285161134844`. String harga di katalog bersifat **display-only** — tidak pernah masuk perhitungan estimator.

---

## 4. Konsep & Terminologi Domain

| Istilah | Arti di produk ini |
|---|---|
| **Pax** | Jumlah peserta dalam satu rombongan estimasi (1–200). |
| **Tier hotel** | `ECONOMY`, `STANDARD`, `PELATARAN`, `PREMIUM`. "Pelataran" = tepat di area pelataran Masjidil Haram. |
| **Tier maskapai** | `BUDGET`, `STANDARD`, `GARUDA`, `BUSINESS`. Estimator memilih **tier**; tier menunjuk ke satu **opsi default** konkret. |
| **Room type** | `QUINT` (5/kamar), `QUAD` (4), `TRIPLE` (3), `DOUBLE` (2). `SINGLE` **sudah dipensiunkan** — tidak ada kamar single di operasional. |
| **Estimate (estimasi)** | Snapshot tersimpan: input mentah, catatan AI, parameter (JSONB), layer override manual, total. |
| **Harga estimate** | Harga hotel perkiraan yang dikelola admin (`hotel_prices` + `hotel_monthly_prices`). |
| **Harga real** | Harga otoritatif hasil transkripsi katalog hotel (`real_hotel_prices`), per hotel per bulan, dengan label sumber. Diprioritaskan di atas harga estimate. |
| **Manual override** | Layer edit ala spreadsheet di atas rincian biaya terhitung — lengket, tersimpan, dan ikut ke semua ekspor. |
| **importKey** | Kunci ter-normalisasi untuk mencegah duplikat saat import CSV / tambah manual. |
| **divideByPax** | Penanda bahwa biaya layanan bersifat patungan rombongan; dibagi rata untuk tampilan per orang. |
| **Preview-confirm** | Pola wajib semua import CSV: validasi & tampilkan dampak dulu, tulis ke DB hanya setelah dikonfirmasi. |

---

## 5. Estimator — Model Data & Parameter

### 5.1 `EstimateParams` (`types/index.ts`)

```
nightsMadinah    number      malam di Madinah (1–30)
nightsMakkah     number      malam di Makkah (1–30)
pax              number      jumlah peserta (1–200)
hotelTier        HotelTier   fallback legacy jika hotel konkret tidak dipilih
madinahHotelId?  string      hotel konkret Madinah — menang atas hotelTier
makkahHotelId?   string      hotel konkret Makkah — menang atas hotelTier
roomType         RoomType    QUINT | QUAD | TRIPLE | DOUBLE
airline          AirlineTier | "NONE"
services         ServiceKey[]  VISA, SISKOPATUH, TASREH, TRANSPORT, TOUR_MAKKAH, TOUR_MADINAH
fullboard        boolean
travelMonth?     number      1–12; tanpa ini, harga jatuh ke base
```

**Default** (`DEFAULT_PARAMS`): 4 malam Madinah, 9 malam Makkah, 1 pax, tier `STANDARD`, room `QUAD`, maskapai `STANDARD`, layanan `[VISA, SISKOPATUH, TRANSPORT]`, fullboard `true`.

**Aturan kompatibilitas.** `hotelTier` tidak boleh dihapus — estimasi lama mungkin hanya punya tier. Estimasi lama juga bisa membawa `roomType` yang sudah pensiun (`SINGLE`); resolusi room type dibuat defensif (jatuh ke `QUAD`) alih-alih melempar error, karena params dibaca mentah dari JSONB tanpa re-validasi.

### 5.2 `PricingConfig`

Dirakit sekali per request oleh `fetchPricingConfig(db)`:

- `rates` — `{ SAR, USD }` → IDR
- `hotels` — peta fallback kota × tier
- `hotelOptions` — daftar hotel konkret per kota (dengan `monthlyPrices` **dan** `realMonthlyPrices`)
- `airlines` — peta default per tier
- `airlineOptions` — daftar opsi maskapai konkret per tier
- `services` — konfigurasi service fee
- `roomMultipliers` — `{ paxPerRoom, multiplier }` per room type

---

## 6. Mesin Perhitungan Biaya

`calculateBudget(params, pricing)` di `lib/budget/calculate.ts` — fungsi murni, tanpa efek samping, teruji unit.

### 6.1 Formula hotel

```
roomCount   = max(1, ceil(pax / paxPerRoom))
totalIdr    = sarPerNight × nights × roomMultiplier × roomCount × sarRate
perPersonIdr = round(totalIdr / pax)
```

Dihitung terpisah untuk Madinah dan Makkah.

### 6.2 Arti `roomMultiplier` — **berubah pada 2026-07-26**

`sarPerNight` adalah harga **satu kamar quad per malam**. `roomCount` sudah menjawab "berapa kamar yang dibutuhkan okupansi ini".

Sebelumnya `roomMultiplier` diisi tabel *uplift per orang* (Quad 1.0 / Triple 1.25 / Double 1.5 / Single 2.8) — ini menskalakan sumbu yang sama dua kali dan **melebihkan biaya setiap tipe kamar selain Quad**:

| Tipe | roomCount | multiplier lama | Per orang | Seharusnya | Error |
|---|---|---|---|---|---|
| Quad | 1 | 1.0 | 58,75 | 58,75 | — |
| Triple | 2 | 1.25 | 146,88 | 117,50 | **+25%** |
| Double | 2 | 1.5 | 176,25 | 117,50 | **+50%** |
| Single | 4 | 2.8 | 658 | 235 | **+180%** |

*(contoh: 4 pax, SAR 235/malam)*

**Definisi baru:** `roomMultiplier` adalah **rasio tarif kamar** relatif terhadap kamar quad. Semua nilai seed sekarang `1.0`, sehingga `roomCount` sendirian yang membawa matematika okupansi. Formula tidak berubah — yang berubah adalah datanya.

Seed saat ini: QUINT (5/kamar, 1.0), QUAD (4, 1.0), TRIPLE (3, 1.0), DOUBLE (2, 1.0).

> **Aksi operasional:** perubahan ini hanya berlaku otomatis pada database yang di-seed ulang. Database produksi yang sudah berjalan **harus diperbarui baris `room_multipliers`-nya secara manual** agar koreksi harga benar-benar terjadi.

### 6.3 Resolusi harga hotel — real-first, estimate fallback

```
jika travelMonth diisi:
    realMonthlyPrices[travelMonth]     → source = "real"       ← prioritas 1
    monthlyPrices[travelMonth]         → source = "estimate"   ← prioritas 2
selain itu:
    sarPerNight (base)                 → source = "estimate"   ← prioritas 3
```

**Month-gated by design.** Harga real bersifat musiman, jadi jalur real hanya aktif ketika `travelMonth` diisi. Tanpa bulan, hasilnya sama persis seperti sebelum fitur ini ada. Ini bukan bug.

`priceSource` (`"real" | "estimate"`) diteruskan ke `HotelCostDetail` sehingga UI bisa menampilkan asal harga untuk membangun kepercayaan, dan test bisa mengasersinya.

**Jaminan non-regresi:** tanpa satu pun baris `real_hotel_prices`, setiap estimasi menghasilkan output identik dengan sebelum fitur ini.

### 6.4 Resolusi harga maskapai

Tier → opsi default tier itu → override bulanan jika `travelMonth` ada → base IDR. `airline: "NONE"` ⇒ `flightIdr = 0`.

### 6.5 Service fee

- Mata uang `SAR`/`USD` dikonversi ke IDR pakai kurs saat itu; `IDR` diteruskan apa adanya.
- `divideByPax = true` ⇒ dibagi `pax` untuk tampilan per orang (total rombongan tetap benar: `perPax × pax = biaya asli`).
- Service yang `enabled = false` dikeluarkan dari total.

### 6.6 Output

`BudgetBreakdown`: `hotelMadinahIdr`, `hotelMakkahIdr`, `hotelMadinahDetail`, `hotelMakkahDetail`, `servicesIdr`, `serviceItems[]`, `flightIdr`, `totalIdrPax`, `totalIdrGrp`, `sarRate`, `usdRate`.

`HotelCostDetail` membawa jejak perhitungan lengkap (label hotel, tier, SAR/malam, malam, pax/kamar, jumlah kamar, multiplier, `priceSource`) sehingga setiap permukaan bisa merender formulanya sendiri.

---

## 7. Manual Override — Edit Rincian Ala Spreadsheet

Rincian biaya dulunya sepenuhnya *derived*: dihitung ulang setiap render, tidak ada yang disimpan. Itu membuat admin tidak bisa mencerminkan harga hasil negosiasi, biaya sekali-jalan, atau pos yang tidak dimodelkan mesin harga.

**Layer override** menambahkan seam persisten di atas hasil hitung.

### 7.1 Kemampuan

| Kemampuan | Detail |
|---|---|
| Ubah nominal baris | Override langsung nilai Rp per orang. |
| Ubah harga satuan | Override tarif satuan native (SAR/USD/IDR); nilai per orang dihitung ulang secara linier. |
| Ganti nama baris | Rename bebas. |
| Sembunyikan baris | Dikeluarkan dari total; tetap ditampilkan tercoret dengan tombol reset. |
| Tambah baris kustom | Pos baru bebas (mis. "Manasik", "Handling"). |

`idr` dan `unitPrice` **saling eksklusif** — mengisi salah satu menghapus yang lain.

### 7.2 Perilaku

- **Lengket.** Override bertahan melewati perhitungan ulang parameter; hanya hilang lewat reset eksplisit per baris.
- **Terkunci ke row key kanonik.** `hotelMadinah`, `hotelMakkah`, `flight`, `service:<KEY>` — stabil lintas recompute.
- **Deteksi basi.** `autoIdrAtOverride` merekam nilai otomatis saat override dibuat; jika nilai otomatis berubah setelahnya, baris ditandai `stale` agar admin tahu angkanya mungkin sudah kedaluwarsa.
- **Persisten.** Disimpan sebagai JSONB di `estimates.manual_overrides` (`null` = tidak ada edit).
- **Mengalir ke semua hilir.** Total layar, Copy, ekspor WhatsApp, dan ekspor PDF semua membaca model tampilan yang sama — angka yang dikirim ke jamaah persis angka yang diedit admin.

---

## 8. AI Parsing (Bahasa Natural → Parameter)

`lib/ai/parse.ts` + `lib/ai/prompt.ts`, memakai Anthropic Claude API.

`parseEstimate(text, pricing)` → `{ params: EstimateParams, notes: string }`. `notes` menjelaskan asumsi yang diambil AI dan wajib ditampilkan ke pengguna.

### 8.1 Kontrak parser

Parser **harus**:

- Mengekstrak malam, pax, bulan, tier hotel, nama/ID hotel, room type, maskapai, layanan, fullboard.
- Menghormati permintaan tanpa tiket secara eksplisit sebagai `airline: "NONE"` — dan **mengoreksi** output no-flight yang tidak diminta pengguna.
- Mengubah "total hari" menjadi malam Madinah/Makkah ketika pengguna menyebut hari, bukan malam. (Formula redistribusi ini dipakai bersama oleh parser dan chip "hari" di UI lewat satu helper agar tidak melenceng.)
- Mempertahankan bulan yang disebut sebagai `travelMonth`.
- Mencocokkan ID hotel konkret ketika label tersedia.
- Bila hotel yang diminta tidak ada di daftar lokal: pilih alternatif **sekota, setier** yang sebanding dan **catat substitusinya di `notes`**.
- Memakai peringkat kedekatan untuk frasa: `pelataran`, `ring 1`, `jalan kaki`, `dekat haram`, `dekat nabawi`, `near haram`, `near nabawi`.
- Ketika tidak ada hotel disebut: **mengutamakan hotel yang punya harga real** di antara opsi sebanding, sebelum jatuh ke hotel estimate-only.

Kegagalan JSON atau field wajib hilang ⇒ `ParseError`. Error API dibungkus `"Anthropic API error: …"`.

### 8.2 Batasan yang harus dijaga

Metadata `distance` adalah **konteks peringkat best-effort** yang diisi admin. Tidak boleh disajikan sebagai jaminan booking, approval, atau rute jalan kaki terverifikasi — dan **tidak pernah memengaruhi matematika biaya**.

---

## 9. Pengalaman Estimator (UI)

Revamp 2026-07-25 mengganti form 8-seksi dengan permukaan naratif.

### 9.1 Permukaan utama

- **Kalimat naratif dengan chip** — mis. *"Umroh [12 hari] untuk [2 orang] bulan [November] …"*. Setiap chip membuka editor field.
- **Editor field** — inline tray di alur halaman pada desktop (≥1024px), bottom sheet overlay pada mobile (<1024px).
- **Hotel picker** — searchable + filter tier/harga, sepenuhnya klien di atas `pricing.hotelOptions[city]` yang sudah dimuat. Tidak ada API baru.
- **Total selalu terlihat** — rail kanan sticky di desktop, bar bawah sticky di mobile.
- **Rincian Biaya** — panel breakdown dengan seluruh perilaku manual override.
- **Preview pesan WhatsApp** — bisa di-toggle dan disalin ke clipboard.
- **"Buka form lengkap"** — fallback form penuh sebagai jaring pengaman; **tidak boleh dihapus**.
- **"Ceritakan ulang dari nol"** — reset di balik konfirmasi eksplisit, dan tidak boleh diam-diam membuang `manualOverrides`.

### 9.2 Aturan yang dijaga

- Semua target sentuh ≥44px; grid bulan responsif (bukan 6 kolom mati).
- Batas numerik aplikasi tetap: pax 1–200, malam 1–30 per kota.
- Reducer, bentuk State/Action, dan handler `EstimatorClient` **tidak diubah** oleh revamp — komponen baru dilapiskan di atasnya.

### 9.3 Ekspor

- **PDF** — rincian terformat, `@react-pdf/renderer`.
- **WhatsApp** — teks siap kirim (header, item, total IDR).
- Keduanya lewat `GET /api/estimate/[id]/export?format=pdf|whatsapp` dan keduanya membaca model tampilan override-aware yang sama.

---

## 10. Fitur Publik & Komunitas

### 10.1 Gabung komunitas (`/komunitas`)

- Wajib: nama lengkap, nomor HP. Opsional: username sosial media, alasan bergabung.
- **Anonymous-first** — tidak perlu login; jika ada sesi, user diasosiasikan.
- Setelah submit: state sukses menampilkan link request grup WhatsApp + link chat admin, dan meminta pengguna memakai nama/nomor yang sama agar admin bisa mencocokkan.
- Admin di `/admin/community-requests`: lihat identitas, konteks, tanggal, **indikator duplikat**, status (Baru / Sudah dicocokkan / Ditolak), catatan internal.
- Duplikat bersifat **advisory** — tidak pernah menolak submission secara otomatis.

### 10.2 Webinar RSVP (`/webinar-umroh-mandiri`)

- Halaman publik; **link RSVP-nya** yang di-gate, bukan halamannya — supaya link kampanye tetap bisa dibagikan.
- URL RSVP disimpan di env server-only `WEBINAR_RSVP_URL`, dirender hanya setelah `auth()` mengonfirmasi sesi. Konfigurasi kosong ⇒ state "tidak tersedia", bukan link rusak.
- Visitor anonim diarahkan ke `/login?callbackUrl=/webinar-umroh-mandiri`.

### 10.3 Statistik komunitas (social proof)

Tiga angka: anggota komunitas, jamaah terbantu, pengunjung.

- Dua angka pertama **hand-maintained** di `lib/stats/community.ts` (`3.500+`, `3.000+`).
- Angka pengunjung dihitung dari `visitor_logs` (distinct IP hash), di-cache 60 detik, **plus offset promosi `+100`** — satu konstanta, dipakai badge publik **dan** dashboard admin, supaya admin bisa mengecek angka yang dilihat visitor.
- Modul `lib/stats/community.ts` sengaja **client-safe** (tidak menyentuh DB) karena navbar merendernya dari client component; query DB-nya terpisah di `lib/stats/visitor-count.ts` (server-only).
- Kegagalan baca DB ⇒ badge kosong, bukan halaman error. Angka ini menghias halaman, bukan alasan orang datang.

### 10.4 Pelacakan pengunjung

`POST /api/visitor` mencatat kunjungan. Privasi & anti-spam:

- IP di-hash SHA-256, tidak pernah disimpan mentah.
- Route `/admin`, `/dashboard`, `/login`, `/api`, `/_next`, `/favicon.ico` diabaikan.
- Satu IP + path yang sama tidak dicatat ulang dalam 15 menit.
- Kegagalan pencatatan tidak menggagalkan request.

### 10.5 Navigasi

IA baru (2026-07-25) mengganti navbar sembilan link datar:

- **Layanan** — mega menu berisi katalog enam layanan.
- **Lainnya** — dropdown overflow untuk konten sekunder.
- **Avatar account menu** — aksi akun di balik avatar.
- Badge statistik **dipindah keluar dari navbar** ke homepage hero & `/layanan`.
- Link admin hanya muncul untuk `role === ADMIN`.

---

## 11. Permukaan API

### 11.1 Estimate

| Method | Path | Akses |
|---|---|---|
| `POST` | `/api/estimate/parse` | User — parse teks bebas → params (tanpa simpan) |
| `POST` | `/api/estimate` | User — parse → hitung → simpan |
| `GET` | `/api/estimate` | User — daftar estimasi |
| `GET/PATCH/DELETE` | `/api/estimate/[id]` | Pemilik |
| `GET` | `/api/estimate/[id]/export?format=pdf\|whatsapp` | Pemilik |

### 11.2 Admin — pricing

| Method | Path |
|---|---|
| `GET` | `/api/admin/pricing` |
| `PATCH` | `/api/admin/pricing/[category]` — rates / hotel / airline / service / monthly-hotel / monthly-airline |
| `POST` | `/api/admin/pricing/hotel` — tambah hotel (auto-seed 12 baris bulanan) |
| `POST` | `/api/admin/pricing/airline` — tambah opsi maskapai (auto-seed 12 baris bulanan) |
| `GET` | `/api/admin/pricing/{hotel,airline}-import/template` |
| `POST` | `/api/admin/pricing/{hotel,airline}-import/preview` |
| `POST` | `/api/admin/pricing/{hotel,airline}-import/confirm` |
| `POST` | `/api/admin/pricing/real-hotel-import/confirm` — upsert harga real ke hotel yang sudah ada |

### 11.3 Admin — konten

`/api/admin/faqs` (+ `[id]`, `groups`, `groups/[id]`, `import/{template,preview,confirm}`) · `/api/admin/hotels` (+ `[id]`) · `/api/admin/stories` (+ `[id]`, `[id]/publish`, `import/{template,preview,confirm}`) · `/api/admin/community-requests` (+ `[id]`).

### 11.4 Publik

`POST /api/community/join` · `GET|POST /api/visitor` · `/api/auth/[...nextauth]`.

### 11.5 Aturan route publik (`middleware.ts`)

Publik: `/`, `/login`, `/api/auth`, `/api/community`, `/api/visitor`, `/panduan`, `/cerita-jamaah`, `/hotel-nusuk`, `/faq`, `/komunitas`, `/webinar-umroh-mandiri`, `/visa`, `/transportasi`, `/layanan`, `/badalin`.

Selain itu wajib login (redirect ke `/login?callbackUrl=…`). `/admin/*` tambahan wajib `role === ADMIN`, jika tidak → `/dashboard`.

---

## 12. Data, Import, & Operasional

### 12.1 Skema database (PostgreSQL + Drizzle, PK CUID2)

**Pricing:** `exchange_rates` · `hotel_prices` · `hotel_monthly_prices` · **`real_hotel_prices`** · `airline_prices` · `airline_monthly_prices` · `service_fees` · `room_multipliers`

**User & estimate:** `users` · `accounts` · `sessions` · `verification_tokens` · `estimates` · `activity_logs`

**Konten publik:** `pilgrim_stories` · `story_itinerary_days` · `story_packing_items` · `hotel_listings` · `faq_groups` · `faq_items`

**Komunitas & analitik:** `community_join_requests` · `visitor_logs`

Enum: `city`, `hotel_tier`, `airline_tier`, `service_key`, `role`, `community_join_request_status`.

Constraint penting:
- `airline_prices` — unique partial index memastikan **hanya satu default per tier**.
- `hotel_monthly_prices` / `real_hotel_prices` / `airline_monthly_prices` — unique `(parentId, month)`.
- `hotel_prices.import_key` & `airline_prices.import_key` — unique.

### 12.2 Dua lapis harga hotel — mengapa terpisah

`real_hotel_prices` sengaja **tabel terpisah**, bukan flag `source` di `hotel_monthly_prices`. Alasannya: data estimate tetap utuh dan tak tersentuh, rollback bersih, dan jaminan non-regresi bisa diuji. Kolom `sourceLabel` (mis. *"Katalog Emaar 2027"*) menjaga jejak asal katalog.

Alur masuknya: admin mentranskripsi PDF katalog hotel ke bentuk CSV yang sudah ada, import mencocokkan hotel **yang sudah ada** lewat `importKey`. Baris yang tidak cocok **dilaporkan, bukan dibuat diam-diam**. UI admin khusus untuk mengelola katalog masih ditunda.

### 12.3 Pola import CSV (hotel, maskapai, FAQ, cerita, real price)

Semua mengikuti **preview → confirm**:

1. Upload/paste CSV → route `preview` memvalidasi dan mengembalikan klasifikasi baris: *create / update / invalid / conflict*. **Tidak ada penulisan.**
2. Admin meninjau.
3. Route `confirm` **mem-parse dan memvalidasi ulang dari awal** — state preview dari klien tidak pernah dipercaya — lalu menerapkan baris yang valid.

Aturan lain: pencegahan duplikat lewat `importKey` ter-normalisasi; sel override bulanan kosong jatuh ke harga base; FAQ hasil import masuk sebagai **draft**; `distance` opsional dan **tidak boleh** memengaruhi `importKey`.

Kolom template:

```csv
# hotel
city,tier,label,sublabel,distance,base_sar_per_night,jan_sar,…,dec_sar
# maskapai
tier,label,sublabel,base_idr_per_person,is_default,jan_idr,…,dec_idr
# faq
group,question,answer
```

Template & prompt riset ada di `docs/templates/`.

### 12.4 Environment variables

| Var | Fungsi |
|---|---|
| `DATABASE_URL` | Postgres (self-hosted atau Neon) |
| `AUTH_SECRET`, `AUTH_URL`, `AUTH_TRUST_HOST` | NextAuth v5 (trust host wajib di balik reverse proxy) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `ANTHROPIC_API_KEY` | AI parsing |
| `NEXT_PUBLIC_COMMUNITY_WHATSAPP_GROUP_URL`, `NEXT_PUBLIC_COMMUNITY_ADMIN_WHATSAPP_URL` | Link komunitas |
| `WEBINAR_RSVP_URL` | **Server-only** RSVP webinar |
| `NEXT_PUBLIC_SHOW_MONTHLY_HOTEL_PRICE` | Feature flag grid harga bulanan |

### 12.5 Activity log

`activity_logs` mencatat `flow` / `event` / `status` (mis. `estimate` / `ai_parse` / `SUCCESS`) beserta input, output, error, dan metadata — untuk menelusuri kegagalan parsing AI dan penyimpanan estimasi.

---

## 13. Tech Stack & Deployment

| Layer | Teknologi |
|---|---|
| Framework | Next.js 14 App Router (output `standalone`) |
| Bahasa | TypeScript |
| Styling | Tailwind CSS + komponen Radix UI lokal |
| Database | PostgreSQL via Drizzle ORM |
| Auth | NextAuth v5 (credentials + Google OAuth) |
| AI | Anthropic Claude API (`@anthropic-ai/sdk`) |
| Konten | MDX, react-markdown, gray-matter |
| PDF | `@react-pdf/renderer` |
| Test | Vitest + Testing Library |
| Package manager | pnpm |

**Deployment** (rencana 2026-05-17, belum diverifikasi terhadap server): VPS dengan **Dokploy** (PaaS self-hosted berbasis Docker), Dockerfile multi-stage, PostgreSQL dalam container dengan named volume, SSL/HTTPS otomatis lewat Traefik bawaan Dokploy, auto-deploy tiap push ke `main` lewat GitHub webhook.

Di luar cakupan deployment saat ini: test runner di CI, blue-green/canary, monitoring/alerting eksternal, layanan email, otomasi backup (hanya runbook `pg_dump` manual).

Perintah utama: `npm run dev` · `build` · `test` · `db:generate` · `db:migrate` · `db:push` · `seed` · `import:real-prices`.

---

## 14. Kualitas & Status Pengujian

**Dijalankan pada commit acuan (2026-07-26):**

```
Test Files  1 failed | 72 passed  (73)
Tests       2 failed | 622 passed (624)
```

**Dua kegagalan — test basi, bukan bug produk.** `app/(public)/webinar-umroh-mandiri/__tests__/page.test.tsx` masih mengasersi `"Ahad, 14 Juni 2026"`, sementara halaman sudah diperbarui ke `"Selasa, 16 Juni 2026"`. Perbaikannya: perbarui asersi test agar cocok dengan tanggal acara saat ini.

Area cakupan test terkuat: mesin budget (`lib/budget/`), AI parsing (`lib/ai/`), semua parser import CSV (`lib/admin/`), route import (preview & confirm), komponen estimator, ekspor, auth, dan skema DB.

**Gate yang belum bisa diandalkan:**
- `npx tsc --noEmit` — sebelumnya gagal karena type-cast error di test route admin hotels/stories.
- `npm run lint` — `next lint` masih meminta konfigurasi ESLint interaktif, jadi belum bisa dipakai non-interaktif.

---

## 15. Risiko, Utang Teknis, & Keputusan Terbuka

| # | Isu | Dampak | Rekomendasi |
|---|---|---|---|
| 1 | **Baris `room_multipliers` produksi belum tentu diperbarui.** Koreksi multiplier adalah perubahan data, bukan kode. | Estimasi Triple/Double di produksi masih bisa kelebihan 25–50%. | Verifikasi & perbarui 4 baris di DB produksi. Jadikan checklist rilis. |
| 2 | **Akses estimator ambigu.** Plan menyebut admin-only; kode memakai `requireAuth()` (semua user login). | Jamaah bisa mengakses editor harga internal. | Keputusan produk: kunci ke admin, atau resmikan sebagai fitur user. |
| 3 | **Riwayat migrasi ganda.** Ada dua lineage (dua `0000`, dua `0001`, dua `0008`); `_journal.json` hanya memuat 2 entri hasil squash. | Deploy baru aman (baseline lengkap & current), tapi DB lama yang dimigrasikan dengan lineage lama bisa tidak sinkron. | Verifikasi state produksi vs journal; hapus file migrasi yatim. |
| 4 | **Dua dokumen produk lama masih beredar** (`FEATURES.md`, `PRD-…-updated.md`). | Tim membaca informasi kedaluwarsa. | Tandai keduanya superseded, arahkan ke dokumen ini. |
| 5 | `npm run lint` & `tsc --noEmit` belum jadi gate | Regresi tipe lolos ke main. | Tambahkan config ESLint; perbaiki type-cast di test admin. |
| 6 | Belum ada UI admin untuk katalog harga real | Kurasi harga real bergantung transkripsi CSV manual. | Sesuai rencana (ditunda), evaluasi jika volume katalog naik. |
| 7 | Kurs di `/transportasi` di-hardcode di klien (default 4850) & bisa diubah pengguna, terpisah dari `exchange_rates` DB | Angka transport bisa berbeda dari estimator. | Sadari sebagai perbedaan yang disengaja, atau satukan sumbernya. |
| 8 | Angka komunitas (3.500+/3.000+) hand-maintained, dan pengunjung diberi offset +100 | Bukan angka audit. | Jaga sebagai social proof; jangan dipakai untuk pelaporan. |
| 9 | Tidak ada monitoring/alerting/backup otomatis | Insiden produksi tidak terdeteksi. | Prioritaskan setelah traffic naik. |

---

## 16. Invarian — Hal yang Tidak Boleh Dilanggar

Aturan-aturan ini sudah menyebabkan bug sebelumnya. Simpan.

1. **Jangan hapus fallback `hotelTier`.** Estimasi tersimpan mungkin hanya punya tier.
2. **Jangan pernah biarkan metadata (jarak, tag, URL OTA) mengubah matematika biaya.** Metadata hanya untuk pencocokan & peringkat.
3. **Jangan biarkan `distance` memengaruhi `importKey`.** Itu mengubah identitas baris import.
4. **Jangan campur `hotel_prices.distance` (estimator, teks bebas) dengan `hotel_listings.distanceMeters` (direktori Nusuk, numerik).** Dua konsep berbeda.
5. **Route `confirm` harus memvalidasi ulang dari awal.** Jangan pernah percaya state preview dari klien.
6. **Resolusi room type harus defensif.** Params dibaca mentah dari JSONB; tipe pensiunan harus jatuh ke `QUAD`, bukan melempar error.
7. **Harga real hanya berlaku ketika `travelMonth` diisi.** Ini desain, bukan bug.
8. **Fallback "Buka form lengkap" di estimator tidak boleh dihapus.**
9. **Reset estimator tidak boleh diam-diam membuang `manualOverrides`.**
10. **`lib/stats/community.ts` harus bebas dari akses database.** Navbar merendernya dari client component.
11. **Preview FAQ di dashboard maksimal tujuh item.**
12. **Jangan mengandalkan harga OTA live di dalam logika estimator runtime.**

---

## 17. Riwayat Keputusan Produk (kronologis)

| Tanggal | Keputusan |
|---|---|
| 2026-04-30 | Estimator awal: parsing AI + mesin budget + tier hotel/maskapai. |
| 2026-05-08 | Import CSV harga hotel dengan pola preview-confirm. |
| 2026-05-09 | Maskapai berubah dari tier tunggal → banyak opsi konkret per tier dengan satu default. |
| 2026-05-09 | Pemilihan hotel konkret per kota, menggantikan tier sebagai jalur utama. |
| 2026-05-10 | Manajemen FAQ (grup, publish/draft, import). |
| 2026-05-11 | Metadata jarak/kedekatan hotel untuk pencocokan AI. |
| 2026-05-17 | Deployment pertama ke VPS via Dokploy + Docker. |
| 2026-05-30 | Alur gabung komunitas anonymous-first + review admin. |
| 2026-06-11 | Halaman webinar dengan gate pada link RSVP (bukan halamannya). |
| 2026-06-21 | Gambar kendaraan di `/transportasi`. |
| 2026-07-11 | **Manual override** — rincian biaya bisa diedit ala spreadsheet, lengket & persisten. |
| 2026-07-24 | **Real price layer** — harga katalog otoritatif diprioritaskan di atas estimate. |
| 2026-07-25 | **Revamp estimator** — kalimat naratif + chip editor menggantikan form 8-seksi. |
| 2026-07-25 | **Navbar & IA baru** — mega menu Layanan, dropdown Lainnya, account menu; halaman `/layanan` & `/badalin`. |
| 2026-07-25 | Statistik komunitas kembali ke homepage, satu sumber angka. |
| 2026-07-26 | **Perbaikan multiplier room type** — redefinisi sebagai rasio tarif kamar; `SINGLE` pensiun, `QUINT` masuk. |

---

## 18. Rujukan

| Topik | Lokasi |
|---|---|
| Skema database | `lib/db/schema.ts`, `drizzle/migrations/` |
| Tipe domain | `types/index.ts` |
| Mesin budget | `lib/budget/calculate.ts` |
| Logika override | `lib/budget/overrides.ts`, `lib/estimate/overrides.ts` |
| Room type | `lib/estimate/room-types.ts` |
| AI parsing | `lib/ai/parse.ts`, `lib/ai/prompt.ts` |
| Parser import | `lib/admin/*-import.ts` |
| Katalog layanan | `lib/services/catalog.ts` |
| Konten Badalin | `lib/badalin/content.ts` |
| Statistik | `lib/stats/community.ts`, `lib/stats/visitor-count.ts` |
| Ekspor | `lib/export/{pdf,whatsapp,summary}.ts` |
| Akses route | `middleware.ts`, `auth.ts`, `auth.config.ts`, `lib/auth.ts` |
| UI estimator | `components/estimator/` |
| Template import & prompt riset | `docs/templates/` |
| Riwayat plan | `docs/plans/` |
| Catatan desain | `docs/design_handoff_estimator_revamp/`, `docs/2026-07-25-*` |
