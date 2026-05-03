import { requireAdmin } from "@/lib/auth"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { desc } from "drizzle-orm"
import { Badge } from "@/components/ui/badge"

export const metadata = { title: "Admin — Pengguna" }

export default async function AdminUsersPage() {
  await requireAdmin()

  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
        >
          Pengguna
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
          {allUsers.length} pengguna terdaftar.
        </p>
      </div>

      <div
        className="rounded-lg border overflow-hidden"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        <table className="w-full">
          <thead style={{ background: "rgba(0,0,0,0.2)" }}>
            <tr>
              {["Nama", "Email", "Role", "Bergabung"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allUsers.map((u) => (
              <tr key={u.id} className="border-t" style={{ borderColor: "var(--color-border)" }}>
                <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text)" }}>{u.name}</td>
                <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text-muted)" }}>{u.email}</td>
                <td className="px-4 py-3">
                  <Badge
                    variant={u.role === "ADMIN" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {u.role}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {new Date(u.createdAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
