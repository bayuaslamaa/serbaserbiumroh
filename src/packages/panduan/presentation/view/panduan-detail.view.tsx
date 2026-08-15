import { notFound } from 'next/navigation';
import {
  getAllGuides,
  getGuideBySlug,
  HTML_PUBLISHED_SLUGS,
} from '@/packages/panduan/domain/panduan';
import { GuideSidebar } from '@/packages/panduan/presentation/view/guide-sidebar';
import { ArabicText, Callout } from '@/packages/panduan/presentation/view/mdx-components';
import { PdfViewer } from '@/packages/panduan/presentation/view/pdf-viewer';

export interface Props {
  params: Promise<{ slug: string }>;
}

const PDF_MAPPING: Record<string, string> = {
  'panduan-umroh-mandiri': '/pdf/panduan-umroh-mandiri.pdf',
  'manasik-umroh': '/pdf/manasik-umroh.pdf',
  'doa-dzikir-umroh': '/pdf/doa-dzikir-umroh.pdf',
};

const MDX_MODULES: Record<string, () => Promise<{ default: React.ComponentType }>> = {
  'persiapan/panduan-umroh-mandiri.mdx': () =>
    import('@/shared/content/panduan/persiapan/panduan-umroh-mandiri.mdx'),
  'manasik/manasik-umroh.mdx': () => import('@/shared/content/panduan/manasik/manasik-umroh.mdx'),
  'doa-dzikir/doa-dzikir-umroh.mdx': () =>
    import('@/shared/content/panduan/doa-dzikir/doa-dzikir-umroh.mdx'),
};

export const PanduanDetailView = async ({ params }: Props) => {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) notFound();

  const allGuides = getAllGuides();
  const pdfUrl = PDF_MAPPING[slug];

  if (pdfUrl && !HTML_PUBLISHED_SLUGS.has(slug)) {
    return (
      <div className="max-w-5xl mx-auto flex gap-8">
        <GuideSidebar guides={allGuides} />
        <PdfViewer title={guide.title} description={guide.description} pdfUrl={pdfUrl} />
      </div>
    );
  }

  const loader = MDX_MODULES[guide.filePath];
  if (!loader) notFound();

  const mod = await loader();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Content = mod.default as React.ComponentType<any>;

  return (
    <div className="max-w-5xl mx-auto flex gap-8">
      <GuideSidebar guides={allGuides} />
      <article
        className="flex-1 min-w-0 prose prose-invert max-w-none"
        style={{ color: 'var(--color-text)' }}
      >
        <Content components={{ ArabicText, Callout }} />

        {pdfUrl && (
          <p
            className="not-prose mt-10 border-t pt-6 text-sm"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded border px-3 py-2 font-medium"
              style={{
                borderColor: 'var(--color-gold)',
                color: 'var(--color-gold)',
                backgroundColor: 'rgba(201, 168, 76, 0.05)',
              }}
            >
              Unduh versi PDF
            </a>
          </p>
        )}
      </article>
    </div>
  );
};
