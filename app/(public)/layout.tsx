import { NavBar } from "@/components/nav/NavBar"
import { VisitorTracker } from "@/components/nav/VisitorTracker"
import { WhatsAppFloatingButton } from "@/components/ui/WhatsAppFloatingButton"
import { JsonLd } from "@/components/seo/JsonLd"
import { buildOrganizationSchema, buildWebSiteSchema } from "@/lib/seo/schema"

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      {/*
        Site-level schema lives here rather than in the root layout so it
        applies to public pages only -- the dashboard and admin areas are
        noindex and have no business emitting Organization markup.
      */}
      <JsonLd data={buildOrganizationSchema()} />
      <JsonLd data={buildWebSiteSchema()} />
      <VisitorTracker />
      <NavBar />
      <main className="container mx-auto px-4 py-6">{children}</main>
      <WhatsAppFloatingButton />
    </div>
  )
}

