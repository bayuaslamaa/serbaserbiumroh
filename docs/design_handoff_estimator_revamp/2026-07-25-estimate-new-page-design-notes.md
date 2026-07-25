# Catatan Desain — Revamp Halaman `/estimate/new`

**Tanggal:** 2026-07-25
**Branch:** `feat/estimate-update`
**Halaman:** `app/(dashboard)/estimate/new/page.tsx` (dipakai juga oleh `app/(dashboard)/estimate/[id]/page.tsx` lewat `EstimatorClient`)
**Status:** brief untuk sesi desain berikutnya (ce-frontend-design) — belum ada implementasi

---

## Tujuan dokumen

Ini adalah catatan konteks untuk sesi Claude berikutnya yang akan mengerjakan revamp UI/UX halaman estimator, di desktop maupun mobile. Isinya: peta komponen saat ini, sistem desain yang sudah ada (harus dipertahankan), temuan masalah UX konkret dengan referensi file:baris, dan beberapa arah desain untuk didiskusikan — bukan keputusan final.

**Mode desain: Existing System.** Halaman ini punya token warna, font, radius, dan pola komponen yang sudah mapan di seluruh app (lihat bagian Sistem Desain). Revamp harus *extend* bahasa visual ini, bukan mengganti dengan palet/font baru. Pekerjaan ini masuk Module C (Components & Features) dari skill ce-frontend-design: fokus ke kualitas interaksi & komposisi, bukan membangun identitas visual baru.

---

## ⚠️ Hal yang perlu dikonfirmasi dulu ke user sebelum mulai build

Halaman ini saat ini **hanya bisa diakses admin** (`app/(dashboard)/estimate/new/page.tsx:43-77`). Non-admin melihat layar "Fitur Segera Hadir", bukan form estimator. Kalau revamp ini ditujukan untuk audiens yang lebih luas (calon jamaah), perlu dikonfirmasi dulu apakah gate ini akan dibuka juga — karena itu mengubah prioritas desain (copywriting, onboarding, empty state) secara signifikan.

---

## 1. Peta komponen saat ini

```
app/(dashboard)/estimate/new/page.tsx   — server component, auth gate, parse initial searchParams
└── components/estimator/EstimatorClient.tsx   — state (useReducer), fetch parse & save
    ├── InputPanel.tsx        — textarea deskripsi bebas + parse AI + chip contoh
    ├── ParamsPanel.tsx       — form manual: nights, pax, bulan, hotel×2 kota, tipe kamar,
    │                           maskapai, layanan tambahan, fullboard
    │   ├── Stepper.tsx           — kontrol angka (nights, pax)
    │   ├── RadioCardGrid.tsx     — grid kartu radio (hotel, kamar, maskapai)
    │   └── ServiceCheckboxGrid.tsx — checkbox layanan tambahan
    └── BudgetBreakdown.tsx   — hasil hitung, override manual per baris, total, tombol simpan
        ├── ComputedRow (internal)     — baris hasil hitung, bisa diedit (unit price/amount/label/hide)
        └── CustomRowEditor (internal) — baris custom tambahan
```

Layout halaman: `grid grid-cols-1 lg:grid-cols-2` — kolom kiri (Input + Params), kolom kanan sticky (Breakdown + tombol Simpan) hanya aktif ≥1024px (`EstimatorClient.tsx:381,397`). Di bawah `lg:`, semuanya jadi satu kolom vertikal panjang.

---

## 2. Sistem desain yang sudah ada — pertahankan ini

Dari `app/globals.css:5-19` dan `tailwind.config.ts`:

- **Aesthetic:** "Islamic dark green/gold" — dark-only, tidak ada mode terang. Ini sengaja (lihat komentar `PRD §14`), bukan sesuatu yang perlu diperbaiki.
- **Warna (CSS vars):** `--color-bg` (#0b1c12), `--color-surface` (putih 3% alpha), `--color-border` (gold 18% alpha), `--color-gold` (#c9a84c) sebagai satu-satunya aksen, `--color-text` / `--color-text-muted`.
- **Font:** heading `Amiri` (serif, untuk judul & angka total), body `DM Sans`.
- **Radius:** `--radius: 0.5rem`, dipakai konsisten (`rounded-lg`/`rounded-xl` untuk card, `rounded-md` untuk kontrol kecil).
- **Komponen dasar:** shadcn/Radix (`components/ui/*`) — Button, Dialog, Input, Textarea, Badge, Select, Toast. Tidak ada Sheet/Accordion/Tabs yang sudah dipakai di estimator, tapi `Sheet` sudah ada di project (dipakai NavBar mobile) — bisa dipakai lagi kalau perlu drawer.
- **Tidak ada library animasi** (tidak ada framer-motion di `package.json`). Kalau butuh motion, pakai CSS transition (pola yang sudah dipakai: `transition-colors`, `transition-all`) — konsisten dengan pola project, jangan tambah dependency baru tanpa alasan kuat.
- **Pola styling campuran:** sebagian besar styling pakai `style={{ color: "var(--color-gold)" }}` inline daripada Tailwind arbitrary value (`text-[var(--color-gold)]`). Kedua pola ada di file yang sama (lihat `page.tsx:55` vs `page.tsx:59`). Tidak konsisten, tapi bukan blocker — ikuti pola dominan di file yang sedang diedit.

---

## 3. Temuan masalah UX konkret

### Mobile (di bawah `lg:` / 1024px)

1. **Grid bulan keberangkatan tidak responsif.** `ParamsPanel.tsx:157` — `grid grid-cols-6 gap-1.5` fixed 6 kolom di semua lebar layar. Di viewport 375px, tiap tombol bulan jadi ~50px lebar termasuk gap → target tap kecil dan label 3-huruf ("Jan", "Feb") mepet. *Catatan: ini regresi terhadap rencana `docs/plans/2026-05-04-001-feat-mobile-responsiveness-plan.md` (unit U4) yang secara eksplisit menyebut grid ini harus jadi `grid-cols-3 sm:grid-cols-4 md:grid-cols-6` — tampaknya perubahan itu tidak pernah diterapkan atau ke-revert.*
2. **Form satu kolom sangat panjang, total & tombol Simpan terkubur di bawah.** Karena breakpoint 2-kolom baru aktif di `lg:`, dari HP sampai tablet (sampai 1024px) user harus scroll melewati: notes AI → InputPanel → 8 section ParamsPanel (nights×2, pax, bulan, hotel×2 kota, kamar, maskapai, layanan, fullboard) baru ketemu BudgetBreakdown dan tombol Simpan. Tidak ada indikator total berjalan yang selalu terlihat saat user mengubah parameter — user kehilangan feedback loop "ubah parameter → lihat dampak ke harga" yang justru jadi nilai utama fitur ini.
3. **Touch target di bawah rekomendasi 44px.** `Stepper.tsx:28,54` — tombol +/− adalah `w-9 h-9` (36px). `BudgetBreakdown.tsx` `IconButton` (reset/hide) juga kecil (`px-1.5 py-1`, ikon teks). Fungsional tapi berisiko mis-tap di layar sentuh.
4. **Kartu hotel padat di 2 kolom sempit.** `ParamsPanel.tsx:190-196` — `RadioCardGrid` dipanggil dengan `cols={2}` untuk tiap kota, berisi label hotel (bisa panjang, mis. "Grand Plaza Badr Maqam"), sublabel tier, dan badge harga SAR. Di mobile (grid 2 kolom penuh dalam card yang sudah dipersempit `p-5`), teks berpotensi wrap 3-4 baris dan badge harga terpotong/wrap aneh.
5. **`ComputedRow` di BudgetBreakdown sudah stack di mobile** (`flex-col sm:flex-row`, `BudgetBreakdown.tsx:335`) — ini sudah baik, tapi dua `AmountField` (Harga satuan + Total/orang) yang right-aligned jadi menggantung sendiri di kanan tanpa keterkaitan visual jelas ke label baris di atasnya saat stacked.

### Desktop (≥1024px)

6. **Kolom kiri (Params) jauh lebih tinggi dari kolom kanan (Breakdown).** Karena `ParamsPanel` punya banyak section berat, sementara `BudgetBreakdown` relatif ringkas di awal (sebelum override ditambah), ada banyak ruang kosong di bawah kolom kanan yang sticky — kurang termanfaatkan.
7. **Semua section `ParamsPanel` punya bobot visual sama** — 8 section (nights, pax, bulan, hotel Madinah, hotel Makkah, kamar, maskapai, layanan, fullboard) semuanya heading kecil uppercase + card border yang sama, tidak ada hierarki mana yang "keputusan besar" (hotel, kamar) vs "detail kecil" (fullboard checkbox nyempil sendirian di bawah tanpa section wrapper — `ParamsPanel.tsx:232-244`).
8. **Dua entry point yang bersaing:** `InputPanel` (deskripsi bebas + AI parse) dan `ParamsPanel` (manual) render sejajar dengan bobot sama, padahal alur yang disarankan produk kemungkinan besar "cerita dulu, lalu koreksi manual" — hierarki visual saat ini tidak menyiratkan urutan itu.
9. **Halaman dibungkus dua container** (`layout.tsx:11` → `container mx-auto px-4 py-6`, lalu `page.tsx:103` → `max-w-6xl mx-auto`) — perlu dicek langsung di browser apakah kombinasi ini menyisakan padding ganda / lebar konten yang aneh di layar sangat lebar.

---

## 4. Yang JANGAN diubah (batasan fungsional)

- Alur data & state di `EstimatorClient.tsx` (reducer, `patchRow`, override logic, save/parse handlers) — ini murni presentasi yang perlu direvamp, bukan logika.
- Kontrak props semua komponen anak kalau memungkinkan — ada test yang menguji lewat komponen ini: `components/estimator/__tests__/{BudgetBreakdown,EstimatorClient,EstimatorPreFill}.test.tsx`. Cek test-test ini sebelum mengubah struktur DOM yang mereka assert.
- Fitur manual override (edit label/harga/hide per baris, custom rows) — ini fitur inti yang baru saja dibangun (lihat `docs/2026-07-18-estimate-manual-overrides-review.md`), jangan disederhanakan/dihilangkan demi tampilan lebih bersih.
- Breakpoint Tailwind default project (`sm:640 md:768 lg:1024`) — jangan tambah custom breakpoint tanpa alasan kuat (konsisten dengan keputusan di rencana mobile-responsiveness sebelumnya).

---

## 5. Arah desain untuk didiskusikan (bukan keputusan final)

Tiga ide besar untuk sesi brainstorm/plan berikutnya — pilih salah satu atau kombinasi sebagai **visual thesis** sebelum mulai coding:

- **A. Sticky mobile summary bar.** Tambahkan bar ringkas fixed di bawah viewport (mobile only) yang selalu menampilkan Total/orang + tombol "Lihat rincian" / "Simpan" saat user scroll di ParamsPanel — mengatasi temuan #2 tanpa mengubah struktur single-column.
- **B. Progressive disclosure di ParamsPanel.** Kelompokkan 8 section jadi 3-4 grup dengan hierarki lebih jelas (mis. "Dasar" [malam, pax, bulan] selalu terbuka; "Hotel & Kamar" dan "Penerbangan & Layanan" sebagai accordion/tab) — mengatasi temuan #7, mengurangi panjang scroll mobile (temuan #2) sekaligus.
- **C. Perjelas urutan Input AI vs Manual.** Reposisi `InputPanel` sebagai langkah 1 yang menonjol (mis. full-width di atas, dengan `ParamsPanel` sebagai "hasil yang bisa dikoreksi" di bawahnya) — mengatasi temuan #8.

Interaction plan (kandidat, sesuaikan dengan yang dipilih di atas):
- Transisi halus saat total berubah (angka `--color-gold` di BudgetBreakdown) — CSS transition/kecil animasi count-up, bukan library baru.
- Expand/collapse pada accordion (kalau opsi B dipakai) — pakai Radix Accordion kalau perlu ditambahkan (belum ada di `components/ui/`), atau native `<details>` kalau ingin minim dependency.
- Micro-feedback saat override baris diaktifkan (badge "manual" sudah ada — bisa ditambah transisi masuk halus).

---

## 6. Pertanyaan terbuka

1. Apakah gate admin-only tetap dipertahankan, atau fitur ini akan dibuka lebih luas? (lihat bagian ⚠️ di atas)
2. Prioritas revamp: mobile-first (karena gap paling jelas ada di sana) atau desktop-first (karena admin kemungkinan besar pakai desktop)?
3. Apakah boleh menambah komponen baru ke `components/ui/` (mis. Accordion) kalau opsi B dipilih, atau harus pakai yang sudah ada saja?
