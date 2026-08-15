import {
  CalendarDays,
  Compass,
  HelpCircle,
  Hotel,
  Mail,
  MessageCircle,
  Newspaper,
  Tags,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const moreLinks: NavLink[] = [
  { href: '/artikel', label: 'Artikel', icon: Newspaper },
  { href: '/cerita-jamaah', label: 'Cerita Jamaah', icon: Users },
  { href: '/hotel-nusuk', label: 'Hotel Nusuk', icon: Hotel },
  { href: '/faq', label: 'FAQ', icon: HelpCircle },
  { href: '/template-email', label: 'Template Email', icon: Mail },
  { href: '/webinar-umroh-mandiri', label: 'Webinar', icon: CalendarDays },
];

export const exploreLinks: NavLink[] = [
  { href: '/panduan', label: 'Panduan', icon: Compass },
  { href: '/artikel', label: 'Artikel', icon: Newspaper },
  { href: '/cerita-jamaah', label: 'Cerita Jamaah', icon: Users },
  { href: '/hotel-nusuk', label: 'Hotel Nusuk', icon: Hotel },
  { href: '/komunitas', label: 'Komunitas', icon: MessageCircle },
  { href: '/webinar-umroh-mandiri', label: 'Webinar', icon: CalendarDays },
  { href: '/template-email', label: 'Template Email', icon: Mail },
  { href: '/faq', label: 'FAQ', icon: HelpCircle },
];

export const memberLinks: NavLink[] = [
  { href: '/pricelist-hotel', label: 'Pricelist Hotel', icon: Tags },
];

export const adminLinks: { href: string; label: string }[] = [
  { href: '/admin/pricing', label: 'Kelola Harga' },
  { href: '/admin/users', label: 'Kelola User' },
  { href: '/admin/community-requests', label: 'Pengajuan Komunitas' },
  { href: '/admin/content/stories', label: 'Kelola Cerita' },
  { href: '/admin/content/hotels', label: 'Kelola Hotel' },
  { href: '/admin/content/faqs', label: 'Kelola FAQ' },
  { href: '/admin/visitor-stats', label: 'Statistik Pengunjung' },
];
