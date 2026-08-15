import Link from 'next/link';
import { asc, eq } from 'drizzle-orm';
import { Badge } from '@/components/atoms/badge';
import { FaqGroupForm } from '@/packages/admin/presentation/view/faqs/faq-group-form';
import { FaqImportPanel } from '@/packages/admin/presentation/view/faqs/faq-import-panel';
import { requireAdmin } from '@/shared/auth/guards';
import { db } from '@/shared/db';
import { faqGroups, faqItems } from '@/shared/db/schema';
import { FaqTableActions } from './faq-table-actions';

const truncate = (text: string, length = 90) => {
  if (text.length <= length) return text;
  return `${text.slice(0, length).trim()}...`;
};

export const AdminContentFaqsView = async () => {
  await requireAdmin();

  const [groups, faqs] = await Promise.all([
    db.select().from(faqGroups).orderBy(asc(faqGroups.sortOrder), asc(faqGroups.name)),
    db
      .select({
        id: faqItems.id,
        groupId: faqItems.groupId,
        groupName: faqGroups.name,
        question: faqItems.question,
        answer: faqItems.answer,
        sortOrder: faqItems.sortOrder,
        isPublished: faqItems.isPublished,
      })
      .from(faqItems)
      .innerJoin(faqGroups, eq(faqItems.groupId, faqGroups.id))
      .orderBy(asc(faqGroups.sortOrder), asc(faqItems.sortOrder), asc(faqItems.question)),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}
          >
            FAQ
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {faqs.length} pertanyaan tersimpan, {faqs.filter((faq) => faq.isPublished).length}{' '}
            publik.
          </p>
        </div>
        <Link
          href="/admin/content/faqs/new"
          className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
          style={{ background: 'var(--color-gold)', color: '#1a1206' }}
        >
          + Tambah FAQ
        </Link>
      </div>

      <FaqGroupForm groups={groups} />
      <FaqImportPanel />

      <div
        className="overflow-x-auto rounded-lg border"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
      >
        <table className="w-full min-w-[820px]">
          <thead style={{ background: 'rgba(0,0,0,0.2)' }}>
            <tr>
              {['Pertanyaan', 'Grup', 'Jawaban', 'Urutan', 'Status', 'Aksi'].map((heading) => (
                <th
                  key={heading}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {faqs.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-sm italic"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  Belum ada FAQ. Tambahkan pertanyaan pertama.
                </td>
              </tr>
            )}
            {faqs.map((faq) => (
              <tr key={faq.id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                <td
                  className="px-4 py-3 text-sm font-medium"
                  style={{ color: 'var(--color-text)' }}
                >
                  {faq.question}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {faq.groupName}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {truncate(faq.answer)}
                </td>
                <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  {faq.sortOrder}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={faq.isPublished ? 'default' : 'secondary'} className="text-xs">
                    {faq.isPublished ? 'Publik' : 'Draft'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <FaqTableActions id={faq.id} isPublished={faq.isPublished} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
