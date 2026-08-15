import { NavBar } from '@/components/organisms/nav-bar';
import { VisitorTracker } from '@/components/organisms/visitor-tracker';
import { requireAuth } from '@/shared/auth/guards';
import { NOINDEX_METADATA } from '@/shared/seo/metadata';

export const metadata = NOINDEX_METADATA;

const DashboardLayout = async ({ children }: { children: React.ReactNode }) => {
  await requireAuth();

  return (
    <div className="min-h-screen">
      <VisitorTracker />
      <NavBar />
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
};

export default DashboardLayout;
