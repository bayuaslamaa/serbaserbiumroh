import { requireAdmin } from "@/lib/auth"
import { db } from "@/lib/db"
import { visitorLogs } from "@/lib/db/schema"
import { desc, count, countDistinct } from "drizzle-orm"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, Users, BarChart3, Clock } from "lucide-react"

export const metadata = { title: "Admin — Statistik Pengunjung" }

export default async function VisitorStatsPage() {
  await requireAdmin()

  // Fetch statistics
  const [stats] = await db
    .select({
      totalViews: count(),
      uniqueVisitors: countDistinct(visitorLogs.ipHash),
    })
    .from(visitorLogs)

  const pathBreakdown = await db
    .select({
      path: visitorLogs.path,
      views: count(),
      uniques: countDistinct(visitorLogs.ipHash),
    })
    .from(visitorLogs)
    .groupBy(visitorLogs.path)
    .orderBy(desc(count()))

  const recentLogs = await db
    .select()
    .from(visitorLogs)
    .orderBy(desc(visitorLogs.createdAt))
    .limit(50)

  // Admin-side promotional offset. Deliberately NOT the same number as the
  // public pill in components/layanan/StatBadges.tsx (100) — this view reports
  // the figure the admin dashboard has always shown.
  const BASELINE_OFFSET = 1420
  const promoCount = (stats?.uniqueVisitors || 0) + BASELINE_OFFSET

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
        >
          Statistik Pengunjung
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
          Pantau jumlah kunjungan halaman publik, pengunjung unik, dan data analitik secara real-time.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Kunjungan (Hits)</CardTitle>
            <Eye className="h-4 w-4 text-[var(--color-gold)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats?.totalViews || 0).toLocaleString("id-ID")}</div>
            <p className="text-xs text-[var(--color-text-muted)]">
              Total seluruh halaman publik diakses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Pengunjung Unik (Database)</CardTitle>
            <Users className="h-4 w-4 text-[var(--color-gold)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats?.uniqueVisitors || 0).toLocaleString("id-ID")}</div>
            <p className="text-xs text-[var(--color-text-muted)]">
              Berdasarkan IP Address unik terenkripsi
            </p>
          </CardContent>
        </Card>

        <Card style={{ borderColor: "rgba(201, 168, 76, 0.4)", background: "rgba(201, 168, 76, 0.04)" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Angka Promosi (Navbar)</CardTitle>
            <BarChart3 className="h-4 w-4 text-[var(--color-gold)] animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--color-gold)]">{promoCount.toLocaleString("id-ID")}+</div>
            <p className="text-xs text-[var(--color-text-muted)]">
              Pengunjung unik + offset promo ({BASELINE_OFFSET})
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Popular Pages Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[var(--color-gold)]" /> Halaman Terpopuler
            </CardTitle>
            <CardDescription>Peringkat akses rute publik teratas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-xs text-[var(--color-text-muted)]">
                    <th className="py-2">Rute</th>
                    <th className="py-2 text-right">Views</th>
                    <th className="py-2 text-right">Unik</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-surface)]">
                  {pathBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-sm text-[var(--color-text-muted)]">
                        Belum ada data kunjungan.
                      </td>
                    </tr>
                  ) : (
                    pathBreakdown.map((row) => (
                      <tr key={row.path} className="hover:bg-[var(--color-surface)] transition-colors">
                        <td className="py-2 font-mono text-xs max-w-[150px] truncate" title={row.path}>
                          {row.path}
                        </td>
                        <td className="py-2 text-right font-medium">{row.views.toLocaleString("id-ID")}</td>
                        <td className="py-2 text-right font-medium">{row.uniques.toLocaleString("id-ID")}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Visitor Logs */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-[var(--color-gold)]" /> Log Kunjungan Terbaru (Maks. 50)
            </CardTitle>
            <CardDescription>Aktivitas akses halaman publik secara real-time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-[380px] overflow-y-auto pr-1">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-xs text-[var(--color-text-muted)] sticky top-0 bg-[#0b1c12] z-10">
                    <th className="py-2">Waktu</th>
                    <th className="py-2">Rute</th>
                    <th className="py-2">IP Hash (SHA-256)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-surface)]">
                  {recentLogs.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-sm text-[var(--color-text-muted)]">
                        Belum ada data aktivitas.
                      </td>
                    </tr>
                  ) : (
                    recentLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[var(--color-surface)] transition-colors">
                        <td className="py-2 text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString("id-ID", {
                            dateStyle: "short",
                            timeStyle: "medium",
                          })}
                        </td>
                        <td className="py-2 font-mono text-xs font-medium max-w-[120px] truncate" title={log.path}>
                          {log.path}
                        </td>
                        <td className="py-2 font-mono text-[10px] text-[var(--color-text-muted)] max-w-[150px] truncate" title={log.ipHash}>
                          {log.ipHash}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
