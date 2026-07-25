import { NavBar } from "@/components/nav/NavBar"
import { VisitorTracker } from "@/components/nav/VisitorTracker"

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
