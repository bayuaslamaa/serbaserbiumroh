'use client'

import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StoryCard, getGroupSizeLabel } from './story-card'
import type { PilgrimStory } from '@/shared/db/schema'

const MONTH_NAMES = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const HOTEL_TIERS = ['ECONOMY', 'STANDARD', 'PELATARAN', 'PREMIUM'] as const

interface StoryFiltersProps {
  stories: PilgrimStory[]
}

export function StoryFilters({ stories }: StoryFiltersProps) {
  const [city, setCity] = useState('Semua')
  const [groupSize, setGroupSize] = useState('Semua')
  const [tier, setTier] = useState('Semua')
  const [month, setMonth] = useState('Semua')

  // Derive unique departure cities from stories
  const departureCities = Array.from(new Set(stories.map((s) => s.departureCity))).sort()

  const filtered = stories.filter((story) => {
    if (city !== 'Semua' && story.departureCity !== city) return false
    if (groupSize !== 'Semua' && getGroupSizeLabel(story.pax) !== groupSize) return false
    if (tier !== 'Semua' && story.hotelTier !== tier) return false
    if (month !== 'Semua' && String(story.travelMonth) !== month) return false
    return true
  })

  return (
    <div>
      {/* Filter controls */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Select value={city} onValueChange={setCity}>
          <SelectTrigger
            className="w-48"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(255,255,255,0.03)', color: 'var(--color-text)' }}
          >
            <SelectValue placeholder="Kota Keberangkatan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Semua">Semua Kota</SelectItem>
            {departureCities.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={groupSize} onValueChange={setGroupSize}>
          <SelectTrigger
            className="w-40"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(255,255,255,0.03)', color: 'var(--color-text)' }}
          >
            <SelectValue placeholder="Ukuran Grup" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Semua">Semua Ukuran</SelectItem>
            <SelectItem value="Solo">Solo</SelectItem>
            <SelectItem value="Pasangan">Pasangan</SelectItem>
            <SelectItem value="Keluarga">Keluarga</SelectItem>
            <SelectItem value="Grup">Grup</SelectItem>
          </SelectContent>
        </Select>

        <Select value={tier} onValueChange={setTier}>
          <SelectTrigger
            className="w-40"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(255,255,255,0.03)', color: 'var(--color-text)' }}
          >
            <SelectValue placeholder="Hotel Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Semua">Semua Tier</SelectItem>
            {HOTEL_TIERS.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger
            className="w-40"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(255,255,255,0.03)', color: 'var(--color-text)' }}
          >
            <SelectValue placeholder="Bulan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Semua">Semua Bulan</SelectItem>
            {MONTH_NAMES.slice(1).map((name, idx) => (
              <SelectItem key={idx + 1} value={String(idx + 1)}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Story cards */}
      {filtered.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
          Tidak ada cerita yang cocok.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      )}
    </div>
  )
}
