import { pageMetadata } from '@/shared/seo/metadata';
import { TemplateEmailView } from '@/packages/email-template/presentation/view/template-email.view';

export const metadata = pageMetadata({
  title: 'Template Email ke Instansi Umroh',
  description:
    'Kumpulan template email siap pakai untuk menghubungi support instansi umroh, termasuk permintaan reset ID Nusuk ke Nusuk Care.',
  path: '/template-email',
});

export default TemplateEmailView;
