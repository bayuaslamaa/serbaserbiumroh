import Link from "next/link"
import { auth } from "@/auth"
import { Button } from "@/components/ui/button"
import { Info, Youtube, Tv } from "lucide-react"

const WEBINAR_PATH = "/webinar-umroh-mandiri"

export const metadata = {
  title: "Webinar Umroh Mandiri",
  description: "RSVP webinar Umroh Mandiri Selasa, 16 Juni 2026 untuk user terdaftar.",
}

export default async function WebinarUmrohMandiriPage() {
  const session = await auth()
  const rsvpUrl = process.env.WEBINAR_RSVP_URL
  const isLoggedIn = !!session?.user

  return (
    <div className="mx-auto max-w-5xl">
      <section className="grid gap-8 py-8 lg:grid-cols-[1fr_0.8fr] lg:items-start lg:py-12">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--color-gold)" }}>
            Webinar Umroh Mandiri
          </p>
          <h1
            className="mt-3 text-4xl font-bold leading-tight"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
          >
            Siapkan umroh mandiri dengan langkah yang lebih rapi
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
            Ikuti sesi webinar untuk memahami alur persiapan, estimasi biaya, pilihan hotel, transportasi,
            dan hal penting yang perlu dicek sebelum berangkat mandiri.
          </p>
          <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
            <div
              className="rounded-lg border p-4"
              style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.03)" }}
            >
              <p className="font-semibold" style={{ color: "var(--color-text)" }}>
                Jadwal
              </p>
              <p className="mt-1 text-xl font-bold" style={{ color: "var(--color-text-muted)" }}>
                Selasa, 16 Juni 2026
              </p>
            </div>
            <div
              className="rounded-lg border p-4"
              style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.03)" }}
            >
              <p className="font-semibold" style={{ color: "var(--color-text)" }}>
                Akses RSVP
              </p>
              <p className="mt-1" style={{ color: "var(--color-text-muted)" }}>
                Khusus user yang sudah login
              </p>
            </div>
          </div>

          {/* New Capacity and Live Stream Callout */}
          <div
            className="mt-6 rounded-lg border p-5 space-y-4"
            style={{ borderColor: "var(--color-border)", background: "rgba(201, 168, 76, 0.05)" }}
          >
            <div className="flex gap-2.5 items-start">
              <Info className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "var(--color-gold)" }} />
              <div className="space-y-1.5">
                <p className="font-semibold text-sm" style={{ color: "var(--color-gold)" }}>
                  Informasi Kapasitas Zoom & Akses Masuk
                </p>
                <p className="text-xs md:text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                  Kapasitas Zoom <strong className="text-[var(--color-text)]">hanya untuk 300 peserta</strong>. Ruang Zoom akan dibuka 15-30 menit sebelum acara dimulai pukul 13:00 WIB, dan admin akan menyetujui (accept) peserta masuk secara acak.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--color-border)]/40 space-y-2">
              <p className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
                Jika ruang Zoom sudah penuh, silakan tonton siaran langsung di:
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                <a
                  href="http://youtube.com/@serbaserbiumroh"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded bg-red-600/10 border border-red-600/30 text-red-400 hover:bg-red-600/20 transition-all"
                >
                  <Youtube className="w-4 h-4" />
                  <span>Live YouTube</span>
                </a>
                <a
                  href="https://www.tiktok.com/@bayuaslama_"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded bg-white/5 border border-white/20 text-white hover:bg-white/10 transition-all"
                >
                  <Tv className="w-4 h-4" />
                  <span>Live TikTok</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        <aside
          className="rounded-xl border p-6"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          <h2
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
          >
            RSVP Webinar
          </h2>

          {isLoggedIn && rsvpUrl ? (
            <>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                Kakak sudah login. Silakan lanjut RSVP lewat tombol di bawah ini.
              </p>
              <a
                href={rsvpUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex w-full items-center justify-center rounded-md px-5 py-3 text-sm font-semibold"
                style={{ background: "var(--color-gold)", color: "#1a1206" }}
              >
                RSVP Sekarang
              </a>
            </>
          ) : isLoggedIn ? (
            <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
              Link RSVP belum tersedia. Silakan cek kembali beberapa saat lagi.
            </p>
          ) : (
            <>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                Login dulu untuk melihat link RSVP. Setelah masuk, Kakak akan diarahkan kembali ke halaman ini.
              </p>
              <Link href={`/login?callbackUrl=${encodeURIComponent(WEBINAR_PATH)}`} className="mt-6 block">
                <Button className="w-full">Masuk untuk RSVP</Button>
              </Link>
            </>
          )}
        </aside>
      </section>
    </div>
  )
}
