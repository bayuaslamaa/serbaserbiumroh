import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { HotelCard } from '../HotelCard'
import type { HotelListing } from '@/lib/db/schema'

function makeHotel(overrides: Partial<HotelListing> = {}): HotelListing {
  return {
    id: 'hotel-1',
    slug: 'test-hotel',
    name: 'Hotel Al-Safwa',
    city: 'MAKKAH',
    tier: 'STANDARD',
    distanceMeters: 500,
    facilities: 'WiFi, Sarapan, AC',
    pilgrimNotes: 'Dekat dengan Masjidil Haram',
    isPublished: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('HotelCard', () => {
  it('renders hotel name', () => {
    render(<HotelCard hotel={makeHotel()} priceIdrPerNight={null} />)
    expect(screen.getByText('Hotel Al-Safwa')).toBeDefined()
  })

  it('renders city badge', () => {
    render(<HotelCard hotel={makeHotel({ city: 'MAKKAH' })} priceIdrPerNight={null} />)
    expect(screen.getByText('MAKKAH')).toBeDefined()
  })

  it('renders tier badge', () => {
    render(<HotelCard hotel={makeHotel({ tier: 'STANDARD' })} priceIdrPerNight={null} />)
    expect(screen.getByText('STANDARD')).toBeDefined()
  })

  it('shows distance in meters when < 1000m', () => {
    render(<HotelCard hotel={makeHotel({ distanceMeters: 300 })} priceIdrPerNight={null} />)
    expect(screen.getByText('300 m dari Haram')).toBeDefined()
  })

  it('shows distance in km when >= 1000m', () => {
    render(<HotelCard hotel={makeHotel({ distanceMeters: 1500 })} priceIdrPerNight={null} />)
    expect(screen.getByText('1.5 km dari Haram')).toBeDefined()
  })

  it('shows distance in km for exactly 1000m', () => {
    render(<HotelCard hotel={makeHotel({ distanceMeters: 1000 })} priceIdrPerNight={null} />)
    expect(screen.getByText('1.0 km dari Haram')).toBeDefined()
  })

  it('shows formatted IDR price when priceIdrPerNight is provided', () => {
    render(<HotelCard hotel={makeHotel()} priceIdrPerNight={500_000} />)
    expect(screen.getByText(/500\.000.*malam/)).toBeDefined()
  })

  it('shows "Hubungi admin untuk harga" when priceIdrPerNight is null', () => {
    render(<HotelCard hotel={makeHotel()} priceIdrPerNight={null} />)
    expect(screen.getByText('Hubungi admin untuk harga')).toBeDefined()
  })

  it('shows "Estimasi segera hadir" text instead of calculation link for non-admins', () => {
    render(<HotelCard hotel={makeHotel({ city: 'MAKKAH', tier: 'STANDARD' })} priceIdrPerNight={null} isAdmin={false} />)
    expect(screen.getByText('Estimasi segera hadir')).toBeDefined()
    expect(screen.queryByText('Hitung dengan hotel ini')).toBeNull()
  })

  it('shows "Hitung dengan hotel ini" link for admins', () => {
    render(<HotelCard hotel={makeHotel({ city: 'MAKKAH', tier: 'STANDARD' })} priceIdrPerNight={null} isAdmin={true} />)
    const link = screen.getByText('Hitung dengan hotel ini')
    expect(link).toBeDefined()
    expect(link.getAttribute('href')).toBe('/estimate/new?city=MAKKAH&tier=STANDARD')
  })
})
