# Konteks Halaman Utama `/` — Serba Serbi Umroh (SSU)

Dokumen ini dibuat untuk di-upload ke **Claude Design** sebagai konteks saat merevamp halaman utama.
Isinya: stack, design token, struktur layout, **source code lengkap** semua komponen yang dirender di `/`,
temuan masalah UI/UX saat ini dengan referensi `file:baris`, batasan yang tidak boleh dilanggar, dan
pertanyaan terbuka.

Snapshot: **2026-08-03** · Branch: `feat/home-webinar-recording` · HEAD: `15bc691`

**Mode desain: Existing System.** Palet, font, radius, dan pola komponen sudah mapan di seluruh app.
Revamp harus *meng-extend* bahasa visual ini, bukan mengganti dengan identitas baru.

---

## 1. Stack & konvensi

| Hal | Nilai |
|---|---|
| Framework | Next.js 14.2 (App Router, RSC) |
| Bahasa | TypeScript, React 18 |
| Styling | Tailwind CSS 3.4 + CSS variables (banyak inline `style={{}}`) |
| Komponen dasar | shadcn-style (`components/ui/*`), Radix primitives, `cva` + `cn()` |
| Ikon | `lucide-react` |
| Font | `Amiri` (heading, serif) + `DM Sans` (body) via `next/font/google` |
| Auth | NextAuth v5 beta — `auth()` dipanggil server-side di page |
| DB | Postgres + Drizzle ORM |
| Bahasa UI | Bahasa Indonesia |
| Test | Vitest + Testing Library (`app/(public)/__tests__/page.test.tsx`, `components/home/__tests__/*`) |
| Animasi | **Tidak ada library motion** (tidak ada framer-motion). Pakai CSS transition. |
| Tema | **Dark-only.** Tidak ada light mode, dan itu disengaja (PRD §14). |

Catatan teknis penting untuk redesign:

- `app/(public)/page.tsx` adalah **async Server Component** — memanggil `db.select()`, `auth()`, dan
  `getPublicVisitorCount()`. Tidak boleh ada hook / `"use client"` di file itu. Semua interaktivitas
  harus dipecah ke child client component.
- Keempat komponen `components/home/*` saat ini **semuanya server component murni** (tidak ada `"use client"`).
  Kalau desain baru butuh state (carousel, tab, accordion, modal), komponen itu harus dipecah jadi client child.
- Breakpoint: default Tailwind (`sm:640 md:768 lg:1024 xl:1280`) + satu custom `nav: 900px` yang **khusus
  dipakai navbar**, jangan dipakai di konten halaman.

---

## 2. Design token (`app/globals.css`)

```css
:root {
  /* Islamic aesthetic — dark green / gold (PRD §14) */
  --color-bg: #0b1c12;
  --color-surface: rgba(255, 255, 255, 0.03);
  --color-border: rgba(201, 168, 76, 0.18);
  --color-gold: #c9a84c;
  --color-gold-muted: rgba(201, 168, 76, 0.5);
  --color-gold-hover: #d9bc66;
  --color-green: #2c6b42;
  --color-green-text: #7a9e84;
  --color-text: #f0ece0;
  --color-text-muted: #9ab39e;
  --color-text-soft: #d9d4c4;
  --color-danger-text: #e08585;
  --color-danger-text-hover: #f0a0a0;
  --font-heading: "Amiri", serif;
  --font-body: "DM Sans", sans-serif;
  --radius: 0.5rem;
}

* { border-color: var(--color-border); }

body {
  background-color: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
}

@keyframes ssuFadeDown {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}

::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--color-bg); }
::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 3px; }
```

Semua token sudah di-map ke Tailwind (`tailwind.config.ts`), jadi tersedia sebagai class:
`bg-bg`, `bg-surface`, `border-border`, `text-gold`, `text-gold-muted`, `text-gold-hover`,
`text-green-text`, `text-text`, `text-text-muted`, `text-text-soft`, `font-heading`, `font-body`,
plus `animate-fade-down`.

> **Catatan konsistensi:** di halaman utama, mayoritas styling justru pakai inline
> `style={{ color: 'var(--color-gold)' }}` walaupun class `text-gold` sudah tersedia. Kedua pola muncul
> di file yang sama. Revamp boleh (dan sebaiknya) menyeragamkan ke class Tailwind — tidak ada test yang
> mengunci pola inline ini.

---

## 3. Struktur & komposisi halaman

```
app/layout.tsx                      # <html lang="id"> + font Amiri/DM Sans + <Toaster />
└── app/(public)/layout.tsx         # JsonLd (Organization + WebSite), VisitorTracker,
    │                               # <NavBar /> (sticky), <main class="container mx-auto px-4 py-6">,
    │                               # <WhatsAppFloatingButton /> (FAB fixed bottom-right)
    └── app/(public)/page.tsx       # <div class="max-w-6xl mx-auto">
        ├── <HeroSection />         # H1 + tagline + 3 pill statistik + 3 CTA
        ├── <PromoWebinar />        # kartu gradient besar: 3 rekaman YouTube
        ├── <SectionCards />        # H2 + grid 6 kartu navigasi
        └── <FeaturedStories />     # H2 + 3 kartu cerita jamaah (null kalau kosong)
```

**Tidak ada footer.** Halaman berhenti begitu saja di `FeaturedStories` (atau di `SectionCards` kalau
belum ada cerita yang di-*feature*). Ini gap yang paling terlihat secara struktural.

**Double container.** `layout.tsx` sudah memberi `container mx-auto px-4 py-6`, lalu `page.tsx` menambah
`max-w-6xl mx-auto`. Efeknya: konten terkunci di ~1152px dan **section full-bleed (background hero, band
warna, divider selebar layar) tidak mungkin** tanpa trik `-mx-` atau mengubah layout. Kalau desain baru
butuh full-bleed, sebutkan eksplisit — perubahannya ada di `app/(public)/layout.tsx:19`.

### Data yang tersedia di halaman

| Data | Sumber | Catatan |
|---|---|---|
| `featured` | `pilgrimStories` where `isPublished && isFeatured`, `.limit(3)` | Tanpa `orderBy` — urutan tidak deterministik |
| `isAdmin` | `session?.user?.role === 'ADMIN'` | Membuka fitur estimator yang di-gate |
| `visitorCount` | `getPublicVisitorCount()` | `number \| null`; null = gagal baca, pill disembunyikan |

Angka komunitas hard-coded di `lib/stats/community.ts`:
`COMMUNITY_SIZE = "4.500+"`, `PILGRIMS_HELPED = "3.500+"`, visitor count ditambah offset promosi `+100`.

---

## 4. Source code lengkap

### 4.1 `app/(public)/page.tsx`

```tsx
import { db } from '@/lib/db'
import { pilgrimStories } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { HeroSection } from '@/components/home/HeroSection'
import { PromoWebinar } from '@/components/home/PromoWebinar'
import { SectionCards } from '@/components/home/SectionCards'
import { FeaturedStories } from '@/components/home/FeaturedStories'
import { getPublicVisitorCount } from '@/lib/stats/visitor-count'
import { auth } from '@/auth'

export default async function HomePage() {
  const [featured, session, visitorCount] = await Promise.all([
    db
      .select()
      .from(pilgrimStories)
      .where(and(eq(pilgrimStories.isPublished, true), eq(pilgrimStories.isFeatured, true)))
      .limit(3),
    auth(),
    getPublicVisitorCount(),
  ])

  const isAdmin = session?.user?.role === 'ADMIN'

  return (
    <div className="max-w-6xl mx-auto">
      <HeroSection isAdmin={isAdmin} visitorCount={visitorCount} />
      <PromoWebinar />
      <SectionCards isAdmin={isAdmin} />
      <FeaturedStories stories={featured} />
    </div>
  )
}
```

### 4.2 `components/home/HeroSection.tsx`

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CommunityStats } from '@/components/stats/CommunityStats'

interface HeroSectionProps {
  isAdmin?: boolean
  /**
   * Raw unique-visitor count, already resolved by the page. Null when
   * unreadable. Required on purpose — a default would let a caller drop the
   * prop and silently lose the pill with nothing failing.
   */
  visitorCount: number | null
}

export function HeroSection({ isAdmin = false, visitorCount }: HeroSectionProps) {
  return (
    <section className="py-16 text-center">
      {/*
        No webinar announcement opens the hero: the session has run, and its
        recording is offered further down the page by PromoWebinar, where every
        past session lives. Anything added back here lands ahead of the H1 in
        reading order, so it must not carry a heading of its own.
      */}
      {/*
        The H1 carries the search intent, not the brand. The brand name is
        already in the navbar, the logo, and every page title via
        title.template, so spending the strongest on-page signal on it was
        pure waste.
      */}
      <h1
        className="text-4xl font-bold mb-4"
        style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}
      >
        Panduan Umroh Mandiri: Biaya, Hotel, Visa, dan Komunitas
      </h1>
      <p className="text-lg mb-2" style={{ color: 'var(--color-text-muted)' }}>
        Serba Serbi Umroh — partner setia umroh mandirimu
      </p>
      <p className="text-sm mb-8 max-w-xl mx-auto" style={{ color: 'var(--color-text-muted)' }}>
        Rencanakan perjalanan umroh mandiri Anda dengan panduan lengkap, cerita nyata dari para jamaah,
        dan estimasi biaya yang akurat berbasis data riil.
      </p>

      <div className="mb-8">
        <CommunityStats visitorCount={visitorCount} />
      </div>

      <div className="flex gap-4 justify-center flex-wrap">
        <Link href="/cerita-jamaah">
          <Button style={{ backgroundColor: 'var(--color-gold)', color: '#0b1c12' }}>
            Lihat Cerita Jamaah
          </Button>
        </Link>
        <Link href="/komunitas">
          <Button variant="outline" style={{ borderColor: 'var(--color-gold)', color: 'var(--color-gold)' }}>
            Gabung Komunitas
          </Button>
        </Link>
        {isAdmin ? (
          <Link href="/estimate/new">
            <Button variant="outline" style={{ borderColor: 'var(--color-gold)', color: 'var(--color-gold)' }}>
              Buat Estimasi Biaya
            </Button>
          </Link>
        ) : (
          <Button
            variant="outline"
            disabled
            className="opacity-50 cursor-not-allowed text-[var(--color-text-muted)]"
            style={{ borderColor: 'var(--color-border)', cursor: 'not-allowed' }}
          >
            Buat Estimasi Biaya (Coming Soon)
          </Button>
        )}
      </div>
    </section>
  )
}
```

### 4.3 `components/stats/CommunityStats.tsx` (dipakai hero, varian `full`)

```tsx
import { Globe, Heart, Users } from "lucide-react"
import { COMMUNITY_SIZE, PILGRIMS_HELPED, formatVisitorCount } from "@/lib/stats/community"

const pillClass =
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-[5px] text-xs font-semibold text-gold"

const pillStyle = {
  background: "rgba(201, 168, 76, 0.06)",
  borderColor: "var(--color-border)",
} as const

/** Live indicator on the visitor pill. */
function PulseDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
    </span>
  )
}

// variant "full" — dipakai di hero homepage dan /layanan.
// variant "compact" — dipakai di navbar (ikon tanpa label).
export function CommunityStats({ visitorCount, variant = "full" }) {
  const displayCount = formatVisitorCount(visitorCount)

  // ... varian compact dipotong ...

  return (
    <div className="flex flex-wrap justify-center gap-2">
      <span className={pillClass} style={pillStyle}>{COMMUNITY_SIZE} Komunitas</span>
      <span className={pillClass} style={pillStyle}>{PILGRIMS_HELPED} Jamaah Terbantu</span>
      {displayCount !== null && (
        <span className={pillClass} style={pillStyle}>
          <PulseDot />
          {displayCount}+ Pengunjung
        </span>
      )}
    </div>
  )
}
```

### 4.4 `components/home/PromoWebinar.tsx`

```tsx
import Link from 'next/link'
import { Youtube, Play } from 'lucide-react'

// Newest first: the recording a visitor is most likely to have been sent here
// for is the one from the session that just ran.
//
// Every entry states its own copy, deliberately. These are archive records: the
// title and date describe the session that was recorded, so they must not be
// read from lib/webinar's campaign constants — scheduling the next webinar edits
// those, which would relabel this card with the new event while it still opened
// the old video.
const recordings = [
  {
    id: 'webinar-risiko',
    title: 'Jangan Nekat Umroh Mandiri Sebelum Tahu Risiko Ini!',
    description:
      'Rekaman webinar gratis Ahad, 2 Agustus 2026 — risiko umroh mandiri yang paling sering diabaikan, dan cara mengantisipasinya.',
    url: 'https://youtu.be/qLuAmsjkH2Y',
    thumbnail: `https://img.youtube.com/vi/qLuAmsjkH2Y/maxresdefault.jpg`,
    badge: 'Webinar',
    narasumber: null,
    narasumberSub: null,
  },
  {
    id: 'webinar',
    title: 'Webinar A-Z Umroh Mandiri',
    description: 'Panduan lengkap merencanakan dan menjalankan ibadah umroh secara mandiri — dari A sampai Z.',
    url: 'https://youtu.be/qkeENfXQg8I?si=jwabOtyEbmUil0a6',
    thumbnail: `https://img.youtube.com/vi/qkeENfXQg8I/maxresdefault.jpg`,
    badge: 'Webinar',
    narasumber: null,
    narasumberSub: null,
  },
  {
    id: 'manasik',
    title: 'Manasik Online bersama Ustadz Muhammad Singgih Pamungkas',
    description: 'Tata cara ibadah umroh sesuai sunnah, persiapan ruhani, dan tips praktis di tanah suci.',
    url: 'https://youtu.be/zw4s8_KnxKQ?si=7QrEHr6rwAxv3giV',
    thumbnail: `https://img.youtube.com/vi/zw4s8_KnxKQ/maxresdefault.jpg`,
    badge: 'Manasik Online',
    narasumber: 'Ustadz Muhammad Singgih Pamungkas',
    narasumberSub: 'S3 Universitas Islam Madinah',
  },
]

export function PromoWebinar() {
  return (
    <section className="py-6 md:py-10">
      <div
        className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-[#0e271a] via-[#0b1c12] to-[#122e1d] p-5 md:p-10 shadow-2xl transition-all duration-500 hover:shadow-[0_0_40px_rgba(201,168,76,0.15)] group"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {/* Glow effects */}
        <div className="absolute -right-24 -top-24 w-96 h-96 bg-[var(--color-gold)] opacity-[0.03] rounded-full blur-3xl pointer-events-none group-hover:opacity-[0.06] transition-opacity duration-700" />
        <div className="absolute -left-24 -bottom-24 w-96 h-96 bg-[var(--color-green)] opacity-[0.05] rounded-full blur-3xl pointer-events-none group-hover:opacity-[0.08] transition-opacity duration-700" />

        <div className="relative z-10 space-y-6 md:space-y-8">
          {/* Header */}
          <div className="space-y-2 md:space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
              <Youtube className="w-3.5 h-3.5" />
              REKAMAN SUDAH TAYANG
            </div>

            <h2
              className="text-xl sm:text-2xl md:text-3xl font-extrabold leading-tight tracking-wide font-serif"
              style={{ color: 'var(--color-gold)' }}
            >
              Rekaman Lengkap <span className="text-white">Sudah Tersedia!</span>
            </h2>

            <p className="text-sm leading-relaxed max-w-2xl" style={{ color: 'var(--color-text-muted)' }}>
              Nggak sempat hadir live? Atau mau nonton ulang? Rekamannya sudah kami upload di YouTube — tonton santai
              sambil ngopi, sambil nyatet, atau share ke keluarga yang mau umroh 🤲
            </p>
          </div>

          {/* Recording Cards */}
          {/* Three cards now: two across at tablet width would strand the third
              on a half-empty row, so the grid opens to three columns at lg. */}
          <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-5 lg:grid-cols-3">
            {recordings.map((rec) => (
              <Link
                key={rec.id}
                href={rec.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group/card relative overflow-hidden rounded-xl border transition-all duration-300 hover:border-[var(--color-gold)]/50 hover:shadow-[0_0_24px_rgba(201,168,76,0.12)] active:scale-[0.98] bg-[#0b1c12]/60 backdrop-blur-sm
                           flex flex-row md:flex-col"
                style={{ borderColor: 'var(--color-border)' }}
              >
                {/* Thumbnail — sidebar on mobile, full-width on desktop */}
                <div className="relative flex-shrink-0 w-28 sm:w-36 md:w-full md:aspect-video overflow-hidden bg-black/40 self-stretch md:self-auto">
                  <img
                    src={rec.thumbnail}
                    alt={rec.title}
                    // Every thumbnail is a full-resolution remote JPEG (~220KB) and the
                    // whole section sits below the hero, so nothing here is an LCP
                    // candidate. Deferring the fetch keeps the card count off the
                    // homepage's initial payload as more recordings are added.
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105 opacity-80 group-hover/card:opacity-100"
                  />
                  {/* Play button */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-9 h-9 sm:w-11 sm:h-11 md:w-14 md:h-14 rounded-full bg-[var(--color-gold)]/90 flex items-center justify-center shadow-lg transition-all duration-300 group-hover/card:scale-110 group-hover/card:bg-[var(--color-gold)]">
                      <Play className="w-4 h-4 md:w-6 md:h-6 text-[#0b1c12] fill-[#0b1c12] ml-0.5" />
                    </div>
                  </div>
                  {/* Badge — hidden on mobile to save space */}
                  <div className="absolute top-2 left-2 hidden sm:block md:block">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--color-gold)]/90 text-[#0b1c12]">
                      {rec.badge}
                    </span>
                  </div>
                  {/* YouTube icon */}
                  <div className="absolute bottom-2 right-2 hidden md:block">
                    <Youtube className="w-4 h-4 text-red-500 drop-shadow" />
                  </div>
                </div>

                {/* Info */}
                <div className="flex flex-col flex-1 p-3 md:p-4 gap-1 md:gap-2 min-w-0">
                  <span className="inline-block sm:hidden px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--color-gold)]/90 text-[#0b1c12] self-start">
                    {rec.badge}
                  </span>

                  <h3 className="text-xs sm:text-sm md:text-base font-bold text-white leading-snug group-hover/card:text-[var(--color-gold)] transition-colors duration-200 line-clamp-3 md:line-clamp-none">
                    {rec.title}
                  </h3>

                  <p className="text-[11px] sm:text-xs leading-relaxed hidden sm:block" style={{ color: 'var(--color-text-muted)' }}>
                    {rec.description}
                  </p>

                  {rec.narasumber && (
                    <div className="hidden sm:block">
                      <p className="text-[11px] sm:text-xs font-semibold text-[var(--color-gold)]">{rec.narasumber}</p>
                      <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{rec.narasumberSub}</p>
                    </div>
                  )}

                  <div className="mt-auto flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-[var(--color-gold)]">
                    <span>Tonton di YouTube</span>
                    <span className="transition-transform duration-200 group-hover/card:translate-x-1">→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Footer note */}
          <p className="text-[11px] sm:text-xs text-center leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
            📌 Insya Allah kegiatan seperti ini akan kami adakan rutin dan tetap{' '}
            <span className="font-semibold text-white">100% GRATIS</span>. Pantengin terus akun{' '}
            <span className="text-[var(--color-gold)]">Serba Serbi Umroh</span> biar nggak ketinggalan sesi berikutnya!
          </p>
        </div>
      </div>
    </section>
  )
}
```

### 4.5 `components/home/SectionCards.tsx`

```tsx
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Users, Hotel, Calculator, MessageCircle, ShieldCheck } from 'lucide-react'

const sections = [
  { title: 'Panduan Umroh',  description: 'Panduan lengkap tata cara umroh, manasik, dan doa dzikir',            href: '/panduan',      icon: BookOpen },
  { title: 'Cerita Jamaah',  description: 'Pengalaman nyata jamaah umroh mandiri lengkap dengan itinerary dan anggaran', href: '/cerita-jamaah', icon: Users },
  { title: 'Hotel Nusuk',    description: 'Direktori hotel dekat Masjidil Haram dan Masjid Nabawi pilihan jamaah', href: '/hotel-nusuk',  icon: Hotel },
  { title: 'Visa Umroh',     description: 'Layanan penerbitan visa umroh reguler online & Siskopatuh',            href: '/visa',         icon: ShieldCheck },
  { title: 'Komunitas',      description: 'Ajukan masuk grup WhatsApp umroh mandiri yang dicek admin',            href: '/komunitas',    icon: MessageCircle },
  { title: 'Estimasi Biaya', description: 'Hitung estimasi biaya umroh mandiri dengan AI berbasis data riil',     href: '/estimate/new', icon: Calculator, disabled: true, badge: 'Coming Soon' },
]

export function SectionCards({ isAdmin = false }: { isAdmin?: boolean }) {
  return (
    <section className="py-8">
      <h2 className="text-2xl font-bold mb-6 text-center" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}>
        Mulai Perencanaan Umroh Anda
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {sections.map((section) => {
          const Icon = section.icon
          const isDisabled = section.disabled && !isAdmin

          const CardContentComp = (
            <Card
              className={`h-full transition-colors flex flex-col justify-between ${
                isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-yellow-600 cursor-pointer'
              }`}
              style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'var(--color-border)' }}
            >
              <div>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="w-6 h-6" style={{ color: 'var(--color-gold)' }} />
                    {section.badge && !isAdmin && (
                      <Badge variant="outline" style={{ borderColor: 'var(--color-gold)', color: 'var(--color-gold)', fontSize: '9px', padding: '0 6px' }}>
                        {section.badge}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-sm font-bold" style={{ color: 'var(--color-gold)' }}>
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{section.description}</p>
                </CardContent>
              </div>
            </Card>
          )

          if (isDisabled) return <div key={section.title}>{CardContentComp}</div>
          return <Link key={section.href} href={section.href}>{CardContentComp}</Link>
        })}
      </div>
    </section>
  )
}
```

### 4.6 `components/home/FeaturedStories.tsx`

```tsx
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { PilgrimStory } from '@/lib/db/schema'

export function FeaturedStories({ stories }: { stories: PilgrimStory[] }) {
  if (stories.length === 0) return null

  return (
    <section className="py-8">
      <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}>
        Cerita Jamaah Pilihan
      </h2>
      <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
        Pengalaman nyata jamaah umroh mandiri
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stories.map((story) => (
          <Link key={story.id} href={`/cerita-jamaah/${story.slug}`}>
            <Card className="h-full hover:border-yellow-600 transition-colors cursor-pointer"
                  style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'var(--color-border)' }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm" style={{ color: 'var(--color-gold)' }}>{story.authorName}</CardTitle>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {story.departureCity}
                  {story.travelMonth ? ` · ${new Date(2024, story.travelMonth - 1).toLocaleString('id-ID', { month: 'long' })}${story.travelYear ? ` ${story.travelYear}` : ''}` : ''}
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)', fontSize: '10px' }}>
                    {story.pax} orang
                  </Badge>
                  <Badge variant="outline" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)', fontSize: '10px' }}>
                    {story.hotelTier}
                  </Badge>
                </div>
                <p className="text-sm font-semibold mt-2" style={{ color: 'var(--color-gold)' }}>
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(story.totalBudgetIdr / story.pax)}/orang
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <div className="text-center mt-6">
        <Link href="/cerita-jamaah" className="text-sm underline" style={{ color: 'var(--color-gold)' }}>
          Lihat semua cerita →
        </Link>
      </div>
    </section>
  )
}
```

### 4.7 `app/(public)/layout.tsx` (pembungkus)

```tsx
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <JsonLd data={buildOrganizationSchema()} />
      <JsonLd data={buildWebSiteSchema()} />
      <VisitorTracker />
      <NavBar />
      <main className="container mx-auto px-4 py-6">{children}</main>
      <WhatsAppFloatingButton />
    </div>
  )
}
```

---

## 5. Konteks produk yang tidak terlihat dari kode halaman

Halaman utama ini **bukan** peta lengkap situs. Yang perlu diketahui perancang:

**Layanan komersial (sumber pendapatan) — `lib/services/catalog.ts`, tampil di mega menu navbar & `/layanan`:**

| Layanan | Href | Harga tampil |
|---|---|---|
| Visa Umroh | `/visa` | Mulai USD 165 |
| Badalin — Badal Umroh (**BARU**) | `/badalin` | dari `badalinPriceShort` |
| Sewa Transportasi | `/transportasi` | Mulai SAR 170 |
| Booking Hotel | `/hotel-nusuk` | Mulai Rp 900 rb/malam |
| Jasa Booking HHR (kereta cepat) | WhatsApp | +Rp 100 rb/orang |
| Muthowwif | WhatsApp | Mulai Rp 1,4 jt/sesi |

**Dari 6 layanan ini, halaman utama hanya menyinggung 2 (Visa, Hotel Nusuk) — dan itupun sebagai kartu
navigasi biasa, bukan sebagai layanan berharga. Tidak ada satu pun link ke `/layanan` di halaman utama.**

Halaman publik lain yang ada tapi tidak muncul di `/`: `/layanan`, `/badalin`, `/transportasi`, `/faq`,
`/webinar-umroh-mandiri`.

Nomor WhatsApp admin (dipakai FAB dan semua CTA layanan): `6285161134844`.

---

## 6. Temuan masalah konkret

### A. Struktur & hierarki

1. **Bobot visual terbalik.** `PromoWebinar` adalah blok paling ramai di halaman — kartu gradient
   `rounded-2xl`, dua glow blur, `shadow-2xl`, badge merah "REKAMAN SUDAH TAYANG", tiga thumbnail
   YouTube besar (`PromoWebinar.tsx:48-55`) — dan ia duduk tepat di bawah hero, **di atas** grid navigasi
   utama. Padahal isinya arsip rekaman (konten sekunder), sedangkan `SectionCards` — yang menjawab
   "situs ini buat apa" — jauh lebih sunyi. Pengunjung baru melihat arsip webinar sebelum melihat peta situs.
2. **Halaman utama mengulang dirinya sendiri.** Ketiga CTA hero (`Cerita Jamaah`, `Komunitas`,
   `Estimasi Biaya` — `HeroSection.tsx:48-75`) semuanya muncul lagi sebagai kartu di `SectionCards`
   beberapa ratus piksel di bawahnya. Tidak ada tujuan baru yang ditambahkan CTA hero.
3. **Tidak ada footer.** `app/(public)/layout.tsx:19-20` — setelah `<main>` langsung FAB WhatsApp.
   Tidak ada navigasi sekunder, kontak, tentang kami, sosial media, atau info legal. Untuk situs konten
   + layanan berbayar, ini gap kepercayaan sekaligus gap internal-linking (SEO).
4. **Halaman bisa berakhir mendadak.** `FeaturedStories.tsx:11` — `if (stories.length === 0) return null`.
   Kalau belum ada cerita ber-*flag* `isFeatured`, halaman berhenti di grid kartu tanpa penutup dan tanpa
   *empty state*. Perlu keputusan desain: fallback konten, atau memang boleh hilang.
5. **Layanan berbayar tidak punya pintu masuk.** Lihat §5 — enam layanan komersial hanya bisa dicapai
   lewat mega menu navbar. Halaman utama tidak menyebut `/layanan` sama sekali.
6. **Ritme spasi tidak konsisten**: `py-16` (hero) → `py-6 md:py-10` (promo) → `py-8` (cards) → `py-8`
   (stories). Tidak ada pembatas visual apa pun antar-section (tidak ada divider, tidak ada pergantian
   background) — semuanya mengambang di `--color-bg` yang sama.
7. **Alignment tidak konsisten**: hero `text-center`, judul `SectionCards` center, judul `FeaturedStories`
   rata kiri, footer note `PromoWebinar` center. Tidak ada aturan yang bisa dibaca.

### B. Grid & responsivitas

8. **`lg:grid-cols-6` terlalu sempit.** `SectionCards.tsx:57` — enam kartu sejajar di dalam container
   `max-w-6xl` (1152px) dikurangi padding dan gap → tiap kartu hanya ~160-170px. Deskripsi seperti
   *"Direktori hotel dekat Masjidil Haram dan Masjid Nabawi pilihan jamaah"* pada `text-xs` akan wrap
   5-6 baris di kolom sesempit itu. Lompatan kolomnya juga kasar: `1 → 2 → 3 → 6`, tanpa langkah 4 atau 5.
9. **H1 tidak responsif.** `HeroSection.tsx:31` — `text-4xl` (36px) tetap di semua lebar layar. Di viewport
   375px, judul 7 kata itu jadi ±4 baris yang memakan hampir seluruh layar pertama. Bandingkan dengan
   `PromoWebinar.tsx:66` yang sudah benar: `text-xl sm:text-2xl md:text-3xl`.
10. **Kartu cerita hilang informasi di mobile.** `FeaturedStories.tsx:21` — `md:grid-cols-3` jadi satu
    kolom di bawah 768px; tiap kartu isinya cuma nama + kota + 2 badge + harga, sehingga di mobile
    tampil sebagai tiga blok pendek yang nyaris identik.
11. **Ukuran teks di bawah nyaman baca.** `text-[10px]` dan `text-[11px]` muncul di beberapa tempat
    (`PromoWebinar.tsx:117,139,150,156,167`; `FeaturedStories.tsx:39,42` lewat `fontSize: '10px'`).
    Di layar HP ini terlalu kecil, apalagi dengan warna `--color-text-muted`.

### C. State & kontrol

12. **Tombol mati di baris CTA utama.** `HeroSection.tsx:66-74` — untuk non-admin, CTA ketiga adalah
    tombol `disabled` "Buat Estimasi Biaya (Coming Soon)" dengan `opacity-50`. Sepertiga baris aksi utama
    halaman adalah kontrol yang tidak bisa diklik dan tidak menjelaskan kapan tersedia.
13. **"Coming Soon" muncul dua kali** — di hero (poin 12) dan di kartu `SectionCards` (`SectionCards.tsx:42-43`).
    Pengulangan janji yang belum ditepati di satu halaman.
14. **Kartu disabled bukan kontrol sungguhan.** `SectionCards.tsx:100-106` — kartu disabled dibungkus
    `<div>` polos dengan `opacity-50 cursor-not-allowed`, tanpa `aria-disabled`, tanpa penjelasan, dan
    tidak fokusabel. Untuk pembaca layar, kartu itu hanya teks biasa yang tampak sama dengan yang lain.
15. **Kontras pada state disabled gagal.** `opacity-50` di atas `--color-text-muted` (#9ab39e) menghasilkan
    rasio kontras jauh di bawah 4.5:1 terhadap `--color-bg`.

### D. Konten & data

16. **Kartu cerita menampilkan penulis, bukan cerita.** `FeaturedStories.tsx:29-31` — `CardTitle` diisi
    `story.authorName`. Tidak ada judul cerita, tidak ada kutipan, tidak ada foto. Padahal *hook* terkuat
    situs ini — total biaya riil per orang — justru ditaruh paling bawah dengan `text-sm`
    (`FeaturedStories.tsx:46-48`).
17. **Pilihan cerita tidak deterministik.** `page.tsx:13-17` — query `.limit(3)` tanpa `orderBy`. Urutan
    (dan cerita mana yang muncul kalau ada >3 yang di-*feature*) ditentukan Postgres, bukan editorial.
18. **Statistik sosial tampil dua kali di layar pertama.** `CommunityStats` varian `compact` sudah ada di
    navbar, lalu varian `full` diulang di hero (`HeroSection.tsx:44-46`) — angka yang sama, dua kali,
    dalam satu viewport.
19. **Halaman utama tanpa gambar.** Satu-satunya citra di `/` adalah tiga thumbnail YouTube. Hero
    sepenuhnya teks di atas latar datar. Untuk produk perjalanan ibadah, ini kehilangan seluruh atmosfer.
20. **Thumbnail bergantung `maxresdefault.jpg`.** `PromoWebinar.tsx:19,29,38` — YouTube tidak selalu
    menyediakan resolusi ini; kalau tidak ada, yang termuat adalah placeholder abu-abu 120×90 yang
    di-`object-cover` jadi buram. Desain sebaiknya menyiapkan perlakuan fallback.

---

## 7. Batasan — jangan diubah

**Produk & konten**

- **Data `recordings` di `PromoWebinar` sengaja hard-coded per-entri.** Baca komentar di
  `PromoWebinar.tsx:4-11`: ini catatan arsip. Judul dan tanggalnya **tidak boleh** dibaca dari konstanta
  kampanye di `lib/webinar` — menjadwalkan webinar berikutnya akan mengubah konstanta itu dan membuat
  kartu ini melabeli video lama dengan acara baru. Boleh diubah tampilannya, jangan diubah sumber datanya.
- **H1 mengandung kata kunci pencarian, bukan nama brand** (`HeroSection.tsx:24-29`). Ini keputusan SEO
  yang disengaja. Boleh diubah gaya/ukurannya; jangan diganti jadi "Serba Serbi Umroh".
- **Tema dark-only.** Jangan tambahkan light mode atau palet baru.
- **Aksen tunggal `--color-gold`.** Warna merah di badge `PromoWebinar` adalah satu-satunya pengecualian
  yang ada sekarang; jangan tambah warna aksen baru tanpa alasan kuat.
- **Bahasa Indonesia**, nada hangat/kasual (lihat copy "sambil ngopi", "🤲").

**Teknis**

- **H1 harus tetap heading pertama di dokumen.** Ada test yang mengunci ini:
  `app/(public)/__tests__/page.test.tsx:58-70` mengambil semua `h1..h6` dan meng-assert elemen pertama
  adalah `H1`. Jadi apa pun yang ditambahkan di atas hero (banner pengumuman, breadcrumb) **tidak boleh
  membawa heading sendiri**.
- **Pill statistik harus tetap ada di hero, dan harus tetap hilang diam-diam saat `visitorCount === null`**
  (`page.test.tsx:45-56`). Halaman tidak boleh gagal render kalau angka pengunjung tidak terbaca.
- **`visitorCount` wajib di-pass eksplisit** ke `HeroSection` — prop ini sengaja tidak punya default
  (lihat komentar `HeroSection.tsx:7-12`).
- **`page.tsx` harus tetap server component** (memanggil `auth()` dan `db`). Interaktivitas baru → child
  client component.
- **Jangan tambah dependency animasi.** Pakai CSS transition, atau `animate-fade-down` yang sudah ada.
- **Jangan pakai breakpoint `nav:` (900px)** untuk konten halaman — itu milik navbar.
- Test yang menyentuh halaman ini: `app/(public)/__tests__/page.test.tsx`,
  `components/home/__tests__/HeroSection.test.tsx`, `components/home/__tests__/PromoWebinar.test.tsx`.
  Cek ketiganya sebelum mengubah struktur DOM.

> ⚠️ **Catatan status test (per 2026-08-03):** dua test di `app/(public)/__tests__/page.test.tsx`
> **sedang gagal** — test meng-assert `/3\.500\+ Komunitas/` sementara `COMMUNITY_SIZE` di
> `lib/stats/community.ts` sudah dinaikkan jadi `"4.500+"` (commit `15bc691` "update commity size").
> Ini kegagalan yang sudah ada sebelum revamp, bukan akibat perubahan desain. Perlu diperbaiki terpisah;
> jangan sampai dikira regresi dari pekerjaan desain.

---

## 8. Arah desain untuk didiskusikan (bukan keputusan final)

Empat arah besar — pilih satu atau kombinasi sebagai **visual thesis** sebelum mulai koding.

- **A. Balikkan urutan & bobot.** Turunkan `PromoWebinar` ke bawah `SectionCards` (atau kecilkan jadi
  strip satu baris "Rekaman terbaru →"), dan naikkan grid navigasi jadi blok utama setelah hero.
  Mengatasi temuan #1 dan #2 sekaligus.
- **B. Hero dengan atmosfer + satu CTA tunggal.** Beri hero latar bergambar/pattern geometris Islami
  (butuh keputusan full-bleed, lihat §3), pangkas jadi **satu** CTA primer + satu sekunder, dan buang
  tombol "Coming Soon" dari hero. Mengatasi #12, #13, #19, dan sebagian #2.
- **C. Grid navigasi bertingkat, bukan 6 kolom rata.** Pecah `SectionCards` jadi dua kelompok dengan
  bobot berbeda — misalnya 2-3 kartu besar untuk jalur utama (Panduan, Cerita Jamaah, Layanan) dan sisanya
  sebagai baris kartu kecil/link. Sekalian menambahkan pintu masuk ke `/layanan`. Mengatasi #5 dan #8.
- **D. Angkat "harga riil" sebagai bahasa utama kartu cerita.** Jadikan biaya per orang sebagai elemen
  paling menonjol di kartu, dengan nama jamaah dan kota sebagai atribusi di bawahnya. Mengatasi #16.

Selain itu, dua hal yang hampir pasti perlu diputuskan apa pun tesisnya:

- **Footer** — apa isinya (navigasi sekunder, layanan, kontak WhatsApp, sosial, disclaimer) dan seberapa
  padat. Lihat #3.
- **Empty state `FeaturedStories`** — kalau tidak ada cerita ber-*feature*, halaman diakhiri apa. Lihat #4.

Kandidat interaksi (semuanya CSS-only, sesuai batasan):
- Hover kartu: sudah ada `transition-colors` + `hover:border-yellow-600` — bisa diseragamkan jadi
  perlakuan gold yang sama dengan kartu `PromoWebinar` (`hover:border-[var(--color-gold)]/50` + glow).
- `animate-fade-down` (sudah ada di config) untuk masuknya section saat scroll — kalau mau, tanpa
  library observer, cukup pada elemen di atas lipatan.
- Skeleton/aspect-ratio tetap untuk thumbnail YouTube agar tidak *layout shift* (#20).

---

## 9. Pertanyaan terbuka

1. **Siapa audiens utama halaman ini** — calon jamaah yang baru mencari info (butuh edukasi + kepercayaan),
   atau jamaah yang sudah siap beli layanan (butuh jalur konversi ke `/layanan` dan WhatsApp)?
   Jawabannya menentukan apakah arah C atau B yang jadi prioritas.
2. **Apakah gate admin-only untuk `/estimate/new` akan dibuka?** Kalau ya dan dalam waktu dekat, "Coming
   Soon" bisa dipertahankan sebagai *teaser* dengan tanggal; kalau tidak, sebaiknya dihapus dari hero
   (lihat #12, #13).
3. **Boleh mengubah `app/(public)/layout.tsx` untuk mengizinkan section full-bleed?** Ini prasyarat untuk
   hero bergambar (arah B). Perubahannya berdampak ke semua halaman publik, bukan hanya `/`.
4. **Boleh menambah aset gambar** (foto Masjidil Haram/Nabawi, pattern) ke `public/`? Saat ini `public/`
   hanya berisi `logo.png`, folder `pdf`, dan `transportasi`. Perlu kepastian hak pakai gambar.
5. **Angka statistik komunitas** (`4.500+`, `3.500+`, pengunjung live) — tetap tiga pill di hero, atau
   cukup di navbar saja supaya tidak dobel (#18)?
6. **Boleh menambah komponen baru ke `components/ui/`** (mis. Accordion, Carousel) kalau desain
   membutuhkannya, atau harus memakai yang sudah ada?
