'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { FaqImportParseResult } from '@/packages/admin/domain/faq-import';

type FaqImportPanelProps = {
  onImported?: () => void;
};

export const FaqImportPanel = ({ onImported }: FaqImportPanelProps) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState<FaqImportParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewPending, startPreviewTransition] = useTransition();
  const [isConfirmPending, startConfirmTransition] = useTransition();

  const canConfirm =
    !!preview &&
    preview.summary.conflict === 0 &&
    preview.summary.create + preview.summary.update > 0;

  const postImport = async (url: string) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? 'Terjadi kesalahan.');
    return data;
  };

  const previewImport = () => {
    setError(null);
    startPreviewTransition(async () => {
      try {
        const data = await postImport('/api/admin/faqs/import/preview');
        setPreview(data.preview);
      } catch (err) {
        setPreview(null);
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
      }
    });
  };

  const confirmImport = () => {
    setError(null);
    startConfirmTransition(async () => {
      try {
        const data = await postImport('/api/admin/faqs/import/confirm');
        setPreview(data.preview);
        onImported?.();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
      }
    });
  };

  const loading = isPreviewPending || isConfirmPending;

  return (
    <section
      className="rounded-lg border"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
    >
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span>
          <span className="block text-lg font-semibold" style={{ color: 'var(--color-gold)' }}>
            Import FAQ CSV
          </span>
          <span className="mt-1 block text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Buat atau perbarui banyak Q&A sekaligus. Publish dan urutan tetap diatur manual.
          </span>
        </span>
        <span className="text-sm font-semibold" style={{ color: 'var(--color-text-muted)' }}>
          {isOpen ? 'Tutup' : 'Buka'}
        </span>
      </button>

      {isOpen && (
        <div className="space-y-4 border-t p-5" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Kolom CSV: group, question, answer.
            </p>
            <a
              href="/api/admin/faqs/import/template"
              className="text-sm font-semibold underline underline-offset-4"
              style={{ color: 'var(--color-gold)' }}
            >
              Download Template
            </a>
          </div>

          <textarea
            value={csv}
            onChange={(event) => {
              setCsv(event.target.value);
              setPreview(null);
            }}
            placeholder="Tempel isi CSV FAQ di sini..."
            className="min-h-[180px] w-full rounded-md border px-3 py-2 font-mono text-xs outline-none focus:ring-2"
            style={{
              borderColor: 'var(--color-border)',
              background: 'rgba(255,255,255,0.03)',
              color: 'var(--color-text)',
            }}
          />

          {error && (
            <p className="text-sm" style={{ color: '#ef4444' }}>
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={previewImport}
              disabled={loading || csv.trim().length === 0}
              className="rounded-md border px-4 py-2 text-sm font-semibold disabled:opacity-60"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
            >
              {isPreviewPending ? 'Memeriksa...' : 'Preview'}
            </button>
            <button
              type="button"
              onClick={confirmImport}
              disabled={!canConfirm || loading}
              className="rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60"
              style={{ background: 'var(--color-gold)', color: '#1a1206' }}
            >
              {isConfirmPending ? 'Mengimpor...' : 'Konfirmasi Import'}
            </button>
          </div>

          {preview && <FaqImportPreview preview={preview} />}
        </div>
      )}
    </section>
  );
};

const FaqImportPreview = ({ preview }: { preview: FaqImportParseResult }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ['Baru', preview.summary.create],
          ['Update', preview.summary.update],
          ['Invalid', preview.summary.invalid],
          ['Konflik', preview.summary.conflict],
          ['Grup Baru', preview.groupSummary.create],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-md border p-3"
            style={{ borderColor: 'var(--color-border)', background: 'rgba(255,255,255,0.02)' }}
          >
            <div
              className="text-xs uppercase tracking-wide"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {label}
            </div>
            <div className="mt-1 text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {preview.fileErrors.length > 0 && (
        <div
          className="rounded-md border p-3 text-sm"
          style={{ borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444' }}
        >
          {preview.fileErrors.join('; ')}
        </div>
      )}

      <div
        className="overflow-x-auto rounded-md border"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <table className="w-full min-w-[760px] text-sm">
          <thead style={{ background: 'rgba(0,0,0,0.2)' }}>
            <tr>
              {['Row', 'Status', 'Grup', 'Pertanyaan', 'Catatan'].map((heading) => (
                <th
                  key={heading}
                  className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row) => (
              <tr
                key={row.rowNumber}
                className="border-t"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <td className="px-3 py-2" style={{ color: 'var(--color-text-muted)' }}>
                  {row.rowNumber}
                </td>
                <td className="px-3 py-2 font-semibold" style={{ color: statusColor(row.status) }}>
                  {row.status}
                </td>
                <td className="px-3 py-2" style={{ color: 'var(--color-text-muted)' }}>
                  {row.data?.groupName ?? '-'}
                  {row.data?.willCreateGroup ? ' (baru)' : ''}
                </td>
                <td className="px-3 py-2" style={{ color: 'var(--color-text)' }}>
                  {row.data?.question ?? '-'}
                </td>
                <td className="px-3 py-2" style={{ color: 'var(--color-text-muted)' }}>
                  {row.errors.length > 0
                    ? row.errors.join('; ')
                    : row.status === 'update'
                      ? 'Akan memperbarui FAQ existing'
                      : row.data?.willCreateGroup
                        ? 'Akan membuat grup dan FAQ draft'
                        : 'Akan membuat FAQ draft'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const statusColor = (status: string) => {
  if (status === 'invalid' || status === 'conflict') return '#ef4444';
  if (status === 'update') return 'var(--color-gold)';
  return 'var(--color-text)';
};
