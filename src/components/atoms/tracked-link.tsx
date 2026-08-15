'use client';

import { track } from '@/shared/analytics';

type TrackedLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  event: string;
  params?: Record<string, unknown>;
};

export const TrackedLink = ({ event, params, onClick, children, ...rest }: TrackedLinkProps) => {
  return (
    <a
      {...rest}
      onClick={(e) => {
        track(event, params);
        onClick?.(e);
      }}
    >
      {children}
    </a>
  );
};
