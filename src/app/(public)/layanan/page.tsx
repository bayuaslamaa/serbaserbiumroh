import Link from "next/link"
import { MessageCircle } from "lucide-react"
import { ServiceCard } from "@/components/layanan/service-card"
import { CommunityStats } from "@/components/stats/community-stats"
import { getPublicVisitorCount } from "@/shared/stats/visitor-count"
import { layananConsultHref, services } from "@/shared/services/catalog"
import { pageMetadata } from "@/shared/seo/metadata"

export const metadata = pageMetadata({
  title: "Layanan Umroh Mandiri",
  description:
    "Semua kebutuhan umroh mandiri dalam satu tempat — visa, badal umroh, transportasi, hotel, kereta cepat Haramain, dan muthowwif.",
  path: "/layanan",
})

export default async function LayananPage() {
  const visitorCount = await getPublicVisitorCount()

  return (
    <div className="mx-auto max-w-6xl pb-20">
      <section className="px-2 pb-9 pt-10 text-center md:pt-14">
        <CommunityStats visitorCount={visitorCount} />

        <h1
          className="mt-6 text-3xl font-bold text-text md:text-[42px]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Layanan Serba Serbi Umroh
        </h1>
        <p className="mx-auto mt-3 max-w-[560px] text-base leading-relaxed text-text-muted">
          Semua kebutuhan umroh mandiri Anda dalam satu tempat — dari visa,
          transportasi, hotel, sampai badal umroh yang terdokumentasi.
        </p>
      </section>

      <section className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3.5">
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </section>

      <section
        className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-[14px] border p-6"
        style={{
          borderColor: "var(--color-border)",
          background: "rgba(201,168,76,0.04)",
        }}
      >
        <div>
          <div
            className="text-[22px] font-bold text-text"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Belum yakin butuh layanan yang mana?
          </div>
          <div className="mt-1 text-sm text-text-muted">
            Konsultasi gratis — tim kami bantu susun kebutuhan umroh mandiri Anda.
          </div>
        </div>
        <Link
          href={layananConsultHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 whitespace-nowrap rounded-[10px] bg-gold px-5 py-3 text-sm font-bold text-bg transition-colors hover:bg-gold-hover"
        >
          <MessageCircle size={16} />
          Chat WhatsApp
        </Link>
      </section>
    </div>
  )
}
