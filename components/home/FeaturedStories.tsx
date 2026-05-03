import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { PilgrimStory } from '@/lib/db/schema'

interface FeaturedStoriesProps {
  stories: PilgrimStory[]
}

export function FeaturedStories({ stories }: FeaturedStoriesProps) {
  if (stories.length === 0) return null

  return (
    <section className="py-8">
      <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}>
        Cerita Jamaah Pilihan
      </h2>
      <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
        Pengalaman nyata jamaah umroh mandiri
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stories.map((story) => (
          <Link key={story.id} href={`/cerita-jamaah/${story.slug}`}>
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
                  {story.travelMonth ? ` · ${new Date(2024, story.travelMonth - 1).toLocaleString('id-ID', { month: 'long' })}${story.travelYear ? ` ${story.travelYear}` : ''}` : ''}
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)', fontSize: '10px' }}>
                    {story.pax} orang
                  </Badge>
                  <Badge variant="outline" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)', fontSize: '10px' }}>
                    {story.hotelTier}
                  </Badge>
                </div>
                <p className="text-sm font-semibold mt-2" style={{ color: 'var(--color-gold)' }}>
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(story.totalBudgetIdr / story.pax)}/orang
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <div className="text-center mt-6">
        <Link href="/cerita-jamaah" className="text-sm underline" style={{ color: 'var(--color-gold)' }}>
          Lihat semua cerita →
        </Link>
      </div>
    </section>
  )
}
