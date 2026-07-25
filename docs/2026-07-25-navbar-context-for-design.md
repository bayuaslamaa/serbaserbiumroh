# Konteks Navbar & Mobile Nav — Serba Serbi Umroh (SSU)

File ini dibuat untuk di-upload ke Claude Design sebagai konteks saat merapikan navbar / mobile nav.
Isinya: stack, design token, struktur layout, **source code lengkap** semua komponen nav yang dipakai
sekarang, plus masalah yang terlihat di UI saat ini.

Tanggal snapshot: 2026-07-25 · Branch: `feat/estimate-update`

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
| Auth | NextAuth v5 beta (`auth()` dipanggil server-side di NavBar) |
| Bahasa UI | Bahasa Indonesia |
| Test | Vitest + Testing Library — ada `components/nav/__tests__/NavBar.test.tsx` |

Catatan penting untuk redesign:
- `NavBar` adalah **async Server Component** (memanggil `await auth()`), jadi tidak boleh ada hook/`"use client"` di dalamnya. Semua interaktivitas dipecah ke child client component (`MobileMenu`, `AdminDropdown`, `LayananDropdown`, `VisitorCounter`).
- Breakpoint pemisah desktop/mobile saat ini: `md` (768px). Desktop pakai `hidden md:flex`, mobile pakai `md:hidden`.

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
  --color-green: #2c6b42;
  --color-green-text: #7a9e84;
  --color-text: #f0ece0;
  --color-text-muted: #9ab39e;
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

/* Scrollbar styling */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--color-bg); }
::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 3px; }
```

Token ini di-map ke Tailwind di `tailwind.config.ts`:

```ts
theme: {
  extend: {
    colors: {
      bg: "var(--color-bg)",
      surface: "var(--color-surface)",
      border: "var(--color-border)",
      gold: "var(--color-gold)",
      "gold-muted": "var(--color-gold-muted)",
      green: "var(--color-green)",
      "green-text": "var(--color-green-text)",
      text: "var(--color-text)",
      "text-muted": "var(--color-text-muted)",
    },
    fontFamily: {
      heading: ["var(--font-heading)", "serif"],
      body: ["var(--font-body)", "sans-serif"],
    },
    borderRadius: {
      lg: "var(--radius)",
      md: "calc(var(--radius) - 2px)",
      sm: "calc(var(--radius) - 4px)",
    },
  },
}
```

Warna solid navbar yang dipakai sekarang: `rgba(11, 28, 18, 0.95)` (= `--color-bg` dengan alpha) + `backdrop-filter: blur(8px)`.
Overlay mobile menu: `rgba(11, 28, 18, 0.98)` + `blur(16px)`. Dropdown desktop: `rgba(11, 28, 18, 0.98)` + `blur(12px)`.

---

## 3. Struktur file

```
components/nav/
├── NavBar.tsx           # server component — shell + link desktop + slot mobile
├── MobileMenu.tsx       # client — hamburger + full-screen overlay (react portal)
├── LayananDropdown.tsx  # client — dropdown desktop "Layanan"
├── AdminDropdown.tsx    # client — dropdown desktop "Panel Admin"
├── VisitorCounter.tsx   # client — 3 badge statistik (komunitas/jamaah/pengunjung live)
└── __tests__/NavBar.test.tsx

app/
├── layout.tsx           # root: font + Toaster
├── (public)/layout.tsx  # <NavBar /> + <main container> + WhatsApp FAB
├── (dashboard)/layout.tsx  # <NavBar /> + <main container>
└── (admin)/layout.tsx      # <NavBar isAdmin /> + strip "Admin Panel" + <main container>
```

Navbar dirender di **3 route group** dengan wrapper yang identik:

```tsx
// app/(public)/layout.tsx
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="container mx-auto px-4 py-6">{children}</main>
      <WhatsAppFloatingButton />
    </div>
  )
}
```

---

## 4. Peta menu

**Link utama (urut kiri → kanan di desktop):**

| Label | Href | Kondisi |
|---|---|---|
| Panduan | `/panduan` | selalu |
| Cerita Jamaah | `/cerita-jamaah` | selalu |
| Hotel Nusuk | `/hotel-nusuk` | selalu |
| Layanan ▾ | — | selalu (dropdown) |
| → Visa Umroh | `/visa` | |
| → Sewa Transportasi | `/transportasi` | |
| FAQ | `/faq` | selalu |
| Komunitas | `/komunitas` | selalu |
| Webinar | `/webinar-umroh-mandiri` | selalu |
| Dashboard | `/dashboard` | hanya jika login |
| Panel Admin ▾ | — | hanya jika `showAdmin` |

**Sub-menu Panel Admin (7 item):** Kelola Harga `/admin/pricing` · Kelola User `/admin/users` · Pengajuan Komunitas `/admin/community-requests` · Kelola Cerita `/admin/content/stories` · Kelola Hotel `/admin/content/hotels` · Kelola FAQ `/admin/content/faqs` · Statistik Pengunjung `/admin/visitor-stats`

**Sisi kanan:** 3 badge statistik (`VisitorCounter`) → tombol **Buat Estimasi** (aktif hanya untuk ADMIN, selain itu disabled "Coming Soon") → email user + tombol **Keluar** (atau **Masuk** kalau belum login).

Total di viewport desktop: 8–10 link teks + 2 dropdown + 3 badge + 1 tombol CTA + email + 1 tombol auth — **inilah sumber kepadatan navbar sekarang.**

---

## 5. Source code lengkap

### 5.1 `components/nav/NavBar.tsx`

```tsx
import Link from "next/link"
import { auth, signOut } from "@/auth"
import { Button } from "@/components/ui/button"
import { AdminDropdown } from "./AdminDropdown"
import { LayananDropdown } from "./LayananDropdown"
import { MobileMenu } from "./MobileMenu"
import { VisitorCounter } from "./VisitorCounter"

export async function NavBar({ isAdmin = false }: { isAdmin?: boolean }) {
  const session = await auth()
  const user = session?.user
  const showAdmin = isAdmin || user?.role === "ADMIN"

  async function handleSignOut() {
    "use server"
    await signOut({ redirectTo: "/login" })
  }

  return (
    <nav
      className="sticky top-0 z-50 border-b"
      style={{
        background: "rgba(11, 28, 18, 0.95)",
        borderColor: "var(--color-border)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link
            href={user ? "/dashboard" : "/"}
            className="flex items-center gap-2 font-bold text-lg"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
          >
            <img src="/logo.png" alt="SSU Logo" className="h-8 w-12 object-contain" />

          </Link>
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/panduan"
              className="text-sm transition-colors hover:text-[var(--color-text)]"
              style={{ color: "var(--color-text-muted)" }}
            >
              Panduan
            </Link>
            <Link
              href="/cerita-jamaah"
              className="text-sm transition-colors hover:text-[var(--color-text)]"
              style={{ color: "var(--color-text-muted)" }}
            >
              Cerita Jamaah
            </Link>
            <Link
              href="/hotel-nusuk"
              className="text-sm transition-colors hover:text-[var(--color-text)]"
              style={{ color: "var(--color-text-muted)" }}
            >
              Hotel Nusuk
            </Link>
            <LayananDropdown />
            <Link
              href="/faq"
              className="text-sm transition-colors hover:text-[var(--color-text)]"
              style={{ color: "var(--color-text-muted)" }}
            >
              FAQ
            </Link>
            <Link
              href="/komunitas"
              className="text-sm transition-colors hover:text-[var(--color-text)]"
              style={{ color: "var(--color-text-muted)" }}
            >
              Komunitas
            </Link>
            <Link
              href="/webinar-umroh-mandiri"
              className="text-sm transition-colors hover:text-[var(--color-text)]"
              style={{ color: "var(--color-text-muted)" }}
            >
              Webinar
            </Link>
            {user && (
              <Link
                href="/dashboard"
                className="text-sm transition-colors hover:text-[var(--color-text)]"
                style={{ color: "var(--color-text-muted)" }}
              >
                Dashboard
              </Link>
            )}
            {showAdmin && <AdminDropdown />}
          </div>
        </div>

        {/* Desktop navigation right aligned items */}
        <div className="hidden md:flex items-center gap-3">
          <VisitorCounter />
          {user?.role === "ADMIN" ? (
            <Link href="/estimate/new">
              <Button size="sm">Buat Estimasi</Button>
            </Link>
          ) : (
            <Button
              size="sm"
              disabled
              className="opacity-50 cursor-not-allowed text-[var(--color-text-muted)] bg-[var(--color-surface)] border border-[var(--color-border)]"
              style={{ cursor: 'not-allowed' }}
            >
              Buat Estimasi (Coming Soon)
            </Button>
          )}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {user.email && (
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {user.email}
                  </span>
                )}
                <form action={handleSignOut}>
                  <Button type="submit" variant="ghost" size="sm">
                    Keluar
                  </Button>
                </form>
              </>
            ) : (
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Masuk
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile: scrollable stats badges + pinned hamburger button */}
        <div className="flex items-center gap-2 md:hidden min-w-0">
          <div className="overflow-x-auto flex-1 min-w-0 scrollbar-none" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            <VisitorCounter />
          </div>
          <div className="flex-shrink-0">
            <MobileMenu
              userEmail={user?.email}
              showAdmin={showAdmin}
              isAdmin={user?.role === "ADMIN"}
              isLoggedIn={!!user}
              signOutAction={handleSignOut}
            />
          </div>
        </div>
      </div>
    </nav>
  )
}
```

### 5.2 `components/nav/MobileMenu.tsx`

```tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { createPortal } from "react-dom"
import { Menu, X, ChevronDown, Settings, LogOut, FileText, Compass, Users, HelpCircle, Hotel, PlusCircle, MessageCircle, Briefcase, CalendarDays } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MobileMenuProps {
  userEmail?: string | null
  showAdmin?: boolean
  isAdmin?: boolean
  isLoggedIn?: boolean
  signOutAction: () => Promise<void>
}

export function MobileMenu({ userEmail, showAdmin, isAdmin = false, isLoggedIn, signOutAction }: MobileMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [isAdminOpen, setIsAdminOpen] = React.useState(false)
  const [isLayananOpen, setIsLayananOpen] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent scroll when menu is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  const adminLinks = [
    { href: "/admin/pricing", label: "Kelola Harga" },
    { href: "/admin/users", label: "Kelola User" },
    { href: "/admin/community-requests", label: "Pengajuan Komunitas" },
    { href: "/admin/content/stories", label: "Kelola Cerita" },
    { href: "/admin/content/hotels", label: "Kelola Hotel" },
    { href: "/admin/content/faqs", label: "Kelola FAQ" },
    { href: "/admin/visitor-stats", label: "Statistik Pengunjung" },
  ]

  const triggerButton = (
    <button
      onClick={() => setIsOpen(true)}
      className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
      aria-label="Open Menu"
    >
      <Menu size={24} />
    </button>
  )

  if (!mounted) {
    return <div className="md:hidden">{triggerButton}</div>
  }

  return (
    <div className="md:hidden">
      {triggerButton}

      {isOpen && createPortal(
        <div
          className="fixed inset-0 z-[999] flex flex-col transition-all duration-300"
          style={{
            background: "rgba(11, 28, 18, 0.98)",
            backdropFilter: "blur(16px)",
          }}
        >
          {/* Header */}
          <div className="flex h-14 items-center justify-between px-4 border-b border-[var(--color-border)]">
            <Link
              href={isLoggedIn ? "/dashboard" : "/"}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 font-bold text-lg"
              style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
            >
              <img src="/logo.png" alt="SSU Logo" className="h-8 w-auto object-contain" />
            </Link>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              aria-label="Close Menu"
            >
              <X size={24} />
            </button>
          </div>

          {/* Links */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
            <div className="flex flex-col space-y-4">
              <Link
                href="/panduan"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 text-lg font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] py-2 border-b border-[var(--color-surface)]"
              >
                <Compass size={18} /> Panduan
              </Link>
              <Link
                href="/cerita-jamaah"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 text-lg font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] py-2 border-b border-[var(--color-surface)]"
              >
                <Users size={18} /> Cerita Jamaah
              </Link>
              <Link
                href="/hotel-nusuk"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 text-lg font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] py-2 border-b border-[var(--color-surface)]"
              >
                <Hotel size={18} /> Hotel Nusuk
              </Link>

              {/* Layanan Group */}
              <div className="flex flex-col">
                <button
                  onClick={() => setIsLayananOpen(!isLayananOpen)}
                  className="flex items-center justify-between w-full text-lg font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] py-2 border-b border-[var(--color-surface)]"
                >
                  <span className="flex items-center gap-3">
                    <Briefcase size={18} /> Layanan
                  </span>
                  <ChevronDown size={18} className={`transition-transform duration-200 ${isLayananOpen ? "rotate-180" : ""}`} />
                </button>
                {isLayananOpen && (
                  <div className="pl-6 mt-2 space-y-2 border-l border-[var(--color-border)] ml-2">
                    <Link
                      href="/visa"
                      onClick={() => setIsOpen(false)}
                      className="block py-2 text-base text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                    >
                      Visa Umroh
                    </Link>
                    <Link
                      href="/transportasi"
                      onClick={() => setIsOpen(false)}
                      className="block py-2 text-base text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                    >
                      Sewa Transportasi
                    </Link>
                  </div>
                )}
              </div>
              <Link
                href="/faq"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 text-lg font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] py-2 border-b border-[var(--color-surface)]"
              >
                <HelpCircle size={18} /> FAQ
              </Link>
              <Link
                href="/komunitas"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 text-lg font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] py-2 border-b border-[var(--color-surface)]"
              >
                <MessageCircle size={18} /> Komunitas
              </Link>
              <Link
                href="/webinar-umroh-mandiri"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 text-lg font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] py-2 border-b border-[var(--color-surface)]"
              >
                <CalendarDays size={18} /> Webinar
              </Link>
              {isLoggedIn && (
                <Link
                  href="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 text-lg font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] py-2 border-b border-[var(--color-surface)]"
                >
                  <FileText size={18} /> Dashboard
                </Link>
              )}

              {/* Admin Panel Group */}
              {showAdmin && (
                <div className="flex flex-col">
                  <button
                    onClick={() => setIsAdminOpen(!isAdminOpen)}
                    className="flex items-center justify-between w-full text-lg font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] py-2 border-b border-[var(--color-surface)]"
                  >
                    <span className="flex items-center gap-3">
                      <Settings size={18} /> Panel Admin
                    </span>
                    <ChevronDown size={18} className={`transition-transform duration-200 ${isAdminOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isAdminOpen && (
                    <div className="pl-6 mt-2 space-y-2 border-l border-[var(--color-border)] ml-2">
                      {adminLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setIsOpen(false)}
                          className="block py-2 text-base text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-6 space-y-4">
              {isAdmin ? (
                <Link href="/estimate/new" onClick={() => setIsOpen(false)}>
                  <Button className="w-full flex items-center justify-center gap-2" size="lg">
                    <PlusCircle size={18} /> Buat Estimasi
                  </Button>
                </Link>
              ) : (
                <Button
                  className="w-full flex items-center justify-center gap-2 opacity-50 cursor-not-allowed text-[var(--color-text-muted)] bg-[var(--color-surface)] border border-[var(--color-border)]"
                  size="lg"
                  disabled
                  style={{ cursor: 'not-allowed' }}
                >
                  <PlusCircle size={18} /> Buat Estimasi (Coming Soon)
                </Button>
              )}

              {isLoggedIn ? (
                <div className="flex flex-col gap-3 pt-4 border-t border-[var(--color-border)]">
                  {userEmail && (
                    <span className="text-sm text-[var(--color-text-muted)] text-center break-all">
                      {userEmail}
                    </span>
                  )}
                  <form
                    action={async () => {
                      setIsOpen(false)
                      await signOutAction()
                    }}
                    className="w-full"
                  >
                    <Button type="submit" variant="ghost" className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-red-300 hover:bg-[var(--color-surface)]" size="lg">
                      <LogOut size={18} /> Keluar
                    </Button>
                  </form>
                </div>
              ) : (
                <Link href="/login" onClick={() => setIsOpen(false)}>
                  <Button variant="outline" className="w-full" size="lg">
                    Masuk
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
```

### 5.3 `components/nav/LayananDropdown.tsx`

```tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, Briefcase } from "lucide-react"

export function LayananDropdown() {
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const isActive = pathname === "/visa" || pathname === "/transportasi"

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const layananLinks = [
    { href: "/visa", label: "Visa Umroh" },
    { href: "/transportasi", label: "Sewa Transportasi" },
  ]

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-sm font-medium transition-colors duration-200 outline-none focus:outline-none py-2"
        style={{ color: isOpen || isActive ? "var(--color-gold)" : "var(--color-text-muted)" }}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Briefcase size={14} className={isActive ? "text-[var(--color-gold)]" : "text-[var(--color-text-muted)]"} />
        <span className="hover:text-[var(--color-text)] transition-colors duration-200">Layanan</span>
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          style={{ color: isOpen || isActive ? "var(--color-gold)" : "var(--color-text-muted)" }}
        />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 mt-1 w-48 rounded-md shadow-xl border z-50 overflow-hidden transform origin-top-left transition-all duration-200"
          style={{
            background: "rgba(11, 28, 18, 0.98)",
            borderColor: "var(--color-border)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="py-1">
            {layananLinks.map((link) => {
              const isLinkActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-sm transition-colors duration-150"
                  style={{
                    color: isLinkActive ? "var(--color-gold)" : "var(--color-text-muted)",
                    backgroundColor: isLinkActive ? "rgba(201, 168, 76, 0.08)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isLinkActive) {
                      e.currentTarget.style.color = "var(--color-text)"
                      e.currentTarget.style.backgroundColor = "var(--color-surface)"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isLinkActive) {
                      e.currentTarget.style.color = "var(--color-text-muted)"
                      e.currentTarget.style.backgroundColor = "transparent"
                    }
                  }}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
```

### 5.4 `components/nav/AdminDropdown.tsx`

Struktur **identik** dengan `LayananDropdown` (duplikasi kode — kandidat kuat untuk digabung jadi satu `NavDropdown` generik). Bedanya hanya:
- ikon `Settings` (bukan `Briefcase`), label `"Panel Admin"`
- `isActive = pathname?.startsWith("/admin")`
- `adminLinks` berisi 7 item (lihat §4)

```tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, Settings } from "lucide-react"

export function AdminDropdown() {
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const isActive = pathname?.startsWith("/admin")

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const adminLinks = [
    { href: "/admin/pricing", label: "Kelola Harga" },
    { href: "/admin/users", label: "Kelola User" },
    { href: "/admin/community-requests", label: "Pengajuan Komunitas" },
    { href: "/admin/content/stories", label: "Kelola Cerita" },
    { href: "/admin/content/hotels", label: "Kelola Hotel" },
    { href: "/admin/content/faqs", label: "Kelola FAQ" },
    { href: "/admin/visitor-stats", label: "Statistik Pengunjung" },
  ]

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-sm font-medium transition-colors duration-200 outline-none focus:outline-none py-2"
        style={{ color: isOpen || isActive ? "var(--color-gold)" : "var(--color-text-muted)" }}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Settings size={14} className={isActive ? "text-[var(--color-gold)]" : "text-[var(--color-text-muted)]"} />
        <span className="hover:text-[var(--color-text)] transition-colors duration-200">Panel Admin</span>
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          style={{ color: isOpen || isActive ? "var(--color-gold)" : "var(--color-text-muted)" }}
        />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 mt-1 w-48 rounded-md shadow-xl border z-50 overflow-hidden transform origin-top-left transition-all duration-200"
          style={{
            background: "rgba(11, 28, 18, 0.98)",
            borderColor: "var(--color-border)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="py-1">
            {adminLinks.map((link) => {
              const isLinkActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-sm transition-colors duration-150"
                  style={{
                    color: isLinkActive ? "var(--color-gold)" : "var(--color-text-muted)",
                    backgroundColor: isLinkActive ? "rgba(201, 168, 76, 0.08)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isLinkActive) {
                      e.currentTarget.style.color = "var(--color-text)"
                      e.currentTarget.style.backgroundColor = "var(--color-surface)"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isLinkActive) {
                      e.currentTarget.style.color = "var(--color-text-muted)"
                      e.currentTarget.style.backgroundColor = "transparent"
                    }
                  }}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
```

### 5.5 `components/nav/VisitorCounter.tsx`

3 badge pill emas: **3.500+ Komunitas**, **3.000+ Jamaah**, dan counter live **N+ Pengunjung** (fetch `/api/visitor`, POST untuk halaman publik = tracking, GET untuk halaman blacklist).

```tsx
"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Users, Heart, Globe } from "lucide-react"

// Paths that are not counted as visitor pageviews
const BLACKLIST_PATHS = ["/admin", "/dashboard", "/login", "/api"]

// Static community stats (update these values as the community grows)
const COMMUNITY_SIZE = "3.500+"
const PILGRIMS_HELPED = "3.000+"

function StatBadge({
  icon,
  value,
  label,
  className = "",
}: {
  icon: React.ReactNode
  value: string
  label: string
  className?: string
}) {
  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border cursor-default select-none transition-all duration-300 hover:bg-[rgba(201,168,76,0.1)] ${className}`}
      style={{
        background: "rgba(201, 168, 76, 0.05)",
        borderColor: "var(--color-border)",
        color: "var(--color-gold)",
      }}
      title={`${value} ${label}`}
    >
      {icon}
      <span className="whitespace-nowrap">
        {value} {label}
      </span>
    </div>
  )
}

export function VisitorCounter() {
  const pathname = usePathname()
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    const isBlacklisted = BLACKLIST_PATHS.some((path) => pathname?.startsWith(path))

    // Track (POST) for public pages, otherwise just fetch stats (GET)
    const method = isBlacklisted ? "GET" : "POST"
    const body = isBlacklisted ? undefined : JSON.stringify({ path: pathname })
    const headers = isBlacklisted ? undefined : { "Content-Type": "application/json" }

    fetch("/api/visitor", { method, body, headers })
      .then((res) => {
        if (!res.ok) throw new Error("Gagal memuat statistik")
        return res.json()
      })
      .then((data) => {
        if (data.success) setCount(data.uniqueVisitors)
      })
      .catch((err) => {
        console.error("Error fetching visitor count:", err)
      })
  }, [pathname])

  // Baseline offset for promotional purposes
  const BASELINE_OFFSET = 100
  const displayCount = count !== null ? count + BASELINE_OFFSET : null

  return (
    <div className="flex items-center gap-2 w-max">
      <StatBadge icon={<Users size={12} />} value={COMMUNITY_SIZE} label="Komunitas" />
      <StatBadge icon={<Heart size={12} />} value={PILGRIMS_HELPED} label="Jamaah" />

      {/* Live visitor counter — always visible */}
      {displayCount === null ? (
        // Loading skeleton to avoid layout shift
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border animate-pulse"
          style={{
            background: "rgba(201, 168, 76, 0.03)",
            borderColor: "rgba(201, 168, 76, 0.1)",
            width: "115px",
            height: "26px",
          }}
        />
      ) : (
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all duration-300 hover:bg-[rgba(201,168,76,0.12)] cursor-default select-none"
          style={{
            background: "rgba(201, 168, 76, 0.06)",
            borderColor: "var(--color-border)",
            color: "var(--color-gold)",
          }}
          title={`${displayCount.toLocaleString("id-ID")}+ teman umroh telah berkunjung`}
        >
          {/* Live pulse indicator */}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <Globe size={12} className="text-[var(--color-gold)]" />
          <span className="whitespace-nowrap">
            {displayCount.toLocaleString("id-ID")}+ Pengunjung
          </span>
        </div>
      )}
    </div>
  )
}
```

### 5.6 `components/ui/button.tsx` (dipakai navbar)

```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-gold)] text-[var(--color-bg)] hover:bg-[var(--color-gold-muted)] focus-visible:ring-[var(--color-gold)]",
        destructive: "bg-red-800 text-white hover:bg-red-700 focus-visible:ring-red-700",
        outline: "border border-[var(--color-border)] bg-transparent text-[var(--color-text)] hover:bg-[var(--color-surface)]",
        secondary: "bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-border)]",
        ghost: "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]",
        link: "text-[var(--color-gold)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-md px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)
```

---

## 6. Masalah yang terlihat di UI sekarang (dari screenshot)

**Desktop:**
1. **Navbar overflow / terlalu padat.** 9 item nav + 3 badge + CTA + email + tombol keluar tidak muat di satu baris — email user terpotong (`bayuaslamaa@gma…`) dan ada elemen yang keluar viewport di kanan.
2. **Wrapping tidak sengaja.** Label dua kata ("Cerita Jamaah", "Hotel Nusuk", "Panel Admin") membungkus jadi dua baris karena ruang sempit, bikin tinggi baris tidak rata padahal container `h-14` fixed.
3. **Badge statistik makan ruang besar** (3 pill dengan teks penuh) tapi bukan aksi utama.
4. **Tidak ada active state** untuk link biasa (hanya dropdown yang punya `isActive`) — user tidak tahu sedang di halaman mana.
5. **Dropdown Layanan** tidak punya animasi masuk (class transition ada tapi tanpa state awal), dan tidak menutup saat route berubah.

**Mobile:**
6. **Logo gagal render** di header overlay mobile menu — yang tampil alt text `SSU Logo` dengan ikon broken image (`h-8 w-auto` pada `/logo.png`).
7. Daftar menu mobile **panjang sekali** (10 item + 2 grup collapsible + 7 sub-item admin) — perlu grouping/section header.
8. Pemisah antar item pakai `border-b border-[var(--color-surface)]` yang hampir tidak terlihat (`rgba(255,255,255,0.03)`).
9. Badge statistik di navbar mobile pakai horizontal scroll — kompetisi ruang dengan hamburger, dan tidak ada indikator bisa di-scroll.

---

## 7. Batasan yang harus dijaga saat redesign

- `NavBar` **harus tetap server component async** (tidak boleh `"use client"`, tidak boleh hook). Interaktivitas → child client component.
- `signOut` dipanggil lewat **server action** (`handleSignOut`) yang di-pass sebagai prop ke `MobileMenu` — pola ini harus dipertahankan.
- Overlay mobile pakai `createPortal(..., document.body)` + guard `mounted` untuk menghindari hydration mismatch — perlu dipertahankan kalau tetap pakai portal.
- Body scroll lock saat menu terbuka sudah ada — jangan hilang.
- Test `components/nav/__tests__/NavBar.test.tsx` mengecek `getByRole("link", { name: ... })` untuk: Panduan, Cerita Jamaah, Hotel Nusuk, FAQ, Komunitas (`href="/komunitas"`), Webinar (`href="/webinar-umroh-mandiri"`), dan `getByRole("navigation")`. **Semua label & href ini harus tetap ada sebagai `<a>` yang ter-render di DOM** (kalau disembunyikan di balik dropdown yang belum dibuka, test akan gagal).
- Semua warna harus lewat CSS variable, bukan hex literal — kecuali overlay `rgba(11,28,18,…)` yang sudah jadi kebiasaan di codebase (boleh diseragamkan jadi variable baru).
- Bahasa UI: Indonesia.
