'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/molecules/select';
import { HotelCard } from './hotel-card';
import type { HotelListing } from '@/shared/db/schema';

const CITIES = ['MAKKAH', 'MADINAH'] as const;
const TIERS = ['ECONOMY', 'STANDARD', 'PELATARAN', 'PREMIUM'] as const;

interface HotelFiltersProps {
  hotels: HotelListing[];
  priceMap: Record<string, number>;
}

export const HotelFilters = ({ hotels, priceMap }: HotelFiltersProps) => {
  const [city, setCity] = useState('Semua');
  const [tier, setTier] = useState('Semua');

  const filtered = hotels.filter((hotel) => {
    if (city !== 'Semua' && hotel.city !== city) return false;
    if (tier !== 'Semua' && hotel.tier !== tier) return false;
    return true;
  });

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger
            className="w-44"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'rgba(255,255,255,0.03)',
              color: 'var(--color-text)',
            }}
          >
            <SelectValue placeholder="Kota" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Semua">Semua Kota</SelectItem>
            {CITIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={tier} onValueChange={setTier}>
          <SelectTrigger
            className="w-44"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'rgba(255,255,255,0.03)',
              color: 'var(--color-text)',
            }}
          >
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Semua">Semua Tier</SelectItem>
            {TIERS.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
          Tidak ada hotel yang cocok.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((hotel) => (
            <HotelCard
              key={hotel.id}
              hotel={hotel}
              priceIdrPerNight={priceMap[`${hotel.city}_${hotel.tier}`] ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
};
