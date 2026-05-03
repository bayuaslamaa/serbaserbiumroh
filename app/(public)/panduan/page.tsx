import Link from 'next/link'
import { getAllGuides } from '@/lib/panduan'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = {
  title: 'Panduan Umroh Mandiri',
  description: 'Panduan lengkap ibadah umroh mandiri',
}

export default function PanduanPage() {
  const guides = getAllGuides()

  const grouped = {
    persiapan: guides.filter(g => g.group === 'persiapan'),
    manasik: guides.filter(g => g.group === 'manasik'),
    'doa-dzikir': guides.filter(g => g.group === 'doa-dzikir'),
  }

  const groupLabels = {
    persiapan: 'Persiapan',
    manasik: 'Manasik',
    'doa-dzikir': 'Doa & Dzikir',
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1
        className="text-3xl font-bold mb-2"
        style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}
      >
        Panduan Umroh
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--color-text-muted)' }}>
        Panduan lengkap ibadah umroh mandiri
      </p>

      {Object.entries(grouped).map(([group, groupGuides]) => {
        if (groupGuides.length === 0) return null
        return (
          <section key={group} className="mb-8">
            <h2
              className="text-lg font-semibold mb-4"
              style={{ color: 'var(--color-gold)' }}
            >
              {groupLabels[group as keyof typeof groupLabels]}
            </h2>
            <div className="grid gap-3">
              {groupGuides.map(guide => (
                <Link key={guide.slug} href={`/panduan/${guide.slug}`}>
                  <Card
                    className="hover:border-yellow-600 transition-colors cursor-pointer"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      borderColor: 'var(--color-border)',
                    }}
                  >
                    <CardHeader className="pb-1 pt-4">
                      <CardTitle
                        className="text-base"
                        style={{ color: 'var(--color-gold)' }}
                      >
                        {guide.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {guide.description}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
