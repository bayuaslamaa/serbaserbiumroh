'use client';

import { useState } from 'react';
import type { BreakdownDisplay, BreakdownDisplayRow, EstimateParams } from '@/shared/types';
import { HOTEL_MADINAH_ROW_KEY, HOTEL_MAKKAH_ROW_KEY, FLIGHT_ROW_KEY } from '@/shared/types';
import { Button } from '@/components/atoms/button';
import { rp } from '@/packages/estimate/domain/summary';
import { buildWhatsAppMessage } from '@/packages/estimate/domain/whatsapp';

interface EstimatorRailProps {
  display: BreakdownDisplay;
  pax: number;
  params: EstimateParams;
  onSave: () => void;
  saveLabel: string;
  saveDisabled?: boolean;
  waOpen: boolean;
  onWaOpenChange: (open: boolean) => void;
}

interface CategoryBucket {
  key: 'hotel' | 'flight' | 'services';
  label: string;
  amount: number;
}

const isHotelRow = (row: BreakdownDisplayRow): boolean => {
  return row.key === HOTEL_MADINAH_ROW_KEY || row.key === HOTEL_MAKKAH_ROW_KEY || !!row.hotelDetail;
};

const categoryBuckets = (display: BreakdownDisplay): CategoryBucket[] => {
  let hotel = 0;
  let flight = 0;
  let services = 0;
  for (const row of display.rows) {
    if (row.hidden) continue;
    if (isHotelRow(row)) hotel += row.idr;
    else if (row.key === FLIGHT_ROW_KEY) flight += row.idr;
    else services += row.idr;
  }
  return [
    { key: 'hotel', label: 'Hotel Madinah & Makkah', amount: hotel },
    { key: 'flight', label: 'Penerbangan', amount: flight },
    { key: 'services', label: 'Visa & layanan', amount: services },
  ];
};

const CategoryBreakdownBar = ({ display }: { display: BreakdownDisplay }) => {
  const buckets = categoryBuckets(display);
  const max = Math.max(...buckets.map((b) => b.amount));

  return (
    <div className="flex flex-col gap-2.5">
      {buckets.map((b) => (
        <div key={b.key} className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span style={{ color: 'var(--color-text-muted)' }}>{b.label}</span>
            <span className="tabular-nums" style={{ color: 'var(--color-text)' }}>
              {rp(b.amount)}
            </span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <div
              data-testid={`category-bar-${b.key}`}
              className="h-full rounded-full"
              style={{
                width: `${max > 0 ? (b.amount / max) * 100 : 0}%`,
                background: 'var(--color-gold)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export const EstimatorRail = ({
  display,
  pax,
  params,
  onSave,
  saveLabel,
  saveDisabled,
  waOpen,
  onWaOpenChange,
}: EstimatorRailProps) => {
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
    <div className="lg:sticky lg:top-20 flex flex-col gap-4 self-start">
      <div
        className="rounded-xl border p-5 flex flex-col gap-1"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      >
        <span
          className="text-xs uppercase tracking-wide"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Total per Orang
        </span>
        <span
          className="text-3xl font-bold tabular-nums"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}
        >
          {rp(display.totalIdrPax)}
        </span>
        {pax > 1 && (
          <span className="text-sm tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
            Total {pax} orang:{' '}
            <span style={{ color: 'var(--color-gold)' }}>{rp(display.totalIdrGrp)}</span>
          </span>
        )}
      </div>

      <div
        className="rounded-xl border p-5"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      >
        <CategoryBreakdownBar display={display} />
      </div>

      <Button onClick={onSave} className="w-full" size="lg" disabled={saveDisabled}>
        {saveLabel}
      </Button>

      <div
        className="rounded-xl border p-4 flex flex-col gap-3"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      >
        <button
          type="button"
          onClick={() => onWaOpenChange(!waOpen)}
          className="flex items-center justify-between text-sm font-medium"
          style={{ color: 'var(--color-gold)' }}
          aria-expanded={waOpen}
        >
          Pratinjau Pesan WhatsApp
          <span aria-hidden="true">{waOpen ? '−' : '+'}</span>
        </button>

        {waOpen && (
          <div className="flex flex-col gap-3">
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
              className="text-xs px-3 py-1.5 rounded border self-start transition-colors"
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
              {copyStatus === 'copied'
                ? 'Tersalin'
                : copyStatus === 'error'
                  ? 'Gagal'
                  : 'Salin pesan'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
