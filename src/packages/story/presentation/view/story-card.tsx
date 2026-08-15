import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/molecules/card';
import { Badge } from '@/components/atoms/badge';
import type { PilgrimStory } from '@/shared/db/schema';

const MONTH_NAMES = [
  '',
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export const getGroupSizeLabel = (pax: number): string => {
  if (pax === 1) return 'Solo';
  if (pax === 2) return 'Pasangan';
  if (pax >= 3 && pax <= 5) return 'Keluarga';
  return 'Grup';
};

export const formatIdr = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
};

interface StoryCardProps {
  story: PilgrimStory;
}

export const StoryCard = ({ story }: StoryCardProps) => {
  const travelPeriod = story.travelMonth
    ? `${MONTH_NAMES[story.travelMonth]}${story.travelYear ? ` ${story.travelYear}` : ''}`
    : null;

  const costPerPerson = Math.round(story.totalBudgetIdr / story.pax);
  const groupSizeLabel = getGroupSizeLabel(story.pax);

  return (
    <Link href={`/cerita-jamaah/${story.slug}`}>
      <Card
        className="h-full hover:border-yellow-600 transition-colors cursor-pointer"
        style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'var(--color-border)' }}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm" style={{ color: 'var(--color-gold)' }}>
            {story.authorName}
          </CardTitle>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {story.departureCity}
            {travelPeriod ? ` · ${travelPeriod}` : ''}
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap mb-2">
            <Badge
              variant="outline"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-muted)',
                fontSize: '10px',
              }}
            >
              {groupSizeLabel}
            </Badge>
            <Badge
              variant="outline"
              style={{
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-muted)',
                fontSize: '10px',
              }}
            >
              {story.hotelTier}
            </Badge>
          </div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-gold)' }}>
            {formatIdr(costPerPerson)}/orang
          </p>
        </CardContent>
      </Card>
    </Link>
  );
};
