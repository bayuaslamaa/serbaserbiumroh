import type { Metadata } from "next"
import { Amiri, DM_Sans } from "next/font/google"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const amiri = Amiri({
  weight: ["400", "700"],
  subsets: ["latin", "arabic"],
  variable: "--font-heading",
  display: "swap",
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Umroh Budget Estimator",
  description: "Estimasi biaya umroh dengan AI — cepat, akurat, mudah disesuaikan",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" className={`${amiri.variable} ${dmSans.variable}`}>
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
