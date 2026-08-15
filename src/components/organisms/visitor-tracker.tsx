'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const BLACKLIST_PATHS = ['/admin', '/dashboard', '/login', '/api'];

export const VisitorTracker = () => {
  const pathname = usePathname();

  useEffect(() => {
    if (BLACKLIST_PATHS.some((path) => pathname?.startsWith(path))) return;

    fetch('/api/visitor', {
      method: 'POST',
      body: JSON.stringify({ path: pathname }),
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch((err) => {
      console.error('Error tracking visit:', err);
    });
  }, [pathname]);

  return null;
};
