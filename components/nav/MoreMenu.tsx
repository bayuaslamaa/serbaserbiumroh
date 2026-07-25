"use client"

import Link from "next/link"
import { ChevronDown } from "lucide-react"
import { MenuPanel, menuItemClass } from "./NavDropdown"
import { moreLinks } from "./links"

export function MoreMenu({
  isOpen,
  onToggle,
  onNavigate,
}: {
  isOpen: boolean
  onToggle: () => void
  onNavigate: () => void
}) {
  return (
    <div className="relative" data-nav-menu="more">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center gap-1.5 whitespace-nowrap px-3 py-[7px] text-sm text-text-muted transition-colors hover:text-text"
      >
        Lainnya
        <ChevronDown
          size={13}
          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <MenuPanel width="220px">
          {moreLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onNavigate}
                className={menuItemClass}
              >
                <Icon size={15} className="flex-shrink-0" />
                {link.label}
              </Link>
            )
          })}
        </MenuPanel>
      )}
    </div>
  )
}
