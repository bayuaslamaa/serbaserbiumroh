import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import type { HotelListing } from '@/lib/db/schema'

// Mock the Select components to simple elements for testing
vi.mock('@/components/ui/select', () => {
  const React = require('react')

  const Select = ({
    value,
    onValueChange,
    children,
  }: {
    value: string
    onValueChange: (v: string) => void
    children: React.ReactNode
  }) => React.createElement('div', { 'data-testid': 'select-wrapper' }, children)

  const SelectTrigger = ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'select-trigger' }, children)

  const SelectValue = ({ placeholder }: { placeholder?: string }) =>
    React.createElement('span', {}, placeholder)

  const SelectContent = ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'select-content' }, children)

  const SelectItem = ({
    value,
    children,
    onClick,
  }: {
    value: string
    children: React.ReactNode
    onClick?: () => void
  }) =>
    React.createElement(
      'div',
      { 'data-value': value, 'data-testid': `select-item-${value}`, onClick },
      children
    )

  return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
})

function makeHotel(overrides: Partial<HotelListing> = {}): HotelListing {
  return {
    id: 'default-id',
    slug: 'default-slug',
    name: 'Default Hotel',
    city: 'MAKKAH',
    tier: 'STANDARD',
    distanceMeters: 500,
    facilities: 'WiFi',
    pilgrimNotes: '',
    isPublished: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

const hotels: HotelListing[] = [
  makeHotel({ id: '1', slug: 'h1', name: 'Makkah Economy', city: 'MAKKAH', tier: 'ECONOMY' }),
  makeHotel({ id: '2', slug: 'h2', name: 'Makkah Standard', city: 'MAKKAH', tier: 'STANDARD' }),
  makeHotel({ id: '3', slug: 'h3', name: 'Madinah Standard', city: 'MADINAH', tier: 'STANDARD' }),
  makeHotel({ id: '4', slug: 'h4', name: 'Madinah Premium', city: 'MADINAH', tier: 'PREMIUM' }),
]

const priceMap: Record<string, number> = {
  MAKKAH_ECONOMY: 300_000,
  MAKKAH_STANDARD: 500_000,
  MADINAH_STANDARD: 450_000,
  MADINAH_PREMIUM: 900_000,
}

// Import after mocking
const { HotelFilters } = await import('../HotelFilters')

describe('HotelFilters', () => {
  it('renders all hotels initially', () => {
    render(<HotelFilters hotels={hotels} priceMap={priceMap} />)
    expect(screen.getByText('Makkah Economy')).toBeDefined()
    expect(screen.getByText('Makkah Standard')).toBeDefined()
    expect(screen.getByText('Madinah Standard')).toBeDefined()
    expect(screen.getByText('Madinah Premium')).toBeDefined()
  })

  it('shows city filter dropdown options', () => {
    render(<HotelFilters hotels={hotels} priceMap={priceMap} />)
    expect(screen.getByText('Semua Kota')).toBeDefined()
    // MAKKAH appears in both dropdown and card badges — use getAllByText
    expect(screen.getAllByText('MAKKAH').length).toBeGreaterThan(0)
    expect(screen.getAllByText('MADINAH').length).toBeGreaterThan(0)
  })

  it('shows tier filter dropdown options', () => {
    render(<HotelFilters hotels={hotels} priceMap={priceMap} />)
    expect(screen.getByText('Semua Tier')).toBeDefined()
    // ECONOMY appears in both dropdown and card badges — use getAllByText
    expect(screen.getAllByText('ECONOMY').length).toBeGreaterThan(0)
    expect(screen.getAllByText('PREMIUM').length).toBeGreaterThan(0)
  })

  it('shows "Tidak ada hotel yang cocok." when hotels array is empty', () => {
    render(<HotelFilters hotels={[]} priceMap={{}} />)
    expect(screen.getByText('Tidak ada hotel yang cocok.')).toBeDefined()
  })

  it('passes price to HotelCard — shows price when priceMap has matching key', () => {
    render(<HotelFilters hotels={hotels} priceMap={priceMap} />)
    // MAKKAH_ECONOMY 300_000 → formatted IDR
    expect(screen.getByText(/300\.000.*malam/)).toBeDefined()
  })

  it('shows "Hubungi admin untuk harga" for hotels with no price in priceMap', () => {
    render(<HotelFilters hotels={hotels} priceMap={{}} />)
    const noPrice = screen.getAllByText('Hubungi admin untuk harga')
    expect(noPrice.length).toBe(hotels.length)
  })
})
