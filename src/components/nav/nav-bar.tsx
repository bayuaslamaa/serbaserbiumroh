import { auth, signOut } from "@/auth"
import { getPublicVisitorCount } from "@/shared/stats/visitor-count"
import { DesktopNav } from "./desktop-nav"
import { MobileMenu } from "./mobile-menu"

export async function NavBar({ isAdmin = false }: { isAdmin?: boolean }) {
  const [session, visitorCount] = await Promise.all([
    auth(),
    getPublicVisitorCount(),
  ])
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
      <DesktopNav
        userName={user?.name}
        userEmail={user?.email}
        isLoggedIn={!!user}
        isAdmin={user?.role === "ADMIN"}
        showAdmin={!!showAdmin}
        visitorCount={visitorCount}
        signOutAction={handleSignOut}
      />
      <MobileMenu
        userEmail={user?.email}
        showAdmin={!!showAdmin}
        isAdmin={user?.role === "ADMIN"}
        isLoggedIn={!!user}
        signOutAction={handleSignOut}
      />
    </nav>
  )
}
