import { NavBar } from "@/components/nav/nav-bar"
import { VisitorTracker } from "@/components/nav/visitor-tracker"
import { requireAdmin } from "@/shared/auth"
import { Badge } from "@/components/ui/badge"
import { NOINDEX_METADATA } from "@/shared/seo/metadata"

export const metadata = NOINDEX_METADATA

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdmin()

  return (
    <div className="min-h-screen">
      <VisitorTracker />
      <NavBar isAdmin />
      <div className="border-b" style={{ borderColor: "var(--color-border)", background: "rgba(201,168,76,0.05)" }}>
        <div className="container mx-auto px-4 py-2 flex items-center gap-2">
          <Badge variant="default" className="text-xs">Admin Panel</Badge>
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            Kelola data harga dan pengguna
          </span>
        </div>
      </div>
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
