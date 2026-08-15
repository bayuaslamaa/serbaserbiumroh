'use client';

import { cn } from '@/shared/utils';

interface RadioOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
}

interface RadioCardGridProps {
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  cols?: 2 | 4;
}

export const RadioCardGrid = ({ options, value, onChange, cols = 4 }: RadioCardGridProps) => {
  return (
    <div className={cn('grid gap-2', cols === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2')}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-md border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]',
              selected
                ? 'border-[var(--color-gold)] bg-[rgba(201,168,76,0.08)]'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-gold-muted)]',
            )}
          >
            <div className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              {opt.label}
            </div>
            {opt.sublabel && (
              <div className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                {opt.sublabel}
              </div>
            )}
            {opt.badge && (
              <div className="text-xs mt-1 font-medium" style={{ color: 'var(--color-gold)' }}>
                {opt.badge}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};
