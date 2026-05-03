import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StoryCard } from '../StoryCard'
import type { PilgrimStory } from '@/lib/db/schema'

function makeStory(overrides: Partial<PilgrimStory> = {}): PilgrimStory {
  return {
    id: 'test-id',
    slug: 'test-story',
    authorName: 'Budi Santoso',
    departureCity: 'Jakarta',
    travelMonth: 3,
    travelYear: 2025,
    pax: 1,
    hotelTier: 'STANDARD',
    airlineTier: 'BUDGET',
    makkahNights: 8,
    madinahNights: 4,
    totalBudgetIdr: 35_000_000,
    narrative: '',
    isPublished: true,
    isFeatured: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('StoryCard', () => {
  it('renders authorName and departureCity', () => {
    render(<StoryCard story={makeStory()} />)
    expect(screen.getByText('Budi Santoso')).toBeDefined()
    expect(screen.getByText(/Jakarta/)).toBeDefined()
  })

  it('shows Solo badge for pax=1', () => {
    render(<StoryCard story={makeStory({ pax: 1 })} />)
    expect(screen.getByText('Solo')).toBeDefined()
  })

  it('shows Pasangan badge for pax=2', () => {
    render(<StoryCard story={makeStory({ pax: 2 })} />)
    expect(screen.getByText('Pasangan')).toBeDefined()
  })

  it('shows Keluarga badge for pax=3', () => {
    render(<StoryCard story={makeStory({ pax: 3 })} />)
    expect(screen.getByText('Keluarga')).toBeDefined()
  })

  it('shows Grup badge for pax=6', () => {
    render(<StoryCard story={makeStory({ pax: 6 })} />)
    expect(screen.getByText('Grup')).toBeDefined()
  })

  it('formats IDR cost per person correctly', () => {
    // 35_000_000 / 1 = 35_000_000 → Rp 35.000.000
    render(<StoryCard story={makeStory({ totalBudgetIdr: 35_000_000, pax: 1 })} />)
    expect(screen.getByText(/35\.000\.000/)).toBeDefined()
  })

  it('formats IDR cost per person for group (divides by pax)', () => {
    // 40_000_000 / 2 = 20_000_000 → Rp 20.000.000
    render(<StoryCard story={makeStory({ totalBudgetIdr: 40_000_000, pax: 2 })} />)
    expect(screen.getByText(/20\.000\.000/)).toBeDefined()
  })

  it('shows hotelTier badge', () => {
    render(<StoryCard story={makeStory({ hotelTier: 'PREMIUM' })} />)
    expect(screen.getByText('PREMIUM')).toBeDefined()
  })

  it('shows travelMonth formatted in Indonesian', () => {
    render(<StoryCard story={makeStory({ travelMonth: 3, travelYear: 2025 })} />)
    expect(screen.getByText(/Maret 2025/)).toBeDefined()
  })
})
