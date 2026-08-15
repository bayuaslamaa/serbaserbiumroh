import type { Props } from '@/packages/panduan/presentation/view/panduan-detail.view';
import {
  getAllGuides,
  getGuideBySlug,
  HTML_PUBLISHED_SLUGS,
} from '@/packages/panduan/domain/panduan';
import { pageMetadata } from '@/shared/seo/metadata';
import { PanduanDetailView } from '@/packages/panduan/presentation/view/panduan-detail.view';

export const generateStaticParams = async () => {
  const guides = getAllGuides();
  return guides.map((g) => ({ slug: g.slug }));
};

export const generateMetadata = async ({ params }: Props) => {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) return {};
  return pageMetadata({
    title: guide.title,
    description: guide.description,
    path: `/panduan/${slug}`,
  });
};

export default PanduanDetailView;
