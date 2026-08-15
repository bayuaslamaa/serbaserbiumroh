'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type FaqGroup = {
  id: string;
  name: string;
  sortOrder: number;
};

type FaqGroupFormProps = {
  groups: FaqGroup[];
};

export const FaqGroupForm = ({ groups }: FaqGroupFormProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newName, setNewName] = useState('');
  const [newSortOrder, setNewSortOrder] = useState('0');
  const [drafts, setDrafts] = useState(() =>
    Object.fromEntries(
      groups.map((group) => [group.id, { name: group.name, sortOrder: String(group.sortOrder) }]),
    ),
  );
  const [error, setError] = useState<string | null>(null);

  const submitJson = async (url: string, method: string, payload?: unknown) => {
    const res = await fetch(url, {
      method,
      headers: payload ? { 'Content-Type': 'application/json' } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? 'Terjadi kesalahan.');
    }
  };

  const createGroup = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        await submitJson('/api/admin/faqs/groups', 'POST', {
          name: newName,
          sortOrder: Number.parseInt(newSortOrder, 10) || 0,
        });
        setNewName('');
        setNewSortOrder('0');
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
      }
    });
  };

  const updateGroup = (groupId: string) => {
    const draft = drafts[groupId];
    if (!draft) return;
    setError(null);

    startTransition(async () => {
      try {
        await submitJson(`/api/admin/faqs/groups/${groupId}`, 'PUT', {
          name: draft.name,
          sortOrder: Number.parseInt(draft.sortOrder, 10) || 0,
        });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
      }
    });
  };

  const deleteGroup = (groupId: string) => {
    if (!window.confirm('Hapus grup FAQ ini? Grup berisi FAQ tidak bisa dihapus.')) return;
    setError(null);

    startTransition(async () => {
      try {
        await submitJson(`/api/admin/faqs/groups/${groupId}`, 'DELETE');
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
      }
    });
  };

  const inputClass = 'rounded-md border px-3 py-2 text-sm outline-none focus:ring-2';
  const inputStyle = {
    borderColor: 'var(--color-border)',
    background: 'rgba(255,255,255,0.03)',
    color: 'var(--color-text)',
  };

  return (
    <section
      className="space-y-4 rounded-lg border p-5"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
    >
      <div>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-gold)' }}>
          Grup FAQ
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Atur kategori dan urutan tampil FAQ publik.
        </p>
      </div>

      {error && (
        <p className="text-sm" style={{ color: '#ef4444' }}>
          {error}
        </p>
      )}

      <form onSubmit={createGroup} className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_120px_auto]">
        <input
          className={inputClass}
          style={inputStyle}
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="Nama grup"
          required
        />
        <input
          type="number"
          className={inputClass}
          style={inputStyle}
          value={newSortOrder}
          onChange={(event) => setNewSortOrder(event.target.value)}
          aria-label="Urutan grup baru"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60"
          style={{ background: 'var(--color-gold)', color: '#1a1206' }}
        >
          Tambah Grup
        </button>
      </form>

      <div className="space-y-2">
        {groups.length === 0 && (
          <p className="text-sm italic" style={{ color: 'var(--color-text-muted)' }}>
            Belum ada grup FAQ.
          </p>
        )}
        {groups.map((group) => {
          const draft = drafts[group.id] ?? {
            name: group.name,
            sortOrder: String(group.sortOrder),
          };
          return (
            <div
              key={group.id}
              className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_120px_auto_auto]"
            >
              <input
                className={inputClass}
                style={inputStyle}
                value={draft.name}
                onChange={(event) =>
                  setDrafts((current) => ({
                    ...current,
                    [group.id]: { ...draft, name: event.target.value },
                  }))
                }
              />
              <input
                type="number"
                className={inputClass}
                style={inputStyle}
                value={draft.sortOrder}
                onChange={(event) =>
                  setDrafts((current) => ({
                    ...current,
                    [group.id]: { ...draft, sortOrder: event.target.value },
                  }))
                }
                aria-label={`Urutan ${group.name}`}
              />
              <button
                type="button"
                onClick={() => updateGroup(group.id)}
                disabled={isPending}
                className="rounded-md border px-3 py-2 text-sm disabled:opacity-60"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                Simpan
              </button>
              <button
                type="button"
                onClick={() => deleteGroup(group.id)}
                disabled={isPending}
                className="rounded-md border px-3 py-2 text-sm disabled:opacity-60"
                style={{ borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444' }}
              >
                Hapus
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
};
