import TransportasiClient from './TransportasiClient'
import { pageMetadata } from '@/lib/seo/metadata'

export const metadata = pageMetadata({
  title: 'Tarif Sewa Transportasi dan Antar Jemput Bandara Arab Saudi',
  description:
    'Daftar harga sewa mobil dan antar jemput bandara Jeddah & Madinah untuk umroh mandiri, lengkap dengan kalkulator kurs Rupiah dan pemesanan langsung via WhatsApp.',
  path: '/transportasi',
})

export default function TransportasiPage() {
  return <TransportasiClient />
}
