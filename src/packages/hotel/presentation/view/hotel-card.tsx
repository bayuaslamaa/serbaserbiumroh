import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/molecules/card';
import { Badge } from '@/components/atoms/badge';
import type { HotelListing } from '@/shared/db/schema';

interface HotelCardProps {
  hotel: HotelListing;
  priceIdrPerNight: number | null;
  isAdmin?: boolean;
}

const formatDistance = (meters: number | null): string => {
  if (meters === null) return '';
  if (meters < 1000) return `${meters} m dari Haram`;
  return `${(meters / 1000).toFixed(1)} km dari Haram`;
};

const formatIdrPerNight = (amount: number): string => {
  return (
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount) + '/malam'
  );
};

export const HotelCard = ({ hotel, priceIdrPerNight, isAdmin = false }: HotelCardProps) => {
  const facilitiesList = hotel.facilities
    ? hotel.facilities
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean)
    : [];

  return (
    <Card
      className="h-full hover:border-yellow-600 transition-colors"
      style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'var(--color-border)' }}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm" style={{ color: 'var(--color-gold)' }}>
          {hotel.name}
        </CardTitle>
        <div className="flex gap-2 flex-wrap mt-1">
          <Badge
            variant="outline"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-muted)',
              fontSize: '10px',
            }}
          >
            {hotel.city}
          </Badge>
          <Badge
            variant="outline"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-muted)',
              fontSize: '10px',
            }}
          >
            {hotel.tier}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {hotel.distanceMeters !== null && hotel.distanceMeters !== undefined && (
          <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
            {formatDistance(hotel.distanceMeters)}
          </p>
        )}
        {facilitiesList.length > 0 && (
          <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
            {facilitiesList.join(', ')}
          </p>
        )}
        {hotel.pilgrimNotes && (
          <p className="text-xs mb-3 italic" style={{ color: 'var(--color-text-muted)' }}>
            {hotel.pilgrimNotes}
          </p>
        )}
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-gold)' }}>
          {priceIdrPerNight !== null
            ? formatIdrPerNight(priceIdrPerNight)
            : 'Hubungi admin untuk harga'}
        </p>
        {isAdmin ? (
          <Link
            href={`/estimate/new?city=${hotel.city}&tier=${hotel.tier}`}
            className="text-xs underline"
            style={{ color: 'var(--color-gold)' }}
          >
            Hitung dengan hotel ini
          </Link>
        ) : (
          <span className="text-xs text-[var(--color-text-muted)] cursor-not-allowed italic">
            Estimasi segera hadir
          </span>
        )}
      </CardContent>
    </Card>
  );
};
