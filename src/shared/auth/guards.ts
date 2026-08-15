import { auth } from '@/shared/auth/next-auth';
import { redirect } from 'next/navigation';

export const getSession = async () => {
  return await auth();
};

export const requireAuth = async () => {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  return session;
};

export const requireAdmin = async () => {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }
  return session;
};
