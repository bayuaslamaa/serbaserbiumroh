import { NavBar } from "@/components/nav/NavBar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
