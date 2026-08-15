import { SSU_WHATSAPP_NUMBER } from '@/packages/layanan/domain/catalog';

export interface ContactNumber {
  name: string;
  number: string;
}

export const CONTACT_NUMBERS: ContactNumber[] = [
  { name: 'Nurul', number: SSU_WHATSAPP_NUMBER },
  { name: 'Bayu', number: '6285172117757' },
];

export type SocialLabel = 'YouTube' | 'Instagram' | 'TikTok' | 'Facebook Badalin By Bazanyc';

export interface SocialLink {
  label: SocialLabel;
  href: string;
  short: string;
}

export const SOCIAL_LINKS: SocialLink[] = [
  { label: 'YouTube', href: 'https://youtube.com/@serbaserbiumroh', short: 'YT' },
  { label: 'Instagram', href: 'https://www.instagram.com/bayuaslama_', short: 'IG' },
  { label: 'TikTok', href: 'https://www.tiktok.com/@bayuaslama_', short: 'TT' },
  {
    label: 'Facebook Badalin By Bazanyc',
    href: 'https://www.facebook.com/badalinbybazanyc',
    short: 'FB',
  },
];

export const socialHref = (label: SocialLabel): string => {
  const match = SOCIAL_LINKS.find((social) => social.label === label);
  if (!match) throw new Error(`Unknown social profile: ${label}`);
  return match.href;
};

export const displayPhone = (number: string): string => {
  const national = number.replace(/^62/, '');
  return `+62 ${national.replace(/^(\d{3})(\d{4})(\d{4})$/, '$1-$2-$3')}`;
};

export const whatsappLink = (number: string, message?: string): string => {
  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
};
