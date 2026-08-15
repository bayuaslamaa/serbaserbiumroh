import { noIndexMetadata } from "@/shared/seo/metadata"

/**
 * The login page is a client component and cannot export metadata itself,
 * so the noindex directive lives here.
 */
export const metadata = noIndexMetadata("Masuk")

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
