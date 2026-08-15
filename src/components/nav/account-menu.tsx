"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronDown, LayoutDashboard, LogOut, Settings } from "lucide-react"
import { MenuPanel, menuItemClass } from "./nav-dropdown"
import { adminLinks } from "./links"

function initialOf(name?: string | null, email?: string | null) {
  return (name?.trim()?.[0] ?? email?.trim()?.[0] ?? "?").toUpperCase()
}

export function AccountMenu({
  isOpen,
  onToggle,
  onNavigate,
  userName,
  userEmail,
  showAdmin,
  signOutAction,
}: {
  isOpen: boolean
  onToggle: () => void
  onNavigate: () => void
  userName?: string | null
  userEmail?: string | null
  showAdmin?: boolean
  signOutAction: () => Promise<void>
}) {
  const [isAdminOpen, setIsAdminOpen] = React.useState(false)

  // Collapse the admin group when the account menu closes, so reopening it
  // does not show a pre-expanded submenu.
  React.useEffect(() => {
    if (!isOpen) setIsAdminOpen(false)
  }, [isOpen])

  return (
    <div className="relative" data-nav-menu="account">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Menu akun"
        className="flex h-[34px] w-[34px] items-center justify-center rounded-full border text-sm font-bold text-gold"
        style={{
          background: "rgba(201,168,76,0.14)",
          borderColor: "rgba(201,168,76,0.35)",
        }}
      >
        {initialOf(userName, userEmail)}
      </button>

      {isOpen && (
        <MenuPanel align="right" width="240px">
          <div
            className="mb-1 border-b px-3 py-2.5"
            style={{ borderColor: "rgba(201,168,76,0.14)" }}
          >
            {userName && (
              <div className="text-[13px] font-semibold text-text">{userName}</div>
            )}
            {userEmail && (
              <div className="truncate text-[11px] text-text-muted">{userEmail}</div>
            )}
          </div>

          <Link href="/dashboard" onClick={onNavigate} className={menuItemClass}>
            <LayoutDashboard size={15} className="flex-shrink-0" />
            Dashboard
          </Link>

          {showAdmin && (
            <div>
              <button
                type="button"
                onClick={() => setIsAdminOpen((open) => !open)}
                aria-expanded={isAdminOpen}
                className={`${menuItemClass} justify-between`}
              >
                <span className="flex items-center gap-2.5">
                  <Settings size={15} className="flex-shrink-0" />
                  Panel Admin
                </span>
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${
                    isAdminOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {isAdminOpen && (
                <div
                  className="ml-4 border-l pl-2"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  {adminLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={onNavigate}
                      className="block rounded-[7px] px-3 py-2 text-[13px] text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          <form
            action={async () => {
              onNavigate()
              await signOutAction()
            }}
            className="mt-1 border-t pt-1"
            style={{ borderColor: "rgba(201,168,76,0.14)" }}
          >
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-[7px] px-3 py-2.5 text-sm text-danger-text transition-colors hover:bg-white/[0.04] hover:text-danger-text-hover"
            >
              <LogOut size={15} className="flex-shrink-0" />
              Keluar
            </button>
          </form>
        </MenuPanel>
      )}
    </div>
  )
}
