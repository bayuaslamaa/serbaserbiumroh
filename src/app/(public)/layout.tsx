import { NavBar } from '@/components/organisms/nav-bar';
import { SiteFooter } from '@/components/organisms/site-footer';
import { VisitorTracker } from '@/components/organisms/visitor-tracker';
import { WhatsAppFloatingButton } from '@/components/molecules/whats-app-floating-button';
import { JsonLd } from '@/components/atoms/json-ld';
import { buildOrganizationSchema, buildWebSiteSchema } from '@/shared/seo/schema';

const PublicLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen overflow-x-clip">
      <JsonLd data={buildOrganizationSchema()} />
      <JsonLd data={buildWebSiteSchema()} />
      <VisitorTracker />
      <NavBar />
      <main className="container mx-auto px-4 py-6">{children}</main>
      <SiteFooter />
      <WhatsAppFloatingButton />
    </div>
  );
};

export default PublicLayout;
