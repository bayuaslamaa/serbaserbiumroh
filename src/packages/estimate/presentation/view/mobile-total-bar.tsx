'use client';

import type { BreakdownDisplay } from '@/shared/types';

interface MobileTotalBarProps {
  display: BreakdownDisplay;
  waOpen: boolean;
  onWaOpenChange: (open: boolean) => void;
}

const compactRp = (amount: number): string => {
  if (Math.abs(amount) >= 1_000_000) {
    const jt = amount / 1_000_000;
    return `Rp ${jt.toLocaleString('id-ID', { maximumFractionDigits: 2 })} jt`;
  }
  return `Rp ${amount.toLocaleString('id-ID')}`;
};

export const MobileTotalBar = ({ display, waOpen, onWaOpenChange }: MobileTotalBarProps) => {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t px-4 py-3 lg:hidden"
      style={{
        background: 'rgba(11, 28, 18, 0.98)',
        backdropFilter: 'blur(16px)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="flex flex-col leading-tight">
        <span
          className="text-[10px] uppercase tracking-wide"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Total per Orang
        </span>
        <span
          className="text-lg font-bold tabular-nums"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}
        >
          {compactRp(display.totalIdrPax)}
        </span>
      </div>
      <button
        type="button"
        onClick={() => onWaOpenChange(!waOpen)}
        aria-pressed={waOpen}
        className="shrink-0 rounded-md px-4 py-2 text-sm font-medium"
        style={{ background: 'var(--color-gold)', color: 'var(--color-bg)' }}
      >
        {waOpen ? 'Tutup' : 'Kirim WA'}
      </button>
    </div>
  );
};
