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
    { href: "/admin/content/stories", label: "Kelola Cerita" },
    { href: "/admin/content/hotels", label: "Kelola Hotel" },
    { href: "/admin/content/faqs", label: "Kelola FAQ" },
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
