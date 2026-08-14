import type { Metadata } from "next"
import { Amiri, DM_Sans } from "next/font/google"
import Script from "next/script"
import { Toaster } from "@/components/ui/toaster"
import { rootMetadata } from "@/lib/seo/metadata"
import "./globals.css"

// Unset in dev and preview, so local traffic never lands in the property.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID

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

export const metadata: Metadata = rootMetadata

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" className={`${amiri.variable} ${dmSans.variable}`}>
      <body className="antialiased">
        {GA_ID && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
            <Script id="ga4" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}');`}
            </Script>
          </>
        )}
        {children}
        <Toaster />
      </body>
    </html>
  )
}
