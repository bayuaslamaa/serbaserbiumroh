import { NavBar } from "@/components/nav/nav-bar"
import { SiteFooter } from "@/components/nav/site-footer"
import { VisitorTracker } from "@/components/nav/visitor-tracker"
import { WhatsAppFloatingButton } from "@/components/ui/whats-app-floating-button"
import { JsonLd } from "@/components/seo/json-ld"
import { buildOrganizationSchema, buildWebSiteSchema } from "@/shared/seo/schema"

/**
 * `overflow-x-clip` on the root absorbs the scrollbar gutter that a 100vw
 * full-bleed section (see components/home/FullBleed.tsx) would otherwise turn
 * into a sliver of horizontal scroll on every public page. `clip` and not
 * `hidden`: `hidden` would make this a scroll container and break the sticky
 * navbar inside it.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-clip">
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
      <SiteFooter />
      <WhatsAppFloatingButton />
    </div>
  )
}

