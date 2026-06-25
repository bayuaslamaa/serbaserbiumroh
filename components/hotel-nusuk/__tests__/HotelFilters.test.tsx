import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { HotelPriceList, type HotelWithMonthlyPrices } from '../HotelPriceList'

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

function makeHotel(overrides: Partial<HotelWithMonthlyPrices> = {}): HotelWithMonthlyPrices {
  const basePrice = overrides.sarPerNight ?? 200
  const monthlyPrices = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    sar: basePrice,
    idr: basePrice * 4700,
    isOverride: false,
  }))

  return {
    id: 'default-id',
    city: 'MAKKAH',
    tier: 'STANDARD',
    label: 'Default Hotel',
    sublabel: '3★, dekat Haram',
    distance: '500m',
    agodaUrl: null,
    bookingcomUrl: null,
    tripcomUrl: null,
    bookingUrl: null,
    sarPerNight: basePrice,
    monthlyPrices,
    ...overrides,
  }
}

const hotels: HotelWithMonthlyPrices[] = [
  makeHotel({ id: '1', label: 'Makkah Economy', city: 'MAKKAH', tier: 'ECONOMY', sarPerNight: 150 }),
  makeHotel({ id: '2', label: 'Makkah Standard', city: 'MAKKAH', tier: 'STANDARD', sarPerNight: 250 }),
  makeHotel({ id: '3', label: 'Madinah Standard', city: 'MADINAH', tier: 'STANDARD', sarPerNight: 200 }),
  makeHotel({ id: '4', label: 'Madinah Premium', city: 'MADINAH', tier: 'PREMIUM', sarPerNight: 400 }),
]

describe('HotelFilters (replaced with HotelPriceList tests)', () => {
  it('renders all hotels initially', () => {
    render(<HotelPriceList hotels={hotels} exchangeRate={4700} />)
    expect(screen.getByText('Makkah Economy')).toBeDefined()
    expect(screen.getByText('Makkah Standard')).toBeDefined()
    expect(screen.getByText('Madinah Standard')).toBeDefined()
    expect(screen.getByText('Madinah Premium')).toBeDefined()
  })

  it('renders monthly price grid for hotels when showMonthlyPrices is true', () => {
    render(<HotelPriceList hotels={hotels} exchangeRate={4700} showMonthlyPrices={true} />)
    // Verify month abbreviations are rendered
    expect(screen.getAllByText('Jan').length).toBe(4)
    expect(screen.getAllByText('Des').length).toBe(4)
  })

  it('does not render any prices and renders ask admin button when showMonthlyPrices is false', () => {
    render(<HotelPriceList hotels={hotels} exchangeRate={4700} showMonthlyPrices={false} />)
    // Verify month abbreviations are NOT rendered
    expect(screen.queryByText('Jan')).toBeNull()
    expect(screen.queryByText('Des')).toBeNull()
    // Verify pricing details/baselines are NOT rendered
    expect(screen.queryByText('Rp 705rb')).toBeNull()
    expect(screen.queryByText('150 SAR')).toBeNull()
    expect(screen.queryByText('Baseline: 150 SAR')).toBeNull()
    // Verify reference rate is NOT rendered
    expect(screen.queryByText('Kurs acuan:')).toBeNull()
    // Verify "Tanyakan Harga ke Admin" button is rendered
    expect(screen.getAllByText('Tanyakan Harga ke Admin').length).toBeGreaterThan(0)
  })

  it('renders a booking CTA when a preferred booking link exists', () => {
    render(
      <HotelPriceList
        hotels={[makeHotel({ label: 'Pullman Zam Zam', agodaUrl: 'https://www.agoda.com/pullman-zamzam-madina/hotel/medina-sa.html' })]}
        exchangeRate={4700}
      />
    )

    const link = screen.getByRole('link', { name: /Buka Agoda/i })
    expect(link).toHaveAttribute('href', 'https://www.agoda.com/pullman-zamzam-madina/hotel/medina-sa.html')
  })

  it('shows city filter dropdown options', () => {
    render(<HotelPriceList hotels={hotels} exchangeRate={4700} />)
    expect(screen.getByText('Semua Kota')).toBeDefined()
    expect(screen.getAllByText('MAKKAH').length).toBeGreaterThan(0)
    expect(screen.getAllByText('MADINAH').length).toBeGreaterThan(0)
  })

  it('shows tier filter dropdown options', () => {
    render(<HotelPriceList hotels={hotels} exchangeRate={4700} />)
    expect(screen.getByText('Semua Tier')).toBeDefined()
    expect(screen.getAllByText('ECONOMY').length).toBeGreaterThan(0)
    expect(screen.getAllByText('PREMIUM').length).toBeGreaterThan(0)
  })

  it('shows empty text when filtered hotels list is empty', () => {
    render(<HotelPriceList hotels={[]} exchangeRate={4700} />)
    expect(screen.getByText('Tidak ada hotel yang cocok dengan pencarian dan filter Anda.')).toBeDefined()
  })
})
