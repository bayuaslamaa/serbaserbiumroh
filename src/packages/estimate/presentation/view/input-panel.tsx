'use client';

import { Button } from '@/components/atoms/button';
import { Textarea } from '@/components/atoms/textarea';

const EXAMPLES = [
  '12 hari, 2 pax, Nov, Madinah 4 mlm Kayan, Makkah 8 mlm Olayan Ajyad, double, fullboard',
  '9 hari, 4 pax, Mar, hotel standard Makkah+Madinah, quad, Saudia, visa+transport',
  '14 hari, 2 pax, Ramadhan, hotel pelataran, double, Garuda, visa+siskopatuh+tasreh',
];

const PLACEHOLDER =
  'Contoh: Umroh 12 hari untuk 2 orang bulan November. Madinah 4 malam di Kayan Hotel, Makkah 8 malam di Olayan Ajyad, kamar double, fullboard, Saudia, tambah visa+siskopatuh+transport, tanpa tour.';

export const ENHANCED_TOGGLE_LABEL = 'Pakai harga katalog (lebih lambat)';
export const ENHANCED_TOGGLE_HELP =
  'Hotel dipilih dari tarif katalog asli untuk bulan yang diminta. Berguna saat ada batas budget atau bulan tertentu. Perlu ~15-20 detik.';

interface InputPanelProps {
  value: string;
  onChange: (v: string) => void;
  onParse: () => void;
  loading: boolean;
  visible?: boolean;
  onCancel?: () => void;
  enhanced?: boolean;
  onEnhancedChange?: (v: boolean) => void;
}

export const InputPanel = ({
  value,
  onChange,
  onParse,
  loading,
  visible = true,
  onCancel,
  enhanced = false,
  onEnhancedChange,
}: InputPanelProps) => {
  if (!visible) return null;

  return (
    <div
      className="rounded-xl border p-5 flex flex-col gap-4"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
            style={{ background: 'var(--color-gold)', color: 'var(--color-bg)' }}
            aria-hidden="true"
          >
            1
          </span>
          <div>
            <h2
              className="text-lg font-bold mb-1"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}
            >
              Deskripsi Perjalanan
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Ceritakan rencana umroh Anda, biarkan sistem kami mengisi detailnya.
            </p>
          </div>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs underline underline-offset-2 shrink-0"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Batal
          </button>
        )}
      </div>

      <Textarea
        placeholder={PLACEHOLDER}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[120px] resize-y"
        style={{
          background: 'rgba(0,0,0,0.2)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text)',
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onParse();
        }}
      />

      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => onChange(ex)}
            className="text-xs px-2 py-1 rounded-full border transition-colors hover:border-[var(--color-gold)]"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
          >
            {ex.slice(0, 40)}…
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <Button onClick={onParse} disabled={loading} className="w-full sm:w-auto sm:shrink-0">
          {loading ? 'Menganalisis…' : 'Hitung Estimasi'}
        </Button>

        {onEnhancedChange && (
          <div className="min-w-0">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enhanced}
                onChange={(e) => onEnhancedChange(e.target.checked)}
                disabled={loading}
                aria-describedby="enhanced-parse-help"
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-gold)]"
              />
              <span className="text-sm" style={{ color: 'var(--color-text)' }}>
                {ENHANCED_TOGGLE_LABEL}
              </span>
            </label>
            <p
              id="enhanced-parse-help"
              className="mt-1 text-xs leading-snug"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {ENHANCED_TOGGLE_HELP}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
