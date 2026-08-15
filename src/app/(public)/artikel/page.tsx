import { ARTICLE_REVALIDATE_SECONDS, getArticles } from '@/packages/article/domain/articles';
import { pageMetadata } from '@/shared/seo/metadata';
import { ArtikelView } from '@/packages/article/presentation/view/artikel.view';

export const revalidate = ARTICLE_REVALIDATE_SECONDS;

export const metadata = pageMetadata({
  title: 'Artikel Umroh Mandiri',
  description:
    'Kumpulan artikel seputar umroh mandiri — persiapan, visa, hotel, transportasi, dan pengalaman jamaah.',
  path: '/artikel',
});

export default ArtikelView;
