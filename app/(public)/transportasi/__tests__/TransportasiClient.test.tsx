import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import TransportasiClient from '../TransportasiClient'

describe('TransportasiClient', () => {
  it('renders generated vehicle images for every armada option', () => {
    render(<TransportasiClient />)

    expect(screen.getByAltText('Sedan hitam untuk layanan transportasi bandara')).toBeInTheDocument()
    expect(screen.getByAltText('Hyundai Staria tujuh penumpang untuk layanan transportasi keluarga')).toBeInTheDocument()
    expect(screen.getByAltText('Van penumpang dua belas kursi untuk rombongan umroh')).toBeInTheDocument()
    expect(screen.getByAltText('SUV premium hitam untuk transportasi eksklusif')).toBeInTheDocument()
  })

  it('keeps tab selection and WhatsApp booking behavior working with vehicle images', () => {
    render(<TransportasiClient />)

    fireEvent.click(screen.getByRole('button', { name: /12 Seater \(HiAce\)/i }))

    expect(screen.getByRole('heading', { name: 'Kapasitas 12 Seater (HiAce)' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Pesan via WhatsApp/i })[0]).toHaveAttribute(
      'href',
      expect.stringContaining('12%20Seater%20(HiAce)')
    )
  })
})
