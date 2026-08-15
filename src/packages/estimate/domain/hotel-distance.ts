import type { HotelOptionConfig } from '@/shared/types';

export const extractDistanceMeters = (value: string): number | undefined => {
  const normalized = value.toLowerCase().replace(/,/g, '.');
  const km = normalized.match(/(\d+(?:\.\d+)?)\s*(?:km|kilometer)\b/);
  if (km) return Math.round(Number(km[1]) * 1000);

  const meter = normalized.match(/(\d+(?:\.\d+)?)\s*(?:m|meter|metre)\b/);
  if (meter) return Math.round(Number(meter[1]));

  const minuteWalk = normalized.match(/(\d+(?:\.\d+)?)\s*(?:min|menit)/);
  if (minuteWalk) return Math.round(Number(minuteWalk[1]) * 80);
};

export const distanceScore = (
  hotel: Pick<HotelOptionConfig, 'distance' | 'sublabel' | 'label'>,
): number => {
  const text = `${hotel.distance ?? ''} ${hotel.sublabel} ${hotel.label}`.toLowerCase();
  const meters = extractDistanceMeters(text);
  let score = meters ?? 3_000;

  if (/\b(pelataran|ring 1|pinggir)\b/.test(text)) score = Math.min(score, 80);
  if (/\b(jalan kaki|walking|walk|dekat|near)\b/.test(text)) score = Math.min(score, 500);
  if (/\b(shuttle|bus|bis|thakher|aziziyah)\b/.test(text)) score = Math.max(score, 2_500);

  return score;
};
