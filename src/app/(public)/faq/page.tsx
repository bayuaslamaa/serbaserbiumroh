import { pageMetadata } from '@/shared/seo/metadata';
import { FaqView } from '@/packages/faq/presentation/view/faq.view';

export const metadata = pageMetadata({
  title: 'FAQ Umroh Mandiri',
  description:
    'Jawaban atas pertanyaan yang paling sering ditanyakan seputar umroh mandiri: biaya, visa, hotel, dokumen, dan alur keberangkatan.',
  path: '/faq',
});

export default FaqView;
