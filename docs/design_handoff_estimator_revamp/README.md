# Handoff: Revamp halaman /estimate/new (Estimator Biaya Umroh)

**Branch tujuan:** `feat/estimate-update`
**Halaman:** `app/(dashboard)/estimate/new/page.tsx` (dipakai juga `app/(dashboard)/estimate/[id]/page.tsx` lewat `EstimatorClient`)
**Tanggal handoff:** 2026-07-25

---

## Overview

Revamp UI/UX halaman estimator biaya umroh. Arah yang dipilih (opsi **1d** di wireframe): hasil parse AI ditampilkan sebagai **kalimat naratif yang bisa dibetulkan**, bukan form 8 section. Tiap parameter jadi *chip* di dalam kalimat; klik chip membuka editor (tray di desktop, bottom sheet di mobile). Di bawahnya, **Rincian Biaya** tetap jadi tabel yang bisa dioverride manual per baris — fitur inti yang tidak boleh disederhanakan.

Masalah yang diselesaikan (nomor mengacu ke `2026-07-25-estimate-new-page-design-notes.md`):
- #1 grid bulan fixed 6 kolom → 6 kolom desktop / 3 kolom mobile, sel ≥52px
- #2 form satu kolom kepanjangan, total terkubur → kalimat ringkas + sticky total bar mobile + sticky rail desktop
- #3 touch target <44px → semua kontrol interaktif ≥44px di mobile
- #4 kartu hotel padat → pemilih hotel dengan search + filter tier/harga (skala 10–30 hotel per kota)
- #6 kolom kiri jauh lebih tinggi dari kanan → kalimat memadatkan params, rail kanan diisi total + breakdown kategori + preview WA
- #7 semua section bobot sama → hierarki: kalimat (primer) → rincian biaya (sekunder) → form lengkap (tersembunyi)
- #8 dua entry point bersaing → urutan eksplisit: cerita dulu → kalimat hasil → koreksi

## About the Design Files

File di bundle ini adalah **referensi desain yang dibuat dengan HTML** — prototipe yang menunjukkan tampilan dan perilaku yang diinginkan, **bukan kode produksi untuk dicopy**. Tugasnya adalah **membuat ulang desain ini di codebase Next.js yang sudah ada** (React + Tailwind + shadcn/Radix), memakai pola, token, dan komponen yang sudah mapan di sana.

Khususnya:
- Prototipe pakai inline style; di codebase pakai Tailwind + CSS vars (`var(--color-gold)` dst) sesuai pola dominan file yang diedit.
- Prototipe punya state sendiri; di codebase **pakai reducer `EstimatorClient.tsx` yang sudah ada** — `patchRow`, override logic, handler save/parse **jangan diubah**. Ini pekerjaan presentasi.
- Prototipe menampilkan desktop 1440 dan mobile 390 bersebelahan hanya untuk review; di produksi itu satu halaman responsif dengan breakpoint default project (`sm:640 md:768 lg:1024`).

## Fidelity

**High-fidelity.** Warna, tipografi, spacing, radius, dan interaksi sudah final dan mengikuti design system yang ada (dark green/gold, Amiri + DM Sans). Recreate se-pixel-perfect mungkin dengan komponen `components/ui/*` yang ada.

Wireframe lo-fi (4 arah struktur, termasuk 3 arah yang tidak dipilih) disertakan sebagai konteks keputusan: `Estimator Wireframes.dc.html`.

---

## Screens / Views

### 1. Desktop — /estimate/new (≥1024px)

**Purpose:** admin (dan nanti calon jamaah) menyusun estimasi: cerita bebas → kalimat hasil → koreksi chip → override rincian → simpan / kirim WA.

**Layout:**
- Container: max-width 1440px, padding `30px 40px 44px`, background `#0b1c12`.
- Header halaman: judul + deskripsi di kiri; di kanan dua tombol sekunder ("Buka form lengkap", "Tulis ulang dari nol"), tinggi 34px.
- Body: flex row, gap 26px → kolom utama `flex:1; min-width:0` + rail kanan `width:352px; flex:none; position:sticky; top:20px`.

**Komponen kolom utama:**

1. **Story panel** (kondisional, `showStory`) — border `1px solid rgba(201,168,76,.4)`, radius 14px, bg `rgba(201,168,76,.05)`, padding `24px 26px`, gap 14px.
   - Badge langkah "1": 22px bulat, bg `#c9a84c`, teks `#0b1c12`, DM Sans 700 12px.
   - Judul "Ceritakan rencana Kakak" — Amiri 700 16px, `#c9a84c`.
   - Textarea 4 baris: bg `rgba(0,0,0,.28)`, border `1px solid rgba(201,168,76,.22)`, radius 10px, padding `13px 15px`, DM Sans 400 13.5px/1.65. Placeholder = contoh cerita.
   - 3 chip contoh: pill radius 20px, border `rgba(201,168,76,.25)`, padding `6px 13px`, 12px; hover border `#c9a84c`.
   - CTA "Hitung Estimasi": h44, bg `#c9a84c`, radius 9px, DM Sans 700 13.5px, teks `#0b1c12`; hover `#dcbc66`. Saat parsing label jadi "Mengurai cerita Kakak…".
   - Link "Batal" di sebelahnya.

2. **Sentence card** (selalu tampil) — border `1px solid rgba(201,168,76,.34)`, radius 14px, bg `rgba(201,168,76,.045)`.
   - Eyebrow "RENCANA KAKAK" — DM Sans 700 9.5px, letter-spacing .11em, uppercase, `#c9a84c`; di sebelahnya hint "klik bagian bergaris untuk betulkan" 11.5px `rgba(232,239,230,.4)`.
   - Paragraf: Amiri 400 **21px / line-height 2.15**, `#e8efe6`, padding `8px 24px 20px`, `text-wrap:pretty`.
   - **Chip** (inline-flex, baseline): padding `4px 11px`, margin `0 1px`, bg `rgba(201,168,76,.09)`, border `1px solid rgba(201,168,76,.4)` dengan **border-bottom-width 2px** (efek "bergaris"), radius 8px, DM Sans 600 13.5px, `#e8efe6`, cursor pointer, transition `border-color .15s, background .15s`. Hover/aktif: border `#c9a84c`, bg `rgba(201,168,76,.2)`.
   - Urutan kalimat (copy final): `Umroh [12 hari] untuk [2 orang] bulan [November]. Madinah [4 malam] di [Emaar Taibah], Makkah [9 malam] di [Al Fouad Tower], kamar [quad] [fullboard], naik [Saudia], plus [visa + siskopatuh + transport].`
   - Footer: teks "Kalau rencananya berubah banyak," + pill CTA "✎ ceritakan ulang dari nol" (h34, radius 20px, bg `rgba(201,168,76,.12)`, border `rgba(201,168,76,.45)`, 600 12px `#c9a84c`) + "— kami susun kalimatnya lagi."
   - **Tray** (muncul di dalam card, border-top `1px solid rgba(201,168,76,.28)`, bg `rgba(0,0,0,.3)`, padding `18px 24px 20px`, animasi `trayIn .16s ease-out` = opacity 0→1 + translateY(-6px)→0). Header tray: judul uppercase gold + tombol tutup 26×26.
     - **Number tray** (hari, peserta, malam Madinah, malam Makkah): tombol −/+ 44×44 radius 10px, angka Amiri 700 26px `#c9a84c` (min-width 64px, center), hint 12.5px di kanan.
     - **Month tray**: grid `repeat(6, minmax(0,1fr))` gap 8px, max-width 560px. Sel: min-height 46px, padding `9px 6px`, bg `rgba(0,0,0,.25)`, border `1px solid rgba(201,168,76,.18)`, radius 9px; isi = nama bulan (600 13px) + label musim (400 9.5px, opacity .6). Aktif: bg `rgba(201,168,76,.18)`, border `#c9a84c`, teks `#c9a84c`.
     - **Hotel tray**: input search w280 h38 + 5 filter pill (Semua / Pelataran / Premium / Standard / ≤ SAR 300, min-height 36px desktop) + counter "N dari M hotel". List: grid 2 kolom gap 8px, `max-height:264px; overflow-y:auto`. Baris hotel: min-height 48px, padding `10px 12px`, radius 10px; kiri nama (600 13px) + meta "tier · lokasi" (400 11px muted), kanan "SAR nnn" (700 12.5px gold).
     - **Options tray** (kamar / konsumsi / maskapai / layanan): flex wrap gap 8px, sel sama seperti month tray (label + note). Layanan = multi-select (tray tetap terbuka).

3. **Form lengkap** (kondisional, `showFullForm`) — fallback kalau chip tidak cukup. Border `rgba(201,168,76,.18)`, bg `rgba(255,255,255,.03)`, radius 14px, padding `20px 24px`. Grid `repeat(4, minmax(0,1fr))` gap 14px; tiap sel tombol: label uppercase 9px muted + value 600 13.5px, bg `rgba(0,0,0,.25)`, radius 10px, padding `11px 13px`. Klik = buka tray yang sama.

4. **Rincian Biaya** — border `rgba(201,168,76,.18)`, bg `rgba(255,255,255,.03)`, radius 14px.
   - Header: "Rincian Biaya" Amiri 700 16px gold + hint 11.5px; kanan "Reset semua override" (hanya jika ada override) + "Salin rincian" (h30, radius 8px, border `rgba(201,168,76,.28)`); label berubah "Tersalin ✓" 1,6s.
   - Grid kolom: `1fr 148px 176px 40px`, gap 10px, padding baris `11px 24px`, border-top `1px solid rgba(201,168,76,.09)`.
   - Header kolom: KOMPONEN / HARGA SATUAN / TOTAL / ORANG — 700 9px uppercase muted, dua terakhir right-aligned.
   - Kolom 1: input label transparan (border transparan, hover `rgba(201,168,76,.28)`), 600 13.5px; badge **manual** (bg `#c9a84c`, teks `#0b1c12`, radius 20px, 700 8.5px uppercase) muncul jika baris dioverride; sub-note 11.5px `rgba(232,239,230,.42)`.
   - Kolom 2 & 3: prefix mata uang (SAR / $ / Rp) 11px muted + input angka right-aligned, min-height 36px, radius 8px, 600 13px. Default bg `rgba(0,0,0,.3)` border `rgba(201,168,76,.16)`; **saat manual** bg `rgba(201,168,76,.1)` border `#c9a84c`, dan seluruh baris dapat bg `rgba(201,168,76,.05)` (transition .2s).
   - Kolom 4: tombol hapus 32×32, hover border `#c9683c` teks `#e8a082`.
   - Footer: "+ Tambah baris biaya" h40 full-width, border dashed `rgba(201,168,76,.34)`, radius 10px.

**Rail kanan (sticky):**
- **Total card**: border `1px solid rgba(201,168,76,.4)`, radius 14px, background `linear-gradient(180deg, rgba(201,168,76,.1), rgba(201,168,76,.03))`, padding 22px, gap 14px.
  - Eyebrow "TOTAL PER ORANG" gold; angka **Amiri 700 34px/1 `#c9a84c`** dengan `transition: color .25s`.
  - Sub-line: "N orang · X malam Madinah + Y malam Makkah · Bulan (season)" 11.5px muted.
  - Breakdown 3 kategori (Hotel Madinah & Makkah / Penerbangan / Visa & layanan): label 12.5px + jumlah singkat 600 12.5px, plus bar 3px `background:#c9a84c`, width = proporsi terhadap kategori terbesar, `transition: width .3s ease`.
  - Disclaimer kurs 10.5px `rgba(232,239,230,.38)`.
  - CTA primer "Simpan Estimasi" h46 bg gold radius 10px (label → "Estimasi tersimpan ✓" 2s); CTA sekunder "Kirim ke jamaah via WhatsApp" h42 border gold teks gold.
- **WA preview card** (toggle): bg `rgba(0,0,0,.32)`, radius 10px, `white-space: pre-line`, 12.5px/1.7; tombol "Salin pesan" h36.

### 2. Mobile — /estimate/new (<1024px), lebar acuan 390px

**Layout:** satu kolom, area scroll di antara header dan sticky bottom bar (`bottom: 96px` reserved), padding `14px 16px 20px`, gap 16px.

**Komponen:**
1. Judul Amiri 700 21px gold.
2. **Sentence card** — sama seperti desktop tapi paragraf **Amiri 400 16px / line-height 56px** (agar chip 44px tidak bertumpuk antar baris). **Chip mobile: min-height 44px, padding `0 13px`, font 600 13px**, sisanya identik. Kalimat mobile dipangkas sampai "kamar [quad]." (maskapai & layanan diedit lewat form lengkap / tray). Hint di bawah: "Tap bagian bergaris untuk betulkan".
3. **Rincian biaya** sebagai kartu, bukan tabel: tiap baris = card padding `11px 12px`, radius 10px, border `rgba(201,168,76,.14)` (manual: border `rgba(201,168,76,.4)`, bg `rgba(201,168,76,.06)`). Isi: nama 600 13px + total singkat 600 13px gold di kanan; baris kedua note 11px muted + badge manual. Tap baris → sheet edit. "+ Tambah baris biaya" h44 dashed.
4. **Bottom sheet** (pengganti tray): overlay `position:absolute; inset:0; z-index:5; background:rgba(0,0,0,.5)`, align-items flex-end. Panel: bg `#12251a`, border-top `1px solid rgba(201,168,76,.4)`, radius `18px 18px 0 0`, `max-height:74%`, `overflow-y:auto`, padding `16px 16px 22px`, animasi `sheetIn .2s ease-out` (translateY 100%→0). **z-index wajib di atas bottom bar.** Tombol tutup 44×44.
   - Number: −/+ **52×52** radius 12px, angka Amiri 700 30px, hint di bawah center.
   - Month: grid 3 kolom, sel min-height 54px.
   - Hotel: input search h44, filter pill **min-height 44px** padding `0 16px`, list vertikal baris min-height 56px.
   - Options: pill min-height 54px.
5. **Sticky bottom bar**: border-top `1px solid rgba(201,168,76,.34)`, bg `#0e2013`, padding `12px 16px 16px`. Kiri: eyebrow "TOTAL / ORANG" 8.5px uppercase + angka **Amiri 700 22px gold** (format singkat "Rp 47,78 jt"). Kanan: CTA h48 padding `0 18px` bg gold radius 11px "Kirim WA".

---

## Interactions & Behavior

- **Klik chip** → set `tray = <kind>`, reset `hotelQuery`/`hotelFilter`. Desktop: tray render di dalam sentence card (bukan popover mengambang — hindari positioning). Mobile: bottom sheet.
- **Pilih nilai** → tutup tray, kecuali **layanan tambahan** (multi-select, tray tetap terbuka).
- **Stepper** clamp: hari 3–30, peserta 1–40, malam 0–20 per kota.
- **Search hotel** match nama **dan** meta (tier/lokasi), case-insensitive; filter `≤ SAR 300` numerik, filter lain match tier.
- **Override** → `patchRow` yang sudah ada: edit label / harga satuan / total per baris; badge `manual` + highlight baris; "Reset semua override" mengosongkan override dan baris yang dihapus.
- **Hapus baris**: baris hasil hitung masuk daftar `removed` (bisa dipulihkan lewat reset), baris custom dihapus permanen.
- **Parse cerita**: tombol menampilkan state "Mengurai cerita Kakak…" lalu kalimat ter-update. Di produksi ini menunggu response `fetch` parse yang sudah ada.
- **Copy / Save**: label tombol berubah jadi "✓" 1,6–2s lalu balik (pakai Toast yang sudah ada kalau lebih sesuai pola project).
- **Transisi**: hanya CSS (`transition-colors`, `transition: width .3s`, dua keyframes `trayIn`/`sheetIn`). **Tidak ada library animasi baru.**
- **Responsive**: kalimat + rincian kartu di bawah `lg`; dua kolom + sticky rail di `lg:`. Grid bulan `grid-cols-3 sm:grid-cols-4 md:grid-cols-6` (sesuai unit U4 rencana mobile-responsiveness yang belum diterapkan).
- **Touch target**: semua kontrol interaktif mobile ≥44px (chip, filter pill, tombol tutup, baris hotel, stepper 52px).

## State Management

Semua ini **sudah ada** di reducer `EstimatorClient.tsx` — jangan buat state baru untuk data:
`days, pax, month, mdNights, mkNights, mdHotel, mkHotel, room, board, airline, services[], overrides{}, customRows[]`.

State **UI baru** yang perlu ditambahkan (lokal di komponen, tidak masuk reducer):
- `tray: null | 'days' | 'pax' | 'month' | 'mdNights' | 'mkNights' | 'mdHotel' | 'mkHotel' | 'room' | 'board' | 'airline' | 'services'`
- `hotelQuery: string`, `hotelFilter: 'all' | 'pelataran' | 'premium' | 'standard' | 'cheap'`
- `showStory: boolean`, `parsing: boolean`, `showFullForm: boolean`, `waOpen: boolean`
- flag transient: `saved`, `copied`, `copiedWa`

Data fetching: tidak ada yang baru. Parse & save pakai handler yang sudah ada.

## Perhitungan (prototipe, samakan dengan implementasi asli)

Prototipe pakai rumus yang mereproduksi angka di screenshot lama; **sumber kebenaran tetap perhitungan di codebase**:
- Kurs: SAR 1 = Rp 4.900, USD 1 = Rp 18.150.
- Hotel per orang = `rate SAR × malam × 4900 × roomMultiplier` (quad 1 / triple 1.3 / double 1.85).
- Visa USD 165 → 2.994.750; Transport SAR 2.500 → 12.250.000; Siskopatuh Rp 200.000; Penerbangan Saudia Rp 14.500.000.
- Total contoh (Emaar Taibah 235×4, Al Fouad 300×9, quad, Saudia, visa+siskopatuh+transport) = **Rp 47.780.750** — sama dengan screenshot sebelum revamp.

## Design Tokens

Sudah ada di `app/globals.css` — pakai CSS vars, jangan hardcode:

| Token | Nilai | Catatan |
|---|---|---|
| `--color-bg` | `#0b1c12` | background halaman |
| `--color-surface` | `rgba(255,255,255,.03)` | card netral |
| `--color-border` | `rgba(201,168,76,.18)` | border default |
| `--color-gold` | `#c9a84c` | satu-satunya aksen |
| gold hover | `#dcbc66` | tombol primer hover |
| `--color-text` | `#e8efe6` | |
| `--color-text-muted` | `rgba(232,239,230,.45)` | varian .38/.42/.55 dipakai untuk hierarki |
| aksen kuat | `rgba(201,168,76,.34–.45)` | border card penting & chip |
| bg aksen | `rgba(201,168,76,.045–.2)` | fill card/chip/aktif |
| danger | `#c9683c` border / `#e8a082` teks | hanya hover hapus baris |
| Radius | 8px kontrol kecil · 10px input/tombol · 14px card · 20px pill · 26px bezel mock | `--radius: .5rem` sebagai basis |
| Font heading | **Amiri** 400/700 | judul, semua angka total, kalimat naratif |
| Font body | **DM Sans** 400/500/600/700 | label, tombol, tabel |
| Skala tipe | 9px uppercase eyebrow · 11–12.5px meta · 13–13.5px body/kontrol · 16px judul card · 21px kalimat · 21–34px angka total | |
| Spacing | 4 · 8 · 10 · 14 · 20 · 22 · 26 · 40 | gap card 14–26px, padding card 18–26px |
| Shadow | `0 24px 60px rgba(0,0,0,.45)` | hanya untuk mock frame, tidak untuk card in-app |

## Assets

Tidak ada aset baru. Tanpa gambar, tanpa ikon SVG kustom — ikon memakai karakter teks (`−`, `+`, `×`, `✎`, `⌕`, `▾`); ganti dengan icon set yang sudah dipakai project (mis. lucide) saat implementasi. Font dari Google Fonts (Amiri, DM Sans) — sudah dipakai project.

## Files

| File | Isi |
|---|---|
`Estimator Hi-Fi.dc.html` | Prototipe hi-fi interaktif, arah final (1d). Desktop 1440 + mobile 390 berbagi satu state. Buka langsung di browser. |
`Estimator Wireframes.dc.html` | 4 wireframe lo-fi (1a–1d) + catatan trade-off tiap arah. Konteks keputusan. |
`2026-07-25-estimate-new-page-design-notes.md` | Brief asli: peta komponen, design system, 9 temuan UX, batasan fungsional. |
`support.js` | Runtime prototipe. Tidak relevan untuk implementasi. |

## Batasan (dari brief — jangan dilanggar)

1. Jangan ubah alur data/state `EstimatorClient.tsx` (reducer, `patchRow`, override logic, save/parse handlers).
2. Pertahankan kontrak props komponen anak bila memungkinkan — cek `components/estimator/__tests__/{BudgetBreakdown,EstimatorClient,EstimatorPreFill}.test.tsx` sebelum mengubah struktur DOM yang di-assert.
3. Fitur manual override (label/harga/hide per baris, custom rows) tidak boleh disederhanakan.
4. Breakpoint Tailwind default (`sm:640 md:768 lg:1024`) — jangan tambah custom breakpoint.
5. Dark-only, gold satu-satunya aksen. Tidak ada mode terang, tidak ada palet baru.
6. Tanpa dependency animasi baru; CSS transition saja.

## Catatan terbuka untuk developer

- Gate admin-only masih aktif (`page.tsx:43-77`). Keputusan: **admin dulu, desain siap dibuka** untuk calon jamaah — jadi copywriting sudah memakai tone "Kakak" dan CTA "Kirim ke jamaah via WhatsApp".
- Perlu dicek di browser: double container (`layout.tsx:11` `container mx-auto px-4 py-6` + `page.tsx:103` `max-w-6xl mx-auto`) di layar sangat lebar. Desain baru butuh lebar efektif ≥1360px untuk dua kolom + rail 352px.
- Kalau chip mobile terasa penuh untuk paket dengan banyak layanan tambahan, jalur "Buka form lengkap" adalah fallback yang sudah didesain — jangan hapus.
