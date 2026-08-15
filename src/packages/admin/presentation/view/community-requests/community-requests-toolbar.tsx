'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/atoms/input';
import type { RawSearchParams } from '@/packages/community/admin-requests/domain/admin-requests-query';
import { buildAdminRequestsHref } from '@/packages/community/admin-requests/domain/admin-requests-url';

const SEARCH_DEBOUNCE_MS = 300;

type CommunityRequestsToolbarProps = {
  q: string;
};

export const CommunityRequestsToolbar = ({ q }: CommunityRequestsToolbarProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [term, setTerm] = useState(q);

  const pushedRef = useRef(q);

  const current = useMemo<RawSearchParams>(
    () => Object.fromEntries(searchParams.entries()),
    [searchParams],
  );

  const currentRef = useRef(current);
  currentRef.current = current;

  useEffect(() => {
    if (q === pushedRef.current) return;
    pushedRef.current = q;
    setTerm(q);
  }, [q]);

  useEffect(() => {
    if (term === q) return;

    const timer = setTimeout(() => {
      pushedRef.current = term;
      router.replace(buildAdminRequestsHref(currentRef.current, { q: term || null }));
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [term, q, router]);

  return (
    <div>
      <label htmlFor="community-request-search" className="sr-only">
        Cari nama, nomor telepon, atau username sosial
      </label>
      <Input
        id="community-request-search"
        type="search"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Cari nama, nomor, atau username..."
        className="h-9 max-w-md text-sm"
      />
    </div>
  );
};
