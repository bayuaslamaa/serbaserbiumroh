import { NavBar } from "@/components/nav/NavBar"
import { VisitorTracker } from "@/components/nav/VisitorTracker"
import { NOINDEX_METADATA } from "@/lib/seo/metadata"

export const metadata = NOINDEX_METADATA

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <VisitorTracker />
      <NavBar />
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
