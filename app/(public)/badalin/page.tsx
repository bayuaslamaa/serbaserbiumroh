import Link from "next/link"
import { MessageCircle, Play } from "lucide-react"
import { VideoDocGrid } from "@/components/badalin/VideoDocGrid"
import {
  badalSteps,
  badalVideos,
  badalinHero,
  badalinPrice,
  isPlaceholderVideo,
} from "@/lib/badalin/content"
import { badalConsultHref } from "@/lib/services/catalog"

// Only videos with a real YouTube id are watchable; the rest render as
// "segera tayang" posters, so the page must not advertise them as available.
const readyVideoCount = badalVideos.filter(
  (video) => !isPlaceholderVideo(video.youtubeId)
).length

// "Tonton sendiri" promises every card is watchable, so it may only run when
// none are pending. With a mixed list the page says so plainly instead.
const allVideosReady = readyVideoCount === badalVideos.length

export const metadata = {
  title: "Badalin — Badal Umroh Terdokumentasi | Serba Serbi Umroh",
  description:
    "Badal umroh oleh muthowwif tersertifikasi, didokumentasikan penuh dari niat di miqat hingga tahallul, lengkap dengan video dan sertifikat pelaksanaan.",
}

export default function BadalinPage() {
  return (
    <div className="mx-auto max-w-6xl pb-20">
      <section className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-center gap-9 px-2 pb-10 pt-10 md:pt-14">
        <div>
          <div
            className="mb-4 inline-flex items-center rounded-full border px-3 py-[5px] text-[11px] font-bold tracking-[0.12em] text-gold"
            style={{
              background: "rgba(201,168,76,0.08)",
              borderColor: "rgba(201,168,76,0.25)",
            }}
          >
            {badalinHero.eyebrow}
          </div>
          <h1
            className="text-4xl font-bold leading-[1.1] text-text md:text-5xl"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {badalinHero.title}
          </h1>
          <div className="mb-3.5 mt-1.5 text-lg font-semibold text-gold md:text-[19px]">
            {badalinHero.tagline}
          </div>
          <p className="mb-6 max-w-[480px] text-[15px] leading-[1.65] text-text-muted">
            {badalinHero.description}
          </p>

          <div className="flex flex-wrap gap-2.5">
            <Link
              href={badalConsultHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-[10px] bg-gold px-5 py-3 text-[15px] font-bold text-bg transition-colors hover:bg-gold-hover"
            >
              <MessageCircle size={17} />
              Pesan via WhatsApp
            </Link>
            <a
              href="#dokumentasi"
              className="flex items-center gap-2 rounded-[10px] border px-5 py-3 text-[15px] font-semibold text-gold transition-colors hover:bg-[rgba(201,168,76,0.08)]"
              style={{ borderColor: "rgba(201,168,76,0.35)" }}
            >
              <Play size={16} />
              Lihat Dokumentasi
            </a>
          </div>

          <div className="mt-4 text-[13px] text-text-muted">
            Mulai dari <span className="font-bold text-gold">{badalinPrice}</span> ·{" "}
            {badalinHero.priceNote}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {badalSteps.map((step) => (
            <div
              key={step.n}
              className="flex items-start gap-3.5 rounded-xl border p-4"
              style={{
                borderColor: "rgba(201,168,76,0.16)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <span
                className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full border text-[13px] font-bold text-gold"
                style={{
                  background: "rgba(201,168,76,0.12)",
                  borderColor: "rgba(201,168,76,0.3)",
                }}
              >
                {step.n}
              </span>
              <span>
                <span className="block text-sm font-semibold text-text">
                  {step.title}
                </span>
                <span className="mt-[3px] block text-[12.5px] leading-[1.5] text-text-muted">
                  {step.description}
                </span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section id="dokumentasi" className="scroll-mt-20 px-2 pt-6">
        <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-3">
          <h2
            className="text-2xl font-bold text-text md:text-3xl"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Dokumentasi Badal
          </h2>
          <span className="text-[13px] text-text-muted">
            {readyVideoCount > 0
              ? `${readyVideoCount} video · diperbarui setiap keberangkatan`
              : "Diperbarui setiap keberangkatan"}
          </span>
        </div>
        <p className="mb-5 max-w-[560px] text-sm leading-relaxed text-text-muted">
          {allVideosReady
            ? "Bukan sekadar janji — tonton sendiri bagaimana setiap amanah badal kami jalankan di Tanah Suci."
            : readyVideoCount > 0
              ? "Sebagian rekaman sudah bisa ditonton; sisanya sedang kami siapkan."
              : "Rekaman pelaksanaan sedang kami siapkan. Daftar di bawah adalah dokumentasi yang akan tayang."}
        </p>

        <VideoDocGrid />
      </section>

      <section
        className="mt-12 rounded-2xl border px-7 py-10 text-center"
        style={{
          borderColor: "rgba(201,168,76,0.28)",
          background:
            "linear-gradient(135deg, rgba(201,168,76,0.1), rgba(201,168,76,0.03))",
        }}
      >
        <div
          className="text-2xl font-bold text-text md:text-3xl"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Amanahkan badal umroh keluarga Anda
        </div>
        <p className="mx-auto mb-6 mt-2.5 max-w-[480px] text-sm leading-relaxed text-text-muted">
          Ceritakan untuk siapa badal ini — tim kami balas dengan jadwal terdekat
          dan detail pelaksanaannya.
        </p>
        <Link
          href={badalConsultHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2.5 rounded-[11px] bg-gold px-7 py-3.5 text-base font-bold text-bg transition-colors hover:bg-gold-hover"
        >
          <MessageCircle size={18} />
          Konsultasi Badal via WhatsApp
        </Link>
      </section>
    </div>
  )
}
