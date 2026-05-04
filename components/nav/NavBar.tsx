import Link from "next/link"
import { auth, signOut } from "@/auth"
import { Button } from "@/components/ui/button"

export async function NavBar({ isAdmin = false }: { isAdmin?: boolean }) {
  const session = await auth()
  const user = session?.user
  const showAdmin = isAdmin || user?.role === "ADMIN"

  return (
    <nav
      className="sticky top-0 z-40 border-b"
      style={{
        background: "rgba(11, 28, 18, 0.95)",
        borderColor: "var(--color-border)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
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
              href="/dashboard"
              className="text-sm transition-colors hover:text-[var(--color-text)]"
              style={{ color: "var(--color-text-muted)" }}
            >
              Dashboard
            </Link>
            {showAdmin && (
              <>
                <Link
                  href="/admin/pricing"
                  className="text-sm transition-colors hover:text-[var(--color-text)]"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Pricing
                </Link>
                <Link
                  href="/admin/users"
                  className="text-sm transition-colors hover:text-[var(--color-text)]"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Users
                </Link>
                <Link
                  href="/admin/content/stories"
                  className="text-sm transition-colors hover:text-[var(--color-text)]"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Cerita Jamaah
                </Link>
                <Link
                  href="/admin/content/hotels"
                  className="text-sm transition-colors hover:text-[var(--color-text)]"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Hotel Nusuk
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/estimate/new">
            <Button size="sm">Buat Estimasi</Button>
          </Link>
          <div className="flex items-center gap-2">
            {user?.email && (
              <span className="hidden md:block text-xs" style={{ color: "var(--color-text-muted)" }}>
                {user.email}
              </span>
            )}
            <form
              action={async () => {
                "use server"
                await signOut({ redirectTo: "/login" })
              }}
            >
              <Button type="submit" variant="ghost" size="sm">
                Keluar
              </Button>
            </form>
          </div>
        </div>
      </div>
    </nav>
  )
}
