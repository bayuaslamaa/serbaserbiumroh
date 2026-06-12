import Link from "next/link"
import { auth } from "@/auth"
import { Button } from "@/components/ui/button"

const WEBINAR_PATH = "/webinar-umroh-mandiri"

export const metadata = {
  title: "Webinar Umroh Mandiri",
  description: "RSVP webinar Umroh Mandiri Ahad, 14 Juni 2026 untuk user terdaftar.",
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
              <p className="mt-1" style={{ color: "var(--color-text-muted)" }}>
                Ahad, 14 Juni 2026
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
