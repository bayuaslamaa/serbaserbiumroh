'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Props = {
  id: string;
  isPublished: boolean;
};

export const StoriesTableActions = ({ id, isPublished }: Props) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [localPublished, setLocalPublished] = useState(isPublished);

  const handleDelete = async () => {
    if (!confirm('Hapus cerita ini? Tindakan tidak dapat dibatalkan.')) return;

    startTransition(async () => {
      await fetch(`/api/admin/stories/${id}`, { method: 'DELETE' });
      router.refresh();
    });
  };

  const handleTogglePublish = async () => {
    startTransition(async () => {
      const res = await fetch(`/api/admin/stories/${id}/publish`, { method: 'PATCH' });
      if (res.ok) {
        const data = await res.json();
        setLocalPublished(data.story?.isPublished ?? !localPublished);
        router.refresh();
      }
    });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Link
        href={`/admin/content/stories/${id}/edit`}
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
