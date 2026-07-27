import { NavBar } from "@/components/nav/NavBar"
import { VisitorTracker } from "@/components/nav/VisitorTracker"
import { requireAuth } from "@/lib/auth"
import { NOINDEX_METADATA } from "@/lib/seo/metadata"

export const metadata = NOINDEX_METADATA

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Structural guard for the whole group, mirroring requireAdmin() in the
  // admin layout. The pages each call requireAuth() too, but the layout is
  // what makes a newly added dashboard page safe by default.
  await requireAuth()

  return (
    <div className="min-h-screen">
      <VisitorTracker />
      <NavBar />
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
