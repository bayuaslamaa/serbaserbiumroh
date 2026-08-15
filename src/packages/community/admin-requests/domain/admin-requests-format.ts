const relativeFormatter = new Intl.RelativeTimeFormat('id-ID', { numeric: 'auto' });

const absoluteFormatter = new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

export const formatRelativeTime = (date: Date, now: Date = new Date()): string => {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const magnitude = Math.abs(seconds);

  for (const [unit, size] of UNITS) {
    if (magnitude >= size) return relativeFormatter.format(Math.round(seconds / size), unit);
  }

  return relativeFormatter.format(Math.round(seconds), 'second');
};

export const formatAbsoluteDateTime = (date: Date): string => {
  return absoluteFormatter.format(date);
};

export const formatPhoneDisplay = (phone: string): string => {
  if (!/^\d+$/.test(phone)) return phone;
  return phone.replace(/(\d{4})(?=\d)/g, '$1-');
};

export const whatsappHref = (normalizedPhone: string): string => {
  return `https://wa.me/${normalizedPhone}`;
};
