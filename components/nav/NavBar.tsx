import Link from "next/link"
import { auth, signOut } from "@/auth"
import { Button } from "@/components/ui/button"
import { AdminDropdown } from "./AdminDropdown"
import { MobileMenu } from "./MobileMenu"

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
            className="font-bold text-lg"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
          >
            🕋 Umroh Estimator
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
            <Link
              href="/faq"
              className="text-sm transition-colors hover:text-[var(--color-text)]"
              style={{ color: "var(--color-text-muted)" }}
            >
              FAQ
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
          <Button
            size="sm"
            disabled
            className="opacity-50 cursor-not-allowed text-[var(--color-text-muted)] bg-[var(--color-surface)] border border-[var(--color-border)]"
            style={{ cursor: 'not-allowed' }}
          >
            Buat Estimasi (Coming Soon)
          </Button>
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

        {/* Mobile menu trigger */}
        <MobileMenu
          userEmail={user?.email}
          showAdmin={showAdmin}
          isLoggedIn={!!user}
          signOutAction={handleSignOut}
        />
      </div>
    </nav>
  )
}

