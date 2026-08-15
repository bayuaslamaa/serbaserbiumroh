import { noIndexMetadata } from '@/shared/seo/metadata';

export const metadata = noIndexMetadata('Masuk');

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default AuthLayout;
