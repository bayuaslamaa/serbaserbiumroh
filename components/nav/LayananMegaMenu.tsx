"use client"

import Link from "next/link"
import { ArrowRight, ChevronDown } from "lucide-react"
import { MegaPanel } from "./NavDropdown"
import {
  isExternalHref,
  serviceCardTreatment,
  services,
} from "@/lib/services/catalog"

/**
 * The trigger and the panel render in different places — the trigger sits in
 * the nav's left group, the panel is full-bleed against the sticky <nav> — so
 * they are exported separately rather than as one subtree.
 */
export function LayananTrigger({
  isOpen,
  onToggle,
}: {
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-haspopup="true"
      className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-[7px] text-sm font-semibold text-gold transition-colors"
      style={{
        background: isOpen ? "rgba(201,168,76,0.1)" : "rgba(201,168,76,0.05)",
        borderColor: isOpen
          ? "var(--color-gold-muted)"
          : "rgba(201,168,76,0.25)",
      }}
    >
      Layanan
      <ChevronDown
        size={14}
        className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
      />
    </button>
  )
}

export function LayananPanel({ onNavigate }: { onNavigate: () => void }) {
  return (
    <MegaPanel>
      <div className="mx-auto max-w-[1200px] p-6">
        <div className="grid grid-cols-3 gap-3">
          {services.map((service) => {
            const Icon = service.icon
            const external = isExternalHref(service.href)

            return (
              <Link
                key={service.id}
                href={service.href}
                onClick={onNavigate}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
                className="flex items-start gap-3.5 rounded-[10px] border p-3.5 transition-colors hover:border-[rgba(201,168,76,0.4)] hover:bg-[rgba(201,168,76,0.08)]"
                style={serviceCardTreatment(service.isNew)}
              >
                <span
                  className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-[9px] border"
                  style={{
                    background: "rgba(201,168,76,0.1)",
                    borderColor: "rgba(201,168,76,0.25)",
                  }}
                >
                  <Icon size={19} className="text-gold" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-text">
                      {service.name}
                    </span>
                    {service.isNew && (
                      <span className="rounded-full bg-gold px-[7px] py-0.5 text-[10px] font-bold tracking-[0.06em] text-bg">
                        BARU
                      </span>
                    )}
                  </span>
                  <span className="mt-[3px] block text-xs leading-[1.45] text-text-muted">
                    {service.description}
                  </span>
                  <span className="mt-1.5 block text-xs font-bold text-gold">
                    {service.price}
                  </span>
                </span>
              </Link>
            )
          })}
        </div>

        <div
          className="mt-4 flex items-center justify-between border-t pt-3.5"
          style={{ borderColor: "rgba(201,168,76,0.14)" }}
        >
          <span className="text-xs text-text-muted">
            Butuh bantuan memilih? Konsultasi gratis via WhatsApp.
          </span>
          <Link
            href="/layanan"
            onClick={onNavigate}
            className="flex items-center gap-1.5 text-[13px] font-bold text-gold hover:text-gold-hover"
          >
            Lihat semua layanan
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </MegaPanel>
  )
}
