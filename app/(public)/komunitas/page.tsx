import { CommunityJoinForm } from "@/components/community/CommunityJoinForm"
import { pageMetadata } from "@/lib/seo/metadata"

export const metadata = pageMetadata({
  title: "Gabung Komunitas Umroh Mandiri",
  description:
    "Ajukan bergabung ke komunitas WhatsApp Umroh Mandiri yang dikelola admin — tempat bertanya dan berbagi pengalaman dengan sesama jamaah mandiri.",
  path: "/komunitas",
})

export default function KomunitasPage() {
  return (
    <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
      <section className="py-6 lg:py-12">
        <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--color-gold)" }}>
          Komunitas Umroh Mandiri
        </p>
        <h1
          className="mt-3 text-4xl font-bold leading-tight"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
        >
          Belajar umroh mandiri bareng komunitas
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
          Isi data singkat ini dulu supaya admin bisa mencocokkan pengajuan WhatsApp Kakak dengan data yang masuk.
          Setelah tersimpan, Kakak bisa memilih grup SSU yang ingin dimasuki dan menghubungi admin.
        </p>
        <div
          className="mt-6 rounded-lg border p-4 text-sm leading-relaxed"
          style={{ borderColor: "var(--color-border)", background: "rgba(255,255,255,0.03)", color: "var(--color-text-muted)" }}
        >
          Gunakan nama dan nomor HP yang sama saat mengajukan lewat WhatsApp. Tidak ada persetujuan otomatis; admin tetap melakukan pengecekan manual agar grup tetap rapi.
        </div>
      </section>

      <CommunityJoinForm adminChatUrl={process.env.NEXT_PUBLIC_COMMUNITY_ADMIN_WHATSAPP_URL} />
    </div>
  )
}
