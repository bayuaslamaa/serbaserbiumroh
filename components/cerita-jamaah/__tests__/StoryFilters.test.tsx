import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import type { PilgrimStory } from '@/lib/db/schema'

// Mock the Select components to simple native selects for testing
vi.mock('@/components/ui/select', () => {
  const React = require('react')

  const Select = ({ value, onValueChange, children }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode }) => {
    return React.createElement('div', { 'data-testid': 'select-wrapper' }, children)
  }

  const SelectTrigger = ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'select-trigger' }, children)

  const SelectValue = ({ placeholder }: { placeholder?: string }) =>
    React.createElement('span', {}, placeholder)

  const SelectContent = ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'select-content' }, children)

  const SelectItem = ({ value, children, onClick }: { value: string; children: React.ReactNode; onClick?: () => void }) =>
    React.createElement('div', { 'data-value': value, 'data-testid': `select-item-${value}`, onClick }, children)

  return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
})

function makeStory(overrides: Partial<PilgrimStory> = {}): PilgrimStory {
  return {
    id: 'default-id',
    slug: 'default-slug',
    authorName: 'Test Author',
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

const stories: PilgrimStory[] = [
  makeStory({ id: '1', slug: 'solo-story', authorName: 'Andi Solo', departureCity: 'Jakarta', pax: 1, hotelTier: 'ECONOMY', travelMonth: 1 }),
  makeStory({ id: '2', slug: 'pasangan-story', authorName: 'Budi Pasangan', departureCity: 'Surabaya', pax: 2, hotelTier: 'STANDARD', travelMonth: 3 }),
  makeStory({ id: '3', slug: 'keluarga-story', authorName: 'Citra Keluarga', departureCity: 'Jakarta', pax: 3, hotelTier: 'STANDARD', travelMonth: 5 }),
  makeStory({ id: '4', slug: 'grup-story', authorName: 'Dodi Grup', departureCity: 'Bandung', pax: 6, hotelTier: 'PREMIUM', travelMonth: 7 }),
]

// Import after mocking
const { StoryFilters } = await import('../StoryFilters')

describe('StoryFilters', () => {
  it('renders all stories initially (no filters applied)', () => {
    render(<StoryFilters stories={stories} />)
    expect(screen.getByText('Andi Solo')).toBeDefined()
    expect(screen.getByText('Budi Pasangan')).toBeDefined()
    expect(screen.getByText('Citra Keluarga')).toBeDefined()
    expect(screen.getByText('Dodi Grup')).toBeDefined()
  })

  it('shows all story cards initially', () => {
    const { container } = render(<StoryFilters stories={stories} />)
    // All 4 stories should be rendered as links
    const links = container.querySelectorAll('a[href^="/cerita-jamaah/"]')
    expect(links.length).toBe(4)
  })

  it('shows "Tidak ada cerita yang cocok." when stories array is empty', () => {
    render(<StoryFilters stories={[]} />)
    expect(screen.getByText('Tidak ada cerita yang cocok.')).toBeDefined()
  })

  it('renders story author names', () => {
    render(<StoryFilters stories={stories} />)
    expect(screen.getByText('Andi Solo')).toBeDefined()
    expect(screen.getByText('Budi Pasangan')).toBeDefined()
  })

  it('renders departure city info for stories', () => {
    render(<StoryFilters stories={stories} />)
    // Jakarta appears for multiple stories
    const jakartaElements = screen.getAllByText(/Jakarta/)
    expect(jakartaElements.length).toBeGreaterThan(0)
  })

  it('renders group size badges for stories', () => {
    render(<StoryFilters stories={stories} />)
    // These texts appear both in the filter dropdown items AND the story badges
    expect(screen.getAllByText('Solo').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Pasangan').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Keluarga').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Grup').length).toBeGreaterThan(0)
  })

  it('renders filter dropdowns', () => {
    render(<StoryFilters stories={stories} />)
    expect(screen.getByText('Semua Kota')).toBeDefined()
    expect(screen.getByText('Semua Ukuran')).toBeDefined()
    expect(screen.getByText('Semua Tier')).toBeDefined()
    expect(screen.getByText('Semua Bulan')).toBeDefined()
  })
})
