---
title: "feat: Pilihan 5 grup SSU di halaman komunitas"
date: 2026-07-31
type: feat
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
depth: standard
---

# feat: Pilihan 5 grup SSU di halaman komunitas

**Goal Capsule.** Setelah jamaah menyimpan form komunitas, satu tombol `Ajukan Masuk Grup` diganti menjadi daftar vertikal berisi 5 grup Serba Serbi Umroh (SSU I–V). SSU V ditandai sebagai grup terbaru dan tampil paling atas; SSU I–IV di bawahnya masing-masing menampilkan jumlah member aktif 30 hari terakhir supaya jamaah punya dasar memilih. Perubahan murni front-end — tidak ada kolom database, endpoint, atau layar admin baru.

---

## Problem Frame

Halaman `/komunitas` sekarang menganggap komunitas SSU hanya punya satu grup WhatsApp: state sukses form merender satu tombol `Ajukan Masuk Grup` yang menunjuk ke satu env var, `NEXT_PUBLIC_COMMUNITY_WHATSAPP_GROUP_URL` (`components/community/CommunityJoinForm.tsx:105-115`, `app/(public)/komunitas/page.tsx:37`).

Kenyataannya komunitas sudah terdiri dari 5 grup — SSU I sampai SSU V — dan SSU V adalah grup terbaru yang sedang dibuka untuk pendaftar. Jamaah yang baru mengisi form tidak punya cara memilih grup, dan admin tidak punya cara mengarahkan pendaftar baru ke grup yang tepat selain lewat percakapan WhatsApp manual.

Menampilkan 5 tombol saja memindahkan masalahnya, bukan menyelesaikannya: jamaah menghadapi lima pilihan yang tampak identik tanpa dasar apa pun untuk memilih. Rekap aktivitas WhatsApp per 31 Juli 2026 memberi dasar itu — jumlah member berbeda yang mengirim pesan dalam 30 hari terakhir: SSU IV 310, SSU I 169, SSU II 156, SSU III 147. Angka ini juga mengonfirmasi keempat grup lama aktif semua, sehingga menonaktifkan grup lama bukan pilihan yang benar.

**Catatan ukuran.** Angka ini adalah member *aktif*, bukan total anggota. Ia tidak sebanding dengan konstanta `COMMUNITY_SIZE` (`3.500+`) di `lib/stats/community.ts` yang dimaksudkan sebagai total, dan plan ini tidak menyentuh angka tersebut.

---

## Requirements

| ID | Requirement |
|----|-------------|
| R1 | State sukses form komunitas merender 5 tombol grup SSU dalam susunan vertikal, bukan satu tombol `Ajukan Masuk Grup`. |
| R2 | Urutan tampil: SSU V paling atas, lalu SSU I, II, III, IV. |
| R3 | SSU V diberi penanda visual "Grup terbaru" dan gaya menonjol (gold) yang membedakannya dari grup lain. |
| R4 | Kelima tombol aktif dan membuka link undangan WhatsApp masing-masing di tab baru. |
| R5 | Grup yang link undangannya belum tersedia dirender nonaktif dengan keterangan jelas, bukan link rusak atau tombol hilang diam-diam. |
| R6 | Tombol `Hubungi Admin` tetap ada, tetap membawa pesan prefilled berisi nama dan nomor HP, dan tetap terpisah secara visual dari daftar grup. |
| R7 | Pesan fallback saat tidak ada satu pun link WhatsApp tersedia tetap muncul (tidak ada state kosong tanpa penjelasan). |
| R8 | Definisi grup (label, urutan, URL, status terbaru, statistik) hidup di satu modul konstanta, bukan tersebar di komponen. |
| R9 | Grup yang punya data aktivitas menampilkan jumlah member aktif 30 hari terakhir di dalam tombolnya. |
| R10 | Grup tanpa data aktivitas menampilkan keterangan yang tidak bisa terbaca sebagai nol. |
| R11 | Tanggal snapshot data aktivitas tampil satu kali di bawah daftar grup. |

---

## Key Technical Decisions

**KTD1 — Daftar grup jadi konstanta di `lib/community/groups.ts`, bukan env var.**
Lima env var `NEXT_PUBLIC_*_1..5` akan memindahkan hanya URL-nya ke `.env`, sementara label, urutan, statistik, dan penanda "terbaru" tetap di kode — jadi setiap perubahan tetap butuh commit. Menyimpan seluruh definisi di satu konstanta membuat satu tempat kebenaran, bisa di-test, dan cocok dengan pola `lib/stats/community.ts` yang sudah dipakai untuk konstanta komunitas lain. Trade-off yang diterima: ganti link atau angka = commit + deploy.

**KTD2 — Entry dengan `url` kosong dirender nonaktif, bukan disembunyikan.**
Link undangan SSU I–IV kemungkinan belum semuanya di tangan saat implementasi. Menyembunyikan entry-nya membuat daftar terlihat "benar" padahal tidak lengkap dan sulit dilacak; merender tombol nonaktif dengan teks `Link belum tersedia` membuat kekurangan itu terlihat di UI dan di test. Ini juga menjaga R7 tetap bermakna: pesan fallback global hanya muncul saat *tidak ada* grup ber-URL sama sekali.

**KTD3 — Prop `groupRequestUrl` dihapus dari komponen.**
Setelah daftar grup jadi konstanta, prop tersebut tidak punya pemilik yang jelas — menyimpannya sebagai override akan menciptakan dua sumber kebenaran untuk pertanyaan "link grup mana yang dipakai". `adminChatUrl` tetap sebagai prop karena memang masih berasal dari env dan tidak punya varian.
Nilai `NEXT_PUBLIC_COMMUNITY_WHATSAPP_GROUP_URL` yang aktif di deployment sekarang dipakai sebagai URL awal SSU V, sehingga tidak ada link yang hilang saat rilis.

**KTD4 — Tanpa pencatatan pilihan grup ke database.**
Alur persetujuan tetap manual: admin mencocokkan pendaftar lewat WhatsApp. Menambah kolom `requestedGroup` menuntut migrasi, endpoint PATCH, dan kolom baru di dashboard admin — biaya yang tidak dibayar oleh manfaat apa pun selama pencocokan masih manual. Dicatat sebagai kandidat lanjutan di Scope Boundaries.

**KTD5 — Statistik adalah snapshot manual di konstanta yang sama, bukan integrasi analitik.**
WhatsApp tidak menyediakan API untuk angka ini; sumbernya ekspor analitik yang dibaca admin secara berkala. Membangun pipeline impor untuk empat angka yang berubah beberapa kali setahun tidak sebanding. Angka disimpan bersama entry grupnya sehingga label, URL, dan statistik satu grup tidak bisa lepas sinkron, dan tanggal snapshot disimpan sebagai satu konstanta modul supaya kejujuran datanya ikut ter-render (R11), bukan bergantung ingatan.

**KTD6 — Hanya angka 30 hari yang disimpan dan ditampilkan.**
Rekap sumber punya kolom 30/60/90 hari, tapi pertanyaan yang dijawab UI ini cuma satu: "grup ini hidup atau tidak sekarang". Angka 30 hari menjawabnya paling langsung, sedangkan 60/90 hari melebar tanpa mengubah keputusan jamaah. Menyimpan ketiganya berarti dua field tanpa konsumen. Data lengkapnya tercatat di Sources bila suatu saat dibutuhkan.

---

## High-Level Technical Design

Bentuk state sukses setelah perubahan:

```
┌─ Data sudah tercatat ────────────────────────────┐
│ Silakan lanjut mengajukan lewat WhatsApp...      │
│ Bayu Aslama - 085172117757                       │
│                                                  │
│ PILIH GRUP                                       │
│ ┌──────────────────────────────────────────────┐ │
│ │ SSU V              [Grup terbaru]         →  │ │  gold solid
│ │ Baru dibuka                                  │ │
│ ├──────────────────────────────────────────────┤ │
│ │ SSU I                                     →  │ │  outline
│ │ 169 member aktif 30 hari terakhir            │ │
│ │ SSU II                                    →  │ │
│ │ 156 member aktif 30 hari terakhir            │ │
│ │ SSU III                                   →  │ │
│ │ 147 member aktif 30 hari terakhir            │ │
│ │ SSU IV             Link belum tersedia       │ │  disabled
│ │ 310 member aktif 30 hari terakhir            │ │
│ └──────────────────────────────────────────────┘ │
│ Data aktivitas per 31 Juli 2026.                 │
│                                                  │
│ [ Hubungi Admin ]                                │  sekunder
└──────────────────────────────────────────────────┘
```

Aturan render per entry — dua sumbu yang berdiri sendiri, sehingga grup nonaktif tetap menampilkan statistiknya:

| Sumbu | Kondisi | Hasil |
|---|---|---|
| Interaksi | `isNewest` + ada `url` | `<a>` gold solid, badge `Grup terbaru` |
| Interaksi | ada `url` | `<a>` outline |
| Interaksi | `url` kosong | `<span>` non-interaktif, `opacity-60`, teks `Link belum tersedia` |
| Statistik | ada `activeMembers30d` | baris muted `<N> member aktif 30 hari terakhir` |
| Statistik | tidak ada `activeMembers30d` | baris muted `Baru dibuka` |

Fallback global (R7) memakai kondisi yang sudah ada, diperluas: tidak ada grup ber-URL **dan** tidak ada `adminChatUrl` → pesan `Link WhatsApp belum tersedia...`.

---

## Implementation Units

### U1. Modul konstanta grup SSU

**Goal:** Satu sumber kebenaran untuk daftar grup SSU — label, urutan tampil, URL undangan, penanda grup terbaru, dan statistik aktivitas.
**Requirements:** R2, R3, R8, R9, R10, R11
**Dependencies:** —
**Files:**
- `lib/community/groups.ts` (baru)
- `lib/community/__tests__/groups.test.ts` (baru)

**Approach:** Ekspor `SSU_GROUPS` sebagai array entry berisi `id` (slug stabil, mis. `ssu-5`), `label` (`"SSU V"`), `url` (string, boleh kosong), `isNewest` (boolean), dan `activeMembers30d` (number opsional). Array ditulis langsung dalam urutan tampil sesuai R2 — SSU V dulu, lalu SSU I–IV — sehingga komponen cukup melakukan `.map()` tanpa logika pengurutan. Ekspor juga helper turunan `hasAnyGroupUrl` untuk dipakai kondisi fallback di U2, supaya aturan "ada grup yang bisa diklik" tidak diduplikasi di komponen.

Isi `activeMembers30d` dari rekap 31 Juli 2026: SSU I 169, SSU II 156, SSU III 147, SSU IV 310. SSU V dibiarkan tanpa nilai — grup baru belum punya riwayat, dan `undefined` di sini berarti "belum ada data", berbeda dari nol (R10). Ekspor `STATS_SNAPSHOT_LABEL` sebagai string tampil (`"31 Juli 2026"`) untuk R11; menyimpannya sebagai label jadi, bukan `Date`, menghindari perbedaan format antara server dan client render.

Seed URL SSU V dengan nilai `NEXT_PUBLIC_COMMUNITY_WHATSAPP_GROUP_URL` yang sedang aktif di deployment (lihat Open Questions Q1). Entry lain diisi URL asli bila tersedia, atau string kosong.

**Patterns to follow:** `lib/stats/community.ts` — konstanta komunitas sebagai named export dengan komentar yang menjelaskan asal angka dan siapa yang memeliharanya, plus test tipis yang menjaga invarian, bukan nilai literalnya.

**Test scenarios** (`lib/community/__tests__/groups.test.ts`):
- `SSU_GROUPS` berisi tepat 5 entry.
- Setiap entry punya `id` unik dan `label` non-kosong.
- Entry pertama adalah grup dengan `isNewest: true`, dan hanya ada satu entry ber-`isNewest`.
- Urutan label setelah entry pertama adalah `SSU I`, `SSU II`, `SSU III`, `SSU IV`.
- Setiap `activeMembers30d` yang terisi adalah bilangan bulat positif — menjaga agar nol tidak pernah masuk sebagai pengganti "belum ada data".
- Entry ber-`isNewest` tidak punya `activeMembers30d`.
- `STATS_SNAPSHOT_LABEL` non-kosong.
- `hasAnyGroupUrl` mengembalikan `true` untuk daftar dengan minimal satu `url` non-kosong, `false` untuk daftar yang semua `url`-nya kosong.

**Verification:** `npm test -- lib/community` hijau; tidak ada import baru ke `process.env` dari modul ini.

---

### U2. Daftar grup vertikal di state sukses `CommunityJoinForm`

**Goal:** Mengganti tombol tunggal `Ajukan Masuk Grup` dengan daftar 5 tombol grup vertikal berikut statistik aktivitasnya, sesuai aturan render di High-Level Technical Design.
**Requirements:** R1, R3, R4, R5, R6, R7, R9, R10, R11
**Dependencies:** U1
**Files:**
- `components/community/CommunityJoinForm.tsx`
- `components/community/__tests__/CommunityJoinForm.test.tsx`

**Approach:** Di blok `if (submitted)` (`CommunityJoinForm.tsx:84-136`), ganti wadah `flex flex-col gap-3 sm:flex-row` menjadi kolom penuh (`flex flex-col gap-2`) — susunan tetap vertikal di semua breakpoint, karena 5 tombol berjajar horizontal tidak muat di mobile maupun di kolom kanan desktop yang sempit. Beri label bagian `Pilih grup` di atas daftar memakai `labelClass`/`labelStyle` yang sudah ada di komponen.

Setiap entry `SSU_GROUPS` dirender menurut tabel aturan render. Sumbu interaksi dan sumbu statistik dievaluasi terpisah: entry ber-URL jadi `<a target="_blank" rel="noreferrer">`, entry tanpa URL jadi `<span>` non-interaktif — bukan `<a>` tanpa `href`, supaya tidak muncul di pohon aksesibilitas sebagai link — dan baris statistik ikut dirender pada keduanya. Baris statistik memakai `var(--color-text-muted)` pada ukuran lebih kecil dari label grup sehingga hierarki nama-dulu-angka-kemudian terbaca.

Nama aksesibel tiap link dibuat eksplisit lewat `aria-label` yang menggabungkan grup dan aktivitasnya (mis. `Ajukan masuk grup SSU I, 169 member aktif 30 hari terakhir`), sehingga pembaca layar mendapat dasar memilih yang sama dengan pembaca visual tanpa bergantung pada urutan pembacaan dua baris terpisah.

Di bawah daftar, render `STATS_SNAPSHOT_LABEL` satu kali sebagai teks muted (R11) — satu kalimat, bukan diulang per tombol.

Hapus prop `groupRequestUrl` dari `CommunityJoinFormProps` dan seluruh pemakaiannya. `Hubungi Admin` beserta `adminLink` yang sudah ada dipindah ke bawah daftar grup dengan pemisah tipis, tanpa perubahan logika prefill pesan. Kondisi fallback (`CommunityJoinForm.tsx:129`) diubah dari `!groupRequestUrl && !adminChatUrl` menjadi `!hasAnyGroupUrl(SSU_GROUPS) && !adminChatUrl`.

Gaya mengikuti token yang sudah dipakai di komponen ini — `var(--color-gold)`, `var(--color-border)`, `var(--color-surface)`, `var(--color-text-muted)` — tanpa memperkenalkan warna literal baru selain `#1a1206` yang sudah jadi pasangan teks di atas gold.

**Patterns to follow:** styling inline berbasis CSS variable dan `className` Tailwind di komponen yang sama; struktur `<a>` eksternal (`target="_blank" rel="noreferrer"`) pada tombol WhatsApp yang sudah ada; pola pill statistik `components/stats/CommunityStats.tsx` untuk hierarki angka-dan-label muted.

**Test scenarios** (`components/community/__tests__/CommunityJoinForm.test.tsx`):

Seluruh skenario di bawah menjalankan `vi.mock` pada `@/lib/community/groups` dengan fixture yang mencakup grup terbaru tanpa statistik, grup ber-URL dengan statistik, dan grup tanpa URL. Test tidak boleh bergantung pada nilai konstanta sebenarnya, karena KTD2 dan Q1 mengizinkan URL asli kosong saat implementasi.

- Setelah submit berhasil, kelima label grup fixture muncul di state sukses.
- Tombol `Ajukan Masuk Grup` yang lama sudah tidak ada — assertion negatif eksplisit terhadap teks tersebut.
- Grup ber-URL dirender sebagai link dengan `href` sesuai fixture, `target="_blank"`, dan `rel="noreferrer"`.
- Entry ber-`isNewest` menampilkan badge `Grup terbaru`; grup lain tidak.
- Grup dengan `activeMembers30d` menampilkan angka itu beserta teks `member aktif 30 hari terakhir`.
- Grup terbaru tanpa `activeMembers30d` menampilkan `Baru dibuka` dan tidak memuat angka `0` di mana pun barisnya.
- Grup tanpa URL tetap menampilkan baris statistiknya — membuktikan sumbu interaksi dan statistik tidak terikat.
- `aria-label` pada link grup ber-statistik memuat label grup dan angka aktifnya.
- Entry dengan `url` kosong tidak muncul sebagai `role="link"` dan menampilkan teks `Link belum tersedia`.
- `STATS_SNAPSHOT_LABEL` muncul tepat satu kali di state sukses.
- Urutan render: grup terbaru muncul sebelum grup kedua di `container.textContent` (pola indeks-teks yang sama dipakai `components/home/__tests__/HeroSection.test.tsx`).
- `Hubungi Admin` tetap muncul dengan `href` mengandung `text=` berisi nama dan nomor pendaftar.
- Test lama `handles missing WhatsApp configuration without crashing` disesuaikan: dengan fixture yang semua `url`-nya kosong dan tanpa `adminChatUrl`, pesan `Link WhatsApp belum tersedia` tetap muncul.
- Test lama `submits minimal request...` diperbarui: prop `groupRequestUrl` dihapus dari `render()`, assertion `href` dialihkan ke link grup terbaru.

**Verification:** `npm test -- components/community` hijau; state sukses tidak lagi menerima atau membaca `groupRequestUrl`.

---

### U3. Rapikan pemanggil dan konfigurasi env

**Goal:** Menyelaraskan halaman komunitas dan dokumentasi env dengan sumber grup yang baru, tanpa meninggalkan variabel yatim.
**Requirements:** R8
**Dependencies:** U2
**Files:**
- `app/(public)/komunitas/page.tsx`
- `.env.example`
- `docs/PRD-umroh-planner-v3.md`

**Approach:** Hapus prop `groupRequestUrl={process.env.NEXT_PUBLIC_COMMUNITY_WHATSAPP_GROUP_URL}` dari pemanggilan `CommunityJoinForm` (`page.tsx:37`); `adminChatUrl` tidak berubah. Perbarui kalimat pengantar di `page.tsx:24-27` sehingga menyebut memilih grup, bukan "tombol untuk mengajukan masuk grup" — kalimatnya kini salah menggambarkan UI yang akan dilihat jamaah.

Di `.env.example`, hapus baris `NEXT_PUBLIC_COMMUNITY_WHATSAPP_GROUP_URL` (baris 26) karena tidak lagi dibaca kode mana pun, dan perbarui baris tabel env di `docs/PRD-umroh-planner-v3.md:479` supaya hanya menyebut `NEXT_PUBLIC_COMMUNITY_ADMIN_WHATSAPP_URL`. Variabel yang tersisa di environment Dokploy boleh dibiarkan sampai deploy berikutnya — tidak ada kode yang membacanya, jadi tidak berdampak; catat ini saat rilis agar tidak menimbulkan kebingungan di kemudian hari.

**Test expectation:** none — perubahan wiring dan dokumentasi; perilaku sudah dijaga test U2. Regresi tertangkap oleh type-check karena prop yang dihapus akan gagal kompilasi bila masih dikirim.

**Verification:** `npm run build` lolos type-check; `grep -rn "NEXT_PUBLIC_COMMUNITY_WHATSAPP_GROUP_URL" --include="*.ts" --include="*.tsx"` tidak menemukan hasil di kode aplikasi.

---

## Scope Boundaries

**Di luar cakupan:**
- Angka global `COMMUNITY_SIZE` dan `PILGRIMS_HELPED` di `lib/stats/community.ts`, beserta navbar, hero homepage, dan `/layanan`. Angka itu adalah total anggota; statistik plan ini adalah member aktif — dua ukuran berbeda, dan menyamakannya butuh keputusan produk tersendiri.
- Angka 60 dan 90 hari dari rekap sumber (KTD6).
- Perubahan alur persetujuan. Admin tetap mencocokkan dan menyetujui pendaftar secara manual lewat WhatsApp.
- Halaman admin `community-requests` dan endpoint `/api/community/join` — tidak tersentuh.

**Ditunda untuk pekerjaan lanjutan:**
- Mencatat grup pilihan ke database (kolom `requestedGroup`, PATCH endpoint, kolom baru di dashboard admin). Layak dipertimbangkan bila admin mulai kesulitan menebak grup tujuan pendaftar.
- Memindahkan `SSU_GROUPS` dan statistiknya ke database + editor admin, sehingga link dan angka bisa diubah tanpa deploy. Baru sepadan bila frekuensi pembaruan naik jauh di atas beberapa kali setahun.
- Menandai grup penuh secara otomatis berdasarkan kapasitas WhatsApp.

---

## Open Questions

| ID | Pertanyaan | Penanganan |
|----|-----------|-----------|
| Q1 | URL undangan asli untuk SSU I–V. Hanya nilai SSU V yang bisa diturunkan dari env deployment saat ini. | Isi yang tersedia; sisanya string kosong dan otomatis dirender nonaktif per KTD2. Bukan blocker implementasi. |
| Q2 | Apakah SSU V benar-benar satu-satunya yang perlu ditandai, atau SSU IV (grup paling aktif) juga layak diberi penanda? | Asumsi: hanya SSU V. Konstanta menampung satu `isNewest`; menambah penanda kedua adalah perubahan satu baris bila diperlukan. |
| Q3 | Dengan angka aktivitas kini tampil, apakah urutan sebaiknya berubah jadi menurut keaktifan (V, IV, I, II, III) alih-alih urut angka Romawi? | Plan mempertahankan R2 yang sudah dikonfirmasi. Mengubahnya berarti mengubah requirement, bukan detail implementasi — putuskan sebelum U1 ditulis, karena urutan hidup di konstanta. |

---

## Risks

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Link keempat grup lama kini terekspos publik ke siapa pun yang mengisi form. | Orang bisa masuk grup lama tanpa arahan admin. | Aktifkan "Approve new participants" di pengaturan grup WhatsApp masing-masing — kontrol ada di sisi WhatsApp, bukan di aplikasi. Perlu dicek admin sebelum rilis. |
| Konstanta ter-deploy dengan URL kosong tanpa disadari. | Jamaah melihat beberapa tombol nonaktif. | Degradasi terlihat dan disengaja (KTD2), bukan link rusak; test U1 tidak memaksa URL terisi, jadi ini keputusan rilis yang sadar, bukan kegagalan senyap. |
| Angka aktivitas jadi basi karena tidak ada yang memperbaruinya. | Jamaah mengambil keputusan berdasarkan data lama tanpa tahu. | `STATS_SNAPSHOT_LABEL` tampil di UI (R11), jadi kebasian terlihat jamaah maupun admin. Tidak ada mekanisme pengingat otomatis — diterima sadar sesuai KTD5. |
| Grup dengan angka terendah makin ditinggalkan karena angkanya terlihat. | SSU III (147) berpotensi terus mengecil sementara SSU IV membesar. | Diterima: informasi yang sama juga membantu admin melihat kapan sebuah grup perlu digabung atau ditutup. Tinjau ulang bila selisihnya melebar tajam. |
| Env var lama masih terpasang di Dokploy setelah kode berhenti membacanya. | Kebingungan saat debugging. | Dicatat di U3; tidak ada dampak runtime. |

---

## Verification Contract

- `npm test` hijau, termasuk suite baru `lib/community/__tests__/groups.test.ts` dan `components/community/__tests__/CommunityJoinForm.test.tsx` yang diperbarui.
- `npm run build` lolos tanpa error TypeScript.
- Pemeriksaan manual di `/komunitas`: isi form dengan data uji → state sukses menampilkan 5 grup vertikal, SSU V di atas dengan badge `Grup terbaru` dan teks `Baru dibuka`, SSU I–IV menampilkan angka member aktif masing-masing, tanggal snapshot muncul sekali di bawah daftar, tiap link ber-URL membuka tab baru ke undangan yang benar, `Hubungi Admin` masih membawa pesan prefilled.
- Pemeriksaan mobile (lebar ≤ 390px): kelima tombol tetap satu kolom, label grup dan baris statistik tidak terpotong, target sentuh nyaman.

## Definition of Done

- [ ] R1–R11 terpenuhi dan bisa ditelusuri ke unit yang mengerjakannya.
- [ ] `url` SSU V terisi non-kosong — tanpa ini halaman kehilangan CTA utama yang hari ini berfungsi.
- [ ] `groupRequestUrl` tidak lagi ada di komponen, halaman, `.env.example`, maupun tabel env PRD.
- [ ] Seluruh Verification Contract lolos.
- [ ] Q1 dijawab sejauh link yang tersedia; sisanya sengaja dibiarkan nonaktif dan tercatat. Q3 diputuskan sebelum U1 ditulis.

---

## Sources & Research

- `components/community/CommunityJoinForm.tsx` — state sukses dan tombol yang diganti.
- `app/(public)/komunitas/page.tsx` — pemanggil dan wiring env saat ini.
- `lib/stats/community.ts` + `lib/stats/__tests__/community.test.ts` — pola konstanta komunitas yang diikuti U1; juga sumber angka global yang sengaja tidak disentuh.
- `components/stats/CommunityStats.tsx` — pola hierarki angka-dan-label muted.
- `components/home/__tests__/HeroSection.test.tsx` — pola assertion urutan render berbasis indeks teks.
- `docs/plans/2026-05-30-001-feat-umroh-community-join-plan.md` — plan asal alur komunitas ini.
- Screenshot `/komunitas` (31 Jul 2026) — state sukses sebelum perubahan.
- Rekap aktivitas WhatsApp per 31 Juli 2026, member berbeda yang mengirim pesan. Angka lengkapnya disimpan di sini karena KTD6 hanya membawa kolom 30 hari ke kode:

  | Grup | 30 hari | 60 hari | 90 hari |
  |---|---|---|---|
  | SSU IV | 310 | 593 | 682 |
  | SSU I | 169 | 247 | 296 |
  | SSU II | 156 | 206 | 268 |
  | SSU III | 147 | 203 | 280 |
