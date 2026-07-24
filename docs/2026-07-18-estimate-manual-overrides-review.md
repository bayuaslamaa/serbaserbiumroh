# Review — Kolom Baru Sistem Estimasi: Manual Overrides

**Tanggal:** 2026-07-18
**Branch:** `feat/estimate-update`
**Fitur:** manual override (editing gaya spreadsheet) pada breakdown estimasi
**Plan terkait:** `docs/plans/2026-07-11-001-feat-manual-estimate-overrides-plan.md`
**Status:** untuk direview tim

---

## 1. Ringkasan

Menambahkan kemampuan **admin mengedit manual** hasil breakdown estimasi (rename baris, ubah harga satuan / harga per-pax, sembunyikan baris, tambah baris custom). Editan disimpan sebagai satu **kolom JSONB baru** di tabel `estimates`, lalu digabung dengan hasil hitung otomatis oleh `applyOverrides` sebelum ditampilkan di UI dan diekspor (WhatsApp/PDF).

Prinsip desain: **layer override yang null/kosong menghasilkan output identik dengan breakdown otomatis** — fitur ini aditif dan tidak mengubah perilaku estimasi yang sudah ada.

---

## 2. Perubahan skema — 1 kolom baru

`drizzle/migrations/0012_estimate_manual_overrides.sql`:

```sql
ALTER TABLE "estimates" ADD COLUMN "manual_overrides" jsonb;
```

`lib/db/schema.ts`:

```ts
manualOverrides: jsonb("manual_overrides"), // ManualOverrides layer; null = no manual edits
```

- **Nullable**, `null` = tidak ada editan manual (mayoritas estimasi).
- Tidak ada constraint di level DB — integritas isi bergantung sepenuhnya pada validasi di boundary API (lihat §5).

> Catatan: branch ini juga menambah `drizzle/migrations/0000_mature_zzzax.sql` (311 baris, baseline). **Perlu dikonfirmasi apakah baseline ini sengaja di-regenerate** atau ikut ter-commit tanpa sengaja.

---

## 3. Tipe data baru (`types/index.ts`)

| Tipe | Fungsi |
|---|---|
| `RowOverride` | Override 1 baris: `label?`, `idr?`, `unitPrice?`, `hidden?`, `autoIdrAtOverride?` |
| `CustomRow` | Baris tambahan admin: `id`, `label`, `idr` |
| `ManualOverrides` | Layer tersimpan: `{ overrides: Record<string, RowOverride>, customRows: CustomRow[] }` |
| `BreakdownDisplayRow` | 1 baris model tampilan gabungan (dikonsumsi UI + ekspor) |
| `BreakdownDisplay` | Model tampilan penuh hasil `applyOverrides` |

Perubahan pendukung:
- `ServiceKey` di-refactor jadi `SERVICE_KEYS` (const tuple) + tipe turunannya — agar bisa **diiterasi saat runtime** untuk validasi.
- `BudgetBreakdown.services[]` dapat 2 field baru: `unitAmount` (harga per-unit native, mis. 165 utk $165) & `currency` (`SAR`/`USD`/`IDR`).

**Row keys kanonik** (penambat override ke baris hasil hitung, stabil lintas recompute):
`HOTEL_MADINAH_ROW_KEY="hotelMadinah"`, `HOTEL_MAKKAH_ROW_KEY="hotelMakkah"`, `FLIGHT_ROW_KEY="flight"`, dan `serviceRowKey(k) = "service:{k}"`.

---

## 4. Aturan bisnis penting

1. **`idr` vs `unitPrice` mutually exclusive.** Mengedit salah satu menghapus yang lain. Jika `unitPrice` di-set, harga per-pax **dihitung ulang linear**: `idr = round(unitPrice × factor)`, dengan `factor = baseIdr / baseUnitPrice` (guard `baseUnitPrice > 0`, else factor 1 — aman dari divide-by-zero). Override `idr` langsung menang atas `unitPrice`.
2. **Deteksi basi (`stale`).** Saat override dibuat, nilai otomatis saat itu disimpan di `autoIdrAtOverride`. Jika parameter berubah dan nilai otomatis bergeser, baris ditandai `stale = (autoIdrAtOverride != null && autoIdrAtOverride !== baseIdr)`. **Override TIDAK diperbarui otomatis** — admin harus rekonsiliasi manual (UI menampilkan status stale).
3. **Baris disembunyikan (`hidden`).** Dikeluarkan dari total, tetap ditampilkan (coret) dengan opsi reset.
4. **Baris custom.** Admin bisa menambah item (mis. "Manasik", "Handling") dengan `id` unik.
5. **Stabilitas total.** Total per-pax & grup **selalu dihitung ulang di server** dari `applyOverrides` — total kiriman klien tidak pernah dipercaya.

---

## 5. Validasi & keamanan

**Validasi bentuk** (`lib/estimate/overrides.ts → validateManualOverrides`), dipanggil di boundary API:
- Hanya key top-level `overrides` & `customRows`.
- `overrides` & `customRows` masing-masing maksimal `MAX_ROWS = 50`.
- Key override wajib kanonik (`hotelMadinah`/`hotelMakkah`/`flight`/`service:<ServiceKey valid>`).
- Field override & custom-row dibatasi whitelist; `label` 1–`MAX_LABEL_LEN(120)` char; nilai IDR integer `0..MAX_IDR(2_147_483_647 = int32 max)`.
- Menolak `id` custom-row duplikat.

**Otorisasi & konkurensi** (kedua write-path):
| Aspek | POST `/api/estimate` | PATCH `/api/estimate/[id]` |
|---|---|---|
| Override butuh ADMIN | ✅ (kecuali kosong / dari sumber tersimpan) | ✅ (`role !== "ADMIN"` → 403) |
| Validasi bentuk | ✅ | ✅ |
| Ownership | — (baru) | ✅ (`userId` match / ADMIN, else 403) |
| Optimistic lock | — | ✅ `expectedUpdatedAt` (409 mismatch, 428 jika hilang) |
| Total dihitung server | ✅ | ✅ (`arePersistableEstimateTotals` cek batas int32) |

`MAX_IDR = int32 max` sejalan dengan kolom `total_idr_*` bertipe `integer` — mencegah overflow.

---

## 6. Alur data

```
Klien (BudgetBreakdown.tsx edit)
  → API POST/PATCH  → validateManualOverrides + gate ADMIN
                    → applyOverrides(breakdown, overrides, pax)  [merge + recompute total]
                    → simpan estimates.manual_overrides (+ total)
  ← BreakdownDisplay dipakai UI, dan saat export:
     app/api/estimate/[id]/export/route.ts → applyOverrides → PDF / WhatsApp
```

`applyOverrides` (`lib/budget/overrides.ts`) adalah **single source of truth** yang dilalui semua permukaan (UI, Copy, WhatsApp, PDF) dan total tersimpan — memastikan angka konsisten di semua tempat.

---

## 7. File terdampak

| File | Δ | Peran |
|---|---|---|
| `drizzle/migrations/0012_estimate_manual_overrides.sql` | +1 | kolom baru |
| `drizzle/migrations/0000_mature_zzzax.sql` | +311 | baseline — **konfirmasi intensi** |
| `lib/db/schema.ts` | +1 | field schema |
| `types/index.ts` | +72/-6 | tipe override + `SERVICE_KEYS` |
| `lib/estimate/overrides.ts` | +94 | validasi + guard total |
| `lib/budget/overrides.ts` | +201 | `applyOverrides` (merge/scaling/stale) |
| `lib/budget/calculate.ts` | +2 | expose `unitAmount`/`currency` |
| `lib/estimate/params.ts` | +4/-… | penyesuaian |
| `app/api/estimate/route.ts` | +88 | POST: terima & simpan override |
| `app/api/estimate/[id]/route.ts` | +118 | PATCH: gate + optimistic lock |
| `app/api/estimate/[id]/export/route.ts` | +9 | export pakai override |
| `components/estimator/BudgetBreakdown.tsx` | +384 | UI edit spreadsheet |
| `components/estimator/EstimatorClient.tsx` | +182 | state & aksi override |

(+ test: `__tests__/patch-route`, `export-route`, `overrides` di lib/budget & lib/estimate, `EstimatorClient`, `BudgetBreakdown`.)

---

## 8. Poin untuk direview

**Sudah kuat (verifikasi saat baca kode):**
- Otorisasi override ADMIN-only di **kedua** endpoint; ownership + optimistic-locking di PATCH.
- Total selalu dihitung ulang di server; batas int32 dijaga.
- Scaling `unitPrice` aman dari divide-by-zero.
- Layer kosong = output identik breakdown otomatis (aditif, low-risk).

**Perlu perhatian:**
1. **Integritas JSONB hanya dijaga app-layer** — tidak ada CHECK constraint di DB. Setiap write-path baru ke `manual_overrides` WAJIB lewat `validateManualOverrides`, kalau tidak data malformed bisa persist. (Saat ini 2 path sudah benar.)
2. **`stale` tidak auto-recompute** — override basi hanya ditandai, admin harus rekonsiliasi. Pastikan UX-nya jelas (baris stale menonjol + tombol reset) supaya angka usang tidak ikut terekspor tanpa disadari.
3. **Baseline migration `0000_mature_zzzax.sql`** — konfirmasi ini memang regenerasi drizzle yang disengaja, bukan artefak.
4. **Edge unit-price saat `baseUnitPrice = 0`** — `factor` jatuh ke 1, jadi `idr = unitPrice`; secara bisnis mungkin tidak bermakna. Prioritas rendah, tapi layak dicek untuk baris yang basis unit-nya bisa 0.

---

## 9. Cara verifikasi

```bash
# Jalankan test unit fitur override
npm test -- lib/budget/__tests__/overrides.test.ts \
             lib/estimate/__tests__/overrides.test.ts \
             app/api/estimate/__tests__/patch-route.test.ts

# Cek migration diterapkan
grep -n "manual_overrides" drizzle/migrations/*.sql lib/db/schema.ts
```
