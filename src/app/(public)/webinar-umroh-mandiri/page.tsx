import { pageMetadata } from '@/shared/seo/metadata';
import {
  WEBINAR_ACCESS_NOTE,
  WEBINAR_DATE_LABEL,
  WEBINAR_PATH,
  WEBINAR_TIME_LABEL,
} from '@/packages/webinar/domain/webinar';
import { WebinarUmrohMandiriView } from '@/packages/webinar/presentation/view/webinar-umroh-mandiri.view';

export const metadata = pageMetadata({
  title: 'Webinar Umroh Mandiri',
  description: `RSVP webinar Umroh Mandiri ${WEBINAR_DATE_LABEL} untuk user terdaftar.`,
  path: WEBINAR_PATH,
});

export default WebinarUmrohMandiriView;
