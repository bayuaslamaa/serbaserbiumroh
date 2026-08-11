import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  MessageCircle,
  HelpCircle,
  ShieldCheck,
  Users,
  SearchCheck
} from "lucide-react"
import Link from "next/link"
import { pageMetadata } from "@/lib/seo/metadata"

export const metadata = pageMetadata({
  title: "Visa Umroh Mandiri: Penerbitan Visa Perorangan",
  description:
    "Layanan pengurusan visa umroh perorangan secara online oleh @badalinbybazanyc. Pilihan reguler lewat approval hotel Nusuk Masar atau BRN.",
  path: "/visa",
})

const whatsappVisaHref =
  "https://wa.me/6285161134844?text=Assalamu%27alaikum%2C%20saya%20ingin%20konsultasi%20pengurusan%20visa%20umroh%20perorangan."
const whatsappLayanan1Href =
  "https://wa.me/6285161134844?text=Assalamu%27alaikum%2C%20saya%20ingin%20mengajukan%20visa%20umroh%20Layanan%201%20reguler%20melalui%20approval%20hotel%20di%20Nusuk%20Masar."
const whatsappLayanan2Href =
  "https://wa.me/6285161134844?text=Assalamu%27alaikum%2C%20saya%20ingin%20mengajukan%20visa%20umroh%20Layanan%202%20reguler%20dengan%20BRN."
const visaAppHref = "https://visa.serbaserbiumroh.id"
// Portal resmi Kementerian Luar Negeri Arab Saudi untuk mengecek status/keaslian visa.
const cekVisaMofaHref = "https://visa.mofa.gov.sa/VISASERVICES/SEARCHVISA"

export default function VisaPage() {
  return (
    <div className="mx-auto max-w-6xl py-8 md:py-12 px-2">
      {/* Hero Header Section */}
      <section className="text-center mb-12 max-w-3xl mx-auto">
        <Badge variant="outline" className="mb-4 px-3 py-1 border-[var(--color-gold)] text-[var(--color-gold)] font-medium tracking-wide">
          VISA UMROH PERORANGAN 🇸🇦
        </Badge>
        <h1
          className="text-3xl md:text-5xl font-bold mb-4 tracking-tight"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
        >
          Pengurusan Visa Umroh Online
        </h1>
        <p className="text-base md:text-lg mb-2 font-medium" style={{ color: "var(--color-text)" }}>
          by @badalinbybazanyc
        </p>
        <p className="text-sm md:text-base leading-relaxed mb-8" style={{ color: "var(--color-text-muted)" }}>
          Pengurusan visa umroh dilakukan online. Semua transaksi dan komunikasi lanjutan masih dilakukan melalui WhatsApp ini.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href={visaAppHref} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto font-bold flex items-center justify-center gap-2 group transition-all duration-300 hover:shadow-lg hover:shadow-[rgba(201,168,76,0.2)]">
              <span>Pesan Visa lewat Aplikasi</span>
              <ExternalLink className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Button>
          </Link>
          <Link href={whatsappVisaHref} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full sm:w-auto flex items-center justify-center gap-2 border-[var(--color-gold)] text-[var(--color-gold)] hover:bg-[var(--color-surface)]">
              <MessageCircle className="w-4 h-4" />
              <span>Ajukan via WhatsApp</span>
            </Button>
          </Link>
        </div>
      </section>

      {/* Cek Visa Resmi (MOFA) */}
      <section className="mb-12">
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 p-5 md:p-6 rounded-xl border-2 border-[var(--color-gold)] bg-gradient-to-r from-[rgba(201,168,76,0.12)] to-transparent">
          <div className="flex items-start gap-3 flex-grow">
            <SearchCheck className="w-6 h-6 md:w-7 md:h-7 text-[var(--color-gold)] shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base md:text-lg font-bold mb-1" style={{ color: "var(--color-gold)", fontFamily: "var(--font-heading)" }}>
                Cek Keaslian Visa Anda di Situs Resmi Saudi
              </h3>
              <p className="text-xs md:text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                Setelah visa terbit, pastikan status dan keasliannya lewat portal resmi Kementerian Luar Negeri Arab Saudi (MOFA). Siapkan nomor paspor dan nomor visa Anda.
              </p>
            </div>
          </div>
          <Link href={cekVisaMofaHref} target="_blank" rel="noopener noreferrer" className="w-full md:w-auto shrink-0">
            <Button size="lg" className="w-full md:w-auto font-bold flex items-center justify-center gap-2 group transition-all duration-300 hover:shadow-lg hover:shadow-[rgba(201,168,76,0.2)]">
              <span>Cek Visa di MOFA</span>
              <ExternalLink className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Main Visa Types Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">

        {/* Card 1: Nusuk Masar */}
        <Card className="flex flex-col h-full relative overflow-hidden border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="absolute top-0 right-0 left-0 h-[3px] bg-gradient-to-r from-emerald-600 via-[var(--color-gold)] to-emerald-600" />
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
              <Badge variant="green" className="text-xs py-1 px-3">
                Layanan 1
              </Badge>
              <div className="text-right">
                <span className="text-xs text-[var(--color-text-muted)] block">Harga</span>
                <span className="text-2xl font-bold text-[var(--color-gold)]">USD 165</span>
                <span className="text-[10px] text-[var(--color-text-muted)] block">(include asuransi selama di Saudi)</span>
              </div>
            </div>
            <CardTitle className="text-xl md:text-2xl font-bold" style={{ color: "var(--color-gold)", fontFamily: "var(--font-heading)" }}>
              Reguler melalui Approval Hotel di Nusuk Masar
            </CardTitle>
            <CardDescription className="text-xs md:text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
              Layanan reguler melalui approval hotel di Nusuk Masar untuk hotel Mekkah dan Madinah yang sudah Anda booking.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-grow space-y-6">
            {/* Info Badges */}
            <div className="flex gap-4 p-3 rounded-lg border border-[var(--color-border)] bg-black/20 text-xs">
              <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                <Clock className="w-4 h-4 text-[var(--color-gold)] shrink-0" />
                <div>
                  <span className="font-semibold block text-[var(--color-text)]">Proses:</span>
                  3–14 hari kerja (Tergantung approval hotel)
                </div>
              </div>
            </div>

            {/* Requirements */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-gold)] mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Persyaratan Dokumen:
              </h4>
              <ul className="space-y-2 text-xs md:text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Scan/foto paspor yang jelas & terbaca</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Tiket Pulang Pergi (PP) yang valid</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>KTP & KK (wajib dilampirkan hanya jika mengajukan Siskopatuh)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    Booking hotel Mekkah & Madinah yang terdaftar di Nusuk Masar. Bisa cek rekomendasi kami di{" "}
                    <Link
                      href="/hotel-nusuk"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-[var(--color-gold)] underline underline-offset-4 hover:text-[var(--color-gold-muted)]"
                    >
                      www.serbaserbiumroh.id/hotel-nusuk
                    </Link>
                  </span>
                </li>
              </ul>
            </div>

            {/* Specific Instructions */}
            <div className="p-4 rounded-lg bg-amber-950/20 border border-amber-900/30 text-xs md:text-sm space-y-2">
              <h5 className="font-semibold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" /> Ketentuan Penting & Wajib:
              </h5>
              <ul className="space-y-1.5 text-[var(--color-text-muted)] list-disc pl-4">
                <li>
                  Hotel boleh dibeli melalui OTA seperti Bookingcom, Agoda, dan lainnya.
                </li>
                <li>
                  <strong className="text-[var(--color-text)]">WAJIB tanya ke kami</strong> sebelum membeli hotel.
                </li>
                <li>
                  Hotel harus <strong className="text-[var(--color-text)]">non-refundable & non-free cancellation</strong>.
                </li>
                <li>Jumlah tempat tidur (bed) wajib sesuai dengan jumlah orang yang menginap.</li>
                <li>Untuk grup dengan jumlah <strong className="text-[var(--color-text)]">lebih dari 2 orang</strong>, wajib menggunakan jasa transportasi penjemputan dari kami.</li>
              </ul>
            </div>
          </CardContent>

          <CardFooter className="pt-0">
            <Link href={whatsappLayanan1Href} target="_blank" rel="noopener noreferrer" className="w-full">
              <Button className="w-full flex items-center justify-center gap-2">
                <MessageCircle className="w-4 h-4" />
                <span>Pilih & Ajukan Layanan 1</span>
              </Button>
            </Link>
          </CardFooter>
        </Card>

        {/* Card 2: BRN */}
        <Card className="flex flex-col h-full relative overflow-hidden border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="absolute top-0 right-0 left-0 h-[3px] bg-gradient-to-r from-emerald-600 via-[var(--color-gold)] to-emerald-600" />
          <CardHeader className="pb-4">
            <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
              <Badge variant="green" className="text-xs py-1 px-3">
                Layanan 2
              </Badge>
              <div className="text-right">
                <span className="text-xs text-[var(--color-text-muted)] block">Harga</span>
                <span className="text-2xl font-bold text-[var(--color-gold)]">USD 190</span>
                <span className="text-[10px] text-[var(--color-text-muted)] block">(include asuransi)</span>
              </div>
            </div>
            <CardTitle className="text-xl md:text-2xl font-bold" style={{ color: "var(--color-gold)", fontFamily: "var(--font-heading)" }}>
              Reguler dengan BRN
            </CardTitle>
            <CardDescription className="text-xs md:text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
              Tanpa melalui approval hotel yang dibeli, sehingga biasanya perlu membeli BRN hotel lain.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-grow space-y-6">
            {/* Info Badges */}
            <div className="flex gap-4 p-3 rounded-lg border border-[var(--color-border)] bg-black/20 text-xs">
              <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                <Clock className="w-4 h-4 text-[var(--color-gold)] shrink-0" />
                <div>
                  <span className="font-semibold block text-[var(--color-text)]">Proses:</span>
                  3–14 hari kerja (Selama sistem lancar)
                </div>
              </div>
            </div>

            {/* Why BRN? */}
            <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-xs md:text-sm">
              <h5 className="font-semibold text-[var(--color-gold)] mb-1.5 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4" /> Kapan Menggunakan BRN?
              </h5>
              <p className="text-[var(--color-text-muted)] mb-2">Layanan ini biasanya dipilih ketika approval hotel yang dibeli tidak memungkinkan karena:</p>
              <ul className="list-decimal pl-4 text-[var(--color-text-muted)] space-y-1">
                <li>Sulit mendapatkan approval hotel</li>
                <li>Kurang bed</li>
                <li>Hotel tidak responsif</li>
              </ul>
            </div>

            {/* Requirements */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-gold)] mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Persyaratan Dokumen:
              </h4>
              <ul className="space-y-2 text-xs md:text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Scan/foto paspor yang jelas & terbaca</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Tiket Pulang Pergi (PP) yang valid</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>KTP & KK (wajib dilampirkan jika mengajukan Siskopatuh)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="leading-tight">Booking hotel Mekkah & Madinah yang terdaftar di web Kementerian Pariwisata Saudi. Hotel boleh dibeli melalui OTA seperti Bookingcom, Agoda, dan lainnya.</span>
                </li>
              </ul>
            </div>

            {/* Transportation suggestion */}
            <div className="p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-xs md:text-sm flex items-start gap-2">
              <Users className="w-4 h-4 text-[var(--color-gold)] shrink-0 mt-0.5" />
              <p className="text-[var(--color-text-muted)]">
                Untuk rombongan <strong className="text-[var(--color-text)]">lebih dari 2 orang</strong>, disarankan sekalian mengambil jasa transportasi penjemputan dari kami agar memudahkan koordinasi kedatangan.
              </p>
            </div>
          </CardContent>

          <CardFooter className="pt-0">
            <Link href={whatsappLayanan2Href} target="_blank" rel="noopener noreferrer" className="w-full">
              <Button className="w-full flex items-center justify-center gap-2">
                <MessageCircle className="w-4 h-4" />
                <span>Pilih & Ajukan Layanan 2</span>
              </Button>
            </Link>
          </CardFooter>
        </Card>

      </div>

      {/* Siskopatuh Section */}
      <section className="mb-12">
        <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start flex-wrap gap-2 mb-1">
              <Badge variant="outline" className="border-amber-500/50 text-amber-500 text-xs">
                Layanan Tambahan
              </Badge>
              <div className="text-right">
                <span className="text-xs text-[var(--color-text-muted)] block">Harga</span>
                <span className="text-xl font-bold text-[var(--color-gold)]">Rp200.000</span>
              </div>
            </div>
            <CardTitle className="text-lg md:text-xl font-bold flex items-center gap-2" style={{ color: "var(--color-gold)", fontFamily: "var(--font-heading)" }}>
              <ShieldCheck className="w-5 h-5 text-[var(--color-gold)]" /> Siskopatuh (Opsional)
            </CardTitle>
            <CardDescription className="text-xs md:text-sm" style={{ color: "var(--color-text-muted)" }}>
              Siskopatuh bersifat opsional dan dapat diajukan bersamaan dengan pengurusan visa.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs md:text-sm space-y-4">
            <div>
              <h5 className="font-semibold text-[var(--color-text)] mb-2">Persyaratan Tambahan Siskopatuh:</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex items-center gap-2 p-2.5 rounded-lg border border-[var(--color-border)] bg-black/10">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Semua Syarat Visa Utama</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg border border-[var(--color-border)] bg-black/10">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>KTP (Kartu Tanda Penduduk)</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg border border-[var(--color-border)] bg-black/10">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Kartu Keluarga (KK)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Important Disclaimer / FAQ Summary */}
      <section className="mb-12 p-6 rounded-lg border border-[var(--color-border)] bg-black/25">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: "var(--color-gold)", fontFamily: "var(--font-heading)" }}>
          <AlertTriangle className="w-5 h-5 text-[var(--color-gold)]" /> Catatan Penting Sebelum Pengajuan
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs md:text-sm">
          <div className="space-y-3">
            <div>
              <h5 className="font-bold text-[var(--color-text)] mb-1">Mengenai Tiket Penerbangan</h5>
              <p style={{ color: "var(--color-text-muted)" }}>Pastikan tiket Anda adalah tiket Pulang Pergi (PP) yang valid. Tiket satu arah (one-way) tidak diperbolehkan dan dapat menyebabkan penolakan visa.</p>
            </div>
            <div>
              <h5 className="font-bold text-[var(--color-text)] mb-1">Ketentuan Hotel di Nusuk Masar</h5>
              <p style={{ color: "var(--color-text-muted)" }}>Khusus untuk Layanan 1 (Nusuk Masar), pastikan hotel tempat Anda memesan terdaftar secara resmi dan mau memberikan approval. Disarankan untuk menanyakan ke pihak kami terlebih dahulu sebelum melakukan transaksi booking.</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <h5 className="font-bold text-[var(--color-text)] mb-1">Asuransi Kesehatan</h5>
              <p style={{ color: "var(--color-text-muted)" }}>Seluruh pengurusan visa sudah include (termasuk) biaya asuransi kesehatan wajib dari Kementerian Kesehatan Arab Saudi selama periode berada di Saudi.</p>
            </div>
            <div>
              <h5 className="font-bold text-[var(--color-text)] mb-1">Proses Pembayaran & Transaksi</h5>
              <p style={{ color: "var(--color-text-muted)" }}>Seluruh proses pembayaran, verifikasi dokumen, dan konfirmasi akhir dilakukan melalui chat admin WhatsApp resmi kami.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Block */}
      <section className="text-center py-8 px-4 rounded-xl border border-[var(--color-gold-muted)] bg-gradient-to-b from-[rgba(201,168,76,0.05)] to-transparent max-w-4xl mx-auto">
        <h3 className="text-2xl font-bold mb-3" style={{ color: "var(--color-gold)", fontFamily: "var(--font-heading)" }}>
          Mulai Pengurusan Visa Anda Sekarang
        </h3>
        <p className="text-xs md:text-sm max-w-xl mx-auto mb-6" style={{ color: "var(--color-text-muted)" }}>
          Persiapkan scan paspor, tiket PP, dan kelengkapan booking hotel Anda. Ajukan lewat aplikasi kami atau konsultasikan dulu melalui WhatsApp.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href={visaAppHref} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto font-bold flex items-center justify-center gap-2">
              <span>Pesan Visa lewat Aplikasi</span>
              <ExternalLink className="w-4 h-4" />
            </Button>
          </Link>
          <Link href={whatsappVisaHref} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full sm:w-auto border-[var(--color-gold)] text-[var(--color-gold)] hover:bg-[var(--color-surface)]">
              <MessageCircle className="w-4 h-4" />
              <span>Tanya Admin WhatsApp</span>
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
