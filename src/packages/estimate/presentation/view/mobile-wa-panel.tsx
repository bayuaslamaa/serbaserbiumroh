'use client';

import { useState } from 'react';
import type { BreakdownDisplay, EstimateParams } from '@/shared/types';
import { buildWhatsAppMessage } from '@/packages/estimate/domain/whatsapp';

interface MobileWaPanelProps {
  display: BreakdownDisplay;
  params: EstimateParams;
  pax: number;
}

export const MobileWaPanel = ({ display, params, pax }: MobileWaPanelProps) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(buildWhatsAppMessage(display, params, pax));
      setCopyStatus('copied');
      window.setTimeout(() => setCopyStatus('idle'), 1800);
    } catch {
      setCopyStatus('error');
    }
  };

  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-3"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
    >
      <span className="text-sm font-medium" style={{ color: 'var(--color-gold)' }}>
        Pratinjau Pesan WhatsApp
      </span>
      <pre
        className="whitespace-pre-wrap rounded-lg border p-3 text-xs leading-relaxed"
        style={{
          borderColor: 'var(--color-border)',
          background: 'rgba(0,0,0,0.25)',
          color: 'var(--color-text)',
        }}
      >
        {buildWhatsAppMessage(display, params, pax)}
      </pre>
      <button
        type="button"
        onClick={copyMessage}
        className="text-xs px-3 py-2 rounded border self-start transition-colors min-h-11"
        style={{
          borderColor: copyStatus === 'copied' ? 'var(--color-gold)' : 'var(--color-border)',
          color:
            copyStatus === 'error'
              ? '#ef4444'
              : copyStatus === 'copied'
                ? 'var(--color-gold)'
                : 'var(--color-text-muted)',
        }}
        aria-label="Salin pesan WhatsApp"
      >
        {copyStatus === 'copied' ? 'Tersalin' : copyStatus === 'error' ? 'Gagal' : 'Salin pesan'}
      </button>
    </div>
  );
};
