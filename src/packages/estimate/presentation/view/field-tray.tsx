'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface FieldTrayProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export const FieldTray = ({ title, onClose, children }: FieldTrayProps) => {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const firstFocusable = bodyRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    firstFocusable?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="rounded-xl border p-5 flex flex-col gap-4"
      style={{ borderColor: 'var(--color-gold-muted)', background: 'var(--color-surface)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <h3
          className="text-sm font-bold"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}
        >
          {title}
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div ref={bodyRef} className="flex flex-col gap-4">
        {children}
      </div>
    </div>
  );
};
