"use client"

import * as React from "react"
import Link from "next/link"
import { createPortal } from "react-dom"
import { Menu, X, ChevronDown, Settings, LogOut, FileText, Compass, Users, HelpCircle, Hotel, PlusCircle, MessageCircle, Briefcase } from "lucide-react"
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
