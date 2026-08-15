'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Props = {
  id: string;
  isPublished: boolean;
};

export const HotelsTableActions = ({ id, isPublished }: Props) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [localPublished, setLocalPublished] = useState(isPublished);

  const handleDelete = async () => {
    if (!confirm('Hapus hotel ini? Tindakan tidak dapat dibatalkan.')) return;

    startTransition(async () => {
      await fetch(`/api/admin/hotels/${id}`, { method: 'DELETE' });
      router.refresh();
    });
  };

  const handleTogglePublish = async () => {
    startTransition(async () => {
      const res = await fetch(`/api/admin/hotels/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: !localPublished }),
      });
      if (res.ok) {
        const data = await res.json();
        setLocalPublished(data.hotel?.isPublished ?? !localPublished);
        router.refresh();
      }
    });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Link
        href={`/admin/content/hotels/${id}/edit`}
        className="text-xs px-2 py-1 rounded border transition-opacity hover:opacity-80"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
      >
        Edit
      </Link>

      <button
        type="button"
        onClick={handleTogglePublish}
        disabled={isPending}
        className="text-xs px-2 py-1 rounded border transition-opacity hover:opacity-80 disabled:opacity-40"
        style={{
          borderColor: localPublished ? 'rgba(239,68,68,0.5)' : 'rgba(34,197,94,0.5)',
          color: localPublished ? '#ef4444' : '#22c55e',
        }}
      >
        {localPublished ? 'Sembunyikan' : 'Publikasikan'}
      </button>

      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className="text-xs px-2 py-1 rounded border transition-opacity hover:opacity-80 disabled:opacity-40"
        style={{ borderColor: 'rgba(239,68,68,0.5)', color: '#ef4444' }}
      >
        Hapus
      </button>
    </div>
  );
};
