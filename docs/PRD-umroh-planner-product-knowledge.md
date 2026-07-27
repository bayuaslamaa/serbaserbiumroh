# PRD & Product Knowledge — Serba Serbi Umroh / Umroh Planner

Created: 2026-07-26

## 1. Tujuan Dokumen

Dokumen ini adalah sumber pengetahuan produk kanonis untuk tim Serba Serbi Umroh (SSU). Isinya merekonsiliasi produk yang sudah tersedia di branch `main`, kemampuan internal/admin, proses yang masih diselesaikan manual di luar aplikasi, serta pekerjaan yang masih berada di branch pengembangan.

Dokumen ini menggantikan pembacaan terpisah atas PRD estimator lama, `docs/FEATURES.md`, berbagai implementation plan, dan perilaku aplikasi saat ini. Jika ada perbedaan, urutan sumber kebenarannya adalah:

1. Perilaku dan pembatasan pada kode di `main`.
2. Data serta konfigurasi produksi yang sudah diverifikasi oleh operator.
3. Bagian “Dalam Pengembangan” pada dokumen ini.
4. Dokumen rencana historis.

### Legenda status

| Status | Arti |
|---|---|
| **Tersedia — Publik** | Dapat digunakan tanpa login pada baseline kode `main`. |
| **Tersedia — User** | Membutuhkan akun/login dengan role `USER` atau `ADMIN`. |
| **Tersedia — Admin** | Hanya dapat digunakan role `ADMIN`; umumnya untuk operasi internal. |
| **Eksternal/Manual** | Aplikasi menjadi kanal informasi atau lead; transaksi dan pemenuhan dilanjutkan di WhatsApp, situs lain, atau proses operator. |
| **Dalam Pengembangan** | Sudah ada implementasi pada branch yang belum masuk `main`, atau masih membutuhkan rollout operasional. |
| **Belum Diputuskan** | Ada implementasi/branch lama, tetapi belum ada bukti bahwa fitur tersebut akan dirilis. |

Catatan: “Tersedia” dalam dokumen ini berarti tersedia pada baseline repository. Status deployment produksi tetap harus diverifikasi melalui release/deployment record.

## 2. Ringkasan Produk

Serba Serbi Umroh adalah ekosistem digital untuk membantu jamaah Indonesia memahami, merencanakan, dan menindaklanjuti kebutuhan umroh mandiri. Produk menggabungkan:

- pengetahuan dan pengalaman jamaah;
- direktori serta referensi harga;
- komunitas dan webinar;
- layanan operasional umroh;
- mesin estimasi biaya untuk internal/admin;
- back-office untuk harga, konten, pengguna, komunitas, dan statistik.

Produk bukan marketplace transaksi penuh. Sebagian besar layanan menggunakan aplikasi sebagai media edukasi, pencarian, dan pembentukan lead, lalu pemesanan dikonfirmasi manual melalui WhatsApp atau aplikasi eksternal.

### Proposition utama

> Membantu jamaah Indonesia menjalankan umroh mandiri dengan informasi yang lebih jelas, estimasi yang lebih masuk akal, pengalaman nyata dari komunitas, dan akses langsung ke layanan pendukung yang relevan.

### Posisi produk saat ini

Produk publik lebih matang sebagai **knowledge hub dan service funnel** daripada sebagai self-service trip planner. Mesin estimasi sudah kaya fitur, tetapi pembuatan estimasi masih dibatasi untuk admin dan ditampilkan sebagai “Coming Soon” kepada user biasa.

## 3. Masalah yang Diselesaikan

Calon jamaah umroh mandiri menghadapi beberapa masalah:

1. Informasi tersebar di banyak kanal dan sulit dibedakan antara panduan, pengalaman, promosi, dan ketentuan resmi.
2. Harga hotel, penerbangan, kurs, musim perjalanan, dan komposisi kamar membuat perencanaan biaya sulit dilakukan secara konsisten.
3. Jamaah memerlukan dukungan operasional tertentu—visa, transportasi, hotel, HHR, muthowwif, atau badal—tanpa selalu membeli paket travel penuh.
4. Keputusan hotel membutuhkan konteks lokasi, level, harga bulanan, dan keterkaitan dengan proses visa.
5. Tim internal membutuhkan satu tempat untuk memperbarui harga, mengelola konten, meninjau lead komunitas, dan menyusun estimasi yang bisa dibagikan.
6. Bukti sosial dan pengalaman jamaah dibutuhkan untuk mengurangi ketidakpastian serta membangun kepercayaan.

## 4. Sasaran Produk

### Sasaran utama

- Menjadi pusat pengetahuan praktis untuk umroh mandiri berbahasa Indonesia.
- Mengubah kebutuhan jamaah menjadi langkah berikutnya yang jelas: membaca panduan, bergabung komunitas, membuat rencana, atau menghubungi layanan.
- Membantu admin menghasilkan estimasi biaya yang transparan, dapat disesuaikan, disimpan, dan dibagikan.
- Menjaga sumber harga dan konten operasional agar dapat diperbarui tanpa perubahan kode untuk setiap data.
- Meningkatkan kepercayaan melalui cerita jamaah, dokumentasi layanan, FAQ, dan statistik komunitas yang konsisten.

### Sasaran tahap berikutnya

- Menentukan kesiapan estimator untuk dibuka kepada user umum.
- Menyatukan alur direktori hotel, referensi harga hotel, dan penawaran booking hotel.
- Membentuk pengukuran funnel dari kunjungan hingga lead dan pemenuhan layanan.
- Mengurangi ketergantungan pada data, kampanye, dan proses operasional yang masih hard-coded.

## 5. Non-Goals

Dalam kondisi saat ini, produk tidak dimaksudkan sebagai:

- sistem booking dan pembayaran end-to-end;
- jaminan harga atau ketersediaan vendor secara real-time;
- pengganti verifikasi admin sebelum penawaran/invoice final;
- OTA scraper atau agregator harga live;
- sistem persetujuan visa, hotel, komunitas, atau vendor secara otomatis;
- sistem ERP, akuntansi, atau fulfillment penuh;
- sumber resmi tunggal untuk regulasi pemerintah Saudi atau Indonesia;
- aplikasi multibahasa;
- mesin optimasi kamar campuran untuk satu grup.

## 6. Pengguna dan Peran

### 6.1 Visitor anonim

Kebutuhan:

- memahami umroh mandiri;
- membaca panduan, FAQ, dan cerita;
- melihat direktori/referensi hotel;
- mempelajari dan menghubungi layanan;
- mengajukan bergabung komunitas;
- melihat webinar dan statistik komunitas.

Hak akses:

- seluruh halaman publik;
- pengajuan komunitas tanpa login;
- tidak dapat melihat tujuan RSVP webinar;
- tidak dapat membuat atau menyimpan estimasi.

### 6.2 User terdaftar

Kebutuhan:

- mengakses pengalaman personal setelah login;
- melihat dashboard dan estimasi yang pernah dimiliki;
- memperoleh akses RSVP webinar;
- nantinya menggunakan estimator secara mandiri.

Hak akses saat ini:

- dashboard dan FAQ;
- estimasi miliknya jika sudah ada;
- link RSVP jika dikonfigurasi;
- belum dapat membuat estimasi baru;
- tidak dapat melakukan manual override harga.

Catatan produk: role `USER` sudah ada, tetapi value self-service saat ini terbatas karena pembuatan estimasi masih ditutup.

### 6.3 Admin/estimator

Kebutuhan:

- membuat dan mengedit estimasi;
- mengubah item breakdown sebelum dibagikan;
- memilih sumber harga dan parameter perjalanan;
- menyimpan serta mengekspor hasil;
- menjaga kualitas harga dan konten.

Hak akses:

- seluruh kemampuan user;
- estimator lengkap;
- manual override breakdown;
- akses seluruh halaman admin.

### 6.4 Admin konten dan operasi

Kebutuhan:

- mengelola cerita jamaah, itinerary, packing list, FAQ, dan data hotel;
- mengelola pengajuan komunitas;
- mengelola harga hotel, penerbangan, kurs, dan service fee;
- memantau pengguna dan statistik visitor;
- melakukan import data massal secara terkontrol.

Pada implementasi saat ini tidak ada pemisahan role admin berdasarkan fungsi. Semua admin mendapat akses admin yang sama.

## 7. Pilar Produk

### 7.1 Knowledge & Trust

Konten panduan, FAQ, cerita jamaah, webinar, dokumentasi Badalin, dan informasi layanan membantu jamaah memahami proses serta membangun kepercayaan.

### 7.2 Planning & Estimation

Mesin estimasi mengubah rencana perjalanan menjadi breakdown biaya per orang dan grup. Input dapat berasal dari teks bebas Bahasa Indonesia atau pengaturan manual.

### 7.3 Service Discovery & Lead Generation

Katalog layanan menghubungkan kebutuhan pengguna dengan halaman detail, WhatsApp, atau aplikasi eksternal.

### 7.4 Community

Komunitas menjadi kanal belajar, bukti sosial, dan hubungan jangka panjang. Aplikasi mengumpulkan pengajuan, sedangkan persetujuan tetap manual.

### 7.5 Content, Pricing & Operations

Back-office menyediakan pengelolaan data, konten, dan lead agar produk publik serta estimator dapat dioperasikan tanpa perubahan kode untuk setiap pembaruan.

## 8. Status Produk Saat Ini

| Area | Status | Ringkasan |
|---|---|---|
| Homepage dan navigasi | Tersedia — Publik | Mengarahkan pengguna ke panduan, cerita, hotel, komunitas, webinar, layanan, dan CTA estimator. |
| Panduan umroh | Tersedia — Publik | Artikel MDX dan materi unduhan/PDF. |
| Cerita jamaah | Tersedia — Publik | Cerita terpublikasi, itinerary, packing list, anggaran, dan filter. |
| FAQ | Tersedia — Publik | Hanya group/item yang dipublish. |
| Hotel Nusuk | Tersedia — Publik | Referensi hotel dan estimasi harga, filter kota/tier, link booking/kontak bila tersedia. |
| Katalog layanan | Tersedia — Publik | Enam kategori layanan dengan detail harga indikatif dan CTA. |
| Komunitas | Tersedia — Publik + Manual | Form publik; pencocokan dan persetujuan oleh admin. |
| Webinar | Tersedia — Publik/User | Informasi publik; link RSVP hanya setelah login. Konten event saat ini sudah lewat tanggalnya. |
| Dashboard | Tersedia — User | Daftar estimasi milik user dan FAQ preview. |
| Membuat estimasi | Tersedia — Admin | User biasa melihat status “Coming Soon”. |
| Manual override estimasi | Tersedia — Admin | Mengubah, menyembunyikan, atau menambah baris breakdown. |
| Export estimasi | Tersedia — Pemilik/Admin | PDF dan teks WhatsApp. |
| Admin harga | Tersedia — Admin | Kurs, hotel, airline, service fee, harga bulanan, dan CSV import. |
| Admin konten | Tersedia — Admin | Cerita, hotel listing, FAQ, publish state, dan import tertentu. |
| Statistik visitor/komunitas | Tersedia — Publik/Admin | Visitor log dan angka promosi komunitas; belum setara dengan analytics funnel. |
| Koreksi room multiplier + QUINT | Dalam Pengembangan | Sudah ada pada `feat/estimate-update`, belum di `main`; rollout data produksi belum terverifikasi. |
| Katalog penawaran booking hotel | Belum Diputuskan | Implementasi besar ada pada branch lama `feat/manual-hotel-booking-catalog`, belum digabung. |

## 9. Information Architecture

### 9.1 Area publik

| Route | Fungsi |
|---|---|
| `/` | Homepage, positioning, statistik, dan pintu masuk ke area produk. |
| `/layanan` | Katalog seluruh layanan SSU. |
| `/visa` | Informasi dua layanan visa dan CTA aplikasi eksternal/WhatsApp. |
| `/badalin` | Penjelasan Badalin, harga mulai, proses, dokumentasi video, dan CTA WhatsApp. |
| `/transportasi` | Katalog kendaraan, rute, kalkulator SAR–IDR, dan pemesanan WhatsApp. |
| `/hotel-nusuk` | Referensi hotel, harga, filter, disclaimer, dan link booking/kontak. |
| `/hotel` | Pengalihan ke pengalaman hotel yang berlaku. |
| `/panduan` | Daftar panduan umroh mandiri. |
| `/panduan/[slug]` | Detail panduan. |
| `/cerita-jamaah` | Daftar dan filter cerita jamaah. |
| `/cerita-jamaah/[slug]` | Cerita, itinerary, packing list, dan konteks biaya. |
| `/komunitas` | Pengajuan bergabung komunitas WhatsApp. |
| `/webinar-umroh-mandiri` | Informasi webinar dan RSVP berbasis login. |
| `/faq` | FAQ terpublikasi. |

### 9.2 Area login/user

| Route | Fungsi |
|---|---|
| `/login` | Login credentials dan Google OAuth. |
| `/dashboard` | Daftar estimasi milik user dan FAQ preview. |
| `/estimate/[id]` | Detail/edit estimasi milik user; admin dapat membuka estimasi lain. |
| `/estimate/new` | Membuat estimasi baru; saat ini hanya admin. |

### 9.3 Area admin

| Route | Fungsi |
|---|---|
| `/admin/pricing` | Harga, kurs, service fee, harga bulanan, dan import CSV. |
| `/admin/users` | Daftar user dan role. |
| `/admin/community-requests` | Review pengajuan komunitas, status, duplikasi, dan catatan. |
| `/admin/visitor-stats` | Statistik visitor yang dicatat aplikasi. |
| `/admin/content/stories` | CRUD, import, dan publish cerita jamaah. |
| `/admin/content/hotels` | CRUD dan publish data hotel listing. |
| `/admin/content/faqs` | Group, item, urutan, import, dan publish FAQ. |

## 10. Journey Utama

### 10.1 Discovery ke layanan

1. Visitor masuk melalui homepage, konten, atau halaman layanan.
2. Visitor mempelajari masalah, persyaratan, harga indikatif, dan bukti sosial.
3. Visitor memilih CTA:
   - membuka halaman internal;
   - menghubungi WhatsApp dengan pesan yang sudah diisi;
   - membuka aplikasi/situs eksternal;
   - bergabung komunitas.
4. Admin melanjutkan konsultasi, validasi, penawaran, dan pemenuhan secara manual.

### 10.2 Bergabung komunitas

1. Visitor mengisi nama dan nomor HP; sosial media dan alasan bersifat opsional.
2. Sistem memvalidasi lalu menyimpan pengajuan; login tidak diwajibkan.
3. Sistem menampilkan tombol pengajuan grup dan chat admin jika URL dikonfigurasi.
4. Admin meninjau kemungkinan duplikasi, mencocokkan identitas WhatsApp, memberi catatan, dan mengubah status.
5. Tidak ada persetujuan otomatis.

### 10.3 Membuat estimasi oleh admin

1. Admin membuka `/estimate/new`.
2. Admin memasukkan deskripsi perjalanan dalam Bahasa Indonesia atau langsung mengatur parameter.
3. AI memetakan teks menjadi parameter dan catatan asumsi.
4. Admin meninjau:
   - malam Makkah dan Madinah;
   - jumlah jamaah;
   - bulan perjalanan;
   - hotel/tier tiap kota;
   - tipe kamar;
   - penerbangan;
   - layanan tambahan;
   - full board.
5. Sistem menghitung breakdown per orang dan total grup.
6. Admin dapat mengubah label/nilai, menyembunyikan baris, atau menambah baris custom.
7. Admin menyimpan estimasi.
8. Estimasi dapat disalin, dibagikan sebagai teks WhatsApp, atau diekspor ke PDF.

### 10.4 Memelihara harga

1. Admin memperbarui kurs, harga dasar, atau harga per bulan secara inline.
2. Untuk data hotel/airline besar, admin mengunduh template atau menyiapkan CSV.
3. Sistem mem-preview baris create/update/invalid/conflict tanpa menulis data.
4. Admin mengonfirmasi baris valid.
5. Estimator menggunakan konfigurasi terbaru ketika menghitung ulang.

### 10.5 Menerbitkan konten

1. Admin membuat atau mengimpor konten.
2. Konten baru tetap draft apabila workflow mengharuskannya.
3. Admin memeriksa data, urutan, dan kelengkapan.
4. Admin mempublish.
5. Hanya konten terpublikasi yang tampil kepada visitor.

## 11. Functional Requirements

### 11.1 Authentication & Authorization

- **AUTH-01** — Visitor dapat membuka seluruh route publik tanpa login.
- **AUTH-02** — User dapat login menggunakan email/password atau Google OAuth.
- **AUTH-03** — Session membawa `user.id` dan role `USER`/`ADMIN`.
- **AUTH-04** — Route admin harus ditolak untuk non-admin pada middleware dan server/API.
- **AUTH-05** — Estimasi hanya dapat dibaca atau diubah oleh pemiliknya, kecuali admin.
- **AUTH-06** — Link RSVP server-only tidak boleh bocor kepada visitor anonim.
- **AUTH-07** — Manual override estimasi hanya boleh dibuat/diubah admin.

### 11.2 Public Knowledge

- **KNOW-01** — Visitor dapat menelusuri panduan dan membuka detail berdasarkan slug.
- **KNOW-02** — Visitor hanya melihat FAQ yang dipublish, dikelompokkan dan diurutkan admin.
- **KNOW-03** — Visitor hanya melihat cerita yang dipublish.
- **KNOW-04** — Cerita dapat menyertakan profil perjalanan, narasi, anggaran, itinerary, dan packing list.
- **KNOW-05** — Admin dapat mengelola draft/publish state tanpa mengubah kode.
- **KNOW-06** — Konten yang berkaitan dengan event harus memiliki lifecycle atau penanda kedaluwarsa yang jelas. Persyaratan ini belum terpenuhi secara konsisten.

### 11.3 Hotel Discovery

- **HOTEL-01** — Visitor dapat memfilter hotel berdasarkan kota dan tier.
- **HOTEL-02** — Harga yang ditampilkan harus dilabeli sebagai estimasi, bukan jaminan booking.
- **HOTEL-03** — Harga bulanan hanya tampil jika feature flag publik diaktifkan.
- **HOTEL-04** — Jika harga tidak ditampilkan, visitor harus mendapat CTA untuk menanyakan harga terbaru.
- **HOTEL-05** — Link booking mengikuti prioritas link yang tersedia.
- **HOTEL-06** — Visitor harus mendapat disclaimer tentang status Nusuk, validasi, harga, dan keputusan booking.
- **HOTEL-07** — Hubungan antara `hotel_prices` dan `hotel_listings` harus dijelaskan atau disatukan sebelum kedua model diperluas lebih jauh.

### 11.4 Service Catalog

- **SERVICE-01** — Katalog menampilkan nama, deskripsi, harga indikatif, status baru, dan CTA.
- **SERVICE-02** — CTA internal membuka halaman detail; CTA eksternal membuka WhatsApp atau aplikasi terkait.
- **SERVICE-03** — Harga katalog hanya untuk display dan tidak otomatis menjadi invoice.
- **SERVICE-04** — Pesan WhatsApp harus membawa konteks layanan agar admin dapat menindaklanjuti.
- **SERVICE-05** — Klaim layanan dan dokumentasi publik harus berasal dari data yang benar-benar tersedia.

### 11.5 Community

- **COMM-01** — Pengajuan komunitas dapat dilakukan tanpa login.
- **COMM-02** — Nama dan nomor HP wajib serta divalidasi.
- **COMM-03** — Session user, jika ada, dihubungkan ke pengajuan.
- **COMM-04** — Sistem memberi indikasi duplikasi untuk membantu admin, bukan menolak otomatis.
- **COMM-05** — Admin dapat memberi status dan catatan internal.
- **COMM-06** — Angka komunitas yang bersifat promosi tidak boleh diperlakukan sebagai metrik analitik aktual tanpa label dan definisi.

### 11.6 Estimator

- **EST-01** — Estimator menerima input teks Bahasa Indonesia dan parameter manual.
- **EST-02** — Input AI harus menghasilkan parameter terstruktur serta catatan asumsi.
- **EST-03** — Kegagalan AI tidak boleh menghilangkan kemampuan input manual.
- **EST-04** — Admin dapat memilih hotel konkret per kota atau fallback tier.
- **EST-05** — Sistem mendukung harga hotel dan airline per bulan.
- **EST-06** — Sistem menggunakan real hotel price untuk bulan yang tercakup, lalu fallback ke monthly estimate, lalu base estimate.
- **EST-07** — Breakdown menampilkan biaya hotel, penerbangan, layanan, total per orang, dan total grup.
- **EST-08** — Biaya group-shared dapat dibagi per pax tanpa mengubah group total.
- **EST-09** — Admin dapat mengubah label/nilai, menyembunyikan baris, dan menambah baris custom.
- **EST-10** — Override yang stale akibat perubahan baseline harus dapat dikenali.
- **EST-11** — Save/update menggunakan validasi server dan optimistic concurrency.
- **EST-12** — User tidak boleh mengirim manual override baru melalui API.
- **EST-13** — Hasil display, save, copy, WhatsApp, dan PDF harus menggunakan breakdown yang sama.
- **EST-14** — Estimasi adalah planning aid; hasil bukan harga atau ketersediaan final.

### 11.7 Admin Pricing & Imports

- **PRICE-01** — Admin dapat mengelola SAR→IDR dan USD→IDR.
- **PRICE-02** — Admin dapat mengelola beberapa hotel per kota/tier dan beberapa airline per tier.
- **PRICE-03** — Satu airline dapat ditandai default per tier.
- **PRICE-04** — Hotel dan airline dapat memiliki override harga Januari–Desember.
- **PRICE-05** — Service fee menyimpan currency, enabled state, dan `divideByPax`.
- **PRICE-06** — Import harus melalui preview lalu confirm.
- **PRICE-07** — Import harus membedakan create, update, invalid, dan conflict.
- **PRICE-08** — Key matching harus dinormalisasi untuk mengurangi duplikasi.
- **PRICE-09** — Real hotel price harus menyimpan source label dan tidak menimpa estimate layer.
- **PRICE-10** — Room multiplier saat ini adalah data seed/database dan belum memiliki editor admin.

### 11.8 Export & Sharing

- **EXPORT-01** — Pemilik estimasi atau admin dapat mengekspor PDF.
- **EXPORT-02** — Pemilik estimasi atau admin dapat menghasilkan teks WhatsApp.
- **EXPORT-03** — Export harus menampilkan total dan item yang sama dengan UI setelah override.
- **EXPORT-04** — Export perlu mencantumkan identitas estimasi atau waktu generate jika relevan.

## 12. Model Perhitungan Estimasi

### 12.1 Input inti

| Input | Keterangan |
|---|---|
| Malam Makkah/Madinah | Jumlah malam per kota. |
| Pax | Jumlah anggota grup. |
| Bulan perjalanan | Memilih price layer bulanan. |
| Hotel | Hotel konkret bila dipilih; tier sebagai fallback. |
| Tipe kamar | Occupancy dan room-rate ratio. |
| Airline | Opsi penerbangan, termasuk tanpa penerbangan. |
| Services | Visa, dokumen, transport, tour, atau service fee lain yang enabled. |
| Full board | Penanda kebutuhan makan; dampak mengikuti model yang tersedia. |

### 12.2 Resolusi harga hotel

Urutan sumber harga:

1. `real_hotel_prices` untuk hotel dan bulan yang cocok;
2. `hotel_monthly_prices` sebagai estimate bulanan;
3. `hotel_prices.sar_per_night` sebagai estimate dasar.

Sumber yang dipilih harus tetap dapat ditelusuri sebagai `real` atau `estimate`.

### 12.3 Formula hotel

Kontrak formula:

```text
roomCount = ceil(pax / paxPerRoom)
hotelGroupIdr =
  sarPerNight × nights × roomRateRatio × roomCount × sarToIdr
hotelPerPersonIdr = hotelGroupIdr / pax
```

`roomRateRatio` berarti rasio harga kamar tersebut terhadap harga dasar kamar Quad. Occupancy sudah ditangani oleh `roomCount`; multiplier tidak boleh digunakan sebagai uplift per orang.

### 12.4 Status tipe kamar

Pada `main`, data lama masih mengenal konfigurasi sebelum koreksi terbaru. Branch `feat/estimate-update` mengubah kontrak menjadi:

| Tipe | Pax per kamar | Rasio awal |
|---|---:|---:|
| QUINT | 5 | 1.0 |
| QUAD | 4 | 1.0 |
| TRIPLE | 3 | 1.0 |
| DOUBLE | 2 | 1.0 |

`SINGLE` dihentikan. Nilai non-1.0 hanya boleh digunakan jika terdapat bukti supplier bahwa harga per kamar memang berbeda terhadap Quad.

Sebelum rollout:

- konfirmasi rasio QUINT/DOUBLE/TRIPLE terhadap satu atau lebih supplier;
- perbarui row database produksi secara eksplisit;
- verifikasi Quad tidak berubah dan quote Double turun sesuai model;
- pastikan saved estimate lama fallback ke Quad jika membawa tipe yang tidak dikenal.

### 12.5 Rounding dan jaminan

Estimator membulatkan nilai untuk display sesuai formatter yang berlaku. Hasil adalah estimasi, bukan invoice. Admin harus memeriksa harga, ketersediaan, ketentuan vendor, dan periode perjalanan sebelum memberi penawaran final.

## 13. Katalog Layanan dan Operating Model

| Layanan | Harga display saat audit | Pengalaman digital | Pemenuhan |
|---|---:|---|---|
| Visa Umroh | Mulai USD 165 | Halaman detail, dua skema layanan, aplikasi eksternal, WhatsApp | Eksternal/manual |
| Badalin | Mulai Rp 1,8 juta | Penjelasan proses, lima video dokumentasi, CTA | Manual via WhatsApp |
| Transportasi | Mulai SAR 170 | Kendaraan, rute, kalkulator SAR–IDR, pilih admin | Manual via WhatsApp |
| Booking Hotel | Mulai Rp 900 ribu/malam | Direktori/referensi harga dan link booking/kontak | OTA atau manual |
| Jasa Booking HHR | Fee Rp 100 ribu/orang, di luar tiket | CTA WhatsApp | Manual |
| Muthowwif | Mulai Rp 1,4 juta/sesi | CTA WhatsApp | Manual |

Harga di atas adalah snapshot kode pada 2026-07-26 dan harus diperlakukan sebagai display copy, bukan pricing source otomatis.

### Detail penting

- Visa memiliki opsi approval hotel Nusuk Masar dan opsi BRN; waktu proses dan persyaratan mengikuti copy yang dipublish dan harus direview berkala.
- Transportasi menambahkan fee SSU terhadap base route, mengonversi SAR ke IDR berdasarkan input kurs, lalu menyiapkan pesan WhatsApp.
- Badalin menjanjikan pelaksanaan oleh muthowwif, dokumentasi video, dan sertifikat; hanya video yang benar-benar dipublish boleh dihitung sebagai dokumentasi tersedia.
- HHR dan muthowwif belum memiliki workflow internal selain lead ke WhatsApp.

## 14. Content Model

### Panduan

- Sumber utama berupa MDX dan aset PDF.
- Dikelola melalui repository, belum melalui CMS admin.

### Cerita jamaah

- Profil perjalanan dan narasi utama.
- Kota keberangkatan, bulan/tahun, pax, tier hotel/airline, malam, dan budget.
- Itinerary per hari.
- Packing items.
- Draft/published dan featured state.
- Import CSV tersedia untuk data utama.

### FAQ

- Group dengan urutan.
- Item dengan pertanyaan, rich answer, urutan, dan publish state.
- Import CSV membuat/memperbarui konten, sedangkan publish dan urutan tetap dikontrol admin.

### Hotel

Saat ini ada dua konsep yang perlu dibedakan:

1. `hotel_prices`: sumber pilihan dan estimasi harga untuk estimator serta halaman Hotel Nusuk saat ini.
2. `hotel_listings`: konten hotel terstruktur dengan publish state yang dikelola melalui admin.

Kedua model berpotensi menimbulkan duplikasi identitas hotel, metadata, dan ownership. Tim perlu memutuskan apakah keduanya:

- disatukan;
- dihubungkan dengan foreign key/identity map; atau
- dipertahankan terpisah dengan tujuan yang didokumentasikan.

## 15. Data Domains

| Domain | Tabel utama |
|---|---|
| Pricing | `exchange_rates`, `hotel_prices`, `hotel_monthly_prices`, `real_hotel_prices`, `airline_prices`, `airline_monthly_prices`, `service_fees`, `room_multipliers` |
| Identity | `users`, `accounts`, `sessions`, `verification_tokens` |
| Estimation | `estimates`, `activity_logs` |
| Community | `community_join_requests` |
| Stories | `pilgrim_stories`, `story_itinerary_days`, `story_packing_items` |
| Hotels/content | `hotel_listings` |
| FAQ | `faq_groups`, `faq_items` |
| Traffic | `visitor_logs` |

### Data ownership

- Admin bertanggung jawab atas kualitas harga, kurs, dan publish state.
- Sistem bertanggung jawab atas validasi bentuk data dan akses per role.
- Provider eksternal tetap menjadi sumber kebenaran untuk ketersediaan dan harga final.
- Data visitor dan angka promosi tidak boleh digabung tanpa definisi metrik yang eksplisit.

## 16. API Capability Map

### Public

- mencatat/membaca visitor sesuai endpoint yang tersedia;
- membuat community join request;
- auth callback/session melalui Auth.js.

### Authenticated owner/admin

- list/create estimate;
- AI parse;
- read/update/delete estimate;
- export PDF/WhatsApp.

### Admin

- read/update pricing;
- hotel, airline, FAQ, dan story CSV preview/confirm/template;
- real hotel price import;
- CRUD/publish stories;
- CRUD hotel listings;
- CRUD/group/import FAQ;
- list/update community requests.

Semua mutation harus memvalidasi payload di server; kontrol UI bukan pengganti otorisasi API.

## 17. Architecture & Dependencies

### Stack

- Next.js 14 App Router
- React 18 dan TypeScript
- Tailwind CSS
- PostgreSQL dengan Drizzle ORM
- Auth.js/NextAuth v5
- Anthropic Claude API untuk parsing
- React PDF untuk export
- MDX untuk panduan

### Integrasi eksternal

| Integrasi | Tujuan | Risiko operasional |
|---|---|---|
| PostgreSQL | Data produk dan user | Migration tidak otomatis saat startup. |
| Google OAuth | Login | Salah konfigurasi callback/credential. |
| Anthropic API | Parse teks estimator | API key, latency, format output, dan availability. |
| WhatsApp | Lead dan fulfillment | Tidak ada tracking end-to-end bawaan. |
| Aplikasi visa eksternal | Pemesanan visa | Pengalaman dan data terpisah dari aplikasi utama. |
| OTA/link booking | Booking hotel | Harga/ketersediaan dapat berubah di luar kontrol SSU. |
| YouTube/TikTok/Zoom | Dokumentasi dan event | Konten/link dapat kedaluwarsa atau tidak tersedia. |

### Deployment

- Aplikasi dirancang untuk deployment self-hosted melalui Dokploy.
- PostgreSQL berjalan sebagai service terpisah.
- Migration dijalankan manual sebelum/ketika deploy; aplikasi dapat boot walau tabel/migration belum lengkap lalu gagal saat route digunakan.
- Environment penting meliputi database, auth secret, Google OAuth, Anthropic API, URL komunitas, dan URL RSVP webinar.

## 18. Non-Functional Requirements

### Security

- Otorisasi admin diterapkan pada middleware, server page, dan API mutation.
- Ownership estimasi diverifikasi pada read/update/delete/export.
- Secret dan URL RSVP sensitif tidak boleh dikirim kepada visitor yang tidak berhak.
- CSV dan input user harus dibatasi ukuran serta divalidasi sebelum write.
- Tidak ada data sensitif yang boleh ditulis ke repository atau client bundle.

### Reliability

- Kegagalan statistik visitor tidak boleh menjatuhkan homepage.
- Missing pricing row harus menggunakan fallback aman dan terlihat, bukan membuat seluruh estimator crash.
- Import besar menggunakan preview-confirm untuk mencegah write tidak disengaja.
- Update estimasi memakai concurrency guard untuk menghindari silent overwrite.

### Performance

- Halaman publik server-rendered dan data yang aman dapat di-cache.
- Query listing perlu dibatasi/diurutkan secara deterministik.
- Import dan kalkulasi harus memiliki batas row/input.
- Media eksternal tidak boleh menghambat rendering inti.

### Accessibility & Responsiveness

- Navigasi, estimator, form, tabel, modal, dan CTA harus dapat digunakan pada mobile serta desktop.
- Focus state, label form, keyboard interaction, dan contrast harus dipertahankan.
- Layout estimator harus tetap terbaca pada viewport sempit dan perangkat foldable.

### Observability

- Event penting seperti AI parse dan estimate save dapat dicatat pada activity log.
- Error eksternal perlu memiliki pesan operasional yang dapat ditindaklanjuti.
- Produk belum memiliki funnel analytics lengkap; visitor count saja tidak cukup.

## 19. Metrics

### Metrik yang tersedia atau tersirat

- unique/public visitor count dari `visitor_logs`;
- jumlah user terdaftar;
- jumlah estimate tersimpan;
- event AI parse dan estimate save pada activity log;
- jumlah community join request dan statusnya;
- jumlah konten published;
- angka komunitas promosi yang dikombinasikan dengan visitor count.

### North-star candidate

**Jumlah jamaah yang berhasil bergerak dari pengetahuan ke rencana atau layanan yang dapat ditindaklanjuti.**

Karena fulfillment banyak berlangsung di WhatsApp, north-star ini membutuhkan pencatatan lead dan outcome yang belum tersedia end-to-end.

### KPI yang direkomendasikan

| Funnel | KPI |
|---|---|
| Discover | Unique visitors, landing page entry, content views |
| Learn | Guide/story/FAQ engagement, webinar RSVP |
| Plan | Estimate started, AI parse success, estimate saved, export generated |
| Connect | Community request, WhatsApp/service CTA click |
| Fulfill | Lead contacted, quote sent, booking confirmed, service completed |
| Retain | Repeat visit, repeat estimate, community participation |
| Quality | Price freshness, parse failure, stale override, import error, support correction |

KPI ini adalah target instrumentation, bukan klaim bahwa seluruh data sudah tercatat.

## 20. Product Risks & Gaps

### P0 — Akurasi harga kamar dan rollout data

Koreksi multiplier telah diimplementasikan pada branch aktif, tetapi belum berada di `main` dan belum ada bukti bahwa row produksi telah diperbarui. Quote non-Quad dapat salah sampai code dan data dirilis bersama.

### P0 — Estimator belum memberikan value utama kepada role USER

User dapat login dan membuka dashboard, tetapi tidak dapat membuat estimasi. Tim perlu menentukan:

- apakah estimator memang alat internal permanen; atau
- kriteria keamanan, UX, pricing freshness, dan support sebelum public/user launch.

### P1 — Dua domain hotel tumpang tindih

`hotel_prices`, `real_hotel_prices`, `hotel_listings`, dan branch penawaran booking hotel membawa konsep hotel berbeda tanpa identity contract tunggal.

### P1 — Branch booking hotel besar belum memiliki keputusan produk

Branch `feat/manual-hotel-booking-catalog` menambahkan pencarian berdasarkan tanggal, penawaran harga, admin CRUD/import, dan alur `/pesan-hotel`. Branch terakhir aktif 2026-07-11 dan belum masuk `main`. Fitur tidak boleh dipromosikan sebagai roadmap committed sebelum product owner memutuskan lanjut, rebase, redesign, atau arsip.

### P1 — Konten webinar kedaluwarsa

Halaman menampilkan event 16 Juni 2026, sedangkan audit dilakukan 26 Juli 2026. Dua test masih mengharapkan 14 Juni 2026. Ini menunjukkan event content dan test fixture telah drift.

### P1 — Dokumentasi produk lama tertinggal

`docs/FEATURES.md` dan PRD estimator lama belum mencakup banyak fitur Juli, masih menyebut `SINGLE`, dan menggambarkan estimator lebih user-facing daripada akses aktual.

### P2 — Harga dan nomor operasional hard-coded

Beberapa harga katalog, kurs transportasi default, nomor WhatsApp, rute, dan event copy berada di kode. Perubahan operasional memerlukan deploy dan dapat drift dari pricing database.

### P2 — Analytics funnel belum lengkap

Klik WhatsApp, kontak admin, quote, booking, dan service completion tidak tercatat end-to-end. Angka visitor/promosi belum cukup untuk menilai outcome produk.

### P2 — Role admin terlalu luas

Admin harga, konten, komunitas, dan user management memakai role yang sama. Risiko meningkat seiring jumlah operator bertambah.

### P2 — Deployment bergantung pada migration manual

Missing migration tidak selalu menggagalkan startup, sehingga kegagalan dapat baru terlihat ketika route tertentu digunakan.

## 21. Dalam Pengembangan dan Keputusan yang Diperlukan

### 21.1 `feat/estimate-update`

Status repository:

- branch sudah dipush dan working tree bersih saat audit;
- dua commit di atas `main`;
- mengganti `SINGLE` dengan `QUINT`;
- mendefinisikan multiplier sebagai room-rate ratio;
- menambahkan fallback bila saved estimate atau database tidak cocok;
- memperbarui AI, UI, export, seed, dan test.

Syarat sebelum dianggap rilis:

1. Konfirmasi assumption rasio kamar dengan supplier.
2. Review dan merge ke `main`.
3. Update data `room_multipliers` pada produksi.
4. Verifikasi quote Quad dan Double pada UI.
5. Verifikasi saved estimate lama.

### 21.2 `feat/manual-hotel-booking-catalog`

Kemampuan pada branch:

- route publik `/pesan-hotel`;
- pencarian penawaran berdasarkan tanggal;
- hasil availability/rate window;
- CTA WhatsApp;
- admin CRUD penawaran;
- CSV template, preview, dan confirm;
- schema/migration tambahan;
- dokumentasi serta test khusus.

Keputusan product owner:

- **Lanjut:** rebase terhadap `main`, satukan hotel identity, audit migration, dan validasi data offer.
- **Redesign:** ambil requirement, tetapi susun ulang di atas model hotel terbaru.
- **Arsip:** tandai branch tidak lagi menjadi arah produk dan pindahkan insight yang masih relevan ke backlog.

Sampai keputusan dibuat, fitur berstatus **Belum Diputuskan**, bukan “Coming Soon”.

## 22. Recommended Product Priorities

### Now

1. Merge dan rollout koreksi room pricing secara code + data.
2. Perbaiki konten serta test webinar yang drift.
3. Tetapkan dokumen ini sebagai sumber product knowledge dan tandai PRD lama sebagai historical.
4. Putuskan apakah estimator adalah internal tool atau calon self-service product.

### Next

1. Putuskan nasib branch booking hotel.
2. Definisikan satu hotel identity model.
3. Pindahkan konfigurasi operasional yang sering berubah dari kode ke admin/config.
4. Instrumentasikan CTA WhatsApp dan outcome lead.
5. Tambahkan freshness metadata pada harga dan konten sensitif waktu.

### Later

1. Role admin yang lebih granular.
2. Self-service estimator dengan guardrail jika strategi menyetujuinya.
3. CRM/lead lifecycle ringan untuk menghubungkan discovery hingga fulfillment.
4. Monitoring deployment dan migration readiness.
5. Model harga per hotel × room type jika bukti supplier membutuhkannya.

## 23. Release Readiness Criteria

Sebuah kemampuan boleh disebut “tersedia” kepada tim atau pengguna bila:

- code sudah berada di `main`;
- migration dan seed/data production sudah diterapkan;
- environment/config yang diperlukan tersedia;
- akses per role sudah diuji;
- happy path dan error path utama lulus;
- copy publik sesuai dengan realitas operasional;
- owner operasional dan fallback support jelas;
- harga/event memiliki tanggal verifikasi;
- dokumentasi status diperbarui.

## 24. Quality Snapshot

Audit test pada branch `feat/estimate-update`, 2026-07-26:

- 73 test files ditemukan;
- 72 test files lulus;
- 622 dari 624 test lulus;
- 2 test webinar gagal karena test mengharapkan “Ahad, 14 Juni 2026”, sedangkan halaman menampilkan “Selasa, 16 Juni 2026”;
- warning test DOM/iframe YouTube dan form action muncul, tetapi test terkait tetap lulus.

Snapshot ini bukan jaminan produksi. Browser QA, database production verification, dan deployment smoke test tetap diperlukan untuk release.

## 25. Glossary

| Istilah | Definisi |
|---|---|
| SSU | Serba Serbi Umroh. |
| Umroh Planner | Nama teknis/repository untuk aplikasi SSU. |
| Jamaah | Pengguna atau calon pelaksana umroh. |
| Admin | Operator dengan akses penuh ke estimator dan back-office. |
| Estimasi | Gambaran biaya, bukan quote atau invoice final. |
| Real hotel price | Harga katalog yang ditranskripsi dengan source label untuk bulan tertentu. |
| Estimate price | Harga dasar atau bulanan yang dipakai sebagai fallback. |
| Tier | Kategori hotel atau airline untuk pengelompokan harga. |
| Room-rate ratio | Rasio harga satu tipe kamar terhadap dasar harga kamar Quad. |
| Override | Penyesuaian admin terhadap breakdown hasil kalkulasi. |
| Nusuk/Masar | Konteks platform/proses Saudi yang relevan terhadap hotel dan visa. |
| BRN | Opsi dokumen/booking reference dalam layanan visa sesuai copy operasional. |
| HHR | Haramain High Speed Railway. |
| Muthowwif | Pendamping ibadah. |
| Badalin | Layanan badal umroh SSU. |

## 26. Governance Dokumen

Owner yang direkomendasikan: Product Owner bersama lead operasi.

Dokumen harus diperbarui ketika:

- fitur masuk atau keluar dari `main`;
- akses role berubah;
- service fulfillment berubah;
- ada domain data baru;
- estimator dibuka kepada user;
- harga display/positioning utama berubah;
- branch “Dalam Pengembangan” diputuskan;
- event/kampanye berakhir;
- ada perubahan non-goal atau strategi produk.

Setiap update sebaiknya mencantumkan tanggal, branch/release, owner keputusan, dan perubahan status produk.

## 27. Sumber Audit

Sumber utama yang diperiksa:

- struktur route di `app/`;
- komponen dan domain logic di `components/`, `lib/`, dan `types/`;
- schema dan seed di `lib/db/`;
- API authorization dan mutation routes;
- `docs/FEATURES.md`;
- PRD estimator lama;
- seluruh implementation plan di `docs/plans/`;
- runbook deployment di `docs/ops/runbook.md`;
- branch `main`;
- branch aktif `feat/estimate-update`;
- branch belum tergabung `feat/manual-hotel-booking-catalog`;
- hasil test suite pada 2026-07-26.

Tidak ada riset eksternal yang digunakan. Dokumen ini menggambarkan produk berdasarkan repository dan bukti lokal; klaim kondisi produksi, ketentuan regulator, harga supplier, serta ketersediaan vendor tetap membutuhkan verifikasi operasional.
