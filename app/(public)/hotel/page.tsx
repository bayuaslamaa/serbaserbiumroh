import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Hotel Nusuk — Umroh Mandiri',
  description: 'Direktori hotel umroh dengan estimasi harga IDR terkini',
}

export default function HotelPage() {
  redirect('/hotel-nusuk')
}
