"use client"

import Link from "next/link"
import { CommunityStats } from "@/components/stats/CommunityStats"
import { AccountMenu } from "./AccountMenu"
import { EstimateCta } from "./EstimateCta"
import { LayananPanel, LayananTrigger } from "./LayananMegaMenu"
import { MoreMenu } from "./MoreMenu"
import { useSingleOpenMenu } from "./NavDropdown"

const topLinkClass =
  "whitespace-nowrap px-3 py-[7px] text-sm text-text-muted transition-colors hover:text-text"

export function DesktopNav({
  userName,
  userEmail,
  isLoggedIn,
  isAdmin,
  showAdmin,
  visitorCount,
  signOutAction,
}: {
  userName?: string | null
  userEmail?: string | null
  isLoggedIn: boolean
  isAdmin: boolean
  showAdmin: boolean
  /** Raw unique-visitor count, resolved by NavBar. Null when unreadable. */
  visitorCount: number | null
  signOutAction: () => Promise<void>
}) {
  const { openId, toggle, close } = useSingleOpenMenu()

  return (
    <div className="hidden nav:block" data-testid="desktop-nav">
      <div className="mx-auto flex h-[60px] max-w-[1200px] items-center justify-between gap-4 px-6">
        <div className="flex min-w-0 items-center gap-7">
          <Link
            href={isLoggedIn ? "/dashboard" : "/"}
            className="flex items-baseline gap-1.5 whitespace-nowrap"
          >
            <span
              className="text-[22px] font-bold text-gold"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              SSU
            </span>
            <span className="text-[11px] tracking-[0.08em] text-text-muted">
              Serba Serbi Umroh
            </span>
          </Link>

          <div className="flex items-center gap-1">
            <div className="relative" data-nav-menu="layanan">
              <LayananTrigger
                isOpen={openId === "layanan"}
                onToggle={() => toggle("layanan")}
              />
            </div>
            <Link href="/panduan" className={topLinkClass}>
              Panduan
            </Link>
            <Link href="/komunitas" className={topLinkClass}>
              Komunitas
            </Link>
            <MoreMenu
              isOpen={openId === "more"}
              isLoggedIn={isLoggedIn}
              onToggle={() => toggle("more")}
              onNavigate={close}
            />
          </div>
        </div>

        {/* Social proof sits between the nav links and the CTA. Measured at a
            1200px container: links 561px + pills 225px + actions 324px + gaps
            needs ~1190px of viewport, so below xl the row would wrap. */}
        <div className="hidden min-w-0 flex-shrink xl:flex" data-testid="nav-stats">
          <CommunityStats visitorCount={visitorCount} variant="compact" />
        </div>

        <div className="flex flex-shrink-0 items-center gap-3">
          <EstimateCta variant="desktop" isAdmin={isAdmin} />

          {isLoggedIn ? (
            <AccountMenu
              isOpen={openId === "account"}
              onToggle={() => toggle("account")}
              onNavigate={close}
              userName={userName}
              userEmail={userEmail}
              showAdmin={showAdmin}
              signOutAction={signOutAction}
            />
          ) : (
            <Link
              href="/login"
              className="whitespace-nowrap rounded-lg border px-4 py-2 text-[13px] font-semibold text-text transition-colors hover:bg-[var(--color-surface)]"
              style={{ borderColor: "var(--color-border)" }}
            >
              Masuk
            </Link>
          )}
        </div>
      </div>

      {openId === "layanan" && (
        <div data-nav-menu="layanan">
          <LayananPanel onNavigate={close} />
        </div>
      )}
    </div>
  )
}
