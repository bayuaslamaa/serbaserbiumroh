import { FaqList } from '@/packages/faq/presentation/view/faq-list';
import { JsonLd } from '@/components/atoms/json-ld';
import { getPublishedFaqGroups } from '@/packages/faq/domain/faq';
import { buildFaqPageSchema } from '@/shared/seo/schema';

export const FaqView = async () => {
  const groups = await getPublishedFaqGroups();

  const faqSchema = buildFaqPageSchema(
    groups.flatMap((group) => group.items.map(({ question, answer }) => ({ question, answer }))),
  );

  return (
    <main className="container mx-auto px-4 py-12">
      {faqSchema && <JsonLd data={faqSchema} />}
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}
          >
            FAQ Umroh Mandiri
          </h1>
          <p className="mt-3 text-base" style={{ color: 'var(--color-text-muted)' }}>
            Pertanyaan yang sering ditanyakan tentang estimasi biaya, hotel, dokumen, dan alur umroh
            mandiri.
          </p>
        </div>

        {groups.length === 0 ? (
          <div
            className="rounded-lg border p-8 text-center text-sm"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
          >
            FAQ belum tersedia.
          </div>
        ) : (
          <FaqList groups={groups} />
        )}
      </div>
    </main>
  );
};
