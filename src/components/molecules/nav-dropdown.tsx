'use client';

import * as React from 'react';

export type NavMenuId = 'layanan' | 'more' | 'account';

export const useSingleOpenMenu = () => {
  const [openId, setOpenId] = React.useState<NavMenuId | null>(null);

  const close = React.useCallback(() => setOpenId(null), []);
  const toggle = React.useCallback(
    (id: NavMenuId) => setOpenId((current) => (current === id ? null : id)),
    [],
  );

  React.useEffect(() => {
    if (!openId) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest?.('[data-nav-menu]')) close();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openId, close]);

  return { openId, toggle, close };
};

const panelSurface = {
  background: 'rgba(11, 28, 18, 0.98)',
  borderColor: 'var(--color-border)',
  backdropFilter: 'blur(12px)',
  boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5)',
} as const;

export const MenuPanel = ({
  align = 'left',
  width,
  children,
}: {
  align?: 'left' | 'right';
  width: string;
  children: React.ReactNode;
}) => {
  return (
    <div
      role="menu"
      className={`absolute top-[calc(100%+6px)] z-50 max-h-[calc(100dvh-5rem)] animate-fade-down overflow-y-auto rounded-[10px] border p-1.5 ${
        align === 'right' ? 'right-0' : 'left-0'
      }`}
      style={{ ...panelSurface, width }}
    >
      {children}
    </div>
  );
};

export const menuItemClass =
  'flex w-full items-center gap-2.5 rounded-[7px] px-3 py-2.5 text-sm text-text-muted transition-colors hover:bg-white/[0.04] hover:text-text';

export const MegaPanel = ({ children }: { children: React.ReactNode }) => {
  return (
    <div
      className="absolute inset-x-0 top-full z-40 animate-fade-down border-b"
      style={{
        background: 'rgba(11, 28, 18, 0.98)',
        borderColor: 'rgba(201, 168, 76, 0.25)',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.55)',
      }}
    >
      {children}
    </div>
  );
};
