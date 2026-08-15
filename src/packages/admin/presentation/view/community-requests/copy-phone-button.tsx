'use client';

import { useEffect, useState } from 'react';

type CopyPhoneButtonProps = {
  phone: string;
};

type CopyState = 'idle' | 'copied' | 'failed';

const LABELS: Record<CopyState, string> = {
  idle: 'Salin',
  copied: 'Tersalin',
  failed: 'Gagal salin',
};

export const CopyPhoneButton = ({ phone }: CopyPhoneButtonProps) => {
  const [state, setState] = useState<CopyState>('idle');

  useEffect(() => {
    if (state === 'idle') return;
    const timer = setTimeout(() => setState('idle'), 1500);
    return () => clearTimeout(timer);
  }, [state]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(phone);
      setState('copied');
    } catch {
      setState('failed');
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Salin nomor ${phone}`}
      aria-live="polite"
      className="text-xs underline-offset-2 hover:underline"
      style={{ color: state === 'failed' ? '#ef4444' : 'var(--color-text-muted)' }}
    >
      {LABELS[state]}
    </button>
  );
};
