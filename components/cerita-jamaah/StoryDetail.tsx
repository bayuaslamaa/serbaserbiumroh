'use client'

import ReactMarkdown from 'react-markdown'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { PilgrimStory, StoryItineraryDay, StoryPackingItem } from '@/lib/db/schema'

const MONTH_NAMES = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

function formatIdr(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function getGroupSizeLabel(pax: number): string {
  if (pax === 1) return 'Solo'
  if (pax === 2) return 'Pasangan'
  if (pax >= 3 && pax <= 5) return 'Keluarga'
  return 'Grup'
}

interface StoryDetailProps {
  story: PilgrimStory
  itineraryDays: StoryItineraryDay[]
  packingItems: StoryPackingItem[]
  isAdmin?: boolean
}

export function StoryDetail({ story, itineraryDays, packingItems, isAdmin = false }: StoryDetailProps) {
  const travelPeriod = story.travelMonth
    ? `${MONTH_NAMES[story.travelMonth]}${story.travelYear ? ` ${story.travelYear}` : ''}`
    : null

  const costPerPerson = Math.round(story.totalBudgetIdr / story.pax)

  // Group packing items by category
  const packingByCategory = packingItems.reduce<Record<string, StoryPackingItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  // Pre-fill URL for estimator
  const prefilUrl = `/estimate/new?storyName=${encodeURIComponent(story.authorName)}&makkahNights=${story.makkahNights}&madinahNights=${story.madinahNights}&pax=${story.pax}&tier=${story.hotelTier}${story.travelMonth ? `&travelMonth=${story.travelMonth}` : ''}`

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-3xl font-bold mb-2"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-gold)' }}
        >
          {story.authorName}
        </h1>
        <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
          {story.departureCity}
          {travelPeriod ? ` · ${travelPeriod}` : ''}
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge
            variant="outline"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
          >
            {getGroupSizeLabel(story.pax)} ({story.pax} orang)
          </Badge>
          <Badge
            variant="outline"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
          >
            {story.hotelTier}
          </Badge>
          <Badge
            variant="outline"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
          >
            {story.makkahNights}m Makkah + {story.madinahNights}m Madinah
          </Badge>
        </div>
        <p className="text-2xl font-bold" style={{ color: 'var(--color-gold)' }}>
          {formatIdr(costPerPerson)}/orang
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Total {formatIdr(story.totalBudgetIdr)} untuk {story.pax} orang
        </p>
      </div>

      {/* Pre-fill button */}
      {isAdmin ? (
        <div className="mb-8 p-4 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'var(--color-border)', border: '1px solid' }}>
          <p className="text-sm mb-3" style={{ color: 'var(--color-text-muted)' }}>
            Gunakan cerita ini sebagai titik awal estimasi biaya Anda
          </p>
          <Link
            href={prefilUrl}
            className="inline-block px-4 py-2 rounded text-sm font-semibold transition-colors"
            style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
          >
            Gunakan sebagai titik awal
          </Link>
        </div>
      ) : (
        <div className="mb-8 p-4 rounded-lg opacity-60" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'var(--color-border)', border: '1px solid' }}>
          <p className="text-sm mb-3" style={{ color: 'var(--color-text-muted)' }}>
            Gunakan cerita ini sebagai titik awal estimasi biaya Anda
          </p>
          <button
            disabled
            className="inline-block px-4 py-2 rounded text-sm font-semibold transition-colors cursor-not-allowed opacity-50"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
          >
            Gunakan sebagai titik awal (Coming Soon)
          </button>
        </div>
      )}

      {/* Narrative */}
      {story.narrative && (
        <section className="mb-8">
          <h2
            className="text-xl font-semibold mb-4"
            style={{ color: 'var(--color-gold)' }}
          >
            Cerita Perjalanan
          </h2>
          <div
            className="prose prose-invert max-w-none text-sm"
            style={{ color: 'var(--color-text)' }}
          >
            <ReactMarkdown>{story.narrative}</ReactMarkdown>
          </div>
        </section>
      )}

      {/* Itinerary */}
      {itineraryDays.length > 0 && (
        <section className="mb-8">
          <h2
            className="text-xl font-semibold mb-4"
            style={{ color: 'var(--color-gold)' }}
          >
            Itinerary Hari per Hari
          </h2>
          <div className="space-y-4">
            {itineraryDays
              .sort((a, b) => a.dayNumber - b.dayNumber)
              .map((day) => (
                <div
                  key={day.id}
                  className="p-4 rounded-lg"
                  style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)' }}
                >
                  <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-gold)' }}>
                    Hari {day.dayNumber} — {day.label}
                  </h3>
                  {day.description && (
                    <div className="prose prose-invert max-w-none text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      <ReactMarkdown>{day.description}</ReactMarkdown>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </section>
      )}

      {/* Packing List */}
      {packingItems.length > 0 && (
        <section className="mb-8">
          <h2
            className="text-xl font-semibold mb-4"
            style={{ color: 'var(--color-gold)' }}
          >
            Daftar Perlengkapan
          </h2>
          <div className="space-y-4">
            {Object.entries(packingByCategory).map(([category, items]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>
                  {category}
                </h3>
                <ul className="space-y-1">
                  {items
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((item) => (
                      <li
                        key={item.id}
                        className="text-sm flex items-center gap-2"
                        style={{ color: 'var(--color-text)' }}
                      >
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: 'var(--color-gold)' }} />
                        {item.itemName}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Budget Breakdown */}
      <section className="mb-8">
        <h2
          className="text-xl font-semibold mb-4"
          style={{ color: 'var(--color-gold)' }}
        >
          Rincian Anggaran
        </h2>
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: '1px solid var(--color-border)' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                  Keterangan
                </th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                  Total
                </th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                  Per Orang
                </th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderTop: '1px solid var(--color-border)' }}>
                <td className="px-4 py-3" style={{ color: 'var(--color-text)' }}>Total Biaya Perjalanan</td>
                <td className="px-4 py-3 text-right font-semibold" style={{ color: 'var(--color-gold)' }}>
                  {formatIdr(story.totalBudgetIdr)}
                </td>
                <td className="px-4 py-3 text-right font-semibold" style={{ color: 'var(--color-gold)' }}>
                  {formatIdr(costPerPerson)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
          {story.pax} orang · {story.makkahNights} malam Makkah · {story.madinahNights} malam Madinah · Hotel {story.hotelTier}
        </p>
      </section>
    </div>
  )
}
